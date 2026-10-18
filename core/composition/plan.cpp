#include "djayvo/music.h"
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <limits>
#include <locale>
#include <stdexcept>

namespace djayvo {
const char* instrument_name(Instrument instrument) {
    switch (instrument) {
    case Instrument::piano: return "piano";
    case Instrument::bass: return "bass";
    case Instrument::drums: return "drums";
    case Instrument::guitar: return "guitar";
    case Instrument::organ: return "organ";
    case Instrument::pad: return "pad";
    case Instrument::lead: return "lead";
    }
    throw std::invalid_argument("unsupported instrument");
}

std::uint64_t tick_to_frame(Tick tick, std::uint32_t rate, std::uint32_t tempo) {
    if (tick < 0 || rate < 8000 || rate > 192000 || tempo < 30000 || tempo > 300000)
        throw std::invalid_argument("invalid tick, sample rate, or tempo");
    const auto numerator = static_cast<std::uint64_t>(rate) * 60000U;
    const auto denominator = static_cast<std::uint64_t>(ticks_per_quarter) * tempo;
    const auto t = static_cast<std::uint64_t>(tick);
    // Quotient/remainder avoids overflow for long musical timelines.
    const auto whole = t / denominator;
    const auto remainder = t % denominator;
    const auto fraction = (remainder * numerator + denominator / 2) / denominator;
    if (whole > (std::numeric_limits<std::uint64_t>::max() - fraction) / numerator)
        throw std::overflow_error("musical time exceeds frame range");
    return whole * numerator + fraction;
}

Tick ticks_per_bar(const PerformancePlan& p) {
    if (p.numerator < 1 || p.numerator > 16 ||
        (p.denominator != 2 && p.denominator != 4 && p.denominator != 8 && p.denominator != 16))
        throw std::invalid_argument("unsupported time signature");
    return ticks_per_quarter * 4 * p.numerator / p.denominator;
}

std::uint64_t tick_to_frame(Tick tick, const PerformancePlan& p) {
    if (p.tempo_changes.empty()) return tick_to_frame(tick,p.sample_rate,p.tempo_milli_bpm);
    tick_to_frame(tick,p.sample_rate,p.tempo_milli_bpm); // validate even zero-length segments
    if (p.bars<1 || p.bars>256 || p.tempo_changes.size()>64)
        throw std::invalid_argument("invalid tempo map size or duration");
    const auto end=ticks_per_bar(p)*p.bars;
    Tick previous=0;
    for (const auto& change:p.tempo_changes) {
        if (change.tick<=previous || change.tick>=end)
            throw std::invalid_argument("tempo changes must increase inside the music timeline");
        tick_to_frame(0,p.sample_rate,change.tempo_milli_bpm);
        previous=change.tick;
    }
    std::uint64_t whole=0,fraction=0;
    const auto add=[&](Tick length,std::uint32_t tempo) {
        const std::uint64_t numerator=static_cast<std::uint64_t>(p.sample_rate)*60000U;
        const std::uint64_t denominator=static_cast<std::uint64_t>(ticks_per_quarter)*tempo;
        const auto ticks=static_cast<std::uint64_t>(length);
        const auto remainder=(ticks%denominator)*numerator;
        const auto tail=remainder/denominator;
        const auto limit=std::numeric_limits<std::uint64_t>::max();
        if (ticks/denominator>(limit-tail)/numerator) throw std::overflow_error("tempo timeline exceeds frame range");
        const auto frames=ticks/denominator*numerator+tail;
        if (frames>limit-whole) throw std::overflow_error("tempo timeline exceeds frame range");
        whole+=frames;
        // Upward subframe rounding preserves exact half-frame ties; error <65/2^32 frames.
        fraction+=(((remainder%denominator)<<32U)+denominator-1)/denominator;
    };
    Tick start=0;auto tempo=p.tempo_milli_bpm;
    for (const auto& change:p.tempo_changes) {
        if (change.tick>=tick) break;
        add(change.tick-start,tempo);start=change.tick;tempo=change.tempo_milli_bpm;
    }
    add(tick-start,tempo);
    const auto carry=(fraction+(1ULL<<31U))>>32U;
    if (carry>std::numeric_limits<std::uint64_t>::max()-whole) throw std::overflow_error("tempo timeline exceeds frame range");
    return whole+carry;
}

void validate(const PerformancePlan& p) {
    tick_to_frame(0, p.sample_rate, p.tempo_milli_bpm);
    const Tick bar = ticks_per_bar(p);
    if (p.bars < 1 || p.bars > 256 || p.tail_ms < 500 || p.tail_ms > 10000 ||
        !std::isfinite(p.ceiling_dbfs) || p.ceiling_dbfs > -0.1 || p.ceiling_dbfs < -24.0 ||
        !std::isfinite(p.kick_duck_db) || p.kick_duck_db>0 || p.kick_duck_db < -12)
        throw std::invalid_argument("invalid duration, tail, or mix ceiling");
    tick_to_frame(bar*p.bars,p);
    int next_bar = 0;
    for (const auto& s : p.sections) {
        if (s.name.empty() || s.name.size() > 64 ||
            s.name.find_first_not_of("abcdefghijklmnopqrstuvwxyz_0123456789") != std::string::npos ||
            s.start_bar != next_bar || s.bars < 1 || s.bars > p.bars - next_bar)
            throw std::invalid_argument("sections must cover the piece in order, without gaps");
        next_bar += s.bars;
    }
    if (next_bar != p.bars) throw std::invalid_argument("incomplete section coverage");
    if (p.tracks.empty() || p.tracks.size() > 32) throw std::invalid_argument("invalid track count");
    std::size_t count = 0;
    for (const auto& track : p.tracks) {
        instrument_name(track.instrument);
        if (track.instrument>=Instrument::guitar && track.electronic)
            throw std::invalid_argument("instrument has no alternate electronic sound bank");
        if (!std::isfinite(track.gain_db) || track.gain_db < -60 || track.gain_db > 12 ||
            !std::isfinite(track.pan) || std::abs(track.pan) > 1)
            throw std::invalid_argument("invalid gain or pan");
        if (track.automation.size()>128) throw std::invalid_argument("automation point budget exceeded");
        Tick last=-1;std::uint64_t last_frame=0;
        for (const auto& point:track.automation) {
            if (point.tick<=last || point.tick>bar*p.bars || !std::isfinite(point.gain_db) ||
                point.gain_db < -60 || point.gain_db > 12 || !std::isfinite(point.pan) || std::abs(point.pan)>1)
                throw std::invalid_argument("invalid mix automation point");
            const auto frame=tick_to_frame(point.tick,p);
            if (last<0 ? point.tick!=0 || point.gain_db!=track.gain_db || point.pan!=track.pan :
                         frame-last_frame<p.sample_rate/200U)
                throw std::invalid_argument("automation must start at track mix and ramps must last at least 5 ms");
            last=point.tick;last_frame=frame;
        }
        count += track.notes.size();
        if (count > 100000) throw std::invalid_argument("event budget exceeded");
        for (const auto& n : track.notes) {
            if (n.start < 0 || n.start >= bar * p.bars || n.duration <= 0 ||
                n.duration > bar * p.bars - n.start || n.pitch < 21 || n.pitch > 108 ||
                n.velocity < 1 || n.velocity > 127)
                throw std::invalid_argument("note outside time/pitch/velocity bounds");
            if ((n.muted && track.instrument!=Instrument::guitar) ||
                (track.instrument==Instrument::guitar && (n.pitch<40 || n.pitch>79)))
                throw std::invalid_argument("guitar articulation or pitch outside recorded range");
            if (track.instrument == Instrument::drums &&
                n.pitch != 36 && n.pitch != 38 && n.pitch != 42 && n.pitch != 46)
                throw std::invalid_argument("drum map: 36 kick, 38 snare, 42 closed hat, 46 open hat");
            if (track.instrument != Instrument::drums &&
                440.0 * std::exp2((n.pitch - 69) / 12.0) >= 0.45 * p.sample_rate)
                throw std::invalid_argument("pitched note exceeds synthesis bandwidth at this sample rate");
        }
    }
}

void write_score(const PerformancePlan& p, const std::string& path) {
    validate(p);
    std::ofstream out(path);
    out.imbue(std::locale::classic());
    out << std::setprecision(17);
    const bool sustained=std::any_of(p.tracks.begin(),p.tracks.end(),[](const Track& t){return t.instrument>=Instrument::organ;});
    const bool guitar=std::any_of(p.tracks.begin(),p.tracks.end(),[](const Track& t){return t.instrument==Instrument::guitar;});
    const bool timeline=!p.tempo_changes.empty() || std::any_of(p.tracks.begin(),p.tracks.end(),[](const Track& t){return !t.automation.empty();});
    out << "{\n  \"schema_version\": \""<<(sustained?"1.3-m0a":guitar?"1.2-m0a":timeline?"1.1-m0a":"1.0-m0a")<<"\",\n  \"seed\": " << p.seed
        << ",\n  \"source_asset_id\": null,\n  \"sample_rate\": " << p.sample_rate
        << ",\n  \"ticks_per_quarter\": " << ticks_per_quarter
        << ",\n  \"tempo_milli_bpm\": " << p.tempo_milli_bpm
        << ",\n  \"time_signature\": [" << p.numerator << ", " << p.denominator
        << "],\n  \"target_bars\": " << p.bars
        << ",\n  \"strategy\": \"m0a_four_bar\",\n  \"tail_ms\": " << p.tail_ms
        << ",\n  \"mix\": {\"master_target_peak_dbfs\": " << p.ceiling_dbfs;
    if (p.kick_duck_db!=0) out<<", \"kick_duck_db\": "<<p.kick_duck_db;
    out << "},\n  \"sections\": [";
    for (std::size_t i = 0; i < p.sections.size(); ++i) {
        const auto& s = p.sections[i];
        out << (i ? "," : "") << "\n    {\"name\": \"" << s.name << "\", \"start_bar\": "
            << s.start_bar << ", \"bars\": " << s.bars << "}";
    }
    out << "\n  ]";
    if (!p.tempo_changes.empty()) {
        out<<",\n  \"tempo_changes\": [";
        for (std::size_t i=0;i<p.tempo_changes.size();++i)
            out<<(i?",":"")<<"{\"start_tick\": "<<p.tempo_changes[i].tick<<", \"tempo_milli_bpm\": "<<p.tempo_changes[i].tempo_milli_bpm<<"}";
        out<<"]";
    }
    out<<",\n  \"tracks\": [";
    for (std::size_t i = 0; i < p.tracks.size(); ++i) {
        const auto& t = p.tracks[i];
        out << (i ? "," : "") << "\n    {\"instrument\": \"" << instrument_name(t.instrument)
            << "\", \"gain_db\": " << t.gain_db << ", \"pan\": " << t.pan;
        if (t.electronic) out<<", \"sound\": \"electronic\"";
        if (!t.automation.empty()) {
            out<<", \"automation\": [";
            for (std::size_t j=0;j<t.automation.size();++j)
                out<<(j?",":"")<<"{\"start_tick\": "<<t.automation[j].tick<<", \"gain_db\": "<<t.automation[j].gain_db<<", \"pan\": "<<t.automation[j].pan<<"}";
            out<<"]";
        }
        out<<", \"events\": [";
        for (std::size_t j = 0; j < t.notes.size(); ++j) {
            const auto& n = t.notes[j];
            out << (j ? "," : "") << "\n      {\"start_tick\": " << n.start << ", \"duration_ticks\": "
                << n.duration << ", \"note\": " << n.pitch << ", \"velocity\": " << n.velocity;
            if (n.muted) out<<", \"muted\": true";
            out<<"}";
        }
        out << "\n    ]}";
    }
    out << "\n  ]\n}\n";
    out.flush();
    if (!out) throw std::runtime_error("cannot write score: " + path);
}
} // namespace djayvo
