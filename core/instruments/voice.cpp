#include "djayvo/audio.h"
#include "synth.h"
#include <algorithm>
#include <cmath>

namespace djayvo {
namespace {
constexpr double pi = 3.14159265358979323846;
struct InstrumentSample {
    Instrument instrument;
    int root_midi;
    int velocity_max;
    unsigned take;
    const std::int16_t* pcm;
    std::size_t frames;
    std::uint32_t rate;
    bool muted = false;
};
#include "acoustic_bank.inc"
#include "electronic_bank.inc"
#include "guitar_bank.inc"
const InstrumentSample& select_sample(Instrument instrument,int pitch,int velocity,std::uint32_t seed,bool electronic,bool muted) noexcept {
    const int layer=instrument==Instrument::guitar?(muted?127:velocity<=84?84:127):!electronic && instrument==Instrument::piano?(velocity<=55?55:velocity<=95?95:127):127;
    const unsigned take=(instrument==Instrument::bass || (electronic && instrument==Instrument::piano))?0:seed%2U;
    const InstrumentSample* best=nullptr;
    const auto* bank=instrument==Instrument::guitar?guitar_samples:electronic?electronic_samples:samples;
    const auto size=instrument==Instrument::guitar?sizeof(guitar_samples)/sizeof(*guitar_samples):electronic?sizeof(electronic_samples)/sizeof(*electronic_samples):sizeof(samples)/sizeof(*samples);
    for (std::size_t i=0;i<size;++i) {
        const auto& sample=bank[i];
        if (sample.instrument!=instrument || sample.velocity_max!=layer || sample.take!=take || sample.muted!=muted) continue;
        if (!best || std::abs(sample.root_midi-pitch)<std::abs(best->root_midi-pitch)) best=&sample;
    }
    return *best; // Every validated instrument has entries in the compiled bank.
}
}
std::uint32_t release_frames(Instrument instrument,std::uint32_t rate) {
    const double seconds=instrument==Instrument::piano?0.30:instrument==Instrument::bass?0.16:instrument==Instrument::guitar?0.12:instrument==Instrument::pad?0.8:instrument==Instrument::lead?0.12:0.18;
    return static_cast<std::uint32_t>(std::llround(seconds*rate));
}
void Voice::start(const Event& e,std::uint32_t rate) noexcept {
    active_=true;released_=false;age_=0;release_age_=0;
    instrument_=e.instrument;pitch_=e.pitch;id_=e.note_id;rate_=rate;
    automation_=e.automation;
    release_length_=release_frames(instrument_,rate);
    synthesized_=instrument_==Instrument::organ || instrument_==Instrument::pad || instrument_==Instrument::lead;
    attack_seconds_=instrument_==Instrument::pad?.18:instrument_==Instrument::organ?.005:instrument_==Instrument::lead?.012:.001;
    if (synthesized_) {
        synth_frequency_=440*std::exp2((pitch_-69)/12.0);
        velocity_=std::pow(e.velocity/127.0,1.45);
        tone_=0;const double cutoff=instrument_==Instrument::pad?1800:instrument_==Instrument::lead?3500:7000;
        tone_alpha_=1-std::exp(-2*pi*std::min(cutoff,rate*.45)/rate);
        left_gain_=e.left_gain;right_gain_=e.right_gain;
        return;
    }
    const auto& sample=select_sample(instrument_,pitch_,e.velocity,e.noise_seed,e.electronic,e.muted);
    sample_=sample.pcm;sample_frames_=sample.frames;sample_position_=0;
    sample_step_=static_cast<double>(sample.rate)/rate;
    if (instrument_!=Instrument::drums) sample_step_*=std::exp2((pitch_-sample.root_midi)/12.0);
    // Small deterministic performance-level variation, never oscillator noise.
    velocity_=std::pow(e.velocity/127.0,1.45)*(0.97+(e.noise_seed%7U)*0.01);
    // shortcut: discrete recorded layers; assess boundary jumps before adding crossfades.
    const double brightness=e.velocity/127.0;
    const double cutoff_hz=instrument_==Instrument::piano?1600+6400*brightness:
                           instrument_==Instrument::guitar?1800+6000*brightness:
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
    if ((!synthesized_ && sample_position_>=static_cast<double>(sample_frames_)) ||
        (released_ && release_age_>=release_length_)) {active_=false;return 0;}
    double sound=0;
    if (synthesized_) sound=synth_sample(instrument_,static_cast<double>(age_)/rate_,synth_frequency_,rate_);
    else {
        const auto index=static_cast<std::int64_t>(sample_position_);
        const auto phase=static_cast<std::size_t>(std::llround((sample_position_-static_cast<double>(index))*64));
        for (int tap=0;tap<16;++tap) {
            const auto frame=index+tap-7;
            if (frame>=0 && static_cast<std::uint64_t>(frame)<sample_frames_)
                sound+=sample_[frame]*interpolation_[phase][static_cast<std::size_t>(tap)]/32768.0;
        }
    }
    tone_+=tone_alpha_*(sound-tone_);
    double envelope=std::min(1.0,static_cast<double>(age_)/(rate_*attack_seconds_));
    if (released_) {
        envelope*=0.5*(1+std::cos(pi*release_age_/release_length_));
        ++release_age_;
    }
    ++age_;sample_position_+=sample_step_;
    return static_cast<float>(tone_*envelope*velocity_);
}
} // namespace djayvo
