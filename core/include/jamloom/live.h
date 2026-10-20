#pragma once
#include <cstdint>

// One instrument rack per instance, owned by its render thread. Fixed memory;
// no filesystem, platform, allocation or model calls in note/render functions.
extern "C" {
int jamloom_live_init(unsigned rate) noexcept;
int jamloom_live_note(unsigned id, unsigned patch, int pitch, int velocity) noexcept;
void jamloom_live_off(unsigned id) noexcept;
void jamloom_live_panic() noexcept;
float* jamloom_live_buffer() noexcept;
int jamloom_live_render(unsigned frames) noexcept;
unsigned jamloom_live_active() noexcept;
// Morph the original talk-bass formants OO -> AH -> EE; position in [0,1].
int jamloom_live_mouth(double position) noexcept;
}
