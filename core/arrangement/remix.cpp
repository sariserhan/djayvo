#include "djayvo/remix.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

namespace djayvo {
const char* strategy_name(Strategy s) {
    switch (s) {
    case Strategy::hiphop: return "hiphop";
    case Strategy::reggae: return "reggae";
    case Strategy::experimental: return "experimental";
    case Strategy::baseline: return "baseline";
    case Strategy::club: return "club";
    case Strategy::funk: return "funk";
    case Strategy::call_response: return "call_response";
    case Strategy::hybrid: return "hybrid";
    }
    throw std::invalid_argument("unknown strategy");
}
namespace {
Tick source_tick(std::uint64_t frame, const PerformancePlan& p) {
    const double tick = static_cast<double>(frame) * ticks_per_quarter * p.tempo_milli_bpm /
                        (static_cast<double>(p.sample_rate) * 60000.0);
    // Input rhythm becomes a reproducible sixteenth-note motif.
    return static_cast<Tick>(std::llround(tick / 240.0)) * 240;
}
std::uint64_t near_zero(const AudioBuffer& source, std::uint64_t frame) {
    const auto radius = source.sample_rate / 500U;
    const auto lo = frame > radius ? frame-radius : 0;
    const auto hi = std::min<std::uint64_t>(source.mono.size()-1,frame+radius);
    auto best = std::min<std::uint64_t>(frame,source.mono.size()-1);
    for (auto i = lo; i <= hi; ++i)
        if (std::abs(source.mono[static_cast<std::size_t>(i)]) < std::abs(source.mono[static_cast<std::size_t>(best)])) best=i;
    return best;
}
Region chop_region(const AudioBuffer& source, std::uint64_t onset, std::uint64_t limit, bool extended=false) {
    const auto hop=source.sample_rate/100U;
    const auto begin=near_zero(source,onset>hop?onset-hop:0);
    const auto stop=std::min<std::uint64_t>(limit,onset+(extended?90ULL:60ULL)*hop);
    double peak_power=0;
    unsigned quiet=0;
    for (auto frame=onset;frame+hop<=stop;frame+=hop) {
        double power=0;
        for (auto i=frame;i<frame+hop;++i) power+=static_cast<double>(source.mono[i])*source.mono[i];
        power/=hop;
        peak_power=std::max(peak_power,power);
        // Require a sustained energy valley, not a single waveform zero crossing.
        quiet=frame>=onset+12ULL*hop && peak_power>0 && power<peak_power*0.0225?quiet+1:0;
        if (quiet==2) return {begin,near_zero(source,frame-hop/2),0.65};
    }
    // shortcut: energy is not a word boundary; retain a bounded, lower-confidence
    // crop without a pause until semantic boundaries have listening evidence.
    return {begin,near_zero(source,std::min<std::uint64_t>(limit-1,begin+source.sample_rate*(extended?450ULL:250ULL)/1000U)),0.3};
}
}
RemixPlan make_remix(const AudioBuffer& source, const InputAnalysis& a, Strategy strategy,
                     std::uint32_t seed, bool synthetic, bool consent) {
    strategy_name(strategy);
    if (strategy==Strategy::baseline) return make_baseline(source,a,seed,synthetic,consent);
    if (source.sample_rate<8000 || source.sample_rate>192000 ||
        source.mono.size()<source.sample_rate*2ULL || source.mono.size()>source.sample_rate*5ULL ||
        a.phrases.empty() || a.phrases.size()>128 || a.onsets.size()>2048 ||
        !std::isfinite(a.pitch_hz) || a.pitch_hz<0 || a.pitch_hz>1000 ||
        !std::isfinite(a.pitch_confidence) || a.pitch_confidence<0 || a.pitch_confidence>1 || !std::isfinite(a.normalization_gain) ||
        a.normalization_gain <= 0 || a.normalization_gain > 4)
        throw std::invalid_argument("invalid source analysis");
    for (auto onset : a.onsets)
        if (onset >= source.mono.size()) throw std::invalid_argument("onset outside source");
    for (const auto& phrase : a.phrases)
        if (phrase.begin >= phrase.end || phrase.end > source.mono.size())
            throw std::invalid_argument("phrase outside source");
    RemixPlan r;
    r.strategy = strategy; r.source_sha256 = source.sha256;
    r.synthetic_source = synthetic; r.consent_confirmed = consent; r.analysis = a;
    auto& p = r.music;
    const bool club=strategy==Strategy::club;
    const bool funk=strategy==Strategy::funk;
    const bool dialogue=strategy==Strategy::call_response, hybrid=strategy==Strategy::hybrid;
    p.sample_rate=source.sample_rate; p.seed=seed;
    p.tempo_milli_bpm = strategy == Strategy::hiphop ? 96000U : strategy == Strategy::reggae ? 80000U : 124000U;
    p.bars = strategy == Strategy::hiphop ? 12 : strategy == Strategy::reggae ? 10 : 16;
    if (club) {p.tempo_milli_bpm=140000;p.bars=20;p.kick_duck_db=-7;}
    if (funk) {p.tempo_milli_bpm=std::array<std::uint32_t,3>{{108000,112000,116000}}[(seed/4U)%3U];p.bars=14;}
    if (dialogue || hybrid) {p.tempo_milli_bpm=std::array<std::uint32_t,3>{{108000,112000,116000}}[(seed/4U)%3U];p.bars=16;}
    const int late_break=(strategy==Strategy::reggae || strategy==Strategy::experimental)?static_cast<int>((seed>>2U)&1U):0;
    const int break_bar=club?10:p.bars-6+late_break, return_bar=club?14:p.bars-4+late_break;
    p.sections={{"intro",0,2},{"groove",2,break_bar-2},{"break",break_bar,2},
                {"return",return_bar,p.bars-1-return_bar},{"ending",p.bars-1,1}};
    if (club) p.sections={{"intro",0,2},{"build",2,4},{"drop",6,4},{"break",10,4},{"return",14,5},{"ending",19,1}};
    r.instrument_room_mix=strategy==Strategy::reggae?0.24:0.18;
    if (a.pitch_hz > 0 && a.pitch_confidence >= 0.65) {
        const int midi = static_cast<int>(std::llround(69 + 12*std::log2(a.pitch_hz/440)));
        r.tonic_midi = 60 + ((midi % 12 + 12) % 12);
    }
    // Entire source survives unpitched and forward. Edge fades are only 3 ms.
    r.clips.push_back({0,source.mono.size(),1.0});
    for (auto onset : a.onsets) {
        if (r.clips.size() >= 13) break;
        const auto clip=chop_region(source,onset,source.mono.size(),club);
        if (club) {
            if (clip.confidence<0.65) continue;
            const bool duplicate=std::any_of(r.clips.begin()+1,r.clips.end(),[&](const Region& other) {
                const auto begin=std::max(clip.begin,other.begin),end=std::min(clip.end,other.end);
                return end>begin && (end-begin)*2>=std::min(clip.end-clip.begin,other.end-other.begin);
            });
            if (duplicate) continue;
        }
        if (clip.end > clip.begin + source.sample_rate/25U) r.clips.push_back(clip);
    }
    if (r.clips.size() == 1) {
        for (const auto& phrase : a.phrases) {
            auto clip=chop_region(source,phrase.begin,phrase.end,club);
            clip.begin=phrase.begin;
            clip.end=std::clamp(clip.end,phrase.begin+1,phrase.end);
            r.clips.push_back(clip);
            if (r.clips.size() == 5) break;
        }
    }
    const Tick q = ticks_per_quarter, bar_ticks = ticks_per_bar(p);
    // The source can be a reveal, not always a spoken preamble. Rotate these
    // reproducibly across styles and seeds while keeping both clean hooks.
    const auto opening=(seed%3U+static_cast<unsigned>(strategy))%3U;
    r.vocals.push_back({opening==0?0:2*bar_ticks,0,-3,1,false,0,true});
    if (opening==2) {
        r.vocals.push_back({0,1,-8,1,false,-0.15,false});
        r.vocals.push_back({3*q/2,std::min<std::size_t>(2,r.clips.size()-1),-9,1,false,0.15,false});
    }
    std::uint32_t rng = seed ^ 0xd14e29a7U; if (!rng) rng=1;
    const auto velocity = [&rng](int base) {
        rng ^= rng<<13U; rng ^= rng>>17U; rng ^= rng<<5U;
        return std::clamp(base + static_cast<int>(rng % 11U)-5,1,127);
    };
    Track piano{Instrument::piano,-10,-0.20,{}};
    Track bass{Instrument::bass,-8,0,{}};
    Track drums{Instrument::drums,-9,0.08,{}};
    Track guitar{Instrument::guitar,-12,0.22,{}};
    Track pad{Instrument::pad,-17,-0.25,{}};
    Track lead{Instrument::lead,-16,0.22,{}};
    if (strategy==Strategy::reggae) piano.instrument=Instrument::organ;
    if (club) {
        piano.electronic=bass.electronic=drums.electronic=true;
        piano.gain_db=-12;piano.pan=-0.30;bass.gain_db=-7;drums.gain_db=-3;drums.pan=0;
        r.instrument_room_mix=.28;
    }
    // Choose a coherent phrase once; velocity draws must not change its harmony/rhythm.
    std::uint32_t composition=seed^0x83d2e7a1U;
    composition^=composition<<13U;composition^=composition>>17U;composition^=composition<<5U;
    const std::array<std::array<int,4>,4> hiphop_progressions{{
        {{0,-4,-7,0}},{{0,-7,-4,-2}},{{0,-2,-4,-7}},{{0,-4,-2,0}}}};
    const auto harmony=(composition>>4U)%4U,groove=seed%4U;
    const auto progression=hiphop_progressions[harmony];
    const std::array<std::array<int,4>,8> club_progressions{{
        {{0,0,-4,-4}},{{0,-7,-7,0}},{{0,-4,-2,-7}},{{0,-5,-7,-4}},
        {{0,-4,0,-7}},{{0,-7,-5,-4}},{{0,-2,-4,0}},{{0,-5,-4,-2}}}};
    const std::array<std::array<int,4>,4> funk_progressions{{
        {{0,0,-5,-5}},{{0,-7,0,-5}},{{0,-5,-4,-7}},{{0,-4,0,-7}}}};
    const std::array<std::array<int,6>,4> funk_steps{{
        {{0,3,6,8,11,14}},{{0,2,7,9,12,15}},{{0,3,5,8,10,14}},{{0,1,6,9,11,14}}}};
    const Tick swing=std::array<Tick,3>{{q/24,q/12,q/8}}[(composition>>20U)%3U];
    const Tick chord_length=std::array<Tick,4>{{3*q/2,q,2*q,3*q/4}}[groove];
    const Tick chord_reply=std::array<Tick,4>{{5*q/2,7*q/4,3*q,9*q/4}}[groove];
    const Tick kick_reply=std::array<Tick,4>{{9*q/4,7*q/4,11*q/4,3*q}}[groove];
    const Tick bass_pickup=std::array<Tick,4>{{7*q/4,3*q/2,9*q/4,5*q/4}}[groove];
    const Tick bass_reply=std::array<Tick,4>{{5*q/2,11*q/4,3*q,5*q/2}}[groove];
    std::array<int,3> previous_chord{{55,60,64}};
    std::vector<Tick> motif;
    for (auto onset : a.onsets) {
        const auto t = source_tick(onset,p) % bar_ticks;
        if (std::find(motif.begin(),motif.end(),t) == motif.end()) motif.push_back(t);
        if (motif.size() == 8) break;
    }
    if (motif.empty()) motif={0,3*q/2,5*q/2};
    std::sort(motif.begin(),motif.end());
    for (int b=club?0:opening==0?2:0; b<p.bars; ++b) {
        const Tick base=b*bar_ticks;
        const bool intro=b<2;
        const bool build=club && b>=2 && b<6;
        const bool breakdown=b>=break_bar && b<return_bar;
        const bool returning=b>=return_bar;
        const bool last=b==p.bars-1;
        // Hybrid changes grammar only at phrase boundaries, retaining key and clock.
        const auto chapter=b<6?0U:b<break_bar?1U:2U;
        const auto hybrid_groove=(seed%3U+chapter)%3U;
        const bool hiphop_bar=strategy==Strategy::hiphop || (hybrid && hybrid_groove==0);
        const bool funk_bar=funk || (hybrid && hybrid_groove==1);
        const bool reggae_bar=strategy==Strategy::reggae || (hybrid && hybrid_groove==2);
        const int phrase_start=strategy==Strategy::hiphop && returning?return_bar:2;
        const auto phrase_bar=static_cast<std::size_t>((std::max(phrase_start,b)-phrase_start)%4);
        const int step=last?0:club?club_progressions[(composition>>6U)%8U][static_cast<std::size_t>(b)%4]:funk?funk_progressions[harmony][phrase_bar]:progression[phrase_bar];
        const int root=r.tonic_midi+step;
        const bool major=step==-4 || step==-2;
        // Choose a nearby inversion so each chord voice moves a short distance.
        std::array<int,3> voicing{{root,root+(major?4:3),root+7}};
        int best_distance=1000;
        for (int inversion=0;inversion<3;++inversion) for (int octave=-1;octave<=1;++octave) {
            std::array<int,3> candidate{{root+12*octave,root+(major?4:3)+12*octave,root+7+12*octave}};
            for (int n=0;n<inversion;++n) candidate[static_cast<std::size_t>(n)]+=12;
            std::sort(candidate.begin(),candidate.end());
            if (candidate.front()<48 || candidate.back()>79) continue;
            int distance=0;
            for (std::size_t n=0;n<3;++n) distance+=std::abs(candidate[n]-previous_chord[n]);
            if (distance<best_distance) {best_distance=distance;voicing=candidate;}
        }
        previous_chord=voicing;
        auto chord = [&](Tick start,Tick duration,int strength) {
            for (std::size_t n=0;n<voicing.size();++n) {
                const bool strum=funk_bar && !intro && !breakdown;
                const Tick roll=static_cast<Tick>(n)*(strum?24:12);
                const auto string=strum && (static_cast<unsigned>(b)+seed)%2U?voicing.size()-1-n:n;
                auto& notes=strum?guitar.notes:club && (intro || build || breakdown)?pad.notes:piano.notes;
                notes.push_back({base+start+roll,duration-roll,voicing[string],velocity(strength+(n==2?4:-3)),strum && duration<=q/2});
            }
        };
        auto bass_note = [&](Tick start,Tick duration,int interval,int strength) {
            bass.notes.push_back({base+start,duration,root-24+interval,velocity(strength)});
        };
        auto drum = [&](Tick start,int pitch,int strength,Tick duration=240) {
            drums.notes.push_back({base+start,duration,pitch,velocity(strength)});
        };
        if (club && (intro || build || breakdown)) {
            if (b%2==0) chord(0,bar_ticks-q/4,breakdown?60:54);
            if (build && b>=4) {
                for (int h=0;h<(b==5?6:8);++h) drum(h*q/2,42,(h%2?38:50)+(b-4)*8,120);
                // Accelerate, then leave the last beat free of new hits before the drop.
                if (b==5) for (int h=0;h<3;++h) drum(2*q+h*q/4,38,60+h*12,120);
            }
            if (b==13) {drum(2*q,38,52);drum(3*q,42,56);drum(13*q/4,38,68,120);}
        } else if (club) {
            if (last) {chord(0,2*q,70);bass_note(0,2*q,0,100);drum(0,36,115);}
            else {
                if (b%2==0) chord(q/2,3*q/4,68);
                if (returning && b%2) chord(5*q/2,q/2,74);
                const bool answering=(b+static_cast<int>(seed%2U))%2!=0;
                bass_note(q/4,answering?q/2:q,0,118);
                bass_note(answering?3*q/2:5*q/4,answering?q/4:q/2,0,103);
                const Tick reply=9*q/4+motif[static_cast<std::size_t>(b)%motif.size()]%q/2;
                bass_note(reply,3*q/4,returning && b%2?7:0,112);
                drum(0,36,123,q/2);drum(std::array<Tick,4>{{7*q/4,13*q/4,3*q,5*q/4}}[(groove+static_cast<unsigned>(b%2))%4U],36,109,q/2);drum(2*q,38,118,q/2);
                for (int h=0;h<8;++h) drum(h*q/2+(h%2?q/24:0),h==7 && returning?46:42,h%2?54:72,120);
                if (returning && b%2) {drum(13*q/4,42,42,80);drum(15*q/4,42,48,80);}
            }
        } else if (intro || breakdown) {
            chord(0,3*q,intro?55:48);
            if (intro && b==1) drum(3*q,42,42,120);
        } else if (dialogue) {
            // Leave the voice its own floor; the answer starts after the whole call.
            if (last) {chord(0,2*q,70);bass_note(0,2*q,0,92);drum(0,36,98);}
            else {
                const auto bar_frame=tick_to_frame(base,p);
                const auto first_call=tick_to_frame(opening==0?0:2*bar_ticks,p);
                const auto second_call=tick_to_frame(break_bar*bar_ticks,p);
                const auto breath=source.sample_rate/5U;
                const bool full_call=(bar_frame>=first_call && bar_frame<first_call+source.mono.size()+breath) ||
                                     (bar_frame>=second_call && bar_frame<second_call+source.mono.size()+breath);
                bass_note(0,3*q/2,0,full_call?65:94);
                drum(0,36,full_call?65:102);drum(2*q,38,full_call?42:86);
                if (!full_call && b%2==1) {
                    chord(q/2,q/2,55);
                    for (std::size_t m=0;m<std::min<std::size_t>(motif.size(),4);++m) {
                        const auto offset=std::min<Tick>(3*q,motif[m]);
                        const auto note=voicing[(m+(returning?1U:0U)+groove)%3];
                        piano.notes.push_back({base+offset,q/3,note+(note<67?12:0),velocity(returning?80:72)});
                    }
                    bass_note(5*q/2,q/2,7,78);
                    for (int h=0;h<8;++h) drum(h*q/2+(h%2?swing:0),42,h%2?39:58,120);
                }
            }
        } else if (hiphop_bar) {
            chord(0,last?3*q:chord_length,76);
            if (!last) chord(chord_reply,q/2,returning?68:60);
            bass_note(0,last?3*q:3*q/4,0,102);
            if (!last) { bass_note(bass_pickup,q/2,7,80); bass_note(bass_reply,q,returning && b%2?7:12,87); }
            drum(0,36,110); if (!last) drum(kick_reply+(returning && b%2?q/4:0),36,92);
            if (!last) { drum(q,38,100); drum(3*q,38,106); }
            if (!last) {
                for (int h=0;h<8;++h)
                    if (groove!=3 || returning || h%4!=1) drum(h*q/2+(h%2?swing:0),42,h%2?48:70,120);
                if (returning && b%2) {drum(13*q/4,42,42,120);drum(15*q/4,42,50,120);}
            }
        } else if (funk_bar) {
            if (last) {chord(0,2*q,76);bass_note(0,2*q,0,100);drum(0,36,108);}
            else {
                const auto& steps=funk_steps[groove];
                const std::array<int,6> intervals{{0,12,7,0,major?4:3,7}};
                for (std::size_t n=0;n<steps.size();++n) {
                    const Tick position=steps[n]*q/4;
                    bass_note(position,n==0?q/3:q/6,intervals[(n+(returning && b%2?3U:0U))%6],n==0?106:n%2?81:94);
                    if (n==0 || n==2 || n==3) drum(position,36,n==0?110:94,q/4);
                }
                chord((groove%2?3:2)*q/4,q/5,71);
                chord((groove%2?10:11)*q/4,q/5,64);
                if (returning && b%2) chord(7*q/2,q/5,76);
                drum(q,38,103);drum(3*q,38,108);
                drum((b%2?11:7)*q/4,38,38,q/8);
                for (int h=0;h<16;++h) {
                    if (h%4==3 && !returning) continue;
                    drum(h*q/4+(h%2?q/48:0),h==14 && returning?46:42,h%4==0?65:h%2?37:52,q/8);
                }
            }
        } else if (reggae_bar) {
            if (last) chord(0,3*q,77);
            else for (int beat=0;beat<4;++beat)
                if (returning || groove!=1 || beat!=1) chord(beat*q+q/2,q/5,beat%2?69:77);
            bass_note(0,last?3*q:q/2,0,101);
            if (!last) { bass_note(std::array<Tick,4>{{3*q/2,5*q/4,7*q/4,q/2}}[groove],q/2,7,87); bass_note(std::array<Tick,4>{{11*q/4,5*q/2,3*q,13*q/4}}[groove],3*q/4,12,93); }
            if (!last) { drum(2*q,36,112); drum(2*q,38,91); }
            else drum(0,36,105);
            if (!breakdown && !last)
                for (int h=0;h<8;++h) drum(h*q/2, h==7?46:42,h%2?74:48,120);
        } else {
            if (last) chord(0,3*q,80);
            else { chord(std::array<Tick,4>{{q/2,3*q/4,q,5*q/4}}[groove],q,68); if (returning) chord(std::array<Tick,4>{{3*q,11*q/4,5*q/2,13*q/4}}[groove],q/2,58); }
            bass_note(0,last?3*q:5*q/4,0,108);
            if (!last) bass_note(std::array<Tick,4>{{11*q/4,5*q/2,3*q,9*q/4}}[groove],3*q/4,returning?7:0,88);
            drum(0,36,113);
            if (!last) { drum(std::array<Tick,4>{{7*q/4,13*q/4,3*q,5*q/4}}[(groove+(returning?1U:0U))%4U],36,98); drum(2*q,38,107); }
            if (!last)
                for (int h=0;h<8;++h) if (returning || h%2==0) drum(h*q/2,42,h%2?45:72,120);
        }
        if (!intro && !build && !breakdown && !last && (b+1==break_bar || b+1==p.bars-1)) {
            drum(7*q/2,38,56); drum(15*q/4,38,72);
        }
        if (!club && returning && !last && b%2==static_cast<int>(seed%2U)) drum(7*q/2,46,60,q/4);
        // Phrase-derived call/response, not a continuous voice-over backing loop.
        if (b>=2 && !build && !breakdown && !last && b%2==0) {
            const std::size_t count=std::min<std::size_t>(motif.size(),dialogue?1:returning && !club?3:2);
            for (std::size_t m=0;m<count;++m) {
                const auto clip=1+(m+static_cast<std::size_t>(b))%(r.clips.size()-1);
                Tick offset=motif[m%motif.size()];
                if (reggae_bar) offset=(offset/q)*q+q/2;
                if (strategy==Strategy::experimental) offset=(static_cast<Tick>(m)*3*q/4)%bar_ticks;
                if (club) offset=(m?11*q/4:3*q/4);
                if (funk_bar) offset=std::min<Tick>(3*q,offset);
                if (dialogue) offset=std::min<Tick>(q,offset);
                r.vocals.push_back({base+offset,clip,club?-5.0:-7.0,1,false,
                                    m%2?0.25:-0.25,false});
            }
        }
        if (b==break_bar) r.vocals.push_back({base,0,-4,1,false,0,true});
        // Input rhythm also determines melodic response on alternating bars.
        if (!club && !dialogue && !intro && !breakdown && !last && b%2==1) {
            for (std::size_t m=0;m<std::min<std::size_t>(motif.size(),2);++m) {
                const int note=voicing[(m+(returning?1U:0U))%3];
                auto& response=strategy==Strategy::experimental?lead.notes:piano.notes;
                response.push_back({base+(funk_bar?std::min<Tick>(3*q,motif[m]):motif[m]),funk_bar?q/4:3*q/4,
                                      note+(note<67?12:0),velocity(65)});
            }
        }
    }
    // Quantization can collapse several source onsets onto the same offbeat.
    // Keep the first call there, and reserve the complete clean-hook intervals
    // before choosing chops (long inputs can extend beyond their starting bar).
    const auto interval = [&](const VocalEvent& event) {
        const auto& clip=r.clips[event.clip];
        const auto start=tick_to_frame(event.start,p);
        const auto length=static_cast<std::uint64_t>(std::ceil(static_cast<double>(clip.end-clip.begin)/event.rate));
        return std::make_pair(start,start+length);
    };
    std::vector<std::pair<std::uint64_t,std::uint64_t>> clean_intervals;
    for (const auto& event:r.vocals)
        if (event.clean) clean_intervals.push_back(interval(event));
    std::vector<VocalEvent> spaced;
    std::vector<std::pair<std::uint64_t,std::uint64_t>> chop_intervals;
    const auto breath=source.sample_rate*80ULL/1000;
    for (const auto& event:r.vocals) {
        const auto span=interval(event);
        if (!event.clean) {
            if (std::any_of(chop_intervals.begin(),chop_intervals.end(),[&](const auto& chop) {
                return span.first<chop.second+breath && chop.first<span.second+breath;
            })) continue;
            if (std::any_of(clean_intervals.begin(),clean_intervals.end(),[&](const auto& clean) {
                return span.first<clean.second+breath && clean.first<span.second+breath;
            })) continue;
            chop_intervals.push_back(span);
        }
        spaced.push_back(event);
    }
    r.vocals=std::move(spaced);
    p.tracks={piano,bass,drums};
    if (!guitar.notes.empty()) p.tracks.push_back(std::move(guitar));
    if (!pad.notes.empty()) p.tracks.push_back(std::move(pad));
    if (!lead.notes.empty()) p.tracks.push_back(std::move(lead));
    validate(r,source);
    return r;
}
RemixPlan make_baseline(const AudioBuffer& source,const InputAnalysis& a,std::uint32_t seed,bool synthetic,bool consent) {
    auto r=make_remix(source,a,Strategy::hiphop,seed,synthetic,consent);
    r.strategy=Strategy::baseline;r.tonic_midi=57;r.instrument_room_mix=0;
    auto loop=make_demo(0); // fixed original four-bar loop, independent of input and requested seed
    r.music=loop;r.music.seed=seed;r.music.sample_rate=source.sample_rate;r.music.tempo_milli_bpm=96000;
    r.music.bars=12;r.music.sections={{"intro",0,2},{"groove",2,8},{"ending",10,2}};
    for (auto& track:r.music.tracks) {
        const auto notes=track.notes;track.notes.clear();
        for (int repeat=0;repeat<3;++repeat)
            for (auto note:notes) {note.start+=repeat*4*ticks_per_bar(r.music);track.notes.push_back(note);}
    }
    r.vocals.clear();
    for (int bar:{0,4,8}) r.vocals.push_back({bar*ticks_per_bar(r.music),0,-3,1,false,0,true});
    validate(r,source);return r;
}
} // namespace djayvo
