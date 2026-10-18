#pragma once

#include "djayvo/music.h"
#include <array>
#include <cstddef>
#include <fstream>

namespace djayvo {
enum class EventKind { note_off, note_on };
struct Event {
    std::uint64_t frame = 0;
    EventKind kind = EventKind::note_on;
    std::uint32_t note_id = 0;
    Instrument instrument = Instrument::piano;
    int pitch = 60;
    int velocity = 96;
    float left_gain = 1.0F;
    float right_gain = 1.0F;
    std::uint32_t noise_seed = 1;
    bool electronic = false;
    int automation = -1;
    bool muted = false;
};
struct MixFrame { std::uint64_t frame = 0; float left = 1, right = 1; };
struct Schedule {
    std::uint32_t sample_rate = 48000;
    std::uint64_t music_frames = 0;
    std::uint64_t total_frames = 0;
    double ceiling = 0.891250938;
    std::vector<Event> events;
    double kick_duck_db = 0;
    std::vector<std::uint64_t> kick_frames;
    std::vector<std::vector<MixFrame>> automation;
};
Schedule compile(const PerformancePlan& plan);
std::uint32_t release_frames(Instrument instrument, std::uint32_t sample_rate);

class Voice {
public:
    bool active() const noexcept { return active_; }
    std::uint32_t id() const noexcept { return id_; }
    Instrument instrument() const noexcept { return instrument_; }
    void start(const Event& event, std::uint32_t sample_rate) noexcept;
    void stop() noexcept;
    float next() noexcept;
    float left_gain() const noexcept { return left_gain_; }
    float right_gain() const noexcept { return right_gain_; }
    int automation() const noexcept { return automation_; }
private:
    bool active_ = false;
    bool released_ = false;
    Instrument instrument_ = Instrument::piano;
    int pitch_ = 60;
    int automation_ = -1;
    std::uint32_t id_ = 0, rate_ = 48000, release_length_ = 1;
    std::uint64_t age_ = 0;
    std::uint32_t release_age_ = 0;
    double velocity_ = 1.0, sample_position_ = 0.0, sample_step_ = 1.0;
    double tone_ = 0, tone_alpha_ = 1;
    const std::int16_t* sample_ = nullptr;
    std::size_t sample_frames_ = 0;
    std::array<std::array<float,16>,65> interpolation_{};
    float left_gain_ = 1.0F, right_gain_ = 1.0F;
};

struct AudioStats {
    std::uint64_t frames = 0;
    double peak = 0.0, pre_limiter_peak = 0.0;
    double square_sum_left = 0.0, square_sum_right = 0.0;
    double max_step = 0.0;
    std::uint64_t limited_samples = 0, nonfinite_samples = 0;
};

// Construction owns/allocates a compiled schedule. process() uses a fixed
// voice pool and performs no allocation, I/O or locking; one render thread.
class Renderer {
public:
    explicit Renderer(Schedule schedule, std::size_t max_block = 512);
    std::size_t process(float* interleaved_stereo, std::size_t requested) noexcept;
    bool finished() const noexcept { return cursor_ == schedule_.total_frames; }
    const AudioStats& stats() const noexcept { return stats_; }
    std::uint64_t voice_overflows() const noexcept { return voice_overflows_; }
private:
    Schedule schedule_;
    std::size_t max_block_ = 512, next_event_ = 0, next_kick_ = 0;
    std::uint64_t cursor_ = 0, voice_overflows_ = 0;
    // The interpolation tables exceed mobile worker stacks; allocate once at construction.
    std::vector<Voice> voices_;
    std::vector<std::size_t> automation_positions_;
    std::vector<std::array<float,2>> automation_gains_;
    AudioStats stats_{};
    std::array<float, 2> previous_{};
    double duck_gain_ = 1, duck_minimum_ = 1, duck_attack_ = 1, duck_release_ = 1;
    std::uint64_t duck_hold_ = 0;
};

// Streaming PCM16 stereo RIFF/WAVE. No platform codecs or implicit dither.
class WavWriter {
public:
    WavWriter(const std::string& path, std::uint32_t rate, std::uint64_t frames);
    void write(const float* stereo, std::size_t frames);
    void close();
private:
    std::ofstream stream_;
    std::uint64_t expected_ = 0, written_ = 0;
};
void write_report(const AudioStats& stats, const PerformancePlan& plan,
                  const Schedule& schedule, const std::string& path, const char* milestone = "M0a");
} // namespace djayvo
