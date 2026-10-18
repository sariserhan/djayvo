#pragma once

#include <cstdint>
#include <cstddef>
#include <string>
#include <vector>

namespace djayvo {
using Tick = std::int64_t;
constexpr Tick ticks_per_quarter = 960;
constexpr std::size_t max_voices = 128;

enum class Instrument { piano, bass, drums };
const char* instrument_name(Instrument instrument);

struct Note {
    Tick start = 0;
    Tick duration = ticks_per_quarter;
    int pitch = 60;
    int velocity = 96; // MIDI 1..127; use note duration for note-off
};
struct Track {
    Instrument instrument = Instrument::piano;
    double gain_db = -9.0;
    double pan = 0.0; // -1 left .. +1 right, constant-power law
    std::vector<Note> notes;
    bool electronic = false;
};
struct Section {
    std::string name;
    int start_bar = 0;
    int bars = 1;
};
struct PerformancePlan {
    std::uint32_t seed = 4123;
    std::uint32_t sample_rate = 48000;
    std::uint32_t tempo_milli_bpm = 100000; // BPM measured in quarter notes
    int numerator = 4;
    int denominator = 4;
    int bars = 4;
    std::uint32_t tail_ms = 2000;
    double ceiling_dbfs = -1.0;
    std::vector<Section> sections;
    std::vector<Track> tracks;
    double kick_duck_db = 0;
};

// Round absolute rational tick positions to nearest frame (ties upward).
// Does not accumulate rounded durations. Throws on invalid/overflowing input.
std::uint64_t tick_to_frame(Tick tick, std::uint32_t sample_rate,
                            std::uint32_t tempo_milli_bpm);
Tick ticks_per_bar(const PerformancePlan& plan);
void validate(const PerformancePlan& plan);
void write_score(const PerformancePlan& plan, const std::string& path);
PerformancePlan make_demo(std::uint32_t seed = 4123);
} // namespace djayvo
