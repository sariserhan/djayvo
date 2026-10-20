#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>

namespace jamloom {
// Original procedural timbres; no reference recording, voice model or sample data.
struct PerformanceVoice {
    unsigned id = 0, patch = 0, rate = 48000, release_age = 0;
    std::uint64_t age = 0;
    int pitch = 36;
    bool active = false, released = false;
    double frequency = 0, phase = 0, velocity = 0, noise_low = 0;
    std::uint32_t random = 1;
    void start(unsigned identifier, unsigned program, int note, int strength, unsigned sample_rate) noexcept {
        *this = PerformanceVoice{};
        id = identifier; patch = program; pitch = note; rate = sample_rate; active = true;
        frequency = 440 * std::exp2((note - 69) / 12.0);
        velocity = std::pow(strength / 127.0, 1.45); random = identifier;
    }
    void stop() noexcept { released = true; }
    double next() noexcept {
        constexpr double tau = 6.28318530717958647692;
        if (!active) return 0;
        const double t = static_cast<double>(age) / rate;
        if ((released && release_age >= rate * .12) || (patch == 12 && t >= 1)) { active = false; return 0; }
        double sound = 0;
        if (patch == 11) {
            const double step = frequency / rate;
            // Polynomial edge correction reduces aliasing at the saw discontinuity.
            double edge = 0;
            if (phase < step) { const double x = phase / step; edge = x + x - x*x - 1; }
            else if (phase > 1 - step) { const double x = (phase - 1) / step; edge = x*x + x + x + 1; }
            sound = 2 * phase - 1 - edge;
            phase += step; if (phase >= 1) phase -= 1;
            sound *= std::min(1.0, t / .008);
        } else {
            random ^= random << 13; random ^= random >> 17; random ^= random << 5;
            const double noise = static_cast<double>(random) / 2147483648.0 - 1;
            noise_low += .18 * (noise - noise_low);
            const double high = noise - noise_low;
            if (pitch == 39) {
                double burst = 0;
                for (const double onset : {0.0, .012, .026}) if (t >= onset) burst += std::exp(-(t-onset) / (onset == .026 ? .07 : .006));
                sound = .65 * high * burst;
            } else if (pitch == 37) {
                sound = (.6 * std::sin(tau*1800*t) + .3 * std::sin(tau*2350*t) + .3 * high) * std::exp(-t/.025);
            } else if (pitch == 41) {
                sound = .85 * std::sin(tau*(90*t+2*(1-std::exp(-t/.02)))) * std::exp(-t/.19)
                      + .15 * std::sin(tau*210*t) * std::exp(-t/.08) + .12 * high * std::exp(-t/.009);
            } else sound = .65 * high * std::exp(-t/.055);
            sound *= std::min(1.0, t / .001);
        }
        if (released) { sound *= .5 * (1 + std::cos(tau * .5 * release_age / (rate * .12))); ++release_age; }
        ++age;
        return sound * velocity;
    }
};

struct MouthFilter {
    struct Band {
        double b = 0, a1 = 0, a2 = 0, target_b = 0, target_a1 = 0, target_a2 = 0;
        double x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        double next(double input, double smoothing) noexcept {
            b += smoothing * (target_b-b); a1 += smoothing * (target_a1-a1); a2 += smoothing * (target_a2-a2);
            double out = b*(input-x2)-a1*y1-a2*y2;
            if (std::abs(out) < 1e-20) out = 0; // Avoid denormal tails in an idle live rack.
            x2=x1; x1=input; y2=y1; y1=out;
            return out;
        }
    };
    std::array<Band,3> bands{};
    unsigned rate = 48000;
    double smoothing = 0;
    void shape(double position, bool immediate = false) noexcept {
        constexpr double vowels[3][3] = {{350, 650, 2400}, {700, 1200, 2600}, {300, 2300, 3000}};
        const unsigned section = position < .5 ? 0 : 1;
        const double blend = position * 2 - section;
        for (unsigned i=0; i<bands.size(); ++i) {
            const double hz = vowels[section][i]*(1-blend)+vowels[section+1][i]*blend;
            const double omega = 6.28318530717958647692*hz/rate, alpha=std::sin(omega)/(2*5.0);
            auto& band=bands[i];
            band.target_b=alpha/(1+alpha); band.target_a1=-2*std::cos(omega)/(1+alpha); band.target_a2=(1-alpha)/(1+alpha);
            if (immediate) { band.b=band.target_b; band.a1=band.target_a1; band.a2=band.target_a2; }
        }
    }
    void init(unsigned sample_rate) noexcept {
        *this = MouthFilter{}; rate = sample_rate; smoothing=1-std::exp(-1.0/(rate*.02)); shape(0, true);
    }
    double next(double carrier) noexcept {
        return .20*carrier + 3*(bands[0].next(carrier,smoothing)+.65*bands[1].next(carrier,smoothing)+.4*bands[2].next(carrier,smoothing));
    }
};
} // namespace jamloom
