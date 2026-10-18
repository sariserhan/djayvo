#include "djayvo/audio.h"
#include <charconv>
#include <filesystem>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
std::uint32_t number(const std::string& text) {
    std::uint32_t result = 0;
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size())
        throw std::invalid_argument("expected unsigned integer, got: " + text);
    return result;
}
}
int main(int argc, char** argv) {
    try {
        std::string output = "renders/m0a";
        std::uint32_t seed = 4123, rate = 48000, block = 512;
        for (int i = 1; i < argc; ++i) {
            const std::string arg = argv[i];
            if (arg == "--help") {
                std::cout << "Djayvo M0a offline renderer\n"
                          << "Usage: djayvo_render [--output PREFIX] [--seed UINT32] "
                          << "[--sample-rate 8000..192000] [--block-size 1..65536]\n"
                          << "Writes PREFIX.wav, PREFIX.score.json and PREFIX.report.json.\n";
                return 0;
            }
            if (i + 1 >= argc) throw std::invalid_argument("missing value for " + arg);
            const std::string value = argv[++i];
            if (arg == "--output") output = value;
            else if (arg == "--seed") seed = number(value);
            else if (arg == "--sample-rate") rate = number(value);
            else if (arg == "--block-size") block = number(value);
            else throw std::invalid_argument("unknown option: " + arg);
        }
        if (output.empty()) throw std::invalid_argument("output prefix cannot be empty");
        auto plan = djayvo::make_demo(seed);
        plan.sample_rate = rate;
        const auto schedule = djayvo::compile(plan);
        djayvo::Renderer renderer(schedule, block);
        const auto parent = std::filesystem::path(output).parent_path();
        if (!parent.empty()) std::filesystem::create_directories(parent);
        djayvo::WavWriter wav(output + ".wav", rate, schedule.total_frames);
        std::vector<float> buffer(static_cast<std::size_t>(block) * 2);
        while (!renderer.finished()) {
            const auto frames = renderer.process(buffer.data(), block);
            if (frames == 0) throw std::runtime_error("renderer did not progress");
            wav.write(buffer.data(), frames);
        }
        wav.close();
        if (renderer.voice_overflows() || renderer.stats().nonfinite_samples)
            throw std::runtime_error("render rejected: voice overflow or nonfinite audio");
        djayvo::write_score(plan, output + ".score.json");
        djayvo::write_report(renderer.stats(), plan, schedule, output + ".report.json");
        std::cout << "PASS: " << output << ".wav (" << schedule.total_frames << " frames, "
                  << rate << " Hz, stereo PCM16)\nScore: " << output << ".score.json\nReport: "
                  << output << ".report.json\nListening validation: NOT RUN\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "FAIL: " << error.what() << '\n';
        return 1;
    }
}
