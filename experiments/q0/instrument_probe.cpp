#include "jamloom/audio.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <vector>

// Offline audit only: link the unchanged production core, never the audio callback.
int main(int argc, char** argv) {
    try {
        if (argc != 2 || std::filesystem::exists(argv[1]))
            throw std::runtime_error("Choose a new probe directory");
        std::filesystem::create_directories(argv[1]);
        for (auto instrument : {jamloom::Instrument::piano, jamloom::Instrument::bass,
             jamloom::Instrument::drums, jamloom::Instrument::guitar,
             jamloom::Instrument::organ, jamloom::Instrument::pad, jamloom::Instrument::lead}) {
            for (bool short_gate : {true, false}) {
                jamloom::PerformancePlan plan;
                plan.tempo_milli_bpm = 120000; plan.bars = 4; plan.tail_ms = 2000;
                plan.sections = {{"probe", 0, 4}};
                jamloom::Track track{instrument, -9, 0, {}};
                const int pitch = instrument == jamloom::Instrument::bass ? 40 :
                    instrument == jamloom::Instrument::drums ? 46 : 60;
                for (int i = 0; i < 4; ++i)
                    track.notes.push_back({i * 3840, short_gate ? 240 : 2880, pitch,
                        i == 0 ? 40 : i == 1 ? 75 : 110,
                        instrument == jamloom::Instrument::guitar && i == 3});
                plan.tracks = {track};
                const auto schedule = jamloom::compile(plan);
                jamloom::Renderer renderer(schedule);
                const auto prefix = std::string(argv[1]) + "/" + jamloom::instrument_name(instrument) +
                    (short_gate ? "-short" : "-long");
                jamloom::WavWriter wav(prefix + ".wav", 48000, schedule.total_frames);
                std::vector<float> buffer(1024);
                while (!renderer.finished()) {
                    const auto frames = renderer.process(buffer.data(), 512);
                    if (!frames) throw std::runtime_error("No rendering progress");
                    wav.write(buffer.data(), frames);
                }
                wav.close();
                if (renderer.stats().nonfinite_samples || renderer.voice_overflows())
                    throw std::runtime_error("Invalid probe audio");
                jamloom::write_score(plan, prefix + ".score.json");
                jamloom::write_report(renderer.stats(), plan, schedule, prefix + ".report.json", "Q0 audit");
                std::ofstream events(prefix + ".events.tsv");
                events << "frame\tkind\tpitch\tvelocity\n";
                for (const auto& e : schedule.events)
                    events << e.frame << '\t' << (e.kind == jamloom::EventKind::note_on ? "on" : "off")
                           << '\t' << e.pitch << '\t' << e.velocity << '\n';
            }
        }
        std::cout << "PASS: 14 isolated probes; human realism NOT RUN\n";
    } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
