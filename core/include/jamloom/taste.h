#pragma once
#include "jamloom/music.h"
#include "jamloom/remix.h"

namespace jamloom {
// Instrument bits: piano, guitar, bass, drums, synth. No reference-song audio.
PerformancePlan make_taste(std::uint32_t seed, unsigned tempo, unsigned energy,
                          unsigned instruments, unsigned novelty, unsigned seconds,
                          unsigned direction);
void render_taste(const PerformancePlan& plan, const std::string& prefix, const RenderControl& control = {});
}
