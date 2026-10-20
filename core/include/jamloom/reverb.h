#pragma once
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <vector>

namespace jamloom {
// Original four-line damped feedback network; no recordings or runtime dependencies.
class InstrumentReverb {
public:
    explicit InstrumentReverb(std::uint32_t rate) {
        if (rate<8000 || rate>192000) throw std::invalid_argument("invalid reverb sample rate");
        const std::array<unsigned,4> milliseconds{{31,43,59,71}};
        for (std::size_t i=0;i<lines_.size();++i) lines_[i].resize(static_cast<std::size_t>(rate)*milliseconds[i]/1000);
        alpha_=1-std::exp(-6.283185307179586*3000/rate);
    }
    std::array<double,2> process(double input) noexcept {
        std::array<double,4> taps{};
        for (std::size_t i=0;i<lines_.size();++i) {
            taps[i]=lines_[i][positions_[i]];
            low_[i]+=alpha_*(taps[i]-low_[i]);
            if (std::abs(low_[i])<1e-15) low_[i]=0;
        }
        const std::array<double,4> feedback{{
            low_[0]+low_[1]+low_[2]+low_[3],low_[0]-low_[1]+low_[2]-low_[3],
            low_[0]+low_[1]-low_[2]-low_[3],low_[0]-low_[1]-low_[2]+low_[3]}};
        for (std::size_t i=0;i<lines_.size();++i) {
            // The normalized Hadamard matrix preserves energy; 0.58 contracts it.
            lines_[i][positions_[i]]=input+0.29*feedback[i];
            positions_[i]=(positions_[i]+1)%lines_[i].size();
        }
        return {{0.5*(taps[0]+taps[2]),0.5*(taps[1]+taps[3])}};
    }
private:
    std::array<std::vector<double>,4> lines_;
    std::array<std::size_t,4> positions_{};
    std::array<double,4> low_{};
    double alpha_=0;
};
} // namespace jamloom
