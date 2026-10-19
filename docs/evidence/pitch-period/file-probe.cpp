#include "djayvo/remix.h"
#include <iomanip>
#include <iostream>
int main(int argc,char** argv){std::cout<<std::setprecision(17);for(int i=1;i<argc;++i){try{
 const auto source=djayvo::resample(djayvo::read_wav(argv[i]),48000);
 const auto a=djayvo::analyze(source);
 const auto p=djayvo::make_remix(source,a,djayvo::Strategy::call_response,4123,true,false);
 std::cout<<i<<'\t'<<a.pitch_hz<<'\t'<<a.pitch_confidence<<'\t'<<p.tonic_midi<<'\n';
 }catch(const std::exception&){std::cout<<i<<"\tREJECT\n";}}}
