#import "LiveAudio.h"
#import <AppKit/AppKit.h>
#import <CoreAudio/CoreAudio.h>
#import <CoreAudio/CATapDescription.h>
#import <CoreAudio/AudioHardwareTapping.h>
#include <cstring>
#include "../../../../core/include/jamloom/live_source.h"
#include <atomic>
#include <memory>
#include <vector>
#include <mach/mach_time.h>
#include <unistd.h>

namespace {
AudioObjectPropertyAddress address(AudioObjectPropertySelector sel, AudioObjectPropertyScope scope=kAudioObjectPropertyScopeGlobal) {
    return {sel,scope,kAudioObjectPropertyElementMain};
}
template<class T> bool read(AudioObjectID object, AudioObjectPropertySelector sel, T& value, AudioObjectPropertyScope scope=kAudioObjectPropertyScopeGlobal) {
    auto a=address(sel,scope); UInt32 size=sizeof(T); return AudioObjectGetPropertyData(object,&a,0,nullptr,&size,&value)==noErr && size==sizeof(T);
}
std::vector<AudioObjectID> objects(AudioObjectID object, AudioObjectPropertySelector sel, AudioObjectPropertyScope scope=kAudioObjectPropertyScopeGlobal) {
    auto a=address(sel,scope); UInt32 bytes=0;
    if(AudioObjectGetPropertyDataSize(object,&a,0,nullptr,&bytes)!=noErr || bytes>65536 || bytes%sizeof(AudioObjectID)) return {};
    std::vector<AudioObjectID> result(bytes/sizeof(AudioObjectID));
    if(AudioObjectGetPropertyData(object,&a,0,nullptr,&bytes,result.data())!=noErr) return {};
    result.resize(bytes/sizeof(AudioObjectID)); return result;
}
NSString* stringProperty(AudioObjectID object, AudioObjectPropertySelector sel) {
    CFStringRef value=nullptr; if(!read(object,sel,value) || !value) return @""; return CFBridgingRelease(value);
}
unsigned channels(AudioObjectID object, AudioObjectPropertyScope scope) {
    auto a=address(kAudioDevicePropertyStreamConfiguration,scope); UInt32 bytes=0;
    if(AudioObjectGetPropertyDataSize(object,&a,0,nullptr,&bytes)!=noErr || bytes>65536 || bytes<sizeof(AudioBufferList))return 0;
    std::vector<char> storage(bytes); auto list=reinterpret_cast<AudioBufferList*>(storage.data());
    if(AudioObjectGetPropertyData(object,&a,0,nullptr,&bytes,list)!=noErr)return 0;
    unsigned total=0; for(unsigned i=0;i<list->mNumberBuffers;++i)total+=list->mBuffers[i].mNumberChannels; return total;
}
bool floatStreams(AudioObjectID device, AudioObjectPropertyScope scope, double rate) {
    const auto streams=objects(device,kAudioDevicePropertyStreams,scope); if(streams.empty())return false;
    for(auto stream:streams){AudioStreamBasicDescription f{};
        if(!read(stream,kAudioStreamPropertyVirtualFormat,f) || f.mFormatID!=kAudioFormatLinearPCM ||
           !(f.mFormatFlags&kAudioFormatFlagIsFloat) || (f.mFormatFlags&kAudioFormatFlagIsBigEndian) || f.mBitsPerChannel!=32 || f.mSampleRate!=rate)return false;
    }return true;
}
static_assert(std::atomic<double>::is_always_lock_free && std::atomic<std::uint64_t>::is_always_lock_free, "Audio controls must be lock-free");
struct State {
    AudioObjectID tap=0, aggregate=0, output=0, process=0;
    AudioDeviceIOProcID io=nullptr;
    pid_t pid=0; double rate=0, expectedTime=0; bool haveTime=false;
    std::unique_ptr<jamloom::LiveSourceDSP> dsp;
    std::atomic<double> level{.4}, low{0}, mid{0}, high{0}, tone{18000}, echo{0}, peak{0}, inputPeak{0}, bpm{0}, confidence{0}, maxCallbackMs{0};
    std::atomic<unsigned> flags{0}, fault{0};
    std::atomic<std::uint64_t> frames{0}, lastCallback{0};
    double ticksToMs=0;
    bool started=false;
    ~State(){stop();}
    void stop(){
        if(io){AudioDeviceStop(aggregate,io);AudioDeviceDestroyIOProcID(aggregate,io);io=nullptr;}
        if(aggregate){AudioHardwareDestroyAggregateDevice(aggregate);aggregate=0;}
        if(tap){AudioHardwareDestroyProcessTap(tap);tap=0;}
        started=false;dsp.reset();
    }
};
bool buffers(const AudioBufferList* list, float*& left, float*& right, unsigned& stride, unsigned& frames) {
    if(!list)return false;
    if(list->mNumberBuffers==1 && list->mBuffers[0].mNumberChannels==2){
        left=static_cast<float*>(list->mBuffers[0].mData);right=left?left+1:nullptr;stride=2;frames=list->mBuffers[0].mDataByteSize/8;
        return left && list->mBuffers[0].mDataByteSize%8==0;
    }
    if(list->mNumberBuffers==2 && list->mBuffers[0].mNumberChannels==1 && list->mBuffers[1].mNumberChannels==1 && list->mBuffers[0].mDataByteSize==list->mBuffers[1].mDataByteSize){
        left=static_cast<float*>(list->mBuffers[0].mData);right=static_cast<float*>(list->mBuffers[1].mData);stride=1;frames=list->mBuffers[0].mDataByteSize/4;
        return left && right && list->mBuffers[0].mDataByteSize%4==0;
    }return false;
}
OSStatus render(AudioObjectID,const AudioTimeStamp*,const AudioBufferList* input,const AudioTimeStamp* time,AudioBufferList* output,const AudioTimeStamp*,void* context) {
    auto& s=*static_cast<State*>(context); const auto began=mach_absolute_time();
    if(output)for(unsigned i=0;i<output->mNumberBuffers;++i)if(output->mBuffers[i].mData)std::memset(output->mBuffers[i].mData,0,output->mBuffers[i].mDataByteSize);
    float *l=nullptr,*r=nullptr,*ol=nullptr,*orr=nullptr;unsigned stride=0,outStride=0,frames=0,outFrames=0;
    if(!buffers(input,l,r,stride,frames)||!buffers(output,ol,orr,outStride,outFrames)||frames!=outFrames||frames>4096||!frames){s.fault.store(1);return noErr;}
    if(time && (time->mFlags&kAudioTimeStampSampleTimeValid)){
        if(s.haveTime && std::abs(time->mSampleTime-s.expectedTime)>.5)s.fault.store(2);
        s.expectedTime=time->mSampleTime+frames;s.haveTime=true;
    }
    if(s.fault.load())return noErr;
    const unsigned flags=s.flags.load();
    jamloom::LiveSourceControls c{s.level.load(),s.low.load(),s.mid.load(),s.high.load(),s.tone.load(),s.echo.load(),bool(flags&1),bool(flags&2),bool(flags&4)};
    if(!s.dsp->process(l,r,stride,ol,orr,outStride,frames,c)){s.fault.store(3);return noErr;}
    double peak=0,inPeak=0;for(unsigned i=0;i<frames;++i){peak=std::max({peak,std::abs(double(ol[i*outStride])),std::abs(double(orr[i*outStride]))});inPeak=std::max({inPeak,std::abs(double(l[i*stride])),std::abs(double(r[i*stride]))});}
    s.peak.store(peak);s.inputPeak.store(inPeak);s.bpm.store(s.dsp->bpm());s.confidence.store(s.dsp->confidence());s.frames.fetch_add(frames);s.lastCallback.store(began);
    const double ms=(mach_absolute_time()-began)*s.ticksToMs;s.maxCallbackMs.store(std::max(ms,s.maxCallbackMs.load()));
    return noErr;
}
}

@implementation JLLiveAudio { State* _state; }
- (instancetype)init { if((self=[super init]))_state=new State;return self; }
- (void)dealloc { delete _state; }
+ (NSArray*)sources {
    NSMutableArray* result=[NSMutableArray array];
    for(auto id:objects(kAudioObjectSystemObject,kAudioHardwarePropertyProcessObjectList)){
        pid_t pid=0;UInt32 running=0;if(!read(id,kAudioProcessPropertyPID,pid)||pid==getpid()||pid<=0)continue;
        read(id,kAudioProcessPropertyIsRunningOutput,running);if(!running)continue;
        NSRunningApplication* app=[NSRunningApplication runningApplicationWithProcessIdentifier:pid];
        NSString* name=app.localizedName?:stringProperty(id,kAudioProcessPropertyBundleID);if(!name.length)name=@"Audio process";
        [result addObject:@{@"id":@(id),@"pid":@(pid),@"name":[NSString stringWithFormat:@"%@ · %d",name,pid]}];
    }return result;
}
+ (NSArray*)outputs {
    NSMutableArray* result=[NSMutableArray array];
    for(auto id:objects(kAudioObjectSystemObject,kAudioHardwarePropertyDevices)){
        UInt32 alive=0;if(!read(id,kAudioDevicePropertyDeviceIsAlive,alive)||!alive||channels(id,kAudioDevicePropertyScopeOutput)!=2)continue;
        [result addObject:@{@"id":@(id),@"name":stringProperty(id,kAudioObjectPropertyName)}];
    }return result;
}
- (NSString*)startProcess:(uint32_t)process output:(uint32_t)output {
    const jamloom::LiveSourceControls previous{_state->level.load(),_state->low.load(),_state->mid.load(),_state->high.load(),_state->tone.load(),_state->echo.load()};
    const unsigned flags=_state->flags.load();
    [self stop]; delete _state;_state=new State;auto& s=*_state;
    s.level.store(previous.level);s.low.store(previous.low);s.mid.store(previous.mid);s.high.store(previous.high);s.tone.store(previous.tone);s.echo.store(previous.echo);s.flags.store(flags);
    auto fail=[&](NSString* message){s.stop();return message;};
    if(@available(macOS 14.2,*)){}else return @"Live Source requires macOS 14.2 or later.";
    if(!read(process,kAudioProcessPropertyPID,s.pid)||s.pid<=0||s.pid==getpid())return fail(@"Select another application's audio process.");
    if(channels(output,kAudioDevicePropertyScopeOutput)!=2)return fail(@"Select a stereo output device.");
    s.process=process;s.output=output;
    if(!read(output,kAudioDevicePropertyNominalSampleRate,s.rate)||s.rate<32000||s.rate>96000||std::floor(s.rate)!=s.rate)return fail(@"Select an output at 32–96 kHz.");
    NSString* uid=stringProperty(output,kAudioDevicePropertyDeviceUID);if(!uid.length)return fail(@"The output device is unavailable.");
    CATapDescription* description=[[CATapDescription alloc]initStereoMixdownOfProcesses:@[@(process)]];
    description.name=@"Jamloom selected Live Source";description.privateTap=YES;description.muteBehavior=CATapMutedWhenTapped;
    OSStatus error=AudioHardwareCreateProcessTap(description,&s.tap);
    if(error)return fail([NSString stringWithFormat:@"Audio capture could not start (%d). Check System Settings → Privacy & Security → Screen & System Audio Recording.",(int)error]);
    NSDictionary* aggregate=@{@kAudioAggregateDeviceNameKey:@"Jamloom private Live Source",@kAudioAggregateDeviceUIDKey:NSUUID.UUID.UUIDString,
        @kAudioAggregateDeviceIsPrivateKey:@YES,@kAudioAggregateDeviceMainSubDeviceKey:uid,
        @kAudioAggregateDeviceSubDeviceListKey:@[@{@kAudioSubDeviceUIDKey:uid,@kAudioSubDeviceInputChannelsKey:@0,@kAudioSubDeviceOutputChannelsKey:@2}],
        @kAudioAggregateDeviceTapAutoStartKey:@YES,@kAudioAggregateDeviceTapListKey:@[@{@kAudioSubTapUIDKey:description.UUID.UUIDString,@kAudioSubTapDriftCompensationKey:@YES}]};
    error=AudioHardwareCreateAggregateDevice((__bridge CFDictionaryRef)aggregate,&s.aggregate);
    if(error)return fail([NSString stringWithFormat:@"The selected output could not be routed (%d).",(int)error]);
    if(channels(s.aggregate,kAudioDevicePropertyScopeInput)!=2||channels(s.aggregate,kAudioDevicePropertyScopeOutput)!=2||
       !floatStreams(s.aggregate,kAudioDevicePropertyScopeInput,s.rate)||!floatStreams(s.aggregate,kAudioDevicePropertyScopeOutput,s.rate))return fail(@"This device layout is unsupported. Choose a stereo output without additional input channels, at the source sample rate.");
    s.dsp=std::make_unique<jamloom::LiveSourceDSP>();s.dsp->initialize(unsigned(s.rate));
    mach_timebase_info_data_t ticks{};mach_timebase_info(&ticks);s.ticksToMs=double(ticks.numer)/ticks.denom/1e6;
    error=AudioDeviceCreateIOProcID(s.aggregate,render,&s,&s.io);
    if(!error)error=AudioDeviceStart(s.aggregate,s.io);
    if(error)return fail([NSString stringWithFormat:@"Audio routing did not start (%d). The source has been released.",(int)error]);
    s.started=true;s.lastCallback.store(mach_absolute_time());return nil;
}
- (void)stop { _state->stop(); }
- (BOOL)setLevel:(double)level low:(double)low mid:(double)mid high:(double)high tone:(double)tone echo:(double)echo bypass:(BOOL)bypass roll:(BOOL)roll percussion:(BOOL)percussion {
    jamloom::LiveSourceControls c{level,low,mid,high,tone,echo,bool(bypass),bool(roll),bool(percussion)};if(!c.valid())return NO;
    auto& s=*_state;s.level.store(level);s.low.store(low);s.mid.store(mid);s.high.store(high);s.tone.store(tone);s.echo.store(echo);s.flags.store((bypass?1:0)|(roll?2:0)|(percussion?4:0));return YES;
}
- (NSDictionary*)status {
    auto& s=*_state;NSString* error=@"";
    if(s.started){
        UInt32 alive=0;double rate=0;pid_t pid=0;
        if(!read(s.output,kAudioDevicePropertyDeviceIsAlive,alive)||!alive||!read(s.output,kAudioDevicePropertyNominalSampleRate,rate)||rate!=s.rate)error=@"Output disconnected or changed format. Select the output again.";
        else if(!read(s.process,kAudioProcessPropertyPID,pid)||pid!=s.pid)error=@"The selected audio process ended. Select it again.";
        else if(s.fault.load())error=@"The audio stream changed or missed frames. Capture stopped; the source was released.";
        else if((mach_absolute_time()-s.lastCallback.load())*s.ticksToMs>2000)error=@"Audio callbacks stopped. Capture stopped; the source was released.";
        if(error.length)s.stop();
    }
    return @{@"active":@(s.started),@"error":error,@"peak":@(s.started?s.peak.load():0),@"inputPeak":@(s.started?s.inputPeak.load():0),
        @"bpm":@(s.bpm.load()),@"confidence":@(s.confidence.load()),@"frames":@(s.frames.load()),@"sampleRate":@(s.rate),@"maxCallbackMs":@(s.maxCallbackMs.load())};
}
@end
