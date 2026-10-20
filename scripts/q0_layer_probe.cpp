// Standalone Q0 diagnostic linked against a pinned core; no production changes.
#include "jamloom/audio.h"
#include <cmath>
#include <filesystem>
#include <iomanip>
#include <iostream>
#include <stdexcept>

int main(int argc, char** argv) {
    try {
        if (argc != 2 || std::filesystem::exists(argv[1]))
            throw std::runtime_error("Expected a fresh output directory");
        std::filesystem::create_directories(argv[1]);
        std::cout << std::setprecision(17)
                  << "instrument,rate,pitch,take,boundary,rms_before,rms_after,delta_db,attack_delta_db,one_second_delta_db\n";
        for (const unsigned rate : {48000U, 16000U})
        for (auto instrument : {jamloom::Instrument::piano, jamloom::Instrument::guitar})
        for (int pitch = instrument == jamloom::Instrument::piano ? 48 : 40;
             pitch <= (instrument == jamloom::Instrument::piano ? 96 : 79); ++pitch)
        for (unsigned take : {0U, 1U})
        for (int boundary : {55, 84, 95}) {
            if ((instrument == jamloom::Instrument::piano && boundary == 84) ||
                (instrument == jamloom::Instrument::guitar && boundary != 84)) continue;
            double energy[2][3]{};
            for (int side = 0; side < 2; ++side) {
                jamloom::Event e;
                e.instrument = instrument; e.pitch = pitch; e.velocity = boundary + side; e.noise_seed = take;
                jamloom::Voice voice; voice.start(e, rate);
                for (unsigned frame = 0; frame < rate; ++frame) {
                    const double x = voice.next();
                    if (!std::isfinite(x)) throw std::runtime_error("Nonfinite probe");
                    energy[side][2] += x*x;
                    if (frame < rate/2) energy[side][0] += x*x;
                    if (frame < rate/10) energy[side][1] += x*x;
                }
            }
            if (energy[0][0] <= 0 || energy[1][0] <= 0) throw std::runtime_error("Silent probe");
            std::cout << jamloom::instrument_name(instrument) << ',' << rate << ',' << pitch << ',' << take
                      << ',' << boundary << ',' << std::sqrt(energy[0][0]/(rate/2)) << ','
                      << std::sqrt(energy[1][0]/(rate/2));
            for (int window : {0, 1, 2})
                std::cout << ',' << 10*std::log10(energy[1][window]/energy[0][window]);
            std::cout << '\n';
        }
        for (auto instrument : {jamloom::Instrument::guitar, jamloom::Instrument::piano})
        for (int pitch : {49, 61, 73})
        for (unsigned take : {0U, 1U})
        for (bool muted : {false, true}) {
            if ((instrument == jamloom::Instrument::piano || muted) && (pitch != 61 || take != 1 || (instrument == jamloom::Instrument::piano && muted))) continue;
            const std::string name = std::string(argv[1]) + "/" + jamloom::instrument_name(instrument) +
                "-" + std::to_string(pitch) + "-" + std::to_string(take) + (muted ? "-muted" : "") + ".wav";
            jamloom::WavWriter wav(name, 48000, 8*60000);
            for (int velocity : {70, 80, 83, 84, 85, 86, 95, 110}) {
                jamloom::Event e; e.instrument = instrument; e.pitch = pitch;
                e.velocity = velocity; e.noise_seed = take; e.muted = muted;
                jamloom::Voice voice; voice.start(e, 48000);
                for (unsigned frame = 0; frame < 60000; ++frame) {
                    if (frame == 31200) voice.stop();
                    const float x = voice.next()*.5F;
                    if (!std::isfinite(x) || std::abs(x) >= .8F)
                        throw std::runtime_error("Invalid probe amplitude");
                    const float stereo[2]{x, x}; wav.write(stereo, 1);
                }
            }
            wav.close();
        }
    } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
