#pragma once
#include "djayvo/music.h"
#include <cmath>

namespace djayvo {
// Original partials, not recorded instruments or artist-derived sound material.
inline double synth_sample(Instrument instrument,double time,double frequency,double rate) noexcept {
    constexpr double tau=6.28318530717958647692;
    const auto partial=[&](double harmonic,double detune=1.0) {
        const double hz=frequency*harmonic*detune;
        return hz<rate*(harmonic==1.0?.45:.42)?std::sin(tau*hz*time):0.0;
    };
    if (instrument==Instrument::organ) {
        const double sustain=.60*partial(1)+.25*partial(2)+.10*partial(3)+.06*partial(4)+.03*partial(6)+.01*partial(8);
        return .65*(sustain+.12*std::exp(-time/.09)*partial(3));
    }
    if (instrument==Instrument::pad) {
        double sound=0;
        for (double detune:{.9982,1.0,1.0018})
            sound+=partial(1,detune)+.25*partial(2,detune)+.10*partial(3,detune)+.04*partial(4,detune);
        return .20*sound;
    }
    const double triangle=partial(1)-partial(3)/9+partial(5)/25-partial(7)/49+.08*partial(2);
    return .65*triangle*(.65+.35*std::exp(-time/.15));
}
} // namespace djayvo
