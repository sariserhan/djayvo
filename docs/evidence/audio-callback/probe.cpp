#include "djayvo/live.h"
#include <AudioToolbox/AudioToolbox.h>
#include <CoreAudio/CoreAudio.h>
#include <mach/mach_time.h>
#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <new>
#include <stdexcept>
#include <thread>
#include <vector>

static thread_local bool tracking = false;
static thread_local unsigned allocations = 0;
void* operator new(std::size_t n) {
    if (tracking) ++allocations;
    if (auto p = std::malloc(n)) return p;
    throw std::bad_alloc();
}
void operator delete(void* p) noexcept { std::free(p); }
void operator delete(void* p, std::size_t) noexcept { std::free(p); }
static void require(bool ok, const char* message) { if (!ok) throw std::runtime_error(message); }
static void checked(OSStatus result, const char* action) {
    if (result) throw std::runtime_error(std::string(action) + ": " + std::to_string(result));
}
constexpr unsigned rate = 48000, period = 10 * rate;
struct Event { unsigned frame, on, id, patch, pitch, velocity; };
struct Call {
    std::uint64_t begin, end, host, captured_frame;
    double sample_time;
    unsigned frames, flags, events, allocations;
};
struct Capture {
    std::vector<Event> events;
    std::vector<float> pcm;
    std::vector<Call> calls = std::vector<Call>(50000);
    std::atomic<bool> done{false};
    unsigned cursor = 0, next = 0, count = 0, error = 0, commands = 0;
    explicit Capture(unsigned seconds) : pcm(seconds * rate * 2) {}
};
static_assert(std::atomic<bool>::is_always_lock_free);

static OSStatus render(void* opaque, AudioUnitRenderActionFlags* flags, const AudioTimeStamp* time,
                       UInt32, UInt32 frames, AudioBufferList* output) {
    auto& c = *static_cast<Capture*>(opaque);
    const auto begin = mach_absolute_time();
    // Measure the real output callback without sending the stress chord to the speakers.
    if (output) for (unsigned i=0; i<output->mNumberBuffers; ++i)
        if (output->mBuffers[i].mData) std::memset(output->mBuffers[i].mData, 0, output->mBuffers[i].mDataByteSize);
    if (flags) *flags |= kAudioUnitRenderAction_OutputIsSilence;
    if (c.done.load(std::memory_order_acquire)) return noErr;
    allocations = 0; tracking = true;
    const unsigned first = c.cursor, prior_commands = c.commands;
    if (!frames || !time || c.count == c.calls.size()) c.error = 1;
    unsigned remaining = frames;
    while (!c.error && remaining && c.cursor < c.pcm.size()/2) {
        const unsigned local = c.cursor % period;
        if (!local) c.next = 0;
        while (c.next < c.events.size() && c.events[c.next].frame == local) {
            const auto& e = c.events[c.next++];
            if (e.on) { if (!djayvo_live_note(e.id,e.patch,static_cast<int>(e.pitch),static_cast<int>(e.velocity))) c.error = 2; }
            else djayvo_live_off(e.id);
            ++c.commands;
        }
        const unsigned boundary = c.next < c.events.size() ? c.events[c.next].frame : period;
        const auto n = std::min({128U, remaining, boundary-local, static_cast<unsigned>(c.pcm.size()/2)-c.cursor});
        if (!n || !djayvo_live_render(n)) { c.error = 3; break; }
        std::copy_n(djayvo_live_buffer(), n*2, c.pcm.begin()+c.cursor*2);
        c.cursor += n; remaining -= n;
    }
    tracking = false;
    if (!c.error) c.calls[c.count++] = {begin,mach_absolute_time(),time->mHostTime,first,time->mSampleTime,
                                      frames,time->mFlags,c.commands-prior_commands,allocations};
    if (c.error || c.cursor == c.pcm.size()/2) c.done.store(true,std::memory_order_release);
    return noErr;
}

template<class T> static T property(AudioObjectID object, AudioObjectPropertySelector selector) {
    AudioObjectPropertyAddress address{selector,kAudioObjectPropertyScopeGlobal,kAudioObjectPropertyElementMain};
    T value{}; UInt32 size=sizeof(value);
    checked(AudioObjectGetPropertyData(object,&address,0,nullptr,&size,&value),"read device property");
    require(size==sizeof(value),"unexpected device property size"); return value;
}
struct Unit {
    AudioUnit value = nullptr;
    ~Unit() { if (value) { AudioOutputUnitStop(value); AudioUnitUninitialize(value); AudioComponentInstanceDispose(value); } }
};
static std::vector<Event> load_events(const std::string& prefix) {
    std::ifstream file(prefix+".tsv"); std::string header;
    std::getline(file,header); require(header=="frame\ton\tid\tpatch\tpitch\tvelocity","wrong event trace header");
    std::vector<Event> events; Event e{};
    while (file >> e.frame >> e.on >> e.id >> e.patch >> e.pitch >> e.velocity) {
        require(events.size()<320 && e.frame<period && e.frame%128==0 && e.on<=1 && e.id>=1 && e.id<=32 &&
                (!e.on || (e.patch<=12 && e.pitch>=21 && e.pitch<=108 && e.velocity>=1 && e.velocity<=127)) &&
                (events.empty() || e.frame>=events.back().frame),"invalid probe event");
        events.push_back(e);
    }
    require(file.eof() && events.size()==320 && events.front().frame==0,"incomplete event trace");
    return events;
}
static std::vector<float> load_pcm(const std::string& prefix) {
    std::ifstream file(prefix+".f32",std::ios::binary|std::ios::ate);
    require(file && file.tellg()==static_cast<std::streamoff>(period*2*sizeof(float)),"wrong reference PCM size");
    std::vector<float> pcm(period*2); file.seekg(0);
    file.read(reinterpret_cast<char*>(pcm.data()),static_cast<std::streamsize>(pcm.size()*sizeof(float)));
    require(static_cast<bool>(file),"cannot read reference PCM"); return pcm;
}
struct Metrics { unsigned gaps=0, missing=0, allocations=0, misses=0; double max_us=0; };
static Metrics measure(const Capture& c, double tick_us) {
    Metrics m;
    for (unsigned i=0; i<c.count; ++i) {
        const auto& call=c.calls[i];
        const double us=static_cast<double>(call.end-call.begin)*tick_us;
        m.max_us=std::max(m.max_us,us); m.misses+=us>1e6*call.frames/rate; m.allocations+=call.allocations;
        if (!(call.flags & kAudioTimeStampSampleTimeValid) || !(call.flags & kAudioTimeStampHostTimeValid)) ++m.missing;
        if (i && (call.flags & c.calls[i-1].flags & kAudioTimeStampSampleTimeValid) &&
            std::abs(call.sample_time-c.calls[i-1].sample_time-c.calls[i-1].frames)>.5) ++m.gaps;
    }
    return m;
}
static void self_test(const std::string& prefix) {
    Capture c(10); c.events=load_events(prefix); const auto reference=load_pcm(prefix);
    require(djayvo_live_init(rate),"init");
    std::vector<float> output(1024);
    AudioBufferList list{1,{{2,static_cast<UInt32>(output.size()*sizeof(float)),output.data()}}};
    std::uint64_t frame=0;
    while (!c.done.load()) {
        const unsigned n=c.count%2?113:512;
        AudioTimeStamp stamp{}; stamp.mSampleTime=static_cast<double>(frame);stamp.mHostTime=frame+1;
        stamp.mFlags=kAudioTimeStampSampleHostTimeValid; AudioUnitRenderActionFlags flags=0;
        std::fill(output.begin(),output.end(),1);
        render(&c,&flags,&stamp,0,n,&list);
        require(std::all_of(output.begin(),output.end(),[](float x){return x==0;}),"speaker mute failed");
        require(flags & kAudioUnitRenderAction_OutputIsSilence,"missing silence flag"); frame+=n;
    }
    require(!c.error && c.pcm==reference && c.commands==320 && !djayvo_live_active(),"split callback PCM mismatch");
    require(measure(c,0).gaps==0 && measure(c,0).missing==0 && measure(c,0).allocations==0,"clean probe rejected");
    c.calls[1].sample_time+=128; require(measure(c,0).gaps==2,"gap detector missed inserted gap");
    c.calls[1].sample_time-=128;c.calls[1].flags=0; require(measure(c,0).missing==1,"missing timestamp accepted");
    c.calls[1].flags=kAudioTimeStampSampleHostTimeValid;c.calls[1].end=c.calls[1].begin+10000000;
    require(measure(c,.001).misses>=1,"deadline detector missed injected delay");
    std::cout << "PASS split 113/512 callbacks, exact offline PCM, muted output, zero C++ allocations, injected gap/flag/delay detection\n";
}
int main(int argc, char** argv) {
    try {
        require(argc==3 || argc==4,"Usage: probe REFERENCE_PREFIX NEW_OUTPUT_PREFIX [--self-test]");
        if (argc==4) { require(std::string(argv[3])=="--self-test","invalid option");self_test(argv[1]);return 0; }
        const std::string reference_prefix=argv[1], output_prefix=argv[2];
        for (const auto suffix:{".json",".f32",".tsv"}) require(!std::filesystem::exists(output_prefix+suffix),"refusing overwrite");
        Capture c(60);c.events=load_events(reference_prefix);const auto reference=load_pcm(reference_prefix);
        const auto device=property<AudioDeviceID>(kAudioObjectSystemObject,kAudioHardwarePropertyDefaultOutputDevice);
        require(device!=kAudioObjectUnknown,"no default output device");
        const auto device_rate=property<Float64>(device,kAudioDevicePropertyNominalSampleRate);
        const auto device_frames=property<UInt32>(device,kAudioDevicePropertyBufferFrameSize);
        const auto transport=property<UInt32>(device,kAudioDevicePropertyTransportType);
        AudioComponentDescription desc{kAudioUnitType_Output,kAudioUnitSubType_DefaultOutput,kAudioUnitManufacturer_Apple,0,0};
        auto component=AudioComponentFindNext(nullptr,&desc);require(component,"default output audio unit unavailable");
        Unit unit;checked(AudioComponentInstanceNew(component,&unit.value),"create audio unit");
        AudioStreamBasicDescription format{rate,kAudioFormatLinearPCM,kAudioFormatFlagIsFloat|kAudioFormatFlagIsPacked,8,1,8,2,32,0};
        checked(AudioUnitSetProperty(unit.value,kAudioUnitProperty_StreamFormat,kAudioUnitScope_Input,0,&format,sizeof(format)),"set client format");
        AURenderCallbackStruct callback{render,&c};
        checked(AudioUnitSetProperty(unit.value,kAudioUnitProperty_SetRenderCallback,kAudioUnitScope_Input,0,&callback,sizeof(callback)),"set callback");
        checked(AudioUnitInitialize(unit.value),"initialize audio unit");require(djayvo_live_init(rate),"initialize engine");
        mach_timebase_info_data_t timebase{};checked(mach_timebase_info(&timebase),"read host clock");
        const double tick_us=static_cast<double>(timebase.numer)/timebase.denom/1000;
        const auto start=std::chrono::steady_clock::now();checked(AudioOutputUnitStart(unit.value),"start audio unit");
        while (!c.done.load(std::memory_order_acquire) && std::chrono::steady_clock::now()-start<std::chrono::seconds(75))
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        checked(AudioOutputUnitStop(unit.value),"stop audio unit");
        require(c.done.load(std::memory_order_acquire),"audio callback timed out");
        require(!c.error && c.cursor==60*rate,"callback failed or capture incomplete");
        const double elapsed=std::chrono::duration<double>(std::chrono::steady_clock::now()-start).count();
        const auto device_after=property<AudioDeviceID>(kAudioObjectSystemObject,kAudioHardwarePropertyDefaultOutputDevice);
        const auto m=measure(c,tick_us);
        double peak=0,square=0,max_delta=0;
        for (std::size_t i=0;i<c.pcm.size();++i) {
            require(std::isfinite(c.pcm[i]),"nonfinite PCM");
            peak=std::max(peak,static_cast<double>(std::abs(c.pcm[i])));
            const double delta=c.pcm[i]-reference[i%reference.size()];max_delta=std::max(max_delta,std::abs(delta));square+=delta*delta;
        }
        std::ofstream pcm(output_prefix+".f32",std::ios::binary);
        pcm.write(reinterpret_cast<const char*>(c.pcm.data()),static_cast<std::streamsize>(c.pcm.size()*sizeof(float)));pcm.close();require(static_cast<bool>(pcm),"PCM write failed");
        std::ofstream trace(output_prefix+".tsv");trace.precision(17);
        trace << "captured_frame\tframes\tsample_time\tflags\thost_ticks\tbegin_ticks\tend_ticks\tevents\tcpp_allocations\n";
        for (unsigned i=0;i<c.count;++i) { const auto& x=c.calls[i];trace << x.captured_frame << '\t' << x.frames << '\t' << x.sample_time << '\t' << x.flags << '\t' << x.host << '\t' << x.begin << '\t' << x.end << '\t' << x.events << '\t' << x.allocations << '\n'; }
        trace.close();require(static_cast<bool>(trace),"trace write failed");
        std::ofstream report(output_prefix+".json");report.precision(17);
        report << "{\"client_rate\":48000,\"captured_frames\":" << c.cursor << ",\"wall_seconds\":" << elapsed << ",\"callbacks\":" << c.count
               << ",\"device_rate\":" << device_rate << ",\"device_buffer_frames\":" << device_frames << ",\"device_transport\":" << transport
               << ",\"default_device_unchanged\":" << (device==device_after?"true":"false") << ",\"host_tick_us\":" << tick_us
               << ",\"commands\":" << c.commands << ",\"sample_time_gaps\":" << m.gaps << ",\"missing_timestamps\":" << m.missing
               << ",\"cpp_callback_allocations\":" << m.allocations << ",\"callback_deadline_misses\":" << m.misses << ",\"callback_max_us\":" << m.max_us
               << ",\"peak\":" << peak << ",\"max_pcm_difference\":" << max_delta << ",\"rms_pcm_difference\":" << std::sqrt(square/c.pcm.size())
               << ",\"active_at_end\":" << djayvo_live_active() << ",\"speaker_output_muted\":true}\n";
        report.close();require(static_cast<bool>(report),"report write failed");
        require(max_delta==0 && peak<=.8 && c.commands==1920 && !djayvo_live_active(),"signal agreement failed; evidence retained");
        std::cout << "PASS captured engine PCM and 1920 commands; callback gaps " << m.gaps << ", deadline misses " << m.misses << '\n';
        return 0;
    } catch (const std::exception& e) { std::cerr << "FAIL " << e.what() << '\n'; return 1; }
}
