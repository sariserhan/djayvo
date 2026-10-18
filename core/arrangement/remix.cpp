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
    p.sample_rate=source.sample_rate; p.seed=seed;
    p.tempo_milli_bpm = strategy == Strategy::hiphop ? 96000U : strategy == Strategy::reggae ? 80000U : 124000U;
    p.bars = strategy == Strategy::hiphop ? 12 : strategy == Strategy::reggae ? 10 : 16;
    // End two bars early: full clean hook, progressively busier motif, break, ending.
    p.sections={{"intro",0,2},{"groove",2,p.bars-6},{"break",p.bars-4,2},{"finale",p.bars-2,2}};
    if (a.pitch_hz > 0 && a.pitch_confidence >= 0.65) {
        const int midi = static_cast<int>(std::llround(69 + 12*std::log2(a.pitch_hz/440)));
        r.tonic_midi = 60 + ((midi % 12 + 12) % 12);
    }
    // Entire source survives unpitched and forward. Edge fades are only 3 ms.
    r.clips.push_back({0,source.mono.size(),1.0});
    const auto chop_length = source.sample_rate / 4U;
    for (auto onset : a.onsets) {
        if (r.clips.size() >= 13) break;
        const auto begin = near_zero(source,onset);
        const auto end = near_zero(source,std::min<std::uint64_t>(source.mono.size()-1,begin+chop_length));
        if (end > begin + source.sample_rate/25U) r.clips.push_back({begin,end,0.6});
    }
    if (r.clips.size() == 1) {
        for (const auto& phrase : a.phrases) {
            r.clips.push_back({phrase.begin,std::min<std::uint64_t>(phrase.end,phrase.begin+chop_length),phrase.confidence});
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
        return base + static_cast<int>(rng % 11U)-5;
    };
    Track piano{Instrument::piano,-13,-0.28,{}};
    Track bass{Instrument::bass,-10,0,{}};
    Track drums{Instrument::drums,-13,0.18,{}};
    const std::array<int,4> progression{{0,-4,-7,0}}; // i, VI, iv, i in minor
    const std::array<int,7> minor{{0,2,3,5,7,8,10}};
    std::vector<Tick> motif;
    for (auto onset : a.onsets) {
        const auto t = source_tick(onset,p) % bar_ticks;
        if (std::find(motif.begin(),motif.end(),t) == motif.end()) motif.push_back(t);
        if (motif.size() == 8) break;
    }
    if (motif.empty()) motif={0,3*q/2,5*q/2};
    std::sort(motif.begin(),motif.end());
    for (int b=opening==0?2:0; b<p.bars; ++b) {
        const Tick base=b*bar_ticks;
        const bool breakdown=b>=p.bars-4 && b<p.bars-2;
        const bool last=b==p.bars-1;
        const int step=progression[static_cast<std::size_t>((std::max(2,b)-2)%4)];
        const int root=r.tonic_midi+step;
        const bool major=step==-4;
        auto chord = [&](Tick start,Tick duration,int strength) {
            for (int n : {root,root+(major?4:3),root+7,root+(major?11:10)})
                piano.notes.push_back({base+start,duration,n,velocity(strength)});
        };
        auto bass_note = [&](Tick start,Tick duration,int interval,int strength) {
            bass.notes.push_back({base+start,duration,root-24+interval,velocity(strength)});
        };
        auto drum = [&](Tick start,int pitch,int strength,Tick duration=240) {
            drums.notes.push_back({base+start,duration,pitch,velocity(strength)});
        };
        if (strategy==Strategy::hiphop) {
            chord(0,last?3*q:3*q/2,76);
            if (!breakdown && !last) chord(5*q/2,q/2,60);
            bass_note(0,last?3*q:3*q/4,0,102);
            if (!last && !breakdown) { bass_note(7*q/4,q/2,7,80); bass_note(5*q/2,q,12,87); }
            drum(0,36,110); if (!last) drum(9*q/4,36,92);
            if (!last) { drum(q,38,100); drum(3*q,38,106); }
            if (!breakdown && !last)
                for (int h=0;h<8;++h) drum(h*q/2+(h%2?q/12:0),42,h%2?48:70,120);
        } else if (strategy==Strategy::reggae) {
            if (last) chord(0,3*q,77);
            else for (int beat=0;beat<4;++beat) chord(beat*q+q/2,q/5,beat%2?69:77);
            bass_note(0,last?3*q:q/2,0,101);
            if (!last) { bass_note(3*q/2,q/2,7,87); bass_note(11*q/4,3*q/4,12,93); }
            if (!last) { drum(2*q,36,112); drum(2*q,38,91); }
            else drum(0,36,105);
            if (!breakdown && !last)
                for (int h=0;h<8;++h) drum(h*q/2, h==7?46:42,h%2?74:48,120);
        } else {
            if (last) chord(0,3*q,80);
            else if (!breakdown) {
                for (int n=0;n<4;++n) {
                    const int interval=minor[static_cast<std::size_t>((n*2+b)%7)];
                    piano.notes.push_back({base+n*q,3*q/4,r.tonic_midi+interval,velocity(n%3?64:83)});
                }
            }
            bass_note(0,last?3*q:q/3,0,108);
            if (!last && !breakdown)
                for (int n : {3,6,10,13}) bass_note(n*q/4,q/4,n%2?12:7,85);
            drum(0,36,113);
            if (!last && !breakdown) { drum(7*q/4,36,98); drum(5*q/2,38,107); }
            if (!last && !breakdown)
                for (int h=0;h<16;++h) if ((h+b)%3) drum(h*q/4,42,h%4?45:79,90);
        }
        // Phrase-derived call/response, not a continuous voice-over backing loop.
        if (b>=2 && !last && b%2==0) {
            const std::size_t count=breakdown?2:std::min<std::size_t>(motif.size(),strategy==Strategy::experimental?4:3);
            for (std::size_t m=0;m<count;++m) {
                const auto clip=1+(m+static_cast<std::size_t>(b))%(r.clips.size()-1);
                Tick offset=motif[m%motif.size()];
                if (strategy==Strategy::reggae) offset=(offset/q)*q+q/2;
                if (strategy==Strategy::experimental) offset=(static_cast<Tick>(m)*3*q/4)%bar_ticks;
                const double rate=strategy==Strategy::experimental ? (m%3==0?0.9438743127:m%3==1?1.0594630944:1.0) : 1.0;
                r.vocals.push_back({base+offset,clip,-7,rate,false,
                                    m%2?0.25:-0.25,false});
            }
        }
        if (b==p.bars-3) r.vocals.push_back({base,0,-4,1,false,0,true});
        // Input rhythm also determines melodic response on alternating bars.
        if (!breakdown && !last && b%2==1) {
            for (std::size_t m=0;m<std::min<std::size_t>(motif.size(),4);++m)
                piano.notes.push_back({base+motif[m],q/2,r.tonic_midi+12+minor[(m+static_cast<std::size_t>(b))%7],velocity(71)});
        }
    }
    // Quantization can collapse several source onsets onto the same offbeat.
    // Keep the first call there, and reserve the complete clean-hook intervals
    // before choosing chops (long inputs can extend beyond their starting bar).
    const auto interval = [&](const VocalEvent& event) {
        const auto& clip=r.clips[event.clip];
        const auto start=tick_to_frame(event.start,p.sample_rate,p.tempo_milli_bpm);
        const auto length=static_cast<std::uint64_t>(std::ceil(static_cast<double>(clip.end-clip.begin)/event.rate));
        return std::make_pair(start,start+length);
    };
    std::vector<std::pair<std::uint64_t,std::uint64_t>> clean_intervals;
    for (const auto& event:r.vocals)
        if (event.clean) clean_intervals.push_back(interval(event));
    std::vector<VocalEvent> spaced;
    std::vector<std::uint64_t> chop_starts;
    for (const auto& event:r.vocals) {
        const auto span=interval(event);
        if (!event.clean) {
            if (std::find(chop_starts.begin(),chop_starts.end(),span.first)!=chop_starts.end()) continue;
            if (std::any_of(clean_intervals.begin(),clean_intervals.end(),[&](const auto& clean) {
                return span.first<clean.second && clean.first<span.second;
            })) continue;
            chop_starts.push_back(span.first);
        }
        spaced.push_back(event);
    }
    r.vocals=std::move(spaced);
    p.tracks={piano,bass,drums};
    validate(r,source);
    return r;
}
RemixPlan make_baseline(const AudioBuffer& source,const InputAnalysis& a,std::uint32_t seed,bool synthetic,bool consent) {
    auto r=make_remix(source,a,Strategy::hiphop,seed,synthetic,consent);
    r.strategy=Strategy::baseline;r.tonic_midi=57;
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
