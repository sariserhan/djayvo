#include "djayvo/remix.h"
#include <cmath>
#include <iostream>
int main(){for(unsigned rate:{8000U,44100U,48000U}) for(double hz:{73.4162,110.,146.8324,220.,261.6256,329.6276,440.}){
 djayvo::AudioBuffer a;a.sample_rate=rate;a.mono.resize(rate*3);
 for(size_t i=0;i<a.mono.size();++i)a.mono[i]=float(.2*std::sin(6.283185307179586*hz*i/rate));
 auto x=djayvo::analyze(a);std::cout<<rate<<" "<<hz<<" "<<x.pitch_hz<<" "<<x.pitch_confidence<<"\n";
}}
