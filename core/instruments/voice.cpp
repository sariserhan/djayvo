#include "djayvo/audio.h"
#include <algorithm>
#include <cmath>

namespace djayvo {
namespace {
constexpr double pi = 3.14159265358979323846;
constexpr double tau = 2.0 * pi;
}
std::uint32_t release_frames(Instrument instrument, std::uint32_t rate) {
    const double seconds = instrument == Instrument::piano ? 0.22 :
                           instrument == Instrument::bass ? 0.10 : 0.08;
    return static_cast<std::uint32_t>(std::llround(seconds * rate));
}
void Voice::start(const Event& e, std::uint32_t rate) noexcept {
    active_ = true; released_ = false; age_ = 0; release_age_ = 0;
    instrument_ = e.instrument; pitch_ = e.pitch; id_ = e.note_id; rate_ = rate;
    release_length_ = release_frames(instrument_, rate);
    frequency_ = 440.0 * std::exp2((e.pitch - 69) / 12.0);
    velocity_ = std::pow(e.velocity / 127.0, 1.45);
    phase_ = 0.0; noise_low_ = 0.0; previous_noise_ = 0.0;
    rng_ = e.noise_seed == 0 ? 1U : e.noise_seed;
    left_gain_ = e.left_gain; right_gain_ = e.right_gain;
}
void Voice::stop() noexcept {
    if (!released_) { released_ = true; release_age_ = 0; }
}
float Voice::next() noexcept {
    if (!active_) return 0.0F;
    const double t = static_cast<double>(age_) / rate_;
    double sound = 0.0;
    double attack = 0.003;
    if (instrument_ == Instrument::piano) {
        // Decaying, mildly inharmonic string modes; velocity controls brightness.
        for (int h = 1; h <= 7; ++h) {
            const double ratio = h * std::sqrt(1.0 + 0.00012 * h * h);
            if (ratio * frequency_ >= 0.45 * rate_) break;
            const double amplitude = std::pow(0.48 + 0.12 * velocity_, h - 1) / std::sqrt(h);
            const double decay = std::exp(-t * (1.0 + h * 0.65));
            sound += amplitude * decay * std::sin(tau * frequency_ * ratio * t);
        }
        sound = 0.62 * sound + 0.07 * std::exp(-t * 3) * std::sin(tau * frequency_ * 1.002 * t);
        attack = 0.004;
    } else if (instrument_ == Instrument::bass) {
        if (frequency_ < 0.45 * rate_) sound = 0.78 * std::sin(tau * phase_);
        if (2 * frequency_ < 0.45 * rate_)
            sound += 0.19 * std::exp(-t * 5.0) * std::sin(tau * 2.0 * phase_);
        if (3 * frequency_ < 0.45 * rate_)
            sound += 0.08 * std::exp(-t * 9.0) * std::sin(tau * 3.0 * phase_);
        sound *= std::exp(-t * 1.6);
        attack = 0.006;
    } else {
        rng_ ^= rng_ << 13U; rng_ ^= rng_ >> 17U; rng_ ^= rng_ << 5U;
        const double noise = static_cast<double>(rng_ >> 8U) / 8388608.0 - 1.0;
        noise_low_ += 0.16 * (noise - noise_low_);
        const double high = noise - noise_low_;
        if (pitch_ == 36) {
            const double kick_phase = tau * (49.0 * t + 2.6 * (1.0 - std::exp(-t / 0.026)));
            sound = 1.05 * std::exp(-t * 15.0) * std::sin(kick_phase) +
                    0.10 * std::exp(-t * 180.0) * high;
            attack = 0.002;
        } else if (pitch_ == 38) {
            sound = 0.66 * std::exp(-t * 25.0) * high +
                    0.30 * std::exp(-t * 32.0) * std::sin(tau * 183.0 * t) +
                    0.12 * std::exp(-t * 40.0) * std::sin(tau * 337.0 * t);
            attack = 0.0015;
        } else {
            const double decay = pitch_ == 46 ? 12.0 : 68.0;
            const double metal_a = std::min(4013.0, 0.18 * rate_);
            const double metal_b = std::min(6121.0, 0.26 * rate_);
            sound = (0.30 * (noise - previous_noise_) +
                     0.10 * std::sin(tau * metal_a * t) * std::sin(tau * metal_b * t)) * std::exp(-t * decay);
            attack = 0.001;
        }
        previous_noise_ = noise;
    }
    double envelope = std::min(1.0, t / attack);
    if (released_) {
        if (release_age_ >= release_length_) { active_ = false; return 0.0F; }
        envelope *= 0.5 * (1.0 + std::cos(pi * release_age_ / release_length_));
        ++release_age_;
    }
    ++age_;
    phase_ += frequency_ / rate_;
    phase_ -= std::floor(phase_);
    return static_cast<float>(sound * envelope * velocity_);
}
} // namespace djayvo
