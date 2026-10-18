#pragma once
#include "djayvo/audio.h"
#include <memory>
#include <stdexcept>

namespace djayvo {
struct AudioBuffer {
    std::uint32_t sample_rate = 48000;
    std::uint32_t original_rate = 48000;
    std::uint64_t original_frames = 0;
    std::string sha256;
    std::vector<float> mono;
};
std::string sha256(const std::vector<std::uint8_t>& bytes);
AudioBuffer read_wav(const std::string& path);
AudioBuffer resample(const AudioBuffer& source, std::uint32_t target_rate);

struct Region { std::uint64_t begin = 0, end = 0; double confidence = 0; };
struct InputAnalysis {
    double peak = 0, rms = 0, normalization_gain = 1;
    double pitch_hz = 0, pitch_confidence = 0;
    std::vector<Region> phrases;
    std::vector<std::uint64_t> onsets;
};
InputAnalysis analyze(const AudioBuffer& source);
enum class Strategy { hiphop, reggae, experimental, baseline, club };
const char* strategy_name(Strategy strategy);
struct VocalEvent {
    Tick start = 0;
    std::size_t clip = 0;
    double gain_db = -6;
    double rate = 1; // coupled pitch/duration; not independent time stretch
    bool reverse = false;
    double pan = 0;
    bool clean = false;
    double pitch_semitones = 0; // independent transform, rate must remain 1
    double time_stretch = 1; // output duration / source duration
};
// Call only after validating the event and crop bounds.
std::uint64_t vocal_frames(const VocalEvent& event, const Region& clip);
struct RemixPlan {
    PerformancePlan music;
    Strategy strategy = Strategy::hiphop;
    std::string source_sha256;
    bool synthetic_source = false;
    bool consent_confirmed = false;
    int tonic_midi = 57;
    double instrument_room_mix = 0; // optional, dry vocals; finite early reflections
    InputAnalysis analysis;
    std::vector<Region> clips;
    std::vector<VocalEvent> vocals;
};
RemixPlan make_remix(const AudioBuffer& source, const InputAnalysis& analysis,
                     Strategy strategy, std::uint32_t seed,
                     bool synthetic, bool consent_confirmed);
RemixPlan make_baseline(const AudioBuffer& source, const InputAnalysis& analysis,
                        std::uint32_t seed, bool synthetic, bool consent_confirmed);
void validate(const RemixPlan& plan, const AudioBuffer& source);
void write_score(const RemixPlan& plan, const AudioBuffer& source, const std::string& path);

// Source memory is immutable and must outlive the renderer. All allocations,
// source validation and sample-trigger compilation happen at construction.
class RemixRenderer {
public:
    RemixRenderer(const RemixPlan& plan, const AudioBuffer& source, std::size_t block = 512,
                  bool vocals_only = false, int solo_instrument = -1);
    std::size_t process(float* stereo, std::size_t count) noexcept;
    bool finished() const noexcept { return cursor_ == total_frames_; }
    const AudioStats& stats() const noexcept { return stats_; }
    std::uint64_t voice_overflows() const noexcept { return music_.voice_overflows(); }
private:
    struct Trigger {
        std::uint64_t start, frames, source_begin, source_end;
        double rate, gain_left, gain_right;
        bool reverse, clean;
        int transformed = -1;
    };
    struct TransformedClip {
        std::size_t clip;
        double pitch, stretch;
        std::vector<float> pcm;
    };
    Renderer music_;
    const AudioBuffer& source_;
    std::vector<Trigger> triggers_;
    std::vector<TransformedClip> transformed_;
    std::vector<float> music_buffer_;
    std::vector<double> room_buffer_;
    std::array<std::size_t,4> room_taps_{};
    std::size_t room_cursor_ = 0;
    double room_mix_ = 0, room_low_ = 0, room_high_ = 0;
    double room_low_alpha_ = 0, room_high_alpha_ = 0;
    std::size_t block_;
    std::uint64_t cursor_ = 0, total_frames_ = 0;
    double ceiling_ = 0.89;
    bool vocals_only_ = false, instrumental_only_ = false;
    AudioStats stats_{};
    float previous_[2]{};
};
struct RenderCancelled : std::runtime_error {
    RenderCancelled() : std::runtime_error("render cancelled") {}
};
struct RenderControl {
    int (*cancelled)(void*) = nullptr;
    void* context = nullptr;
    void check() const { if (cancelled && cancelled(context)) throw RenderCancelled(); }
};
// Low-level writer; remix_file provides exclusive publication and completion metadata.
void render_remix(const RemixPlan& plan, const AudioBuffer& source,
                   const std::string& prefix, std::size_t block = 512, bool stems = false,
                   const RenderControl& control = {});
// Optional offline plan receipt. A null plan records an explicit rule fallback.
struct PlanImport {
    const RemixPlan* plan = nullptr;
    std::string candidate_sha256;
};
void remix_file(const std::string& input, const std::string& output,
                 const std::vector<Strategy>& strategies, std::uint32_t rate,
                 std::uint32_t seed, std::size_t block, bool synthetic, bool consent, bool stems,
                 const RenderControl& control = {}, const PlanImport* imported = nullptr);
} // namespace djayvo
