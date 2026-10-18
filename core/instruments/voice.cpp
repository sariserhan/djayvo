#include "djayvo/audio.h"
#include <algorithm>
#include <cmath>

namespace djayvo {
namespace {
constexpr double pi = 3.14159265358979323846;
struct InstrumentSample {
    Instrument instrument;
    int root_midi;
    const std::int16_t* pcm;
    std::size_t frames;
    std::uint32_t rate;
};
#include "acoustic_bank.inc"
const InstrumentSample& select_sample(Instrument instrument,int pitch) noexcept {
    const InstrumentSample* best=nullptr;
    for (const auto& sample:samples) {
        if (sample.instrument!=instrument) continue;
        if (!best || std::abs(sample.root_midi-pitch)<std::abs(best->root_midi-pitch)) best=&sample;
    }
    return *best; // Every validated instrument has entries in the compiled bank.
}
}
std::uint32_t release_frames(Instrument instrument,std::uint32_t rate) {
    const double seconds=instrument==Instrument::piano?0.30:instrument==Instrument::bass?0.16:0.18;
    return static_cast<std::uint32_t>(std::llround(seconds*rate));
}
void Voice::start(const Event& e,std::uint32_t rate) noexcept {
    active_=true;released_=false;age_=0;release_age_=0;
    instrument_=e.instrument;pitch_=e.pitch;id_=e.note_id;rate_=rate;
    release_length_=release_frames(instrument_,rate);
    const auto& sample=select_sample(instrument_,pitch_);
    sample_=sample.pcm;sample_frames_=sample.frames;sample_position_=0;
    sample_step_=static_cast<double>(sample.rate)/rate;
    if (instrument_!=Instrument::drums) sample_step_*=std::exp2((pitch_-sample.root_midi)/12.0);
    // Small deterministic performance-level variation, never oscillator noise.
    velocity_=std::pow(e.velocity/127.0,1.45)*(0.97+(e.noise_seed%7U)*0.01);
    // shortcut: single-layer samples; replace filtering with velocity layers if listening warrants it.
    const double brightness=e.velocity/127.0;
    const double cutoff_hz=instrument_==Instrument::piano?1600+6400*brightness:
                           instrument_==Instrument::bass?1200+3500*brightness:2500+8000*brightness;
    tone_=0;tone_alpha_=1-std::exp(-2*pi*std::min(cutoff_hz,rate*0.45)/rate);
    left_gain_=e.left_gain;right_gain_=e.right_gain;
    // Precompute short windowed-sinc fractional-delay kernels at note start.
    // A lower cutoff when reading faster suppresses downsampling aliases.
    const double cutoff=0.94*std::min(1.0,1.0/sample_step_);
    for (std::size_t phase=0;phase<interpolation_.size();++phase) {
        double total=0;
        for (int tap=0;tap<16;++tap) {
            const double distance=static_cast<double>(phase)/64.0-(tap-7);
            const double x=pi*distance*cutoff;
            const double value=std::abs(distance)>=8?0:cutoff*(std::abs(x)<1e-12?1:std::sin(x)/x)*
                               (0.5+0.5*std::cos(pi*distance/8));
            interpolation_[phase][static_cast<std::size_t>(tap)]=static_cast<float>(value);
            total+=value;
        }
        for (auto& value:interpolation_[phase]) value=static_cast<float>(value/total);
    }
}
void Voice::stop() noexcept {
    if (!released_) {released_=true;release_age_=0;}
}
float Voice::next() noexcept {
    if (!active_) return 0;
    if (sample_position_>=static_cast<double>(sample_frames_) ||
        (released_ && release_age_>=release_length_)) {active_=false;return 0;}
    const auto index=static_cast<std::int64_t>(sample_position_);
    const auto phase=static_cast<std::size_t>(std::llround((sample_position_-static_cast<double>(index))*64));
    double sound=0;
    for (int tap=0;tap<16;++tap) {
        const auto frame=index+tap-7;
        if (frame>=0 && static_cast<std::uint64_t>(frame)<sample_frames_)
            sound+=sample_[frame]*interpolation_[phase][static_cast<std::size_t>(tap)]/32768.0;
    }
    tone_+=tone_alpha_*(sound-tone_);
    double envelope=std::min(1.0,static_cast<double>(age_)/(rate_*0.001));
    if (released_) {
        envelope*=0.5*(1+std::cos(pi*release_age_/release_length_));
        ++release_age_;
    }
    ++age_;sample_position_+=sample_step_;
    return static_cast<float>(tone_*envelope*velocity_);
}
} // namespace djayvo
