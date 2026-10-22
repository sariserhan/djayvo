#include "jamloom/live_source.h"
#include <iostream>
#include <memory>
#include <stdexcept>
#include <thread>
#include <vector>
void check(bool value,const char* message){if(!value)throw std::runtime_error(message);}
int main(){
    for(unsigned rate:{32000u,48000u,96000u}) {
        auto pad=std::make_unique<jamloom::LiveSamplePad>();std::vector<float> pcm(4800,.4f);
        check(pad->load(pcm.data(),unsigned(pcm.size()),48000),"load");
        for(unsigned i=0;i<128;++i)check(pad->next(rate)==0,"recording never auto-monitors");
        pad->play();double peak=0;unsigned audible=0;
        for(unsigned i=0;i<rate/5;++i){double x=pad->next(rate);peak=std::max(peak,x);if(x>.01)++audible;check(std::isfinite(x)&&std::abs(x)<.401,"bounded sample");}
        check(peak>.39 && audible>rate*.09 && audible<rate*.101,"sample duration follows output clock");
        check(!pad->playing(),"one shot stops");pad->play();for(unsigned i=0;i<500;++i)pad->next(rate);
        pad->play();check(std::abs(pad->next(rate)-.4)<.001,"retrigger starts with previous output for smooth splice");
        pad->stop();for(unsigned i=0;i<128;++i)pad->next(rate);check(pad->next(rate)==0&&!pad->playing(),"stop fades out");
        check(!pad->load(pcm.data(),unsigned(pcm.size()),48000),"producer cannot overwrite readable PCM");
        pad->clear();check(!pad->erase(),"wait for callback acknowledgement");pad->next(rate);check(pad->erase(),"clear zeroes buffer after ack");
        check(!pad->ready()&&pad->next(rate)==0,"clear removes playback");
        check(!pad->load(pcm.data(),unsigned(pcm.size()),1),"bad rate");check(!pad->load(pcm.data(),1,192000),"subsample duration rejected");
        check(!pad->load(pcm.data(),48000*5,48000),"overlong sample rejected before reading");
        pcm[200]=std::numeric_limits<float>::infinity();check(pad->load(pcm.data(),unsigned(pcm.size()),44100),"finite resampling");pad->play();for(unsigned i=0;i<rate;++i)check(std::isfinite(pad->next(rate)),"nonfinite input sanitized");
    }
    // The actual mixer path includes the pad before per-deck FX, mute and limiter.
    auto dsp=std::make_unique<jamloom::LiveSourceDSP>();dsp->initialize(48000);
    auto pad=std::make_unique<jamloom::LiveSamplePad>();std::vector<float> pcm(48000,.5f);pad->load(pcm.data(),unsigned(pcm.size()),48000);
    std::array<float,128> input{},out{};jamloom::LiveSourceControls c;c.mix=.5;c.level=.8;
    for(unsigned i=0;i<100;++i)dsp->process(input.data(),input.data(),1,out.data(),out.data(),1,128,c,false,pad.get());
    pad->play();double energy=0;for(unsigned i=0;i<100;++i){dsp->process(input.data(),input.data(),1,out.data(),out.data(),1,128,c,false,pad.get());for(float x:out){energy+=x*x;check(std::abs(x)<=.445001,"sample shares deck headroom");}}
    check(energy>1,"sample reaches native mixer");c.mute=true;for(unsigned i=0;i<200;++i)dsp->process(input.data(),input.data(),1,out.data(),out.data(),1,128,c,false,pad.get());for(float x:out)check(std::abs(x)<1e-6,"deck mute also mutes sample");
    // Real producer/consumer interleaving: run under ThreadSanitizer as well.
    auto shared=std::make_unique<jamloom::LiveSamplePad>();std::atomic<bool> done{false};
    std::thread render([&]{while(!done.load()){double x=shared->next(48000);check(std::isfinite(x)&&std::abs(x)<2,"concurrent finite output");}});
    for(unsigned i=0;i<1000;++i){while(!shared->load(pcm.data(),4800,48000))std::this_thread::yield();shared->play();shared->stop();shared->clear();while(!shared->erase())std::this_thread::yield();}
    done.store(true);render.join();shared->quiescent(true);
    std::cout<<"PASS: bounded mic PCM, resampling/output-clock duration, explicit one-shot trigger, stop/retrigger smoothing, clear acknowledgement, concurrent publication, mixer/limiter/mute\n";
}
