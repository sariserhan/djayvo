#include "djayvo/remix.h"
#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <limits>
#include <new>
#include <stdexcept>

namespace { std::atomic<std::size_t> allocations{0}; }
void* operator new(std::size_t n) {
    ++allocations;
    if (void* p=std::malloc(n?n:1)) return p;
    throw std::bad_alloc();
}
void* operator new[](std::size_t n) {return ::operator new(n);}
void* operator new(std::size_t n,const std::nothrow_t&) noexcept {try{return ::operator new(n);}catch(...){return nullptr;}}
void* operator new[](std::size_t n,const std::nothrow_t&) noexcept {try{return ::operator new(n);}catch(...){return nullptr;}}
void operator delete(void* p) noexcept {std::free(p);}
void operator delete[](void* p) noexcept {std::free(p);}
void operator delete(void* p,std::size_t) noexcept {std::free(p);}
void operator delete[](void* p,std::size_t) noexcept {std::free(p);}
void operator delete(void* p,const std::nothrow_t&) noexcept {std::free(p);}
void operator delete[](void* p,const std::nothrow_t&) noexcept {std::free(p);}
namespace {
void check(bool condition,const char* message) {if(!condition) throw std::runtime_error(message);}
template<class F> void rejects(F f) {
    bool caught=false;try {f();}catch(const std::exception&) {caught=true;}
    check(caught,"invalid remix accepted");
}
djayvo::AudioBuffer source() {
    djayvo::AudioBuffer a;
    a.sample_rate=a.original_rate=8000;a.original_frames=24000;a.sha256=std::string(64,'0');a.mono.resize(24000);
    for (std::size_t i=0;i<a.mono.size();++i) {
        const double t=static_cast<double>(i)/a.sample_rate;
        const double local=std::fmod(t,0.4);
        if(local<0.2) a.mono[i]=static_cast<float>(0.3*std::sin(6.283185307179586*220*t)*std::pow(std::sin(3.141592653589793*local/0.2),2));
    }
    return a;
}
std::vector<float> render(const djayvo::RemixPlan& p,const djayvo::AudioBuffer& a,std::size_t block=512,bool vocals=false,int solo=-1) {
    djayvo::RemixRenderer r(p,a,block,vocals,solo);
    std::vector<float> all;all.reserve(static_cast<std::size_t>(djayvo::compile(p.music).total_frames)*2);
    std::vector<float> scratch(block*2);
    while(!r.finished()) {
        const auto n=r.process(scratch.data(),block);check(n>0,"remix stalled");
        all.insert(all.end(),scratch.begin(),scratch.begin()+static_cast<std::ptrdiff_t>(n*2));
    }
    check(r.voice_overflows()==0 && r.stats().nonfinite_samples==0,"invalid render stats");
    return all;
}
void hashes() {
    check(djayvo::sha256({})=="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","empty SHA-256 vector");
    check(djayvo::sha256({'a','b','c'})=="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad","abc SHA-256 vector");
    const std::vector<std::uint8_t> million(1000000,'a');
    check(djayvo::sha256(million)=="cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0","multi-block SHA-256 vector");
}
void analysis() {
    const auto a=source(); const auto x=djayvo::analyze(a);
    check(x.peak>0.25 && x.rms>0.05 && !x.phrases.empty() && x.onsets.size()>=4,"missing input features");
    check(x.pitch_hz>210 && x.pitch_hz<230 && x.pitch_confidence>0.8,"pitch estimate wrong for clean tone");
    auto silence=a;std::fill(silence.mono.begin(),silence.mono.end(),0);rejects([&]{djayvo::analyze(silence);});
    silence.mono[5]=std::numeric_limits<float>::infinity();rejects([&]{djayvo::analyze(silence);});
}
void resampling() {
    auto a=source(); const auto same=djayvo::resample(a,8000);
    check(same.mono==a.mono,"identity resampler changed source");
    const auto up=djayvo::resample(a,48000);
    check(up.mono.size()==144000 && up.sha256==a.sha256,"resampling duration/provenance");
    const auto down=djayvo::resample(up,8000);
    double error=0,power=0;
    for(std::size_t i=100;i<a.mono.size()-100;++i) {
        error+=std::pow(a.mono[i]-down.mono[i],2);power+=a.mono[i]*a.mono[i];
    }
    check(error/power<0.0001,"round-trip resampling error");
    auto high=up;
    for(std::size_t i=0;i<high.mono.size();++i) high.mono[i]=static_cast<float>(0.5*std::sin(6.283185307179586*6000*i/48000));
    const auto filtered=djayvo::resample(high,8000);double square=0;
    for(std::size_t i=100;i<filtered.mono.size()-100;++i) square+=filtered.mono[i]*filtered.mono[i];
    check(std::sqrt(square/(filtered.mono.size()-200))<0.003,"downsampling aliases above-Nyquist tone");
    rejects([&]{djayvo::resample(a,0);});
}
void preservation() {
    const auto a=source();auto p=djayvo::make_remix(a,djayvo::analyze(a),djayvo::Strategy::hiphop,4123,true,false);
    const auto vocals=render(p,a,257,true);
    const auto hook=djayvo::tick_to_frame(p.vocals[0].start,a.sample_rate,p.music.tempo_milli_bpm);
    const double gain=std::pow(10.0,-3.0/20)*p.analysis.normalization_gain*std::sqrt(0.5);
    for(std::size_t i=100;i<a.mono.size()-100;++i)
        check(std::abs(vocals[(hook+i)*2]-a.mono[i]*gain)<1e-6,"clean hook was changed beyond gain/edge fades");
    const auto frames=djayvo::compile(p.music).total_frames;
    for(auto strategy:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental}) {
        auto plan=djayvo::make_remix(a,djayvo::analyze(a),strategy,4123,true,false);
        const auto audio=render(plan,a,512);
        check(audio==render(plan,a,113),"remix depends on block size");
        const double ceiling=std::pow(10.0,plan.music.ceiling_dbfs/20);
        for(float x:audio) check(std::isfinite(x) && std::abs(x)<=ceiling+1e-7,"remix violates ceiling");
        for(auto i=audio.size()-a.sample_rate/10*2;i<audio.size();++i) check(audio[i]==0,"truncated final tail");
    }
    check(frames==256000,"hiphop 32-second export duration wrong");
}
void validation() {
    auto a=source();const auto analysis=djayvo::analyze(a);
    rejects([&]{djayvo::make_remix(a,analysis,djayvo::Strategy::hiphop,0,false,false);});
    auto p=djayvo::make_remix(a,analysis,djayvo::Strategy::hiphop,0,false,true);
    auto bad=p;bad.clips[0].end=a.mono.size()+1;rejects([&]{djayvo::validate(bad,a);});
    bad=p;bad.vocals[0].clip=999;rejects([&]{djayvo::validate(bad,a);});
    bad=p;bad.vocals[0].rate=0;rejects([&]{djayvo::validate(bad,a);});
    bad=p;bad.vocals[0].reverse=true;rejects([&]{djayvo::validate(bad,a);});
    bad=p;for(auto& e:bad.vocals)e.clean=false;rejects([&]{djayvo::validate(bad,a);});
    bad=p;bad.source_sha256=std::string(64,'1');rejects([&]{djayvo::validate(bad,a);});
    bad=p;bad.vocals.assign(17,p.vocals[0]);rejects([&]{djayvo::validate(bad,a);});
    bad=p;bad.vocals[0].start=djayvo::ticks_per_bar(p.music)*p.music.bars-1;rejects([&]{djayvo::validate(bad,a);});
    bad=p;bad.vocals[0].rate=std::numeric_limits<double>::quiet_NaN();rejects([&]{djayvo::validate(bad,a);});
    for (double mix:{-0.01,0.36,std::numeric_limits<double>::quiet_NaN()}) {
        bad=p;bad.instrument_room_mix=mix;rejects([&]{djayvo::validate(bad,a);});
    }
    bad=p;bad.music.tail_ms=500;
    bad.music.tracks[0].notes={{djayvo::ticks_per_bar(bad.music)*bad.music.bars-960,960,60,70}};
    rejects([&]{djayvo::validate(bad,a);});
    auto absent=analysis;absent.phrases.clear();rejects([&]{djayvo::make_remix(a,absent,djayvo::Strategy::hiphop,0,true,false);});
    auto invalid_rate=a;invalid_rate.sample_rate=0;
    rejects([&]{djayvo::make_remix(invalid_rate,analysis,djayvo::Strategy::hiphop,0,true,false);});
    absent=analysis;absent.pitch_hz=std::numeric_limits<double>::infinity();
    rejects([&]{djayvo::make_remix(a,absent,djayvo::Strategy::hiphop,0,true,false);});
}
void vocal_spacing() {
    for (const int seconds : {2,3,5}) {
        auto a=source();a.mono.resize(static_cast<std::size_t>(a.sample_rate)*seconds);
        a.original_frames=a.mono.size();
        auto analysis=djayvo::analyze(a);
        // These distinct onsets collapse onto one reggae offbeat.
        analysis.onsets={800,1600,2400,3200,4000,4800};
        for (auto style:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental}) {
            auto p=djayvo::make_remix(a,analysis,style,4123,true,false);
            const auto start=[&](const djayvo::VocalEvent& e) {
                return djayvo::tick_to_frame(e.start,a.sample_rate,p.music.tempo_milli_bpm);
            };
            const auto end=[&](const djayvo::VocalEvent& e) {
                const auto& clip=p.clips[e.clip];
                return start(e)+static_cast<std::uint64_t>(std::ceil(static_cast<double>(clip.end-clip.begin)/e.rate));
            };
            std::vector<std::uint64_t> starts;
            for (const auto& e:p.vocals) if (!e.clean) {
                check(std::find(starts.begin(),starts.end(),start(e))==starts.end(),"chops stack at the same frame");
                starts.push_back(start(e));
                for (const auto& clean:p.vocals) if (clean.clean)
                    check(end(e)+a.sample_rate*80/1000<=start(clean) || start(e)>=end(clean)+a.sample_rate*80/1000,
                          "chop masks a clean hook or its breathing space");
                for (const auto& other:p.vocals) if (!other.clean && &other!=&e)
                    check(end(e)+a.sample_rate*80/1000<=start(other) || start(e)>=end(other)+a.sample_rate*80/1000,
                          "creative chops overlap or leave no breathing space");
            }
            check(!starts.empty(),"spacing removed every creative chop");
            check(std::count_if(p.vocals.begin(),p.vocals.end(),[](const auto& e){return e.clean;})==2,
                  "spacing removed a clean hook");
            // Check the actual vocal stem through both full-source hooks, including
            // a five-second source that extends beyond the two-bar introduction.
            const auto vocals=render(p,a,257,true);
            for (const auto& e:p.vocals) if (e.clean) {
                const auto& clip=p.clips[e.clip];
                const double gain=std::pow(10.0,e.gain_db/20)*p.analysis.normalization_gain*std::sqrt(0.5);
                for (auto i=clip.begin+100;i+100<clip.end;++i)
                    check(std::abs(vocals[(start(e)+i-clip.begin)*2]-a.mono[i]*gain)<1e-6,
                          "clean hook stem contains another vocal");
            }
        }
    }
}
void varied_openings() {
    const auto a=source();const auto analysis=djayvo::analyze(a);
    for (auto style:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental}) {
        bool clean_first=false,instrument_first=false,chop_first=false;
        for (std::uint32_t seed=4123;seed<4126;++seed) {
            const auto p=djayvo::make_remix(a,analysis,style,seed,true,false);
            const bool clean_at_zero=std::any_of(p.vocals.begin(),p.vocals.end(),[](const auto& e){return e.clean && e.start==0;});
            const bool chop_at_zero=std::any_of(p.vocals.begin(),p.vocals.end(),[](const auto& e){return !e.clean && e.start==0;});
            bool instrument_at_zero=false;
            for (const auto& track:p.music.tracks)
                for (const auto& note:track.notes) instrument_at_zero|=note.start==0;
            check(clean_at_zero || instrument_at_zero || chop_at_zero,"varied opening begins with empty silence");
            clean_first|=clean_at_zero;
            instrument_first|=!clean_at_zero && !chop_at_zero && instrument_at_zero;
            chop_first|=chop_at_zero;
            const auto& clean=*std::find_if(p.vocals.begin(),p.vocals.end(),[](const auto& e){return e.clean;});
            check(p.clips[clean.clip].begin==0 && p.clips[clean.clip].end==a.mono.size(),"opening lost the full clean phrase");
        }
        check(clean_first && instrument_first && chop_first,"seeds do not vary the opening treatment");
    }
}
void pause_aware_chops() {
    for (const unsigned rate:{8000U,44100U,48000U,192000U}) {
        auto a=source();a.sample_rate=a.original_rate=rate;
        a.mono.assign(3*rate,0);a.original_frames=a.mono.size();
        for (std::size_t i=rate/10;i<rate*47/100;++i)
            if (i<rate*3/10 || i>=rate*31/100)
                a.mono[i]=static_cast<float>(0.3*std::sin(6.283185307179586*220*i/rate));
        auto features=djayvo::analyze(a);features.onsets={rate/10};
        auto p=djayvo::make_remix(a,features,djayvo::Strategy::experimental,4123,true,false);
        check(p.clips.size()==2,"single onset did not produce one chop");
        const auto clip=p.clips[1];
        check(clip.begin<=rate/10 && clip.begin>=rate*88/1000,"chop loses attack or excessive pre-roll");
        check(clip.end>=rate*47/100 && clip.end<=rate/2,"chop cuts active speech before its nearby pause");
        features.onsets.clear();
        p=djayvo::make_remix(a,features,djayvo::Strategy::experimental,4123,true,false);
        check(p.clips[1].end>=rate*47/100 && p.clips[1].end<=features.phrases[0].end,
              "phrase fallback ignores the quiet boundary or exceeds its region");
        std::fill(a.mono.begin(),a.mono.end(),0.2f);
        features=djayvo::analyze(a);features.onsets={rate/10,a.mono.size()-1};
        p=djayvo::make_remix(a,features,djayvo::Strategy::experimental,4123,true,false);
        check(p.clips.size()==2,"near-EOF onset creates a tiny or invalid chop");
        check(p.clips[1].end-p.clips[1].begin<=rate*260/1000,
              "unbroken sound creates an excessive chop instead of bounded fallback");
        check(p.clips[1].confidence<clip.confidence,"fallback claims the same boundary confidence as a pause");
        features.onsets.clear();features.phrases={{rate,rate+1,0.2}};
        p=djayvo::make_remix(a,features,djayvo::Strategy::experimental,4123,true,false);
        check(p.clips[1].begin==rate && p.clips[1].end==rate+1,"tiny fallback region escapes its bounds");
    }
}
void no_allocations() {
    const auto a=source();const auto p=djayvo::make_remix(a,djayvo::analyze(a),djayvo::Strategy::experimental,4123,true,false);
    djayvo::RemixRenderer r(p,a,512);float buffer[1024]{};
    const auto before=allocations.load();
    while(!r.finished()) r.process(buffer,512);
    const auto after=allocations.load();check(before==after,"sample render allocated memory");
}
void arrangement_contrast() {
    const auto a=source();const auto analysis=djayvo::analyze(a);
    for (auto style:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental})
        for (std::uint32_t seed:{0U,4123U,4124U,4125U,4294967295U}) {
            const auto p=djayvo::make_remix(a,analysis,style,seed,true,false);
            const auto bar=djayvo::ticks_per_bar(p.music);
            const auto rest=std::find_if(p.music.sections.begin(),p.music.sections.end(),[](const auto& s){return s.name=="break";});
            const auto arrival=std::find_if(p.music.sections.begin(),p.music.sections.end(),[](const auto& s){return s.name=="return";});
            check(rest!=p.music.sections.end() && arrival!=p.music.sections.end(),"arrangement lacks contrast sections");
            for (std::size_t t=1;t<3;++t) {
                int returning=0;
                for (const auto& n:p.music.tracks[t].notes) {
                    check(n.start<rest->start_bar*bar || n.start>=(rest->start_bar+rest->bars)*bar,
                          "rhythm section plays through the break");
                    if (n.start>=arrival->start_bar*bar && n.start<(arrival->start_bar+arrival->bars)*bar) ++returning;
                }
                check(returning>=3,"rhythm section does not return");
            }
            for (const auto& n:p.music.tracks[0].notes) {
                check(n.pitch>=48 && n.pitch<=79,"piano escaped its intended register");
                check(n.duration>0,"rolled chord has an invalid note length");
            }
            for (const auto& v:p.vocals) check(v.rate==1 && !v.reverse,"planner alters speech pitch/time");
        }
}
void room_processing() {
    const auto a=source();auto p=djayvo::make_remix(a,djayvo::analyze(a),djayvo::Strategy::hiphop,4123,true,false);
    for (auto& track:p.music.tracks) track.notes.clear();
    p.music.tracks[0].pan=0;p.music.tracks[0].notes={{0,960,60,90}};
    p.instrument_room_mix=0;
    const auto dry=render(p,a,257,false,0),dry_voice=render(p,a,257,true);
    p.instrument_room_mix=0.35;
    const auto wet=render(p,a,257,false,0);
    check(wet==render(p,a,113,false,0),"room depends on block boundaries");
    check(dry_voice==render(p,a,113,true),"instrument room altered vocal stem");
    double side=0;
    for (std::size_t i=0;i<wet.size();i+=2) {
        check(dry[i]==dry[i+1],"centered dry instrument is not mono");
        side+=std::pow(wet[i]-wet[i+1],2);
        if (i/2<a.sample_rate*31/1000) check(wet[i]==dry[i] && wet[i+1]==dry[i+1],"reflection arrives before its delay");
        if (i/2>2*a.sample_rate) check(wet[i]==0 && wet[i+1]==0,"room has a stuck or excessive tail");
    }
    check(side>0.001,"room does not create stereo reflections");
}
}
int main() {
    const std::vector<std::pair<const char*,std::function<void()>>> tests{
        {"SHA-256 known vectors",hashes},{"energy/onset/phrase/pitch analysis and silence",analysis},
        {"resampling duration, identity, round-trip and antialias",resampling},
        {"clean hook preservation, deterministic styles, finite bounded output",preservation},
        {"consent, crop, transform, polyphony and duration rejection",validation},
        {"quantized chop spacing and both clean hooks at 2/3/5 seconds",vocal_spacing},
        {"seeded clean, instrumental and fragment openings",varied_openings},
        {"pause-aware crops, attack pre-roll, bounded fallback and EOF at four rates",pause_aware_chops},
        {"subtraction and return across styles and seeds",arrangement_contrast},
        {"instrument room timing, stereo, dry speech and finite tail",room_processing},
        {"allocation-free sample and instrument processing",no_allocations}};
    int failures=0;
    for(const auto& t:tests)try{t.second();std::cout<<"PASS: "<<t.first<<'\n';}
    catch(const std::exception& e){++failures;std::cout<<"FAIL: "<<t.first<<": "<<e.what()<<'\n';}
    return failures?1:0;
}
