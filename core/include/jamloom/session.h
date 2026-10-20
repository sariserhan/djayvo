#pragma once
#include <cmath>
#include <cstdint>

namespace jamloom {
// Absolute 4/4 grid; round once so fractional-frame bars never accumulate drift.
// -1 rejects invalid inputs. Frames are exact integers within a 24-hour session.
inline double next_bar_frame(double earliest, double origin, unsigned rate, unsigned tempo) noexcept {
    if (rate<8000 || rate>192000 || tempo<60000 || tempo>180000 ||
        !std::isfinite(earliest) || !std::isfinite(origin) || earliest<0 || origin<0 ||
        earliest!=std::floor(earliest) || origin!=std::floor(origin) ||
        earliest>rate*86400.0 || origin>rate*86400.0) return -1;
    const auto unit=240000ULL*rate;
    const auto first=static_cast<std::uint64_t>(origin);
    const auto after=static_cast<std::uint64_t>(earliest);
    auto bar=after>first ? (after-first)*tempo/unit : 0ULL;
    auto frame=first+(bar*unit+tempo/2)/tempo;
    if (frame<after) frame=first+(++bar*unit+tempo/2)/tempo;
    return frame<=static_cast<std::uint64_t>(rate)*86400 ? static_cast<double>(frame) : -1;
}
}
extern "C" double jamloom_next_bar(double earliest, double origin, unsigned rate, unsigned tempo);
