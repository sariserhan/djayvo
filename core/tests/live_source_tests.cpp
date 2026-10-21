#include "jamloom/live_source.h"
#include <chrono>
#include <iostream>
#include <memory>
#include <stdexcept>
void check(bool value,const char* message){if(!value)throw std::runtime_error(message);}
int main(){
    auto dsp=std::make_unique<jamloom::LiveSourceDSP>();
    check(!dsp->initialize(8000),"unsupported rate");check(dsp->initialize(48000),"rate");
    std::array<float,256> in{},out{};jamloom::LiveSourceControls c;
    c.level=1;check(!dsp->process(in.data(),in.data()+1,2,out.data(),out.data()+1,2,128,c),"invalid controls");c.level=.4;
    check(!dsp->process(in.data(),in.data()+1,3,out.data(),out.data()+1,2,128,c),"invalid layout");
    check(!dsp->process(in.data(),in.data()+1,2,out.data(),out.data()+1,2,4097,c),"oversize callback");
    double dry=0,filtered=0,bypass=0;unsigned index=0;
    auto wave=[&](unsigned blocks,double& energy){for(unsigned block=0;block<blocks;++block){for(unsigned i=0;i<128;++i,++index){float x=float(.2*std::sin(6.283185307179586*4000*index/48000));in[i*2]=x;in[i*2+1]=-x;}check(dsp->process(in.data(),in.data()+1,2,out.data(),out.data()+1,2,128,c),"process");for(unsigned i=0;i<128;++i){energy+=out[i*2]*out[i*2];check(std::abs(out[i*2]+out[i*2+1])<1e-5,"stereo preserved");}}};
    wave(300,dry);c.tone=100;wave(300,filtered);c.bypass=true;wave(300,bypass);
    check(filtered<dry*.08,"lowpass attenuation");check(bypass>dry*.9,"bypass restoration");
    c.bypass=false;c.roll=true;c.echo=.4;c.low=6;c.mid=6;c.high=6;c.percussion=true;
    in.fill(4);in[0]=std::numeric_limits<float>::infinity();in[1]=std::numeric_limits<float>::quiet_NaN();
    for(unsigned b=0;b<200;++b){check(dsp->process(in.data(),in.data()+1,2,out.data(),out.data()+1,2,128,c),"effect render");for(float x:out)check(std::isfinite(x)&&std::abs(x)<=.89,"finite ceiling");}
    check(dsp->process(in.data(),in.data()+1,2,out.data(),out.data()+1,2,128,c,true),"muted renderer");for(float x:out)check(x==0,"muted output");
    dsp=std::make_unique<jamloom::LiveSourceDSP>();dsp->initialize(48000);c=jamloom::LiveSourceControls{};c.percussion=true;
    const auto begin=std::chrono::steady_clock::now();
    for(unsigned frame=0;frame<48000*12;frame+=128){for(unsigned i=0;i<128;++i){unsigned t=(frame+i)%24000;in[i*2]=in[i*2+1]=t<960?float(.4*std::sin(6.283185307179586*220*t/48000)):0;}dsp->process(in.data(),in.data()+1,2,out.data(),out.data()+1,2,128,c);}
    check(std::abs(dsp->bpm()-120)<1,"pulse tempo");check(dsp->confidence()>.65,"steady pulse confidence");
    in.fill(0);for(unsigned i=0;i<1500;++i)dsp->process(in.data(),in.data()+1,2,out.data(),out.data()+1,2,128,c);
    check(dsp->confidence()==0&&dsp->bpm()==0,"silence unlocks pulse");
    const auto ms=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-begin).count();
    std::cout<<"PASS: bounds, stereo, EQ/filter bypass, roll/echo ceiling, nonfinite input, muted output, pulse/relock; "<<dsp->frames()<<" frames in "<<ms<<" ms (offline CPU only)\n";
}
