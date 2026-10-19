#include "djayvo/audio.h"
#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <vector>

static void check(bool ok) { if (!ok) { std::cerr << "FAIL interpolation probe\n"; std::exit(1); } }
int main(int argc, char** argv) {
    check(argc == 2);
    const std::string prefix = argv[1];
    check(!std::filesystem::exists(prefix + ".json") && !std::filesystem::exists(prefix + ".f32"));
    std::ofstream pcm(prefix + ".f32", std::ios::binary);
    std::ofstream report(prefix + ".json");
    check(pcm.good() && report.good()); report.precision(17);
    report << "{\"cases\":[";
    for (unsigned scenario = 0; scenario < 3; ++scenario) {
        djayvo::Voice voice;
        std::vector<double> times(2000);
        std::array<float, 256> samples{};
        for (unsigned note = 0; note < times.size(); ++note) {
            djayvo::Event event;
            event.instrument = scenario == 2 && note % 3 == 1 ? djayvo::Instrument::organ : djayvo::Instrument::piano;
            event.pitch = scenario == 0 ? 60 : 21 + static_cast<int>(note % 88);
            event.velocity = 40 + static_cast<int>(note % 88); event.noise_seed = note + 1;
            const unsigned rate = scenario == 2 ? (note % 2 ? 16000U : 48000U) : 48000U;
            voice = djayvo::Voice{}; // Empty per-voice cache on every measured note.
            const auto start = std::chrono::steady_clock::now();
            voice.start(event, rate);
            times[note] = std::chrono::duration<double,std::micro>(std::chrono::steady_clock::now()-start).count();
            djayvo::Voice fresh; fresh.start(event, rate);
            for (unsigned i = 0; i < samples.size(); ++i) {
                if (i == 128) { voice.stop(); fresh.stop(); }
                samples[i] = voice.next(); check(std::isfinite(samples[i]) && samples[i] == fresh.next());
            }
            pcm.write(reinterpret_cast<const char*>(samples.data()), sizeof(samples));
        }
        const double first = times[0];
        std::sort(times.begin(), times.end());
        if (scenario) report << ',';
        report << "{\"scenario\":" << scenario << ",\"notes\":2000,\"first_us\":" << first
               << ",\"p50_us\":" << times[999] << ",\"p95_us\":" << times[1899]
               << ",\"max_us\":" << times.back() << '}';
    }
    report << "]}\n"; check(pcm.good() && report.good());
    std::cout << "PASS 6000 empty-cache/fresh voice comparisons, attack/release and rate/instrument changes\n";
}
