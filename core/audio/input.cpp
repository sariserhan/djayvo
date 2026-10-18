#include "djayvo/remix.h"
#include <algorithm>
#include <cmath>
#include <cstring>
#include <fstream>
#include <iomanip>
#include <limits>
#include <sstream>
#include <stdexcept>

namespace djayvo {
namespace {
std::uint32_t rotate(std::uint32_t x, unsigned n) { return (x >> n) | (x << (32U - n)); }
std::uint16_t u16(const std::vector<std::uint8_t>& b, std::size_t i) {
    return static_cast<std::uint16_t>(b.at(i) | (static_cast<unsigned>(b.at(i + 1)) << 8U));
}
std::uint32_t u32(const std::vector<std::uint8_t>& b, std::size_t i) {
    return static_cast<std::uint32_t>(u16(b,i)) | (static_cast<std::uint32_t>(u16(b,i+2)) << 16U);
}
bool tag(const std::vector<std::uint8_t>& b, std::size_t i, const char* text) {
    return i + 4 <= b.size() && std::memcmp(b.data()+i, text, 4) == 0;
}
}
std::string sha256(const std::vector<std::uint8_t>& input) {
    constexpr std::uint32_t k[64] = {
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2};
    std::uint32_t h[8] = {0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19};
    auto bytes = input;
    const auto bits = static_cast<std::uint64_t>(bytes.size()) * 8U;
    bytes.push_back(0x80);
    while (bytes.size() % 64 != 56) bytes.push_back(0);
    for (int i = 7; i >= 0; --i) bytes.push_back(static_cast<std::uint8_t>(bits >> (i * 8)));
    for (std::size_t off = 0; off < bytes.size(); off += 64) {
        std::uint32_t w[64]{};
        for (unsigned i = 0; i < 16; ++i)
            for (unsigned j = 0; j < 4; ++j) w[i] = (w[i] << 8U) | bytes[off + i*4 + j];
        for (unsigned i = 16; i < 64; ++i) {
            const auto s0 = rotate(w[i-15],7) ^ rotate(w[i-15],18) ^ (w[i-15] >> 3U);
            const auto s1 = rotate(w[i-2],17) ^ rotate(w[i-2],19) ^ (w[i-2] >> 10U);
            w[i] = w[i-16] + s0 + w[i-7] + s1;
        }
        auto a=h[0], b=h[1], c=h[2], d=h[3], e=h[4], f=h[5], g=h[6], z=h[7];
        for (unsigned i = 0; i < 64; ++i) {
            const auto s1 = rotate(e,6) ^ rotate(e,11) ^ rotate(e,25);
            const auto ch = (e & f) ^ (~e & g);
            const auto t1 = z + s1 + ch + k[i] + w[i];
            const auto s0 = rotate(a,2) ^ rotate(a,13) ^ rotate(a,22);
            const auto maj = (a & b) ^ (a & c) ^ (b & c);
            const auto t2 = s0 + maj;
            z=g; g=f; f=e; e=d+t1; d=c; c=b; b=a; a=t1+t2;
        }
        h[0]+=a; h[1]+=b; h[2]+=c; h[3]+=d; h[4]+=e; h[5]+=f; h[6]+=g; h[7]+=z;
    }
    std::ostringstream out;
    out << std::hex << std::setfill('0');
    for (auto value : h) out << std::setw(8) << value;
    return out.str();
}

AudioBuffer read_wav(const std::string& path) {
    std::ifstream file(path, std::ios::binary | std::ios::ate);
    if (!file) throw std::runtime_error("cannot open input WAV");
    const auto length = file.tellg();
    if (length < 44 || length > 32 * 1024 * 1024) throw std::invalid_argument("WAV file size outside limits");
    std::vector<std::uint8_t> bytes(static_cast<std::size_t>(length));
    file.seekg(0); file.read(reinterpret_cast<char*>(bytes.data()), static_cast<std::streamsize>(length));
    if (!file || !tag(bytes,0,"RIFF") || !tag(bytes,8,"WAVE") ||
        static_cast<std::uint64_t>(u32(bytes,4)) + 8 != bytes.size())
        throw std::invalid_argument("invalid/truncated RIFF WAV");
    std::size_t format = 0, format_size = 0, data = 0, data_size = 0;
    for (std::size_t pos = 12; pos < bytes.size();) {
        if (bytes.size() - pos < 8) throw std::invalid_argument("truncated WAV chunk header");
        const auto size = static_cast<std::size_t>(u32(bytes,pos+4));
        if (size > bytes.size() - pos - 8) throw std::invalid_argument("truncated WAV chunk");
        if (tag(bytes,pos,"fmt ")) {
            if (format || size < 16) throw std::invalid_argument("invalid/duplicate format chunk");
            format = pos + 8; format_size = size;
        }
        if (tag(bytes,pos,"data")) {
            if (data) throw std::invalid_argument("duplicate data chunk");
            data = pos + 8; data_size = size;
        }
        pos += 8 + size;
        if (size % 2) {
            if (pos >= bytes.size()) throw std::invalid_argument("missing WAV chunk padding");
            ++pos;
        }
    }
    if (!format || !data) throw std::invalid_argument("missing format/data chunk");
    auto codec = u16(bytes,format);
    const auto channels = u16(bytes,format+2), bits = u16(bytes,format+14);
    auto valid_bits = bits;
    if (codec == 0xfffe) {
        const std::uint8_t guid_tail[12]={0,0,0x10,0,0x80,0,0,0xaa,0,0x38,0x9b,0x71};
        if (format_size<40 || u16(bytes,format+16)<22 || u16(bytes,format+16)>format_size-18 ||
            std::memcmp(bytes.data()+format+28,guid_tail,sizeof(guid_tail))!=0 ||
            (u32(bytes,format+24)!=1 && u32(bytes,format+24)!=3))
            throw std::invalid_argument("unsupported/truncated extensible WAV format");
        codec=static_cast<std::uint16_t>(u32(bytes,format+24));
        valid_bits=u16(bytes,format+18);
        const auto mask=u32(bytes,format+20);
        if (!valid_bits || valid_bits>bits || (codec==3 && valid_bits!=32) ||
            (mask && !((channels==1 && (mask==1 || mask==4)) || (channels==2 && mask==3))))
            throw std::invalid_argument("unsupported extensible WAV precision/channel layout");
    }
    const auto rate = u32(bytes,format+4);
    if ((channels != 1 && channels != 2) || rate < 8000 || rate > 192000 ||
        !((codec == 1 && (bits == 16 || bits == 24 || bits == 32)) || (codec == 3 && bits == 32)))
        throw std::invalid_argument("supported input: mono/stereo PCM16/24/32 or float32, 8..192 kHz");
    const auto width = bits / 8U;
    const auto stride = channels * width;
    if (u16(bytes,format+12) != stride || u32(bytes,format+8) != rate * stride ||
        data_size == 0 || data_size % stride != 0)
        throw std::invalid_argument("inconsistent WAV layout");
    const auto frames = data_size / stride;
    if (frames > static_cast<std::size_t>(rate) * 15U)
        throw std::invalid_argument("input exceeds 15-second research limit");
    AudioBuffer result;
    result.sample_rate = result.original_rate = rate;
    result.original_frames = frames; result.sha256 = sha256(bytes);
    result.mono.resize(frames);
    for (std::size_t i = 0; i < frames; ++i) {
        double sum = 0;
        for (unsigned c = 0; c < channels; ++c) {
            const auto pos = data + i * stride + c * width;
            std::uint32_t raw = 0;
            for (unsigned j = 0; j < width; ++j) raw |= static_cast<std::uint32_t>(bytes[pos+j]) << (8U*j);
            if (codec==1 && valid_bits<bits && (raw & ((1U << (bits-valid_bits))-1U)))
                throw std::invalid_argument("extensible PCM padding bits must be zero");
            double value = 0;
            if (codec == 3) {
                float x = 0; std::memcpy(&x,&raw,sizeof(x)); value = x;
            } else {
                const std::int64_t signed_value = (raw & (1U << (bits-1U))) ?
                    static_cast<std::int64_t>(raw) - (std::int64_t{1} << bits) : raw;
                value = static_cast<double>(signed_value) / static_cast<double>(std::uint64_t{1} << (bits-1U));
            }
            if (!std::isfinite(value) || std::abs(value) > 1.0)
                throw std::invalid_argument("input contains nonfinite/out-of-range samples");
            sum += value;
        }
        result.mono[i] = static_cast<float>(sum / channels);
    }
    return result;
}

AudioBuffer resample(const AudioBuffer& source, std::uint32_t rate) {
    if (rate < 8000 || rate > 192000 || source.sample_rate < 8000 || source.sample_rate > 192000 ||
        source.mono.empty() || source.mono.size() > static_cast<std::size_t>(source.sample_rate) * 15)
        throw std::invalid_argument("invalid resampling input");
    for (const float x : source.mono)
        if (!std::isfinite(x) || std::abs(x) > 1) throw std::invalid_argument("invalid resampling sample");
    if (rate == source.sample_rate) return source;
    AudioBuffer out = source;
    out.sample_rate = rate;
    out.mono.assign((source.mono.size() * rate + source.sample_rate / 2) / source.sample_rate, 0);
    constexpr double pi = 3.14159265358979323846;
    // Windowed-sinc low-pass interpolation; wider support for large downsampling ratios.
    const double ratio = static_cast<double>(rate) / source.sample_rate;
    const double cutoff = 0.94 * std::min(1.0, ratio);
    const int radius = static_cast<int>(std::ceil(24.0 / cutoff));
    for (std::size_t i = 0; i < out.mono.size(); ++i) {
        const double pos = static_cast<double>(i) / ratio;
        const auto center = static_cast<std::int64_t>(std::floor(pos));
        double sum = 0, weight_sum = 0;
        for (int j = -radius + 1; j <= radius; ++j) {
            const auto index = center + j;
            if (index < 0 || index >= static_cast<std::int64_t>(source.mono.size())) continue;
            const double distance = pos - static_cast<double>(index);
            if (std::abs(distance) >= radius) continue;
            const double x = pi * distance * cutoff;
            const double sinc = std::abs(x) < 1e-12 ? 1.0 : std::sin(x) / x;
            const double weight = cutoff * sinc * (0.5 + 0.5 * std::cos(pi * distance / radius));
            sum += source.mono[static_cast<std::size_t>(index)] * weight;
            weight_sum += weight;
        }
        out.mono[i] = static_cast<float>(std::clamp(sum / weight_sum, -1.0, 1.0));
    }
    return out;
}
} // namespace djayvo
