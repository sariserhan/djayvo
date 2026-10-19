#include "djayvo/remix.h"
#include "resample_pcm.h"
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <stdexcept>

namespace djayvo {
namespace {
std::vector<float> transform_voice(const AudioBuffer& source,const Region& clip,const VocalEvent& event) {
    const auto* begin=source.mono.data()+clip.begin;
    const auto length=static_cast<std::size_t>(clip.end-clip.begin);
    const double pitch=std::pow(2.0,event.pitch_semitones/12);
    auto input=event.pitch_semitones==0 ? std::vector<float>(begin,begin+length) :
        detail::resample_pcm(begin,length,1/pitch,static_cast<std::size_t>(std::llround(static_cast<double>(length)/pitch)));
    const auto frames=static_cast<std::size_t>(vocal_frames(event,clip));
    if (input.size()==frames) return input;
    // shortcut: WSOLA does not preserve formants or every transient; upgrade after listening comparisons.
    const std::size_t window=source.sample_rate*40U/1000, hop=window/2;
    const std::size_t radius=source.sample_rate*8U/1000, stride=std::max(1U,source.sample_rate/8000);
    std::vector<float> output(frames);
    std::copy_n(input.begin(),window,output.begin());
    std::size_t previous=0;
    while (previous<frames-window) {
        const auto position=std::min(previous+hop,frames-window);
        const auto overlap=previous+window-position;
        const auto nominal=static_cast<std::size_t>(std::llround(static_cast<double>(position)*
            static_cast<double>(input.size()-window)/static_cast<double>(frames-window)));
        auto selected=nominal;
        if (position!=frames-window) {
            const auto low=nominal>radius?nominal-radius:0;
            const auto high=std::min(nominal+radius,input.size()-window);
            double best=-2;
            const auto consider=[&](std::size_t candidate) {
                double dot=0,left=0,right=0;
                for (std::size_t i=0;i<overlap;i+=stride) {
                    const double x=output[position+i],y=input[candidate+i];
                    dot+=x*y;left+=x*x;right+=y*y;
                }
                const double score=left*right>1e-20?dot/std::sqrt(left*right):-2;
                if (score>best+1e-9) {best=score;selected=candidate;}
            };
            consider(nominal);
            for (auto candidate=low;candidate<=high;candidate+=stride) consider(candidate);
            const auto coarse=selected;
            for (auto candidate=coarse>stride?std::max(low,coarse-stride):low;
                 candidate<=std::min(high,coarse+stride);++candidate) consider(candidate);
        }
        for (std::size_t i=0;i<window;++i) {
            const double weight=i<overlap ? 0.5-0.5*std::cos(3.14159265358979323846*
                static_cast<double>(i)/static_cast<double>(overlap-1)) : 1;
            output[position+i]=static_cast<float>((1-weight)*output[position+i]+weight*input[selected+i]);
        }
        previous=position;
    }
    return output;
}
Schedule selected_schedule(const RemixPlan& plan,const AudioBuffer& source,bool vocals_only,int solo) {
    validate(plan,source);
    if (solo < -2 || solo > static_cast<int>(Instrument::lead)) throw std::invalid_argument("invalid instrument stem");
    auto schedule=compile(plan.music);
    // Filter after compilation: IDs select sample takes and must match the master.
    schedule.events.erase(std::remove_if(schedule.events.begin(),schedule.events.end(),[&](const Event& event) {
        return vocals_only || (solo>=0 && static_cast<int>(event.instrument)!=solo);
    }),schedule.events.end());
    return schedule;
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
    reverb_mix_=vocals_only?0:p.instrument_reverb_mix;
    if (reverb_mix_>0) {
        reverb_=std::make_unique<InstrumentReverb>(p.music.sample_rate);
        for (const auto& e:schedule.events) if (e.kind==EventKind::note_off)
            reverb_end_=std::max(reverb_end_,e.frame+release_frames(e.instrument,p.music.sample_rate));
        reverb_end_+=p.music.sample_rate*1500ULL/1000;
    }
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
        triggers_.push_back({tick_to_frame(event.start,p.music),
            vocal_frames(event,clip),
            clip.begin,clip.end,event.rate,
            gain*std::cos((event.pan+1)*pi/4),gain*std::sin((event.pan+1)*pi/4),event.reverse,event.clean});
        if (!instrumental_only_ && (event.pitch_semitones!=0 || event.time_stretch!=1)) {
            auto it=std::find_if(transformed_.begin(),transformed_.end(),[&](const TransformedClip& t){
                return t.clip==event.clip && t.pitch==event.pitch_semitones && t.stretch==event.time_stretch;
            });
            if (it==transformed_.end()) {
                transformed_.push_back({event.clip,event.pitch_semitones,event.time_stretch,transform_voice(source,clip,event)});
                it=transformed_.end()-1;
            }
            auto& trigger=triggers_.back();
            trigger.transformed=static_cast<int>(it-transformed_.begin());
            trigger.source_begin=0;trigger.source_end=it->pcm.size();trigger.rate=1;
        }
        if (!instrumental_only_ && event.echo_ticks) {
            auto echo=triggers_.back();
            double send=std::pow(10.0,event.echo_gain_db/20);
            for (int repeat=1;repeat<=3;++repeat) {
                echo.start=tick_to_frame(event.start+repeat*event.echo_ticks,p.music);
                const double pan=repeat%2?0.45:-0.45;
                echo.gain_left=gain*send*std::cos((pan+1)*pi/4);
                echo.gain_right=gain*send*std::sin((pan+1)*pi/4);
                triggers_.push_back(echo);send*=0.35;
            }
        }
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
        // Stable compaction preserves summation order; ended clips leave before same-frame starts.
        if (cursor_>=next_vocal_end_) {
            std::size_t remaining=0;
            next_vocal_end_=total_frames_;
            for (std::size_t j=0;j<active_count_;++j) {
                const auto end=active_triggers_[j]->start+active_triggers_[j]->frames;
                if (cursor_>=end) continue;
                next_vocal_end_=std::min(next_vocal_end_,end);
                active_triggers_[remaining++]=active_triggers_[j];
            }
            active_count_=remaining;
        }
        while (next_trigger_<triggers_.size() && triggers_[next_trigger_].start<=cursor_) {
            const auto& trigger=triggers_[next_trigger_];
            if (active_count_<active_triggers_.size()) {
                active_triggers_[active_count_++]=&trigger;
                next_vocal_end_=std::min(next_vocal_end_,trigger.start+trigger.frames);
            }
            else ++vocal_overflows_; // Validation caps simultaneous triggers at 16, including echoes.
            ++next_trigger_;
        }
        double voice_left=0,voice_right=0,duck=1;
        for (std::size_t j=0;j<active_count_;++j) {
            const auto& t=*active_triggers_[j];
            const auto position=cursor_-t.start;
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
            const auto& pcm=t.transformed<0?source_.mono:transformed_[static_cast<std::size_t>(t.transformed)].pcm;
            const double sample=(pcm[index]*(1-fraction)+pcm[next]*fraction)*envelope;
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
        if (reverb_ && cursor_<reverb_end_) {
            const auto wet=reverb_->process((music_buffer_[i*2]+music_buffer_[i*2+1])*0.5);
            const double tail=std::min(1.0,static_cast<double>(reverb_end_-cursor_-1)/(source_.sample_rate*0.05));
            room_left+=wet[0]*reverb_mix_*tail;room_right+=wet[1]*reverb_mix_*tail;
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
        for (int instrument=0;instrument<=static_cast<int>(Instrument::lead);++instrument) {
            if (instrument>=3 && std::none_of(p.music.tracks.begin(),p.music.tracks.end(),[&](const Track& t){return static_cast<int>(t.instrument)==instrument;})) continue;
            render(prefix+"."+instrument_name(static_cast<Instrument>(instrument))+".wav",false,instrument);
        }
    }
    write_score(p,source,prefix+".score.json");
    write_report(stats,p.music,schedule,prefix+".report.json",p.strategy==Strategy::baseline?"M1-control":"M0b/M0c");
    std::ofstream trace(prefix+".events.tsv"); trace<<std::setprecision(17);
    const bool guitar=std::any_of(p.music.tracks.begin(),p.music.tracks.end(),[](const Track& t){return t.instrument==Instrument::guitar;});
    trace<<"frame\tkind\tid\tinstrument\tpitch\tvelocity"<<(guitar?"\tmuted\n":"\n");
    for (const auto& e : schedule.events) {
        trace<<e.frame<<'\t'<<(e.kind==EventKind::note_on?"on":"off")<<'\t'<<e.note_id<<'\t'
             <<instrument_name(e.instrument)<<'\t'<<e.pitch<<'\t'<<e.velocity;
        if (guitar) trace<<'\t'<<e.muted;
        trace<<'\n';
    }
    trace.flush();
    if (!trace) throw std::runtime_error("cannot write event trace");
}
} // namespace djayvo
