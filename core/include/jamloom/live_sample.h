#pragma once
#include <array>
#include <atomic>
#include <algorithm>
#include <cmath>
#include <cstdint>

namespace jamloom {
// One UI producer and one audio consumer. The producer never overwrites a readable sample.
class LiveSamplePad {
    enum { Empty, Writing, Ready, Clearing };
    std::array<float,48000*4> pcm_{};
    std::atomic<unsigned> state_{Empty}, request_{0};
    std::atomic<bool> playing_{false};
    unsigned count_=0, seen_=0;
    double cursor_=0, last_=0, tail_=0;
    unsigned tailFrames_=0;
    bool active_=false;
public:
    bool load(const float* pcm,unsigned count,double rate) noexcept {
        if(!pcm || !count || !std::isfinite(rate) || rate<8000 || rate>192000 || count>rate*4 || count*48000.0/rate<1)return false;
        unsigned empty=Empty;if(!state_.compare_exchange_strong(empty,Writing))return false;
        count_=std::min(unsigned(pcm_.size()),unsigned(count*48000.0/rate));
        for(unsigned i=0;i<count_;++i) {
            const double at=i*rate/48000;const unsigned a=std::min(count-1,unsigned(at)),b=std::min(count-1,a+1);
            const double x=std::isfinite(pcm[a])?std::clamp(double(pcm[a]),-1.,1.):0;
            const double y=std::isfinite(pcm[b])?std::clamp(double(pcm[b]),-1.,1.):0;
            pcm_[i]=float(x+(y-x)*(at-a));
        }
        request_.fetch_add(2);state_.store(Ready,std::memory_order_release);return true;
    }
    bool ready() const noexcept { return state_.load(std::memory_order_acquire)==Ready; }
    bool playing() const noexcept { return playing_.load(); }
    void play() noexcept { if(ready())request_.store((request_.load()+2)|1); }
    void stop() noexcept { request_.store((request_.load()+2)&~1u); }
    void clear() noexcept { stop();unsigned ready=Ready;state_.compare_exchange_strong(ready,Clearing); }
    // UI calls after callback acknowledges clear; no retained PCM remains after erasure.
    bool erase() noexcept {
        unsigned empty=Empty;if(!state_.compare_exchange_strong(empty,Writing))return false;
        pcm_.fill(0);count_=0;state_.store(Empty,std::memory_order_release);return true;
    }
    void quiescent(bool clearSample=false) noexcept {
        stop();active_=false;last_=tail_=0;tailFrames_=0;playing_.store(false);seen_=request_.load();
        if(clearSample || state_.load()==Clearing){state_.store(Empty);erase();}
    }
    double next(unsigned rate) noexcept {
        const unsigned state=state_.load(std::memory_order_acquire);
        if(state==Clearing){last_=tail_=0;tailFrames_=0;active_=false;playing_.store(false);seen_=request_.load();state_.store(Empty,std::memory_order_release);return 0;}
        if(state!=Ready)return 0;
        const auto command=request_.load();
        if(command!=seen_){seen_=command;tail_=last_;tailFrames_=96;cursor_=0;active_=command&1;}
        double value=tailFrames_ ? tail_*tailFrames_--/96. : 0;
        if(active_ && count_) {
            const unsigned a=unsigned(cursor_),b=std::min(count_-1,a+1);
            const double fade=std::min({1.,cursor_/96.,(count_-1-cursor_)/96.});
            value+=(pcm_[a]+(pcm_[b]-pcm_[a])*(cursor_-a))*std::max(0.,fade);
            cursor_+=48000.0/rate;
            if(cursor_>=count_)active_=false;
        }
        playing_.store(active_ || tailFrames_>0);last_=value;return value;
    }
};
static_assert(std::atomic<unsigned>::is_always_lock_free && std::atomic<bool>::is_always_lock_free,"Sampler commands must be lock-free");
}
