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
void deckTransport() {
    for(unsigned rate:{32000u,48000u,96000u}) {
        auto capacity=std::make_unique<jamloom::LiveDeckBuffer>();
        for(unsigned i=0;i<rate*5;++i)capacity->sample({{0,0}},rate,jamloom::LiveSourceControls{});
        check(capacity->seconds(rate)==4,"history capped at four seconds at every rate");
        auto buffer=std::make_unique<jamloom::LiveDeckBuffer>();jamloom::LiveSourceControls c;
        for(unsigned i=0;i<rate;++i)buffer->sample({{double(i)/rate,-double(i)/rate}},rate,c);
        c.reverse=true;c.loopBeats=1;c.tempo=120;
        std::array<double,2> previous{};unsigned falling=0;
        for(unsigned i=0;i<rate/4;++i) {
            const auto out=buffer->sample({{0,0}},rate,c);
            check(std::isfinite(out[0])&&std::abs(out[0]+out[1])<1e-6,"replay stereo preserved");
            if(i>rate/8 && out[0]<previous[0])++falling;
            previous=out;
        }
        check(falling>rate/10,"reverse plays captured samples backward");
        c.scratch=true;c.scratchRate=0;
        for(unsigned i=0;i<rate/4;++i)previous=buffer->sample({{0,0}},rate,c);
        check(std::abs(previous[0])<1e-5,"stationary platter becomes quiet instead of DC");
        c.reverse=false;c.scratch=false;c.roll=false;
        for(unsigned i=0;i<rate/4;++i)previous=buffer->sample({{0.2,-0.2}},rate,c);
        check(std::abs(previous[0]-.2)<1e-6,"return live follows current source");
        check(buffer->seconds(rate)<.25,"old history discarded on return live");
        c.roll=true;c.loopBeats=4;c.tempo=60;
        for(unsigned i=0;i<rate/2;++i)previous=buffer->sample({{0,0}},rate,c);
        check(std::abs(previous[0]-.2)<1e-5,"next loop contains only fresh source audio");
        for(double speed:{-2.,2.}) {
            c.scratch=true;c.scratchRate=speed;c.loopBeats=.25;c.tempo=200;
            for(unsigned i=0;i<rate/2;++i) { const auto out=buffer->sample({{0,0}},rate,c);check(std::isfinite(out[0])&&std::abs(out[0])<=.201,"scratch wrap bounded at extreme speeds"); }
        }
    }
    auto a=std::make_unique<jamloom::LiveDeckBuffer>(),b=std::make_unique<jamloom::LiveDeckBuffer>();jamloom::LiveSourceControls c;
    for(unsigned i=0;i<48000;++i) { a->sample({{.2,.2}},48000,c);b->sample({{-.4,-.4}},48000,c); }
    c.roll=true;std::array<double,2> left{},right{};
    for(unsigned i=0;i<16000;++i) { left=a->sample({{0,0}},48000,c);right=b->sample({{0,0}},48000,c); }
    check(left[0]>.19&&right[0]<-.39,"deck histories are independent");
    auto hp=jamloom::LiveSourceControls{};hp.highpass=2000;
    check(toneEnergy(60,hp)<toneEnergy(60,jamloom::LiveSourceControls{})*.01,"highpass cuts bass");
    for(double delay:{.1,.6}) {
        auto echo=std::make_unique<jamloom::LiveSourceDSP>();echo->initialize(48000);
        jamloom::LiveSourceControls e;e.echo=.4;e.echoSeconds=delay;
        std::array<float,128> input{},output{};
        for(unsigned block=0;block<500;++block)echo->process(input.data(),input.data(),1,output.data(),output.data(),1,128,e);
        double peak=0;unsigned peakFrame=0;
        for(unsigned frame=0;frame<48000;frame+=128) {
            input.fill(0);if(frame==0)input[0]=.5;
            echo->process(input.data(),input.data(),1,output.data(),output.data(),1,128,e);
            for(unsigned i=0;i<128;++i)if(frame+i>1000 && std::abs(output[i])>peak){peak=std::abs(output[i]);peakFrame=frame+i;}
        }
        check(peak>.01 && std::abs(double(peakFrame)-delay*48000)<=3,"echo timing follows selected delay");
    }
    auto muted=hp;muted.mute=true;check(toneEnergy(1000,muted)==0,"deck mute silences output");
    auto engine=std::make_unique<jamloom::LiveSourceDSP>();engine->initialize(48000);c={};c.mix=.5;c.level=.8;c.low=c.mid=c.high=6;
    std::array<float,128> input{},output{};input.fill(4);
    for(unsigned i=0;i<300;++i) { engine->process(input.data(),input.data(),1,output.data(),output.data(),1,128,c);for(float x:output)check(std::abs(x)*2<=.890001,"two native route ceilings fit shared output"); }
    for(auto field:{&jamloom::LiveSourceControls::highpass,&jamloom::LiveSourceControls::echoSeconds,&jamloom::LiveSourceControls::loopBeats,&jamloom::LiveSourceControls::tempo,&jamloom::LiveSourceControls::scratchRate,&jamloom::LiveSourceControls::mix}) {
        auto bad=c;bad.*field=std::numeric_limits<double>::quiet_NaN();check(!bad.valid(),"new controls reject nonfinite input");
    }
}
void offlineSoak(){
    auto a=std::make_unique<jamloom::LiveSourceDSP>(),b=std::make_unique<jamloom::LiveSourceDSP>();
    auto pad=std::make_unique<jamloom::LiveSamplePad>();a->initialize(48000);b->initialize(48000);
    std::array<float,256> input{},left{},right{};std::array<float,4800> sample{};sample.fill(.2f);
    jamloom::LiveSourceControls ca,cb;double peak=0;
    const auto start=std::chrono::steady_clock::now();
    for(unsigned second=0;second<3600;++second){
        ca.mix=.5*(second%11)/10;cb.mix=.5-ca.mix;ca.echo=.3;cb.highpass=100+second%500;
        ca.roll=second%7==0;cb.reverse=second%11==0;cb.percussion=true;
        ca.scratch=second%13==0;ca.scratchRate=second%2 ? -1:1;
        if(second%5==0){pad->clear();pad->next(48000);check(pad->erase(),"soak erase");check(pad->load(sample.data(),unsigned(sample.size()),48000),"soak load");pad->play();}
        for(unsigned frame=0;frame<48000;frame+=128){
            for(unsigned i=0;i<128;++i){float x=float(.3*std::sin(6.283185307179586*220*(frame+i)/48000));input[i*2]=x;input[i*2+1]=-x;}
            check(a->process(input.data(),input.data()+1,2,left.data(),left.data()+1,2,128,ca,false,pad.get()),"soak A");
            check(b->process(input.data(),input.data()+1,2,right.data(),right.data()+1,2,128,cb),"soak B");
            for(unsigned i=0;i<256;++i){double x=left[i]+right[i];check(std::isfinite(x)&&std::abs(x)<=.890001,"soak summed headroom");peak=std::max(peak,std::abs(x));}
        }
    }
    std::cout<<"PASS: 3600 simulated seconds, two 48 kHz stereo decks, FX/transport changes, sampler reload/trigger, finite summed output; peak="<<peak<<", offline seconds="<<std::chrono::duration<double>(std::chrono::steady_clock::now()-start).count()<<". NOT a physical 60-minute session.\n";
}
int main(int argc,char** argv){
    if(argc==2 && std::string(argv[1])=="--soak"){offlineSoak();return 0;}
    individualEffects();deckTransport();
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
    std::cout<<"PASS: dual-deck isolation, reverse/scratch/loop/return-live at 32/48/96 kHz, mix headroom, highpass, bounds, stereo, EQ/filter bypass, roll/echo ceiling, nonfinite input, mute, pulse/relock; "<<dsp->frames()<<" frames in "<<ms<<" ms (offline CPU only)\n";
}
