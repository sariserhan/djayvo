#include "djayvo/remix.h"
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <stdexcept>

namespace djayvo {
namespace {
Schedule selected_schedule(const RemixPlan& plan,const AudioBuffer& source,bool vocals_only,int solo) {
    validate(plan,source);
    if (solo < -2 || solo > 2) throw std::invalid_argument("invalid instrument stem");
    auto music=plan.music;
    for (auto& track : music.tracks)
        if (vocals_only || (solo>=0 && static_cast<int>(track.instrument)!=solo)) track.notes.clear();
    return compile(music);
}
double limiter(double x,double ceiling) noexcept {
    const double knee=0.8*ceiling;
    return std::abs(x)<=knee ? x : std::copysign(knee+(ceiling-knee)*std::tanh((std::abs(x)-knee)/(ceiling-knee)),x);
}
}
RemixRenderer::RemixRenderer(const RemixPlan& p,const AudioBuffer& source,std::size_t block,bool vocals_only,int solo)
    : music_(selected_schedule(p,source,vocals_only,solo),block),source_(source),
      music_buffer_(block*2),block_(block),vocals_only_(vocals_only),instrumental_only_(solo!=-1) {
    const auto schedule=compile(p.music);
    total_frames_=schedule.total_frames; ceiling_=schedule.ceiling;
    room_mix_=vocals_only?0:p.instrument_room_mix;
    if (room_mix_>0) {
        const std::array<unsigned,4> milliseconds{{31,47,73,113}};
        for (std::size_t i=0;i<room_taps_.size();++i)
            room_taps_[i]=static_cast<std::size_t>(p.music.sample_rate)*milliseconds[i]/1000;
        room_buffer_.resize(room_taps_.back()+1);
        room_low_alpha_=1-std::exp(-6.283185307179586*300/p.music.sample_rate);
        room_high_alpha_=1-std::exp(-6.283185307179586*std::min(4500.0,p.music.sample_rate*0.4)/p.music.sample_rate);
    }
    for (const auto& event : p.vocals) {
        const auto& clip=p.clips[event.clip];
        const double gain=std::pow(10.0,event.gain_db/20)*p.analysis.normalization_gain;
        constexpr double pi=3.14159265358979323846;
        triggers_.push_back({tick_to_frame(event.start,p.music.sample_rate,p.music.tempo_milli_bpm),
            static_cast<std::uint64_t>(std::ceil(static_cast<double>(clip.end-clip.begin)/event.rate)),
            clip.begin,clip.end,event.rate,
            gain*std::cos((event.pan+1)*pi/4),gain*std::sin((event.pan+1)*pi/4),event.reverse,event.clean});
    }
    std::stable_sort(triggers_.begin(),triggers_.end(),[](const Trigger& a,const Trigger& b){return a.start<b.start;});
}
std::size_t RemixRenderer::process(float* stereo,std::size_t requested) noexcept {
    if (!stereo || !requested || requested>block_) return 0;
    const auto count=music_.process(music_buffer_.data(),requested);
    std::fill(stereo,stereo+requested*2,0.0F);
    const double fade=std::max(1.0,source_.sample_rate*0.003);
    const double duck_fade=std::max(1.0,source_.sample_rate*0.010);
    for (std::size_t i=0;i<count;++i,++cursor_) {
        double voice_left=0,voice_right=0,duck=1;
        for (const auto& t : triggers_) {
            if (t.start>cursor_) break;
            const auto position=cursor_-t.start;
            if (position>=t.frames) continue;
            const double edge=std::min(static_cast<double>(position),static_cast<double>(t.frames-1-position));
            const double envelope=std::clamp(edge/fade,0.0,1.0);
            if (t.clean) duck=std::min(duck,1.0-0.85*std::clamp(edge/duck_fade,0.0,1.0));
            if (instrumental_only_) continue;
            const double elapsed=static_cast<double>(position)*t.rate;
            const double source_position=t.reverse ? static_cast<double>(t.source_end-1)-elapsed :
                                                                  static_cast<double>(t.source_begin)+elapsed;
            const double bounded=std::clamp(source_position,static_cast<double>(t.source_begin),static_cast<double>(t.source_end-1));
            const auto index=static_cast<std::size_t>(bounded);
            const auto next=std::min<std::size_t>(index+1,static_cast<std::size_t>(t.source_end-1));
            const double fraction=bounded-static_cast<double>(index);
            const double sample=(source_.mono[index]*(1-fraction)+source_.mono[next]*fraction)*envelope;
            voice_left+=sample*t.gain_left; voice_right+=sample*t.gain_right;
        }
        double room_left=0,room_right=0;
        if (room_mix_>0) {
            const double send=(music_buffer_[i*2]+music_buffer_[i*2+1])*0.5;
            room_low_+=room_low_alpha_*(send-room_low_);
            room_high_+=room_high_alpha_*(send-room_low_-room_high_);
            if (std::abs(room_low_)<1e-12) room_low_=0;
            if (std::abs(room_high_)<1e-12) room_high_=0;
            room_buffer_[room_cursor_]=room_high_;
            const auto tap=[&](std::size_t n) {
                return room_buffer_[(room_cursor_+room_buffer_.size()-room_taps_[n])%room_buffer_.size()];
            };
            room_left=room_mix_*(tap(0)+0.5*tap(2));
            room_right=room_mix_*(tap(1)+0.5*tap(3));
            room_cursor_=(room_cursor_+1)%room_buffer_.size();
        }
        const double channels[2]={voice_left+(vocals_only_?0:(music_buffer_[i*2]+room_left)*duck),
                                  voice_right+(vocals_only_?0:(music_buffer_[i*2+1]+room_right)*duck)};
        for (std::size_t c=0;c<2;++c) {
            double x=channels[c];
            if (!std::isfinite(x)) {++stats_.nonfinite_samples;x=0;}
            stats_.pre_limiter_peak=std::max(stats_.pre_limiter_peak,std::abs(x));
            if (std::abs(x)>0.8*ceiling_) ++stats_.limited_samples;
            const float output=static_cast<float>(limiter(x,ceiling_));
            stereo[i*2+c]=output;
            stats_.peak=std::max(stats_.peak,static_cast<double>(std::abs(output)));
            stats_.max_step=std::max(stats_.max_step,static_cast<double>(std::abs(output-previous_[c])));
            previous_[c]=output;
            if (c==0) stats_.square_sum_left+=static_cast<double>(output)*output;
            else stats_.square_sum_right+=static_cast<double>(output)*output;
        }
        ++stats_.frames;
    }
    return count;
}

void render_remix(const RemixPlan& p,const AudioBuffer& source,const std::string& prefix,std::size_t block,bool stems,
                  const RenderControl& control) {
    const auto schedule=compile(p.music);
    const auto render=[&](const std::string& path,bool vocals,int solo) {
        control.check();
        RemixRenderer renderer(p,source,block,vocals,solo);
        WavWriter writer(path,p.music.sample_rate,schedule.total_frames);
        std::vector<float> buffer(block*2);
        while (!renderer.finished()) {
            control.check();
            const auto count=renderer.process(buffer.data(),block);
            if (!count) throw std::runtime_error("remix render stalled");
            writer.write(buffer.data(),count);
        }
        writer.close();
        if (renderer.voice_overflows() || renderer.stats().nonfinite_samples ||
            renderer.stats().peak>schedule.ceiling+1e-7)
            throw std::runtime_error("remix rejected: invalid audio or voices");
        return renderer.stats();
    };
    const auto stats=render(prefix+".wav",false,-1);
    if (stems) {
        render(prefix+".vocals.wav",true,-1);
        for (int instrument=0;instrument<3;++instrument)
            render(prefix+"."+instrument_name(static_cast<Instrument>(instrument))+".wav",false,instrument);
    }
    write_score(p,source,prefix+".score.json");
    write_report(stats,p.music,schedule,prefix+".report.json",p.strategy==Strategy::baseline?"M1-control":"M0b/M0c");
    std::ofstream trace(prefix+".events.tsv"); trace<<std::setprecision(17);
    trace<<"frame\tkind\tid\tinstrument\tpitch\tvelocity\n";
    for (const auto& e : schedule.events)
        trace<<e.frame<<'\t'<<(e.kind==EventKind::note_on?"on":"off")<<'\t'<<e.note_id<<'\t'
             <<instrument_name(e.instrument)<<'\t'<<e.pitch<<'\t'<<e.velocity<<'\n';
    trace.flush();
    if (!trace) throw std::runtime_error("cannot write event trace");
}
} // namespace djayvo
