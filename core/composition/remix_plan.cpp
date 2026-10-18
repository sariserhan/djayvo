#include "djayvo/remix.h"
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <locale>
#include <stdexcept>

namespace djayvo {
std::uint64_t vocal_frames(const VocalEvent& e,const Region& clip) {
    return static_cast<std::uint64_t>(std::ceil(static_cast<double>(clip.end-clip.begin)*e.time_stretch/e.rate));
}
void validate(const RemixPlan& r, const AudioBuffer& source) {
    validate(r.music); strategy_name(r.strategy);
    if (!r.synthetic_source && !r.consent_confirmed)
        throw std::invalid_argument("recorded input requires explicit consent to process");
    if (source.sample_rate != r.music.sample_rate || source.mono.empty() ||
        source.mono.size() < static_cast<std::size_t>(source.sample_rate) * 2 ||
        source.mono.size() > static_cast<std::size_t>(source.sample_rate) * 5 ||
        source.sha256.size() != 64 || source.sha256.find_first_not_of("0123456789abcdef") != std::string::npos ||
        r.source_sha256 != source.sha256)
        throw std::invalid_argument("source must be 2..5 seconds and match its plan hash/rate");
    for (float x : source.mono)
        if (!std::isfinite(x) || std::abs(x)>1) throw std::invalid_argument("invalid source PCM");
    if (!std::isfinite(r.analysis.normalization_gain) || r.analysis.normalization_gain <= 0 ||
        r.analysis.normalization_gain > 4 || r.tonic_midi < 48 || r.tonic_midi > 71 ||
        !std::isfinite(r.instrument_room_mix) || r.instrument_room_mix<0 || r.instrument_room_mix>0.35 ||
        r.clips.empty() || r.clips.size()>64 || r.vocals.empty() || r.vocals.size()>1024)
        throw std::invalid_argument("invalid clip/event/analysis limits");
    if (!std::isfinite(r.analysis.peak) || !std::isfinite(r.analysis.rms) ||
        !std::isfinite(r.analysis.pitch_hz) || !std::isfinite(r.analysis.pitch_confidence) ||
        r.analysis.peak<=0 || r.analysis.peak>1 || r.analysis.rms<=0 || r.analysis.rms>1 ||
        r.analysis.pitch_hz<0 || r.analysis.pitch_hz>1000 || r.analysis.pitch_confidence<0 || r.analysis.pitch_confidence>1 ||
        r.analysis.onsets.size()>2048 || r.analysis.phrases.empty() || r.analysis.phrases.size()>128)
        throw std::invalid_argument("invalid analysis features");
    for (auto onset:r.analysis.onsets)
        if (onset>=source.mono.size()) throw std::invalid_argument("analysis onset outside source");
    for (const auto& phrase:r.analysis.phrases)
        if (phrase.begin>=phrase.end || phrase.end>source.mono.size() || !std::isfinite(phrase.confidence) ||
            phrase.confidence<0 || phrase.confidence>1) throw std::invalid_argument("analysis phrase outside source");
    for (const auto& clip : r.clips)
        if (clip.begin >= clip.end || clip.end > source.mono.size() ||
            !std::isfinite(clip.confidence) || clip.confidence<0 || clip.confidence>1)
            throw std::invalid_argument("clip exceeds source bounds");
    const auto music_end=tick_to_frame(ticks_per_bar(r.music)*r.music.bars,source.sample_rate,r.music.tempo_milli_bpm);
    const auto total=music_end+static_cast<std::uint64_t>(r.music.tail_ms)*source.sample_rate/1000;
    if (total < source.sample_rate*20ULL || total > source.sample_rate*40ULL)
        throw std::invalid_argument("remix must be 20..40 seconds");
    bool clean=false;
    std::uint64_t transformed_frames=0;
    unsigned transformed_events=0;
    std::vector<std::pair<std::uint64_t,int>> occupancy;
    for (const auto& e : r.vocals) {
        if (e.start<0 || e.start>=ticks_per_bar(r.music)*r.music.bars || e.clip>=r.clips.size() ||
            !std::isfinite(e.gain_db) || e.gain_db < -30 || e.gain_db>0 ||
            !std::isfinite(e.pan) || std::abs(e.pan)>1 || !std::isfinite(e.rate) || e.rate<0.5 || e.rate>2 ||
            !std::isfinite(e.pitch_semitones) || std::abs(e.pitch_semitones)>4 ||
            !std::isfinite(e.time_stretch) || e.time_stretch<0.8 || e.time_stretch>1.25)
            throw std::invalid_argument("invalid vocal event");
        const auto& clip=r.clips[e.clip];
        const auto begin=tick_to_frame(e.start,source.sample_rate,r.music.tempo_milli_bpm);
        const auto frames=vocal_frames(e,clip);
        if (e.pitch_semitones!=0 || e.time_stretch!=1) {
            transformed_frames+=frames;
            if (e.rate!=1 || clip.end-clip.begin<source.sample_rate*80ULL/1000 ||
                ++transformed_events>32 || transformed_frames>source.sample_rate*20ULL)
                throw std::invalid_argument("independent voice transform exceeds rate/crop/work budget");
        }
        if (frames>music_end || begin>music_end-frames)
            throw std::invalid_argument("vocal event runs beyond music boundary");
        if (e.clean) {
            if (e.rate!=1 || e.pitch_semitones!=0 || e.time_stretch!=1 || e.reverse || e.pan!=0 || clip.end-clip.begin < source.sample_rate/2)
                throw std::invalid_argument("clean hook must be forward, unpitched, centered and >=500 ms");
            clean=true;
        }
        occupancy.emplace_back(begin,1); occupancy.emplace_back(begin+frames,-1);
    }
    if (!clean) throw std::invalid_argument("at least one clean recognizable hook is required");
    std::sort(occupancy.begin(),occupancy.end()); int voices=0;
    for (const auto& boundary : occupancy) {
        voices+=boundary.second;
        if (voices>16) throw std::invalid_argument("more than 16 overlapping sample voices");
    }
    const auto schedule=compile(r.music); // instrument event budget / polyphony / release coverage
    if (r.instrument_room_mix>0) {
        const auto room_tail=static_cast<std::uint64_t>(source.sample_rate)*213/1000+1;
        for (const auto& e:schedule.events) if (e.kind==EventKind::note_off)
            if (e.frame+release_frames(e.instrument,source.sample_rate)+room_tail>schedule.total_frames)
                throw std::invalid_argument("tail truncates instrument room reflections");
    }
}

void write_score(const RemixPlan& r, const AudioBuffer& source, const std::string& path) {
    validate(r,source);
    std::ofstream out(path); out.imbue(std::locale::classic()); out<<std::setprecision(17);
    const auto& p=r.music;
    const bool transforms=std::any_of(r.vocals.begin(),r.vocals.end(),[](const VocalEvent& e){
        return e.pitch_semitones!=0 || e.time_stretch!=1;
    });
    out<<"{\n  \"schema_version\": \""<<(transforms?"1.1-remix":"1.0-remix")<<"\",\n  \"seed\": "<<p.seed
       <<",\n  \"source_asset_id\": \"sha256:"<<source.sha256<<"\",\n  \"sample_rate\": "<<p.sample_rate
       <<",\n  \"source\": {\"sha256\": \""<<source.sha256<<"\", \"original_rate\": "<<source.original_rate
       <<", \"original_frames\": "<<source.original_frames<<", \"processed_frames\": "<<source.mono.size()
       <<", \"kind\": \""<<(r.synthetic_source?"synthetic":"recorded")
       <<"\", \"consent_confirmed\": "<<(r.consent_confirmed?"true":"false")<<"},\n"
       <<"  \"tempo_milli_bpm\": "<<p.tempo_milli_bpm<<",\n  \"ticks_per_quarter\": 960,\n"
       <<"  \"time_signature\": ["<<p.numerator<<", "<<p.denominator<<"],\n  \"target_bars\": "<<p.bars
       <<",\n  \"tail_ms\": "<<p.tail_ms<<",\n  \"strategy\": \""<<strategy_name(r.strategy)
       <<"\",\n  \"key\": {\"tonic_midi\": "<<r.tonic_midi<<", \"mode\": \"minor\"},\n"
       <<"  \"mix\": {\"master_target_peak_dbfs\": "<<p.ceiling_dbfs
       <<", \"clean_hook_instrument_duck_db\": -16.4781748189, \"instrument_room_mix\": "<<r.instrument_room_mix;
    if (p.kick_duck_db!=0) out<<", \"kick_duck_db\": "<<p.kick_duck_db;
    out<<"},\n  \"analysis\": {\"peak\": "<<r.analysis.peak<<", \"rms\": "<<r.analysis.rms
       <<", \"normalization_gain\": "<<r.analysis.normalization_gain
       <<", \"pitch_hz\": "<<r.analysis.pitch_hz<<", \"pitch_confidence\": "<<r.analysis.pitch_confidence
       <<", \"onsets\": [";
    for (std::size_t i=0;i<r.analysis.onsets.size();++i) out<<(i?", ":"")<<r.analysis.onsets[i];
    out<<"], \"phrases\": [";
    for (std::size_t i=0;i<r.analysis.phrases.size();++i) {
        const auto& a=r.analysis.phrases[i];
        out<<(i?", ":"")<<"{\"start_frame\": "<<a.begin<<", \"end_frame\": "<<a.end<<", \"confidence\": "<<a.confidence<<"}";
    }
    out<<"]},\n  \"sections\": [";
    for (std::size_t i=0;i<p.sections.size();++i) {
        const auto& s=p.sections[i];
        out<<(i?",":"")<<"\n    {\"name\": \""<<s.name<<"\", \"start_bar\": "<<s.start_bar<<", \"bars\": "<<s.bars<<"}";
    }
    out<<"\n  ],\n  \"voice_clips\": [";
    for (std::size_t i=0;i<r.clips.size();++i) {
        const auto& c=r.clips[i];
        out<<(i?",":"")<<"\n    {\"id\": "<<i<<", \"start_frame\": "<<c.begin
           <<", \"end_frame\": "<<c.end<<", \"confidence\": "<<c.confidence<<"}";
    }
    out<<"\n  ],\n  \"voice_events\": [";
    for (std::size_t i=0;i<r.vocals.size();++i) {
        const auto& e=r.vocals[i];
        out<<(i?",":"")<<"\n    {\"start_tick\": "<<e.start<<", \"clip_id\": "<<e.clip
           <<", \"gain_db\": "<<e.gain_db<<", \"rate\": "<<e.rate<<", \"reverse\": "<<(e.reverse?"true":"false")
           <<", \"pan\": "<<e.pan<<", \"clean\": "<<(e.clean?"true":"false");
        if (e.pitch_semitones!=0 || e.time_stretch!=1)
            out<<", \"pitch_semitones\": "<<e.pitch_semitones<<", \"time_stretch\": "<<e.time_stretch;
        out<<"}";
    }
    out<<"\n  ],\n  \"tracks\": [";
    for (std::size_t i=0;i<p.tracks.size();++i) {
        const auto& t=p.tracks[i];
        out<<(i?",":"")<<"\n    {\"instrument\": \""<<instrument_name(t.instrument)<<"\", \"gain_db\": "<<t.gain_db
           <<", \"pan\": "<<t.pan;
        if (t.electronic) out<<", \"sound\": \"electronic\"";
        out<<", \"events\": [";
        for (std::size_t j=0;j<t.notes.size();++j) {
            const auto& n=t.notes[j];
            out<<(j?",":"")<<"\n      {\"start_tick\": "<<n.start<<", \"duration_ticks\": "<<n.duration
               <<", \"note\": "<<n.pitch<<", \"velocity\": "<<n.velocity<<"}";
        }
        out<<"\n    ]}";
    }
    out<<"\n  ]\n}\n"; out.flush();
    if (!out) throw std::runtime_error("cannot write remix score");
}
} // namespace djayvo
