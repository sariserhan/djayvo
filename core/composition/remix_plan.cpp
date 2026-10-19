#include "djayvo/remix.h"
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <locale>
#include <stdexcept>

namespace djayvo {
bool in_key(int pitch, int tonic, KeyMode mode) {
    if (mode!=KeyMode::minor && mode!=KeyMode::major) throw std::invalid_argument("unsupported key mode");
    const int degree=(pitch%12-tonic%12+24)%12;
    const bool major=mode==KeyMode::major;
    return degree==0 || degree==2 || degree==(major?4:3) || degree==5 || degree==7 ||
           degree==(major?9:8) || degree==(major?11:10);
}
std::uint64_t vocal_frames(const VocalEvent& e,const Region& clip) {
    return static_cast<std::uint64_t>(std::ceil(static_cast<double>(clip.end-clip.begin)*e.time_stretch/e.rate));
}
void validate(const RemixPlan& r, const AudioBuffer& source) {
    validate(r.music); strategy_name(r.strategy);
    in_key(r.tonic_midi,r.tonic_midi,r.key_mode);
    if (r.key_mode==KeyMode::major) for (const auto& track:r.music.tracks) for (const auto& note:track.notes)
        if (track.instrument!=Instrument::drums && note.duration>ticks_per_quarter/2 && !in_key(note.pitch,r.tonic_midi,r.key_mode))
            throw std::invalid_argument("sustained note conflicts with declared major key");
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
        !std::isfinite(r.instrument_reverb_mix) || r.instrument_reverb_mix<0 || r.instrument_reverb_mix>0.25 ||
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
    const auto music_end=tick_to_frame(ticks_per_bar(r.music)*r.music.bars,r.music);
    const auto total=music_end+static_cast<std::uint64_t>(r.music.tail_ms)*source.sample_rate/1000;
    if (total < source.sample_rate*20ULL || total > source.sample_rate*40ULL)
        throw std::invalid_argument("remix must be 20..40 seconds");
    bool clean=false;
    std::uint64_t transformed_frames=0;
    unsigned transformed_events=0;
    std::vector<std::pair<std::uint64_t,int>> occupancy;
    std::vector<std::pair<std::uint64_t,std::uint64_t>> hooks,echoes;
    for (const auto& e : r.vocals) {
        if (e.start<0 || e.start>=ticks_per_bar(r.music)*r.music.bars || e.clip>=r.clips.size() ||
            !std::isfinite(e.gain_db) || e.gain_db < -30 || e.gain_db>0 ||
            !std::isfinite(e.pan) || std::abs(e.pan)>1 || !std::isfinite(e.rate) || e.rate<0.5 || e.rate>2 ||
            !std::isfinite(e.pitch_semitones) || std::abs(e.pitch_semitones)>4 ||
            !std::isfinite(e.time_stretch) || e.time_stretch<0.8 || e.time_stretch>1.25 ||
            (e.echo_ticks!=0 && (e.echo_ticks<120 || e.echo_ticks>960)) ||
            !std::isfinite(e.echo_gain_db) || e.echo_gain_db< -24 || e.echo_gain_db> -6)
            throw std::invalid_argument("invalid vocal event");
        const auto& clip=r.clips[e.clip];
        const auto begin=tick_to_frame(e.start,r.music);
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
            if (e.rate!=1 || e.pitch_semitones!=0 || e.time_stretch!=1 || e.echo_ticks!=0 || e.reverse || e.pan!=0 || clip.end-clip.begin < source.sample_rate/2)
                throw std::invalid_argument("clean hook must be forward, unpitched, centered and >=500 ms");
            clean=true;
            hooks.emplace_back(begin,begin+frames);
        }
        occupancy.emplace_back(begin,1); occupancy.emplace_back(begin+frames,-1);
        if (e.echo_ticks) for (int repeat=1;repeat<=3;++repeat) {
            const auto start=tick_to_frame(e.start+repeat*e.echo_ticks,r.music);
            if (start+frames+source.sample_rate/10>total)
                throw std::invalid_argument("tail truncates vocal echo");
            echoes.emplace_back(start,start+frames);
            occupancy.emplace_back(start,1);occupancy.emplace_back(start+frames,-1);
        }
    }
    if (!clean) throw std::invalid_argument("at least one clean recognizable hook is required");
    if (occupancy.size()>2048) throw std::invalid_argument("compiled vocal trigger budget exceeded");
    const auto breath=source.sample_rate*80ULL/1000;
    for (const auto& echo:echoes) for (const auto& hook:hooks)
        if (echo.second+breath>hook.first && echo.first<hook.second+breath)
            throw std::invalid_argument("vocal echo overlaps clean hook clearance");
    std::sort(occupancy.begin(),occupancy.end()); int voices=0;
    for (const auto& boundary : occupancy) {
        voices+=boundary.second;
        if (voices>16) throw std::invalid_argument("more than 16 overlapping sample voices");
    }
    const auto schedule=compile(r.music); // instrument event budget / polyphony / release coverage
    if (r.instrument_reverb_mix>0) {
        for (const auto& e:schedule.events) if (e.kind==EventKind::note_off)
            if (e.frame+release_frames(e.instrument,source.sample_rate)+source.sample_rate*1600ULL/1000>schedule.total_frames)
                throw std::invalid_argument("tail truncates instrument reverb");
    }
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
    const bool echoes=std::any_of(r.vocals.begin(),r.vocals.end(),[](const VocalEvent& e){return e.echo_ticks!=0;});
    const bool sustained=std::any_of(p.tracks.begin(),p.tracks.end(),[](const Track& t){return t.instrument>=Instrument::organ;});
    const bool guitar=std::any_of(p.tracks.begin(),p.tracks.end(),[](const Track& t){return t.instrument==Instrument::guitar;});
    const bool timeline=!p.tempo_changes.empty() || std::any_of(p.tracks.begin(),p.tracks.end(),[](const Track& t){return !t.automation.empty();});
    out<<"{\n  \"schema_version\": \""<<(r.key_mode==KeyMode::major?"1.7-remix":r.instrument_reverb_mix>0?"1.6-remix":sustained?"1.5-remix":guitar?"1.4-remix":timeline?"1.3-remix":echoes?"1.2-remix":transforms?"1.1-remix":"1.0-remix")<<"\",\n  \"seed\": "<<p.seed
       <<",\n  \"source_asset_id\": \"sha256:"<<source.sha256<<"\",\n  \"sample_rate\": "<<p.sample_rate
       <<",\n  \"source\": {\"sha256\": \""<<source.sha256<<"\", \"original_rate\": "<<source.original_rate
       <<", \"original_frames\": "<<source.original_frames<<", \"processed_frames\": "<<source.mono.size()
       <<", \"kind\": \""<<(r.synthetic_source?"synthetic":"recorded")
       <<"\", \"consent_confirmed\": "<<(r.consent_confirmed?"true":"false")<<"},\n"
       <<"  \"tempo_milli_bpm\": "<<p.tempo_milli_bpm<<",\n  \"ticks_per_quarter\": 960,\n"
       <<"  \"time_signature\": ["<<p.numerator<<", "<<p.denominator<<"],\n  \"target_bars\": "<<p.bars
       <<",\n  \"tail_ms\": "<<p.tail_ms<<",\n  \"strategy\": \""<<strategy_name(r.strategy)
       <<"\",\n  \"key\": {\"tonic_midi\": "<<r.tonic_midi<<", \"mode\": \""<<(r.key_mode==KeyMode::major?"major":"minor")<<"\"},\n"
       <<"  \"mix\": {\"master_target_peak_dbfs\": "<<p.ceiling_dbfs
       <<", \"clean_hook_instrument_duck_db\": -16.4781748189, \"instrument_room_mix\": "<<r.instrument_room_mix;
    if (r.instrument_reverb_mix>0) out<<", \"instrument_reverb_mix\": "<<r.instrument_reverb_mix;
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
        if (e.echo_ticks) out<<", \"echo_ticks\": "<<e.echo_ticks<<", \"echo_gain_db\": "<<e.echo_gain_db;
        out<<"}";
    }
    out<<"\n  ]";
    if (!p.tempo_changes.empty()) {
        out<<",\n  \"tempo_changes\": [";
        for (std::size_t i=0;i<p.tempo_changes.size();++i)
            out<<(i?",":"")<<"{\"start_tick\": "<<p.tempo_changes[i].tick<<", \"tempo_milli_bpm\": "<<p.tempo_changes[i].tempo_milli_bpm<<"}";
        out<<"]";
    }
    out<<",\n  \"tracks\": [";
    for (std::size_t i=0;i<p.tracks.size();++i) {
        const auto& t=p.tracks[i];
        out<<(i?",":"")<<"\n    {\"instrument\": \""<<instrument_name(t.instrument)<<"\", \"gain_db\": "<<t.gain_db
           <<", \"pan\": "<<t.pan;
        if (t.electronic) out<<", \"sound\": \"electronic\"";
        if (!t.automation.empty()) {
            out<<", \"automation\": [";
            for (std::size_t j=0;j<t.automation.size();++j)
                out<<(j?",":"")<<"{\"start_tick\": "<<t.automation[j].tick<<", \"gain_db\": "<<t.automation[j].gain_db<<", \"pan\": "<<t.automation[j].pan<<"}";
            out<<"]";
        }
        out<<", \"events\": [";
        for (std::size_t j=0;j<t.notes.size();++j) {
            const auto& n=t.notes[j];
            out<<(j?",":"")<<"\n      {\"start_tick\": "<<n.start<<", \"duration_ticks\": "<<n.duration
               <<", \"note\": "<<n.pitch<<", \"velocity\": "<<n.velocity;
            if (n.muted) out<<", \"muted\": true";
            out<<"}";
        }
        out<<"\n    ]}";
    }
    out<<"\n  ]\n}\n"; out.flush();
    if (!out) throw std::runtime_error("cannot write remix score");
}
} // namespace djayvo
