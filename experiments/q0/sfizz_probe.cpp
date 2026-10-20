#include "jamloom/audio.h"
#include <sfizz.h>
#include <algorithm>
#include <cmath>
#include <filesystem>
#include <iostream>
#include <memory>
#include <vector>

// Optional offline comparison only; sfizz is never linked into the shared core.
int main(int argc, char** argv) {
    try {
        if (argc != 5 || std::filesystem::exists(argv[2]))
            throw std::runtime_error("Expected SFZ, fresh WAV path, pitch, short|long");
        const int pitch = std::stoi(argv[3]);
        const std::string gate = argv[4];
        if (pitch < 0 || pitch > 127 || (gate != "short" && gate != "long"))
            throw std::runtime_error("Invalid probe context");
        constexpr int rate = 48000, block = 512, total = rate * 10;
        std::unique_ptr<sfizz_synth_t, decltype(&sfizz_free)> synth(sfizz_create_synth(), sfizz_free);
        if (!synth) throw std::runtime_error("sfizz allocation failed");
        sfizz_set_sample_rate(synth.get(), rate);
        sfizz_set_samples_per_block(synth.get(), block);
        sfizz_enable_freewheeling(synth.get());
        sfizz_set_volume(synth.get(), -9);
        if (!sfizz_load_file(synth.get(), argv[1]) || sfizz_get_num_regions(synth.get()) == 0 ||
            sfizz_get_num_preloaded_samples(synth.get()) == 0)
            throw std::runtime_error("SFZ or samples failed to load");
        jamloom::WavWriter wav(argv[2], rate, total);
        std::vector<float> left(block), right(block), interleaved(block*2);
        float* channels[] = {left.data(), right.data()};
        bool heard = false;
        for (int frame = 0; frame < total; frame += block) {
            const int count = std::min(block, total-frame);
            for (int i = 0; i < 4; ++i) {
                const int on = i * 2 * rate;
                const int off = on + (gate == "short" ? rate/8 : 3*rate/2);
                if (on >= frame && on < frame+count) {
                    sfizz_send_cc(synth.get(), on-frame, 20, i == 3 ? 127 : 0);
                    sfizz_send_note_on(synth.get(), on-frame, pitch, i == 0 ? 40 : i == 1 ? 75 : 110);
                }
                if (off >= frame && off < frame+count)
                    sfizz_send_note_off(synth.get(), off-frame, pitch, 0);
            }
            sfizz_render_block(synth.get(), channels, 2, count);
            for (int i = 0; i < count; ++i) {
                if (!std::isfinite(left[i]) || !std::isfinite(right[i]) ||
                    std::abs(left[i]) >= 1 || std::abs(right[i]) >= 1)
                    throw std::runtime_error("Nonfinite or clipping probe");
                heard = heard || std::abs(left[i]) > .0001f || std::abs(right[i]) > .0001f;
                interleaved[2*i] = left[i]; interleaved[2*i+1] = right[i];
            }
            wav.write(interleaved.data(), count);
        }
        wav.close();
        if (!heard) throw std::runtime_error("Silent probe");
        std::cout << "PASS: sfizz probe " << argv[2] << '\n';
    } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
