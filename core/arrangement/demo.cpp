#include "jamloom/music.h"
#include <array>

namespace jamloom {
namespace {
std::uint32_t random_next(std::uint32_t& state) {
    state ^= state << 13U; state ^= state >> 17U; state ^= state << 5U;
    return state;
}
}
PerformancePlan make_demo(std::uint32_t seed) {
    PerformancePlan p;
    p.seed = seed;
    p.sections = {{"intro", 0, 1}, {"groove", 1, 1}, {"variation", 2, 1}, {"ending", 3, 1}};
    Track piano{Instrument::piano, -10.0, -0.24, {}};
    Track bass{Instrument::bass, -8.5, 0.04, {}};
    Track drums{Instrument::drums, -10.5, 0.16, {}};
    std::uint32_t rng = seed ^ 0xa511e9b3U;
    if (rng == 0) rng = 1;
    const auto velocity = [&rng](int center) { return center + static_cast<int>(random_next(rng) % 9U) - 4; };
    // Original Am9 -> Fmaj7 -> G6 -> Am9 voicings; no sampled loops.
    const std::array<std::array<int, 4>, 4> chords{{{{60, 64, 67, 71}}, {{60, 64, 69, 72}},
                                                {{59, 62, 64, 67}}, {{60, 64, 67, 71}}}};
    const std::array<int, 4> roots{{33, 29, 31, 33}};
    const Tick q = ticks_per_quarter;
    for (int bar = 0; bar < 4; ++bar) {
        const Tick base = bar * 4 * q;
        const auto& chord = chords[static_cast<std::size_t>(bar)];
        for (int c = 0; c < 4; ++c) {
            // A restrained rolled chord; absolute tick positions preserve microtiming.
            piano.notes.push_back({base + c * 16, q + q / 3, chord[static_cast<std::size_t>(c)], velocity(82)});
            if (bar < 3)
                piano.notes.push_back({base + 5 * q / 2 + c * 10, q / 2, chord[static_cast<std::size_t>(c)], velocity(65)});
        }
        if (bar < 3) {
            piano.notes.push_back({base + 3 * q / 2, q / 3, chord[3] + 12, velocity(76)});
            piano.notes.push_back({base + 7 * q / 2, q / 3, chord[2] + 12, velocity(70)});
        } else {
            piano.notes.push_back({base + 2 * q, 2 * q, 81, velocity(72)});
        }
        bass.notes.push_back({base, 3 * q / 4, roots[static_cast<std::size_t>(bar)], velocity(103)});
        bass.notes.push_back({base + 3 * q / 2, q / 3, roots[static_cast<std::size_t>(bar)] + 12, velocity(80)});
        bass.notes.push_back({base + 2 * q, bar == 3 ? 2 * q : 3 * q / 4,
                              roots[static_cast<std::size_t>(bar)], velocity(94)});
        if (bar < 3)
            bass.notes.push_back({base + 7 * q / 2, q / 3,
                                  bar == 2 ? 32 : roots[static_cast<std::size_t>(bar)] + 7, velocity(72)});
        const int hat_count = bar == 3 ? 5 : 8;
        for (int h = 0; h < hat_count; ++h) {
            const Tick swing = (h % 2 == 1) ? q / 16 : 0;
            drums.notes.push_back({base + h * q / 2 + swing, q / 6,
                                  (h == 7 && bar == 1) ? 46 : 42, velocity(h % 2 ? 54 : 70)});
        }
        drums.notes.push_back({base, q / 2, 36, velocity(111)});
        drums.notes.push_back({base + 2 * q, q / 2, 36, velocity(103)});
        drums.notes.push_back({base + q, q / 3, 38, velocity(96)});
        if (bar < 3) drums.notes.push_back({base + 3 * q, q / 3, 38, velocity(101)});
        if (bar == 2) {
            drums.notes.push_back({base + 13 * q / 4, q / 8, 38, velocity(47)});
            drums.notes.push_back({base + 7 * q / 2, q / 4, 36, velocity(88)});
            drums.notes.push_back({base + 15 * q / 4, q / 8, 38, velocity(65)});
        }
    }
    p.tracks = {piano, bass, drums};
    validate(p);
    return p;
}
} // namespace jamloom
