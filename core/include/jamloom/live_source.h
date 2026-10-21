#pragma once
#include "../../instruments/performance_voices.h"
#include <limits>

namespace jamloom {
struct LiveSourceControls {
    double level = .4, low = 0, mid = 0, high = 0, tone = 18000, echo = 0;
    bool bypass = false, roll = false, percussion = false;
    bool valid() const noexcept {
        return std::isfinite(level) && level >= 0 && level <= .8 &&
            std::isfinite(low) && low >= -24 && low <= 6 &&
            std::isfinite(mid) && mid >= -24 && mid <= 6 &&
            std::isfinite(high) && high >= -24 && high <= 6 &&
            std::isfinite(tone) && tone >= 100 && tone <= 18000 &&
            std::isfinite(echo) && echo >= 0 && echo <= .4;
    }
};

// Fixed storage, one render-thread owner. No allocation, locks, OS or network calls.
class LiveSourceDSP {
    static constexpr unsigned capacity = 96000;
    std::array<std::array<float, 2>, capacity> delay_{}, history_{};
    std::array<double, 2> bass_{}, treble_{}, tone_{};
    unsigned rate_ = 48000, head_ = 0, recorded_ = 0, rollStart_ = 0, rollLength_ = 0, rollAge_ = 0;
    std::uint64_t frame_ = 0, lastOnset_ = 0;
    double envelope_ = 0, floor_ = 0, interval_ = 0, confidence_ = 0, bpm_ = 0;
    double level_ = 0, wet_ = 0, effect_ = 1, rollMix_ = 0;
    std::array<double, 3> gains_{{1,1,1}};
    bool held_ = false;
    unsigned beats_ = 0;
    PerformanceVoice percussion_;
public:
    bool initialize(unsigned rate) noexcept {
        if (rate < 32000 || rate > capacity) return false;
        rate_ = rate; return true;
    }
    double bpm() const noexcept { return bpm_; }
    double confidence() const noexcept { return confidence_; }
    std::uint64_t frames() const noexcept { return frame_; }
    bool process(const float* left, const float* right, unsigned inputStride,
                 float* outLeft, float* outRight, unsigned outputStride,
                 unsigned frames, const LiveSourceControls& c, bool silent = false) noexcept {
        if (!left || !right || !outLeft || !outRight || !frames || frames > 4096 ||
            inputStride < 1 || inputStride > 2 || outputStride < 1 || outputStride > 2 || !c.valid()) return false;
        constexpr double tau = 6.283185307179586;
        const double bassPole = 1-std::exp(-tau*250/rate_), highPole = 1-std::exp(-tau*4000/rate_);
        const double filterPole = 1-std::exp(-tau*std::min(c.tone, rate_*.4)/rate_);
        const double fast = 1-std::exp(-1.0/(rate_*.004)), slow = 1-std::exp(-1.0/(rate_*.25));
        const double smooth = 1-std::exp(-1.0/(rate_*.015));
        const std::array<double,3> target{{std::pow(10,c.low/20),std::pow(10,c.mid/20),std::pow(10,c.high/20)}};
        if (c.roll && !held_ && recorded_ > rate_/4) {
            rollLength_ = std::min(recorded_, static_cast<unsigned>(rate_*60/(confidence_>.65?bpm_:120)));
            rollStart_ = (head_+capacity-rollLength_)%capacity; rollAge_ = 0; held_ = true;
        }
        if (!c.roll && rollMix_ < .0001) held_ = false;
        const unsigned echoFrames = rate_*3/10;
        for (unsigned f=0;f<frames;++f,++frame_) {
            const std::array<double,2> input{{std::isfinite(left[f*inputStride])?std::clamp(double(left[f*inputStride]),-4.,4.):0,
                std::isfinite(right[f*inputStride])?std::clamp(double(right[f*inputStride]),-4.,4.):0}};
            const double magnitude = std::max(std::abs(input[0]), std::abs(input[1]));
            envelope_ += fast*(magnitude-envelope_);
            floor_ += slow*(magnitude-floor_);
            if (envelope_ > .015 && envelope_ > floor_*2.2 && frame_-lastOnset_ > rate_*.27) {
                const double gap = double(frame_-lastOnset_)/rate_;
                if (lastOnset_ && gap < 1.25) {
                    const bool stable = interval_>0 && std::abs(gap-interval_)/interval_<.08;
                    confidence_ = stable?std::min(1.,confidence_+.18):.18;
                    interval_ = stable?interval_*.8+gap*.2:gap; bpm_ = 60/interval_;
                } else { confidence_=0; interval_=0; bpm_=0; }
                lastOnset_ = frame_;
                if (c.percussion && !c.bypass && confidence_>.65) { ++beats_; percussion_.start(beats_,12,beats_%2?41:70,65,rate_); }
            }
            if (frame_-lastOnset_ > rate_*3) { confidence_=0; bpm_=0; interval_=0; }
            const double accompaniment = percussion_.active ? percussion_.next()*.1 : 0;
            level_ += smooth*(c.level-level_); wet_ += smooth*(c.echo-wet_);
            effect_ += smooth*((c.bypass?0:1)-effect_);
            rollMix_ += smooth*((held_&&c.roll?1:0)-rollMix_);
            for(unsigned g=0;g<3;++g) gains_[g] += smooth*(target[g]-gains_[g]);
            const unsigned read = (head_+capacity-echoFrames)%capacity;
            for(unsigned ch=0;ch<2;++ch) {
                double x=input[ch];
                if(held_) {
                    const unsigned pos = rollAge_%rollLength_;
                    const double edge=std::min(1.,double(std::min(pos,rollLength_-1-pos))/128);
                    x += rollMix_*(history_[(rollStart_+pos)%capacity][ch]*edge-x);
                } else history_[head_][ch]=float(x);
                bass_[ch]+=bassPole*(x-bass_[ch]); treble_[ch]+=highPole*(x-treble_[ch]);
                x=bass_[ch]*gains_[0]+(treble_[ch]-bass_[ch])*gains_[1]+(x-treble_[ch])*gains_[2];
                tone_[ch]+=filterPole*(x-tone_[ch]);
                x=(tone_[ch]+wet_*delay_[read][ch])/(1+wet_);
                delay_[head_][ch]=float(tone_[ch]);
                x=input[ch]+effect_*(x-input[ch]+(c.percussion?accompaniment:0));
                const float output=silent?0:float(.89*std::tanh(x*level_/.89));
                (ch?outRight:outLeft)[f*outputStride]=output;
            }
            if(held_) ++rollAge_; else recorded_=std::min(capacity,recorded_+1);
            head_=(head_+1)%capacity;
        }
        return true;
    }
};
}
