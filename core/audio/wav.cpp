#include "jamloom/audio.h"
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <limits>
#include <locale>
#include <set>
#include <stdexcept>

namespace jamloom {
namespace {
void u16(std::ostream& out, std::uint16_t n) {
    const char bytes[] = {static_cast<char>(n & 255U), static_cast<char>((n >> 8U) & 255U)};
    out.write(bytes, 2);
}
void u32(std::ostream& out, std::uint32_t n) {
    u16(out, static_cast<std::uint16_t>(n & 65535U));
    u16(out, static_cast<std::uint16_t>(n >> 16U));
}
double db(double value) { return value > 0 ? 20 * std::log10(value) : -300.0; }
}
WavWriter::WavWriter(const std::string& path, std::uint32_t rate, std::uint64_t frames)
    : expected_(frames) {
    if (rate < 8000 || rate > 192000 || frames == 0 ||
        frames > (std::numeric_limits<std::uint32_t>::max() - 36U) / 4U)
        throw std::invalid_argument("WAV rate/length invalid or RIFF 4 GiB limit exceeded");
    stream_.open(path, std::ios::binary | std::ios::trunc);
    if (!stream_) throw std::runtime_error("cannot open WAV: " + path);
    const auto bytes = static_cast<std::uint32_t>(frames * 4);
    stream_.write("RIFF", 4); u32(stream_, 36U + bytes); stream_.write("WAVEfmt ", 8);
    u32(stream_, 16); u16(stream_, 1); u16(stream_, 2); u32(stream_, rate);
    u32(stream_, rate * 4); u16(stream_, 4); u16(stream_, 16);
    stream_.write("data", 4); u32(stream_, bytes);
    if (!stream_) throw std::runtime_error("WAV header write failed");
}
void WavWriter::write(const float* stereo, std::size_t frames) {
    if (stereo == nullptr || !stream_.is_open() || frames > expected_ - written_)
        throw std::invalid_argument("invalid WAV write");
    for (std::size_t i = 0; i < frames * 2; ++i) {
        if (!std::isfinite(stereo[i]) || std::abs(stereo[i]) > 1.0F)
            throw std::invalid_argument("WAV input must be finite and within [-1, 1]");
        const auto sample = static_cast<std::int16_t>(std::lround(static_cast<double>(stereo[i]) * 32767.0));
        u16(stream_, static_cast<std::uint16_t>(sample));
    }
    written_ += frames;
    if (!stream_) throw std::runtime_error("WAV write failed");
}
void WavWriter::close() {
    if (written_ != expected_) throw std::runtime_error("incomplete WAV render");
    stream_.flush();
    if (!stream_) throw std::runtime_error("WAV flush failed");
    stream_.close();
    if (stream_.fail()) throw std::runtime_error("WAV close failed");
}

void write_report(const AudioStats& a, const PerformancePlan& p, const Schedule& s, const std::string& path, const char* milestone) {
    std::ofstream out(path);
    out.imbue(std::locale::classic());
    out << std::setprecision(12);
    const double left = a.frames ? std::sqrt(a.square_sum_left / static_cast<double>(a.frames)) : 0;
    const double right = a.frames ? std::sqrt(a.square_sum_right / static_cast<double>(a.frames)) : 0;
    std::set<std::string> banks;
    for (const auto& track:p.tracks)
        banks.insert(track.instrument>=Instrument::organ?"sustained-v1":track.instrument==Instrument::guitar?"guitar-v1":
                     track.electronic?"electronic-v2":"acoustic-v1");
    std::string bank;
    for (const auto& name:banks) {if (!bank.empty()) bank+='+';bank+=name;}
    const bool accepted = a.frames == s.total_frames && a.nonfinite_samples == 0 && a.peak <= s.ceiling + 1e-7;
    out << "{\n  \"project\": \"Jamloom\",\n  \"milestone\": \"" << milestone << "\",\n  \"technical_render\": \""
        << (accepted ? "PASS" : "FAIL") << "\",\n  \"listening_validation\": \"NOT RUN\",\n"
        << "  \"macos_portability\": \"NOT RUN\",\n  \"instrument_bank\": \"" << bank << "\",\n  \"seed\": " << p.seed
        << ",\n  \"sample_rate\": " << s.sample_rate << ",\n  \"music_frames\": " << s.music_frames
        << ",\n  \"total_frames\": " << a.frames << ",\n  \"duration_seconds\": "
        << static_cast<double>(a.frames) / s.sample_rate
        << ",\n  \"events\": " << s.events.size() << ",\n  \"peak_linear\": " << a.peak
        << ",\n  \"peak_dbfs\": " << db(a.peak) << ",\n  \"pre_limiter_peak_linear\": " << a.pre_limiter_peak
        << ",\n  \"ceiling_dbfs\": " << p.ceiling_dbfs
        << ",\n  \"rms_dbfs_left\": " << db(left) << ",\n  \"rms_dbfs_right\": " << db(right)
        << ",\n  \"max_adjacent_sample_step\": " << a.max_step
        << ",\n  \"limited_samples\": " << a.limited_samples
        << ",\n  \"nonfinite_samples\": " << a.nonfinite_samples
        << ",\n  \"loudness_method\": \"unweighted RMS; not integrated LUFS\"\n}\n";
    out.flush();
    if (!out) throw std::runtime_error("cannot write report: " + path);
}
} // namespace jamloom
