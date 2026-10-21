#include "jamloom/taste.h"
#include "jamloom/audio.h"
#include <algorithm>
#include <array>
#include <stdexcept>

namespace jamloom {
PerformancePlan make_taste(std::uint32_t seed, unsigned tempo, unsigned energy,
                          unsigned instruments, unsigned novelty, unsigned seconds,
                          unsigned direction) {
    if (tempo<60 || tempo>180 || energy>2 || !instruments || instruments>31 ||
        novelty>100 || seconds<30 || seconds>180 || direction>2)
        throw std::invalid_argument("Unsupported musical preferences");
    PerformancePlan p;
    p.strategy="taste_composition";
    p.seed=seed; p.tempo_milli_bpm=tempo*1000; p.tail_ms=2000;
    p.bars=std::max(7,static_cast<int>(((seconds-2)*tempo+(seconds==180?0:239))/240));
    const int a=p.bars/4,b=p.bars/2,c=p.bars*3/4;
    p.sections={{"idea",0,a},{"conversation",a,b-a},{"contrast",b,c-b},
                {"developed_return",c,p.bars-c-1},{"resolution",p.bars-1,1}};
    std::uint32_t rng=seed^0x91e10da5U;
    if (!rng) rng=1;
    const auto next=[&]() { rng^=rng<<13U; rng^=rng>>17U; rng^=rng<<5U; return rng; };
    constexpr Tick q=ticks_per_quarter,bar_ticks=4*q;
    const int tonic=60+static_cast<int>(next()%5U);
    const std::array<int,7> scale{{0,2,3,5,7,8,10}};
    std::array<int,4> motif{{0,2,4,0}};
    for (std::size_t i=1;i<3;++i) motif[i]=static_cast<int>(next()%5U);
    const std::array<Tick,4> rhythm{{0,q+static_cast<Tick>(next()%3U)*q/4,2*q+q/2,3*q+q/4}};
    const std::array<Instrument,5> patches{{Instrument::piano,Instrument::guitar,Instrument::bass,Instrument::drums,Instrument::lead}};
    for (unsigned part=0;part<patches.size();++part) {
        if (!(instruments&(1U<<part))) continue;
        Track track{patches[part],part==3?-14.0:-13.0,part==0?-.15:part==1?.15:0,{}};
        for (int bar=0;bar<p.bars;++bar) {
            const Tick base=bar*bar_ticks;
            const bool ending=bar==p.bars-1,contrast=bar>=b && bar<c;
            const bool sparse=bar<a || contrast || ending;
            const int root=ending?0:std::array<int,4>{{0,5,3,0}}[static_cast<std::size_t>((bar/2+direction)%4)];
            const auto add=[&](Tick at,Tick duration,int pitch,int velocity,bool mute=false) {
                const Tick rest=(!ending && (bar+1==b || bar+1==c))?3*q:bar_ticks;
                if (at>=rest) return;
                duration=std::min(duration,rest-at);
                track.notes.push_back({base+at,duration,pitch,std::clamp(velocity+static_cast<int>(energy)*9,1,120),mute});
            };
            const int root_pitch=tonic+scale[static_cast<std::size_t>(root)];
            if (part==3) {
                add(0,q/4,36,72);
                if (!ending && !contrast) {
                    add(2*q,q/4,36,65);
                    if (!sparse && direction!=1) add(rhythm[1],q/4,36,58);
                    add(q,q/4,38,68); add(3*q,q/4,38,72);
                }
                for (int i=0;i<(ending?1:8);++i) {
                    if (sparse && i%2) continue;
                    add(i*q/2+(i%2?q/24:0),q/8,42,i%2?33:48);
                }
            } else if (part==2) {
                add(0,ending?3*q:q*3/4,root_pitch-24,70);
                if (!sparse) {
                    add(direction==1?2*q:rhythm[1],q/2,root_pitch-24,60);
                    add(rhythm[2],q/2,root_pitch-12,56);
                    if (bar%2) add(7*q/2,q/3,root_pitch-17,52);
                }
            } else {
                const bool answer=(part==1 || part==4) && (instruments&1U);
                if (answer && bar%2==0 && !ending) continue;
                const int count=ending?1:sparse?2:4;
                for (int i=0;i<count;++i) {
                    const bool developed=bar>=c && !ending;
                    int degree=ending?0:motif[static_cast<std::size_t>(i)];
                    if (developed && novelty>=50 && i==2) degree=(degree+2)%7;
                    if (contrast) degree=(degree+root)%7;
                    int pitch=tonic+scale[static_cast<std::size_t>(degree)];
                    if (part==1) pitch-=12;
                    if (part==4 && direction==1) pitch+=12;
                    const Tick at=ending?0:rhythm[static_cast<std::size_t>(i)]+(answer?q/4:0);
                    const Tick length=ending?3*q:energy==0?q:q/2;
                    add(at,length,pitch,ending?55:60-i*3,part==1 && energy==2 && i%2);
                    if (part==1 && i==0) add(at+24,length-24,std::min(79,pitch+7),45);
                }
            }
        }
        std::stable_sort(track.notes.begin(),track.notes.end(),[](const Note& x,const Note& y){return x.start<y.start;});
        p.tracks.push_back(std::move(track));
    }
    validate(p);
    return p;
}

void render_taste(const PerformancePlan& p, const std::string& prefix) {
    const auto schedule=compile(p);
    Renderer renderer(schedule);
    WavWriter wav(prefix+".wav",p.sample_rate,schedule.total_frames);
    std::array<float,1024> buffer{};
    while (!renderer.finished()) {
        const auto frames=renderer.process(buffer.data(),512);
        if (!frames) throw std::runtime_error("Renderer did not progress");
        wav.write(buffer.data(),frames);
    }
    wav.close();
    if (renderer.voice_overflows() || renderer.stats().nonfinite_samples || renderer.stats().limited_samples || renderer.stats().peak<.0001)
        throw std::runtime_error("Composition failed audio validation");
    write_score(p,prefix+".score.json");
    write_report(renderer.stats(),p,schedule,prefix+".report.json","Music DNA local preview");
}
}
