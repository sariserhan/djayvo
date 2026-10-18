#include "djayvo/music.h"
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

void validate(const PerformancePlan& p) {
    tick_to_frame(0, p.sample_rate, p.tempo_milli_bpm);
    const Tick bar = ticks_per_bar(p);
    if (p.bars < 1 || p.bars > 256 || p.tail_ms < 500 || p.tail_ms > 10000 ||
        !std::isfinite(p.ceiling_dbfs) || p.ceiling_dbfs > -0.1 || p.ceiling_dbfs < -24.0)
        throw std::invalid_argument("invalid duration, tail, or mix ceiling");
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
        if (!std::isfinite(track.gain_db) || track.gain_db < -60 || track.gain_db > 12 ||
            !std::isfinite(track.pan) || std::abs(track.pan) > 1)
            throw std::invalid_argument("invalid gain or pan");
        count += track.notes.size();
        if (count > 100000) throw std::invalid_argument("event budget exceeded");
        for (const auto& n : track.notes) {
            if (n.start < 0 || n.start >= bar * p.bars || n.duration <= 0 ||
                n.duration > bar * p.bars - n.start || n.pitch < 21 || n.pitch > 108 ||
                n.velocity < 1 || n.velocity > 127)
                throw std::invalid_argument("note outside time/pitch/velocity bounds");
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
    out << "{\n  \"schema_version\": \"1.0-m0a\",\n  \"seed\": " << p.seed
        << ",\n  \"source_asset_id\": null,\n  \"sample_rate\": " << p.sample_rate
        << ",\n  \"ticks_per_quarter\": " << ticks_per_quarter
        << ",\n  \"tempo_milli_bpm\": " << p.tempo_milli_bpm
        << ",\n  \"time_signature\": [" << p.numerator << ", " << p.denominator
        << "],\n  \"target_bars\": " << p.bars
        << ",\n  \"strategy\": \"m0a_four_bar\",\n  \"tail_ms\": " << p.tail_ms
        << ",\n  \"mix\": {\"master_target_peak_dbfs\": " << p.ceiling_dbfs << "},\n  \"sections\": [";
    for (std::size_t i = 0; i < p.sections.size(); ++i) {
        const auto& s = p.sections[i];
        out << (i ? "," : "") << "\n    {\"name\": \"" << s.name << "\", \"start_bar\": "
            << s.start_bar << ", \"bars\": " << s.bars << "}";
    }
    out << "\n  ],\n  \"tracks\": [";
    for (std::size_t i = 0; i < p.tracks.size(); ++i) {
        const auto& t = p.tracks[i];
        out << (i ? "," : "") << "\n    {\"instrument\": \"" << instrument_name(t.instrument)
            << "\", \"gain_db\": " << t.gain_db << ", \"pan\": " << t.pan << ", \"events\": [";
        for (std::size_t j = 0; j < t.notes.size(); ++j) {
            const auto& n = t.notes[j];
            out << (j ? "," : "") << "\n      {\"start_tick\": " << n.start << ", \"duration_ticks\": "
                << n.duration << ", \"note\": " << n.pitch << ", \"velocity\": " << n.velocity << "}";
        }
        out << "\n    ]}";
    }
    out << "\n  ]\n}\n";
    out.flush();
    if (!out) throw std::runtime_error("cannot write score: " + path);
}
} // namespace djayvo
