#include "djayvo/live.h"
#include "djayvo/audio.h"
#include <array>
#include <cmath>

namespace {
std::array<djayvo::Voice, 32> voices;
std::array<float, 4096> output;
unsigned sample_rate = 0;
constexpr std::array<djayvo::Instrument, 11> patches = {
    djayvo::Instrument::piano, djayvo::Instrument::piano,
    djayvo::Instrument::bass, djayvo::Instrument::bass,
    djayvo::Instrument::guitar, djayvo::Instrument::guitar,
    djayvo::Instrument::organ, djayvo::Instrument::pad, djayvo::Instrument::lead,
    djayvo::Instrument::drums, djayvo::Instrument::drums};
}
int djayvo_live_init(unsigned rate) noexcept {
    if (rate < 32000 || rate > 192000) return 0;
    sample_rate = rate;
    for (auto& voice : voices) voice = djayvo::Voice{};
    output.fill(0);
    return 1;
}
int djayvo_live_note(unsigned id, unsigned patch, int pitch, int velocity) noexcept {
    if (!sample_rate || !id || patch >= patches.size() || pitch < 21 || pitch > 108 || velocity < 1 || velocity > 127)
        return 0;
    if ((patch == 4 || patch == 5) && (pitch < 40 || pitch > 79)) return 0;
    if (patch >= 9 && pitch != 36 && pitch != 38 && pitch != 42 && pitch != 46) return 0;
    for (const auto& voice : voices) if (voice.active() && voice.id() == id) return 0;
    for (auto& voice : voices) if (!voice.active()) {
        djayvo::Event event;
        event.note_id = id; event.instrument = patches[patch]; event.pitch = pitch; event.velocity = velocity;
        event.electronic = patch == 1 || patch == 3 || patch == 10;
        event.muted = patch == 5; event.noise_seed = id;
        voice.start(event, sample_rate);
        return 1;
    }
    return 0; // Full pool rejects new notes rather than cutting an active voice.
}
void djayvo_live_off(unsigned id) noexcept {
    for (auto& voice : voices) if (voice.active() && voice.id() == id) voice.stop();
}
void djayvo_live_panic() noexcept { for (auto& voice : voices) voice.stop(); }
float* djayvo_live_buffer() noexcept { return output.data(); }
int djayvo_live_render(unsigned frames) noexcept {
    if (!sample_rate || frames == 0 || frames > output.size() / 2) return 0;
    for (unsigned frame = 0; frame < frames; ++frame) {
        double sample = 0;
        for (auto& voice : voices) if (voice.active()) sample += voice.next() * .22;
        const auto limited = static_cast<float>(.8 * std::tanh(sample / .8));
        output[frame * 2] = limited;
        output[frame * 2 + 1] = limited;
    }
    return 1;
}
unsigned djayvo_live_active() noexcept {
    unsigned count = 0;
    for (const auto& voice : voices) if (voice.active()) ++count;
    return count;
}
