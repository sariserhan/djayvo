#pragma once
#include "../../instruments/performance_voices.h"
#include <limits>

namespace jamloom {
struct LiveSourceControls {
    double level = .4, low = 0, mid = 0, high = 0, tone = 18000, echo = 0;
    bool bypass = false, roll = false, percussion = false;
    double highpass = 20, echoSeconds = .3, loopBeats = 1, tempo = 120, scratchRate = 0, mix = 1;
    bool reverse = false, scratch = false, mute = false;
    bool valid() const noexcept {
        return std::isfinite(level) && level >= 0 && level <= .8 &&
            std::isfinite(low) && low >= -24 && low <= 6 &&
            std::isfinite(mid) && mid >= -24 && mid <= 6 &&
            std::isfinite(high) && high >= -24 && high <= 6 &&
            std::isfinite(tone) && tone >= 100 && tone <= 18000 &&
            std::isfinite(echo) && echo >= 0 && echo <= .4 &&
            std::isfinite(highpass) && highpass >= 20 && highpass <= 4000 &&
            std::isfinite(echoSeconds) && echoSeconds >= .05 && echoSeconds <= 1 &&
            std::isfinite(loopBeats) && loopBeats >= .25 && loopBeats <= 4 &&
            std::isfinite(tempo) && tempo >= 60 && tempo <= 200 &&
            std::isfinite(scratchRate) && scratchRate >= -2 && scratchRate <= 2 &&
            std::isfinite(mix) && mix >= 0 && mix <= 1;
    }
};

// Four seconds at the highest supported rate; frozen during a gesture/loop.
// Returning live discards the old window so the next gesture cannot replay stale audio.
class LiveDeckBuffer {
    static constexpr unsigned capacity = 96000*4;
    std::array<std::array<float,2>,capacity> history_{};
    unsigned head_ = 0, count_ = 0, start_ = 0, length_ = 0;
    double cursor_ = 0, blend_ = 0, speed_ = 0;
    bool held_ = false;
public:
    double seconds(unsigned rate) const noexcept { return double(count_)/rate; }
    std::array<double,2> sample(const std::array<double,2>& input, unsigned rate, const LiveSourceControls& c) noexcept {
        const bool requested = c.roll || c.reverse || c.scratch;
        const unsigned length = c.roll ? std::min(count_,unsigned(rate*60.0/c.tempo*c.loopBeats)) : count_;
        if(requested && count_>=128 && (!held_ || length_!=length)) {
            held_=true;length_=length;start_=(head_+capacity-length_)%capacity;
            cursor_=(c.reverse||c.scratch)?double(length_-1):0;
        }
        const double smooth=1-std::exp(-1.0/(rate*.008));
        blend_+=smooth*((requested&&held_?1:0)-blend_);
        const double target=c.scratch?c.scratchRate:(c.reverse?-1:1);
        speed_+=smooth*(target-speed_);
        std::array<double,2> result=input;
        if(held_) {
            const unsigned a=unsigned(cursor_),b=(a+1)%length_;
            const double fraction=cursor_-a, edge=std::min(1.,double(std::min(a,length_-1-a))/64);
            const double gain=c.scratch?std::min(1.,std::abs(speed_)*4):1;
            for(unsigned ch=0;ch<2;++ch) {
                const double replay=history_[(start_+a)%capacity][ch]*(1-fraction)+history_[(start_+b)%capacity][ch]*fraction;
                result[ch]+=blend_*(replay*edge*gain-input[ch]);
            }
            cursor_+=speed_;
            if(cursor_<0)cursor_+=length_;else if(cursor_>=length_)cursor_-=length_;
            if(!requested && blend_<.0001){held_=false;count_=0;}
        }
        if(!held_) {history_[head_]={{float(input[0]),float(input[1])}};head_=(head_+1)%capacity;count_=std::min(rate*4,count_+1);}
        return result;
    }
};

// Fixed storage, one render-thread owner. No allocation, locks, OS or network calls.
class LiveSourceDSP {
    static constexpr unsigned capacity = 96000;
    std::array<std::array<float, 2>, capacity> delay_{};
    LiveDeckBuffer buffer_;
    std::array<double, 2> bass_{}, treble_{}, tone_{}, highpass_{};
    unsigned rate_ = 48000, head_ = 0;
    std::uint64_t frame_ = 0, lastOnset_ = 0;
    double envelope_ = 0, floor_ = 0, interval_ = 0, confidence_ = 0, bpm_ = 0;
    double level_ = 0, wet_ = 0, effect_ = 1, mix_ = 0, echoFrames_ = 14400;
    std::array<double, 3> gains_{{1,1,1}};
    unsigned beats_ = 0;
    PerformanceVoice percussion_;
public:
    bool initialize(unsigned rate) noexcept {
        if (rate < 32000 || rate > capacity) return false;
        rate_ = rate; return true;
    }
    double bufferedSeconds() const noexcept { return buffer_.seconds(rate_); }
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
        const double hpPole = 1-std::exp(-tau*c.highpass/rate_);
        const double fast = 1-std::exp(-1.0/(rate_*.004)), slow = 1-std::exp(-1.0/(rate_*.25));
        const double smooth = 1-std::exp(-1.0/(rate_*.015));
        const std::array<double,3> target{{std::pow(10,c.low/20),std::pow(10,c.mid/20),std::pow(10,c.high/20)}};
        for (unsigned f=0;f<frames;++f,++frame_) {
            const std::array<double,2> input{{std::isfinite(left[f*inputStride])?std::clamp(double(left[f*inputStride]),-4.,4.):0,
                std::isfinite(right[f*inputStride])?std::clamp(double(right[f*inputStride]),-4.,4.):0}};
            const auto transported=buffer_.sample(input,rate_,c);
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
            mix_ += smooth*((c.mute?0:c.mix)-mix_);
            echoFrames_ += smooth*(rate_*c.echoSeconds-echoFrames_);
            for(unsigned g=0;g<3;++g) gains_[g] += smooth*(target[g]-gains_[g]);
            const unsigned read = (head_+capacity-std::min(capacity-1,unsigned(echoFrames_)))%capacity;
            for(unsigned ch=0;ch<2;++ch) {
                double x=transported[ch];
                bass_[ch]+=bassPole*(x-bass_[ch]); treble_[ch]+=highPole*(x-treble_[ch]);
                x=bass_[ch]*gains_[0]+(treble_[ch]-bass_[ch])*gains_[1]+(x-treble_[ch])*gains_[2];
                highpass_[ch]+=hpPole*(x-highpass_[ch]);
                if(c.highpass>20)x-=highpass_[ch];
                tone_[ch]+=filterPole*(x-tone_[ch]);
                x=(tone_[ch]+wet_*delay_[read][ch])/(1+wet_);
                delay_[head_][ch]=float(tone_[ch]);
                x=transported[ch]+effect_*(x-transported[ch]+(c.percussion?accompaniment:0));
                const float output=silent?0:float(mix_*.89*std::tanh(x*level_/.89));
                (ch?outRight:outLeft)[f*outputStride]=output;
            }
            head_=(head_+1)%capacity;
        }
        return true;
    }
};
}
