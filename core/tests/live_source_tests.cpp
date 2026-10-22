#include "jamloom/live_source.h"
#include <chrono>
#include <iostream>
#include <memory>
#include <stdexcept>
void check(bool value,const char* message){if(!value)throw std::runtime_error(message);}
// Measure each control independently after smoothing, using generated PCM only.
double toneEnergy(double frequency, jamloom::LiveSourceControls controls) {
    auto engine=std::make_unique<jamloom::LiveSourceDSP>();engine->initialize(48000);
    std::array<float,128> input{},output{};double energy=0;
    for(unsigned block=0;block<400;++block) {
        for(unsigned i=0;i<128;++i)input[i]=float(.2*std::sin(6.283185307179586*frequency*(block*128+i)/48000));
        check(engine->process(input.data(),input.data(),1,output.data(),output.data(),1,128,controls),"control render");
        if(block>100)for(float sample:output)energy+=sample*sample;
    }
    return energy;
}
void individualEffects() {
    jamloom::LiveSourceControls neutral;
    const std::array<double,3> frequencies{{60,1000,12000}};
    for(unsigned band=0;band<3;++band) {
        auto cut=neutral;if(band==0)cut.low=-24;else if(band==1)cut.mid=-24;else cut.high=-24;
        check(toneEnergy(frequencies[band],cut)<toneEnergy(frequencies[band],neutral)*.35,"each EQ band attenuates its signal");
        cut.bypass=true;auto dry=neutral;dry.bypass=true;
        check(std::abs(toneEnergy(frequencies[band],cut)-toneEnergy(frequencies[band],dry))<1e-5,"bypass removes EQ");
    }
    auto quiet=neutral;quiet.level=.2;auto loud=neutral;loud.level=.6;
    check(toneEnergy(1000,loud)>toneEnergy(1000,quiet)*8,"master level changes signal");
    auto tail=[](bool echo,bool roll) {
        auto engine=std::make_unique<jamloom::LiveSourceDSP>();engine->initialize(48000);
        std::array<float,128> input{},output{};jamloom::LiveSourceControls c;c.echo=echo?.4:0;
        double energy=0;
        for(unsigned block=0;block<600;++block) {
            for(unsigned i=0;i<128;++i)input[i]=block<300?float(.2*std::sin(6.283185307179586*440*(block*128+i)/48000)):0;
            c.roll=roll && block>=300;
            check(engine->process(input.data(),input.data(),1,output.data(),output.data(),1,128,c),"tail render");
            if(block>=320 && block<400)for(float sample:output)energy+=sample*sample;
        }
        return energy;
    };
    check(tail(false,false)<1e-8,"dry silence has no tail");
    check(tail(true,false)>.01,"echo produces delayed audio");
    check(tail(false,true)>.1,"roll repeats retained audio");
    auto drums=[](bool enabled) {
        auto engine=std::make_unique<jamloom::LiveSourceDSP>();engine->initialize(48000);
        std::array<float,128> input{},output{};jamloom::LiveSourceControls c;c.percussion=enabled;double energy=0;
        for(unsigned frame=0;frame<48000*10;frame+=128) {
            for(unsigned i=0;i<128;++i){unsigned t=(frame+i)%24000;input[i]=t<960?float(.4*std::sin(6.283185307179586*220*t/48000)):0;}
            check(engine->process(input.data(),input.data(),1,output.data(),output.data(),1,128,c),"percussion render");
            if(frame>48000*4)for(unsigned i=0;i<128;++i)if((frame+i)%24000>1200)energy+=output[i]*output[i];
        }
        return energy;
    };
    check(drums(true)>drums(false)+.001,"percussion adds audio after pulse lock");
}
int main(){
    individualEffects();
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
