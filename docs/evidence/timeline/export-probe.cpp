#include "djayvo/music.h"
#include <stdexcept>
int main(int argc,char** argv) {
    if (argc!=2) throw std::invalid_argument("provide a fresh score path");
    auto plan=djayvo::make_demo();
    plan.tempo_changes={{3840,110000},{7680,90000}};
    auto& track=plan.tracks.front();
    track.automation={{0,track.gain_db,track.pan},{7680,-20,0.4},{15360,-30,0}};
    djayvo::write_score(plan,argv[1]);
}
