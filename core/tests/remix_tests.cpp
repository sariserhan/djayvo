#include "djayvo/remix.h"
#include <algorithm>
#include <atomic>
#include <cmath>
#include <chrono>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <functional>
#include <iostream>
#include <limits>
#include <new>
#include <set>
#include <stdexcept>
#include <tuple>

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
    for (const auto rate:{8000U,16000U,48000U,192000U}) {
        for (const auto attack:{0U,rate,rate*3U-1U}) {
            auto transient=a;transient.sample_rate=transient.original_rate=rate;
            transient.original_frames=rate*3U;transient.mono.assign(rate*3U,0);
            const auto length=rate/1000;
            const auto begin=std::min(attack,rate*3U-length);
            for (auto i=begin;i<begin+length;++i) transient.mono[i]=(i%2?0.7F:-0.7F);
            const auto features=djayvo::analyze(transient);
            check(features.phrases.size()==1 && features.phrases[0].begin<=begin &&
                  features.phrases[0].end>=begin+length && features.phrases[0].end<=transient.mono.size(),
                  "short transient lost or padded outside source");
            const auto plan=djayvo::make_remix(transient,features,djayvo::Strategy::hiphop,4123,true,false);
            djayvo::validate(plan,transient);
        }
    }
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
    const auto cd_rate=djayvo::resample(a,44100);
    check(djayvo::resample(cd_rate,48000).mono.size()==144000,"resampling frame numerator overflow");
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
    for(auto strategy:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental,djayvo::Strategy::club,djayvo::Strategy::funk,djayvo::Strategy::call_response,djayvo::Strategy::hybrid}) {
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
    for (double duck:{-12.01,0.01,std::numeric_limits<double>::quiet_NaN()}) {
        bad=p;bad.music.kick_duck_db=duck;rejects([&]{djayvo::validate(bad,a);});
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
        for (auto style:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental,djayvo::Strategy::club,djayvo::Strategy::funk,djayvo::Strategy::call_response,djayvo::Strategy::hybrid}) {
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
    for (auto style:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental,djayvo::Strategy::club,djayvo::Strategy::funk,djayvo::Strategy::call_response,djayvo::Strategy::hybrid}) {
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
void hiphop_composition() {
    const auto a=source();const auto features=djayvo::analyze(a);
    using Shape=std::vector<std::tuple<int,djayvo::Tick,djayvo::Tick,int>>;
    const auto shape=[](const djayvo::RemixPlan& p,int first,int bars,int instrument=-1) {
        Shape result;const auto bar=djayvo::ticks_per_bar(p.music);
        for (const auto& track:p.music.tracks) {
            if (instrument>=0 && static_cast<int>(track.instrument)!=instrument) continue;
            for (const auto& note:track.notes)
                if (note.start>=first*bar && note.start<(first+bars)*bar)
                    result.emplace_back(static_cast<int>(track.instrument),note.start-first*bar,note.duration,note.pitch);
        }
        std::sort(result.begin(),result.end());return result;
    };
    std::set<Shape> compositions,grooves;
    std::set<std::vector<int>> harmonies;
    Shape previous_groove;
    for (std::uint32_t seed=0;seed<64;++seed) {
        const auto p=djayvo::make_remix(a,features,djayvo::Strategy::hiphop,seed,true,false);
        const auto bar=djayvo::ticks_per_bar(p.music);
        compositions.insert(shape(p,2,4));
        const auto groove=shape(p,2,1,static_cast<int>(djayvo::Instrument::drums));
        check(groove!=previous_groove,"adjacent hiphop seeds repeat the same drum rhythm");
        grooves.insert(groove);previous_groove=groove;
        std::vector<int> roots;
        for (const auto& track:p.music.tracks) for (const auto& note:track.notes) {
            if (track.instrument==djayvo::Instrument::bass && note.start>=2*bar && note.start<6*bar && note.start%bar==0)
                roots.push_back(note.pitch);
            if (track.instrument!=djayvo::Instrument::drums) {
                const int degree=(note.pitch-p.tonic_midi+120)%12;
                check(degree==0 || degree==2 || degree==3 || degree==5 || degree==7 || degree==8 || degree==10,
                      "hiphop harmony escaped natural minor");
            }
        }
        harmonies.insert(roots);
        check(shape(p,2,1,static_cast<int>(djayvo::Instrument::drums))==shape(p,4,1,static_cast<int>(djayvo::Instrument::drums)),
              "hiphop groove does not recur within the phrase");
        check(shape(p,3,1)!=shape(p,9,1),"hiphop return lacks a developed response");
        check(shape(p,2,4)==shape(djayvo::make_remix(a,features,djayvo::Strategy::hiphop,seed,true,false),2,4),
              "hiphop composition is not repeatable");
    }
    // Ignore velocity, sample take, voice and intro: they cannot satisfy structural variety.
    std::cout<<"Hip-hop 64-seed audit: "<<harmonies.size()<<" harmonic cycles, "<<grooves.size()
             <<" drum shapes, "<<compositions.size()<<" four-bar instrumental shapes\n";
    check(harmonies.size()>=4,"hiphop seeds share one harmonic cycle");
    check(grooves.size()>=4,"hiphop seeds share one drum rhythm");
    check(compositions.size()>=12,"hiphop seeds do not vary the musical body");
    for (const auto seed:{0U,4294967295U}) {
        const auto p=djayvo::make_remix(a,features,djayvo::Strategy::hiphop,seed,true,false);
        check(render(p,a,113)==render(p,a,257),"hiphop edge seed render depends on block size");
    }
}
void remaining_style_diversity() {
    const auto a=source();const auto features=djayvo::analyze(a);
    using Shape=std::vector<std::tuple<int,djayvo::Tick,djayvo::Tick,int>>;
    for (auto style:{djayvo::Strategy::reggae,djayvo::Strategy::experimental,djayvo::Strategy::club}) {
        std::set<Shape> shapes;
        for (std::uint32_t seed=4100;seed<4164;++seed) {
            const auto p=djayvo::make_remix(a,features,style,seed,true,false);Shape body;
            for (const auto& t:p.music.tracks) for (const auto& n:t.notes)
                if(n.start>=2*djayvo::ticks_per_bar(p.music) && n.start<(p.music.bars-1)*djayvo::ticks_per_bar(p.music))
                    body.emplace_back(static_cast<int>(t.instrument),n.start,n.duration,n.pitch-p.tonic_midi);
            shapes.insert(body);
        }
        check(shapes.size()>=24,"style has too few musical structures for recent-take avoidance");
    }
}
void dialogue_hybrid_composition() {
    auto a=source();a.mono.resize(5*a.sample_rate);a.original_frames=a.mono.size();
    const auto features=djayvo::analyze(a);
    using Shape=std::vector<std::tuple<int,djayvo::Tick,djayvo::Tick,int>>;
    const auto shape=[](const djayvo::RemixPlan& p) {
        Shape result;
        for (const auto& track:p.music.tracks) for (const auto& n:track.notes)
            if (n.start>=2*djayvo::ticks_per_bar(p.music)) result.emplace_back(static_cast<int>(track.instrument),n.start,n.duration,n.pitch);
        return result;
    };
    for (auto style:{djayvo::Strategy::call_response,djayvo::Strategy::hybrid}) {
        std::set<Shape> shapes;
        for (std::uint32_t seed=4100;seed<4164;++seed) {
            const auto p=djayvo::make_remix(a,features,style,seed,true,false);
            const auto bar=djayvo::ticks_per_bar(p.music),q=djayvo::ticks_per_quarter;
            check(p.music.bars==16,"dialogue/hybrid form changed");
            shapes.insert(shape(p));
            check(shape(p)==shape(djayvo::make_remix(a,features,style,seed,true,false)),"new grammar is not repeatable");
            if (style==djayvo::Strategy::call_response) {
                unsigned answers=0;
                for (const auto& n:p.music.tracks[0].notes) if (n.duration==q/3) {
                    ++answers;
                    const auto begin=djayvo::tick_to_frame(n.start,p.music),end=djayvo::tick_to_frame(n.start+n.duration,p.music);
                    for (const auto& e:p.vocals) {
                        const auto call=djayvo::tick_to_frame(e.start,p.music);
                        const auto length=djayvo::vocal_frames(e,p.clips[e.clip]);
                        check(end<=call || begin>=call+length+a.sample_rate*80/1000,"instrument answer interrupts a vocal call");
                    }
                }
                check(answers>=6,"dialogue has no developed instrumental answer");
            } else {
                std::set<std::vector<djayvo::Tick>> rhythms;
                for (int b:{3,7,13}) {
                    std::vector<djayvo::Tick> snare;
                    for (const auto& n:p.music.tracks[2].notes)
                        if(n.pitch==38 && n.start>=b*bar && n.start<(b+1)*bar) snare.push_back(n.start-b*bar);
                    rhythms.insert(snare);
                }
                check(rhythms.size()==3,"hybrid does not traverse all three rhythm grammars");
            }
        }
        check(shapes.size()>=12,"new grammar varies only velocity/tempo/sample takes");
        auto changed=features;changed.onsets={800,3300,9100};
        check(shape(djayvo::make_remix(a,features,style,4123,true,false))!=
              shape(djayvo::make_remix(a,changed,style,4123,true,false)),"new grammar ignores input rhythm");
    }
}
void funk_composition() {
    const auto a=source();const auto features=djayvo::analyze(a);
    using Shape=std::vector<std::tuple<int,djayvo::Tick,djayvo::Tick,int>>;
    const auto shape=[](const djayvo::RemixPlan& p) {
        Shape result;
        for (const auto& track:p.music.tracks) for (const auto& n:track.notes)
            if (n.start>=7680 && n.start<23040)
                result.emplace_back(static_cast<int>(track.instrument),n.start,n.duration,n.pitch);
        return result;
    };
    std::set<Shape> shapes;
    std::set<std::uint32_t> tempos;
    for (std::uint32_t seed=0;seed<64;++seed) {
        const auto p=djayvo::make_remix(a,features,djayvo::Strategy::funk,seed,true,false);
        check(p.music.bars==14 && p.music.sections[2].start_bar==8,"funk lost its break/return form");
        shapes.insert(shape(p));tempos.insert(p.music.tempo_milli_bpm);
        const auto& bass=p.music.tracks[1].notes;const auto& drums=p.music.tracks[2].notes;
        int offbeat_bass=0,ghosts=0,short_chords=0;
        for (const auto& n:bass) if (n.start>=7680 && n.start<30720 && n.start%480!=0) ++offbeat_bass;
        for (const auto& n:drums) if (n.start>=7680 && n.start<30720) {
            if (n.pitch==38 && n.velocity<50) ++ghosts;
            if (n.pitch==36) check(std::any_of(bass.begin(),bass.end(),[&](const auto& b){return b.start==n.start;}),
                                  "funk kick no longer locks to the bass");
        }
        for (const auto& track:p.music.tracks) if (track.instrument==djayvo::Instrument::guitar)
            for (const auto& n:track.notes) if (n.start>=7680 && n.start<30720 && n.duration<=240 && n.muted) ++short_chords;
        const auto& guitar=p.music.tracks[3];
        check(guitar.instrument==djayvo::Instrument::guitar && guitar.notes.size()%3==0,"guitar strums missing");
        bool up=false,down=false,normal=false,muted=false;
        for (std::size_t i=0;i<guitar.notes.size();i+=3) {
            const auto& a=guitar.notes[i];const auto& b=guitar.notes[i+1];const auto& c=guitar.notes[i+2];
            check(b.start-a.start==24 && c.start-b.start==24,"guitar strings strike simultaneously");
            check(a.start+a.duration==b.start+b.duration && b.start+b.duration==c.start+c.duration,"strum muting is not coordinated");
            up|=a.pitch>b.pitch && b.pitch>c.pitch;down|=a.pitch<b.pitch && b.pitch<c.pitch;
            normal|=!a.muted;muted|=a.muted;
        }
        check(up && down && normal && muted,"guitar lacks strum direction or attack articulation");
        check(offbeat_bass>=12 && ghosts>=6 && short_chords>=36,"funk lost syncopation, ghost notes or stabs");
        check(shape(p)==shape(djayvo::make_remix(a,features,djayvo::Strategy::funk,seed,true,false)),"funk is not seed repeatable");
        for (auto other:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental,djayvo::Strategy::club})
            check(shape(p)!=shape(djayvo::make_remix(a,features,other,seed,true,false)),"funk copies another strategy");
    }
    check(shapes.size()>=12 && tempos.size()==3,"funk seeds only change velocity or sample takes");
    auto changed=features;changed.onsets={1200,3000,5700};
    check(shape(djayvo::make_remix(a,features,djayvo::Strategy::funk,4123,true,false))!=
          shape(djayvo::make_remix(a,changed,djayvo::Strategy::funk,4123,true,false)),"funk melody ignores input rhythm");
    const auto p=djayvo::make_remix(a,features,djayvo::Strategy::funk,4294967295U,true,false);
    check(!render(p,a).empty(),"maximum seed failed");
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
    const auto a=source();
    for (auto style:{djayvo::Strategy::experimental,djayvo::Strategy::club,djayvo::Strategy::funk,djayvo::Strategy::call_response,djayvo::Strategy::hybrid}) {
        const auto p=djayvo::make_remix(a,djayvo::analyze(a),style,4123,true,false);
        djayvo::RemixRenderer r(p,a,512);float buffer[1024]{};
        const auto before=allocations.load();
        while(!r.finished()) r.process(buffer,512);
        const auto after=allocations.load();check(before==after,"sample render allocated memory");
    }
}
void club_direction() {
    const auto a=source();auto features=djayvo::analyze(a);
    auto p=djayvo::make_remix(a,features,djayvo::Strategy::club,4123,true,false);
    const auto bar=djayvo::ticks_per_bar(p.music);
    check(p.music.tempo_milli_bpm==140000 && p.music.bars==20,"club tempo/form wrong");
    check(p.music.sections.size()==6 && p.music.sections[2].name=="drop","club lacks build/drop form");
    for (const auto& t:p.music.tracks) check(t.electronic || t.instrument==djayvo::Instrument::pad,"club selected acoustic palette");
    for (const auto& n:p.music.tracks[1].notes)
        check((n.start>=6*bar && n.start<10*bar) || n.start>=14*bar,"bass masks build/break");
    auto altered=features;altered.onsets={800,1700,2600};
    auto other=djayvo::make_remix(a,altered,djayvo::Strategy::club,4123,true,false);
    bool rhythm_changed=false;
    const auto& bass=p.music.tracks[1].notes;
    const auto& other_bass=other.music.tracks[1].notes;
    check(bass.size()==other_bass.size(),"unexpected club note-count change");
    for (std::size_t i=0;i<bass.size();++i) rhythm_changed|=bass[i].start!=other_bass[i].start;
    check(rhythm_changed,"club bass ignores source rhythm");
    auto dry=p;dry.music.kick_duck_db=0;
    const auto ducked=render(p,a,257,false,1),unducked=render(dry,a,257,false,1);
    double duck_energy=0,dry_energy=0;
    for(std::size_t i=0;i<ducked.size();++i) {duck_energy+=ducked[i]*ducked[i];dry_energy+=unducked[i]*unducked[i];}
    check(duck_energy<dry_energy*.99 && duck_energy>dry_energy*.2,"bass solo lost kick envelope or excessive ducking");
    check(render(p,a,257,false,2)==render(dry,a,257,false,2),"kick envelope altered drums");
    check(render(p,a,257,true)==render(dry,a,257,true),"kick envelope altered speech");
    auto acoustic=p;for(auto& t:acoustic.music.tracks)t.electronic=false;
    check(render(p,a,257,false,1)!=render(acoustic,a,257,false,1),"electronic palette has no effect");
}
void club_phrasing() {
    for (unsigned rate:{8000U,48000U}) {
        auto a=source();a.sample_rate=a.original_rate=rate;
        a.mono.assign(3*rate,0);a.original_frames=a.mono.size();
        for(std::size_t i=rate/10;i<rate*8/10;++i)
            a.mono[i]=static_cast<float>(.3*std::sin(6.283185307179586*220*i/rate));
        auto features=djayvo::analyze(a);features.onsets={rate/10,rate*3/10,rate/2};
        auto p=djayvo::make_remix(a,features,djayvo::Strategy::club,4123,true,false);
        check(p.clips.size()==2,"club retained several overlapping slices of the same phrase");
        check(p.clips[1].end>=rate*8/10 && p.clips[1].end<rate*85/100 && p.clips[1].confidence==.65,
              "club crops an active long phrase before the available pause");
        std::fill(a.mono.begin(),a.mono.end(),.2f);
        features=djayvo::analyze(a);
        p=djayvo::make_remix(a,features,djayvo::Strategy::club,4123,true,false);
        check(p.clips.size()>=2 && p.clips[1].confidence==.3 && p.clips[1].end-p.clips[1].begin<=rate*46/100,
              "no-pause club fallback is absent, excessive or overconfident");
    }
    const auto a=source();
    for(std::uint32_t seed:{0U,4123U,4124U,4125U,4294967295U}) {
        const auto p=djayvo::make_remix(a,djayvo::analyze(a),djayvo::Strategy::club,seed,true,false);
        const auto bar=djayvo::ticks_per_bar(p.music),q=djayvo::ticks_per_quarter;
        for(const auto& n:p.music.tracks[2].notes)
            check(n.start<5*bar+3*q || n.start>=6*bar,"build leaves no beat of anticipation before the drop");
        for(int b=14;b<19;++b) {
            int hats=0;
            for(const auto& n:p.music.tracks[2].notes)if(n.pitch==46 && n.start>=b*bar && n.start<(b+1)*bar)++hats;
            check(hats==1,"return doubles its open-hat accent");
        }
    }
}
void stem_identity() {
    const auto a=source();
    for (auto style:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental,djayvo::Strategy::club,djayvo::Strategy::funk,djayvo::Strategy::call_response,djayvo::Strategy::hybrid}) {
        auto p=djayvo::make_remix(a,djayvo::analyze(a),style,4123,true,false);
        // Stay below the nonlinear master stages so the stems must sum to the mix.
        for (auto& track:p.music.tracks) track.gain_db-=18;
        if (style==djayvo::Strategy::hiphop) {
            p.music.tempo_changes={{15360,100000}};
            for (auto& track:p.music.tracks)
                track.automation={{0,track.gain_db,track.pan},{15360,track.gain_db-6,0.7},{30720,track.gain_db,-0.7}};
        }
        const auto full=render(p,a,257);
        auto sum=render(p,a,113,true);
        for(int solo=0;solo<=static_cast<int>(djayvo::Instrument::lead);++solo) {
            const auto stem=render(p,a,113,false,solo);
            for(std::size_t i=0;i<sum.size();++i)sum[i]+=stem[i];
        }
        for(std::size_t i=0;i<sum.size();++i)
            check(std::abs(sum[i]-full[i])<2e-7,"stem export changes the instrument performance");
    }
}
void timeline_voice() {
    const auto a=source();auto p=djayvo::make_remix(a,djayvo::analyze(a),djayvo::Strategy::hiphop,4123,true,false);
    p.music.tempo_changes={{15360,100000}};
    p.vocals={{30720,0,-3,1,false,0,true},{14880,1,-8,1,false,0,false,0,1,720,-12}};
    const auto voice=render(p,a,257,true);
    const std::uint64_t start=156800; // 4 bars at 96 BPM + 4 bars at 100 BPM, 8 kHz
    const double gain=std::pow(10.0,-3.0/20)*p.analysis.normalization_gain*std::sqrt(0.5);
    for (std::size_t i=100;i+100<a.mono.size();++i)
        check(std::abs(voice[(start+i)*2]-a.mono[i]*gain)<1e-6,"tempo map mistimes or changes clean source hook");
    const auto event=p.vocals.back();p.vocals.back().echo_ticks=0;
    for (int repeat=1;repeat<=3;++repeat) {
        auto echo=event;echo.echo_ticks=0;echo.start+=repeat*720;
        echo.gain_db+=-12+(repeat-1)*20*std::log10(0.35);echo.pan=repeat%2?0.45:-0.45;
        // Compare before the third echo, whose gain is below the dry-event floor.
        if (echo.gain_db>=-30) p.vocals.push_back(echo);
    }
    // Check each audible repeat against its dry trigger, including the tempo boundary.
    const auto explicit_echoes=render(p,a,113,true);
    const auto last=djayvo::tick_to_frame(event.start+3*720,p.music);
    for (std::size_t i=0;i<last*2;++i)
        check(std::abs(voice[i]-explicit_echoes[i])<1e-7,"echo uses the wrong tempo segment");
}
void export_transactions() {
    namespace fs=std::filesystem;
    const auto root=fs::temp_directory_path()/("djayvo-export-"+std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));
    check(fs::create_directory(root),"could not reserve export test directory");
    try {
        const auto input=root/"source.wav";
        const auto a=source();std::vector<float> stereo;
        for (auto x:a.mono) {stereo.push_back(x);stereo.push_back(x);}
        djayvo::WavWriter writer(input.string(),a.sample_rate,a.mono.size());
        writer.write(stereo.data(),a.mono.size());writer.close();
        struct Context {std::string prefix;int mode;int checks=0;bool injected=false;};
        const auto callback=+[](void* opaque)->int {
            auto& c=*static_cast<Context*>(opaque);++c.checks;
            if (c.mode==0) return c.checks==40;
            if (c.mode==1) return fs::exists(c.prefix+".hiphop.wav");
            if (!c.injected && fs::exists(fs::path(c.prefix+".partial")/"export.experimental.events.tsv")) {
                std::ofstream obstacle(c.prefix+".reggae.wav");obstacle<<"preserve me";obstacle.close();
                check(static_cast<bool>(obstacle),"cannot inject publication collision");c.injected=true;
            }
            return 0;
        };
        for (int mode=0;mode<3;++mode) {
            Context c{(root/("case"+std::to_string(mode))).string(),mode};
            bool rejected=false;
            try {djayvo::remix_file(input.string(),c.prefix,{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,
                 djayvo::Strategy::experimental},8000,4123,257,true,false,false,{callback,&c});}
            catch (const djayvo::RenderCancelled&) {check(mode<2,"collision misreported as cancellation");rejected=true;}
            catch (const fs::filesystem_error&) {check(mode==2,"unexpected publication I/O failure");rejected=true;}
            check(rejected,"cancelled/colliding export succeeded");
            check(!fs::exists(c.prefix+".complete.json") && !fs::exists(c.prefix+".partial"),"failed export left a completion marker or staging files");
            check(!fs::exists(c.prefix+".hiphop.wav"),"publication rollback left an earlier master");
            if (mode==2) {std::ifstream file(c.prefix+".reggae.wav");std::string text;std::getline(file,text);
                check(c.injected && text=="preserve me","publication replaced a competing file");}
        }
        const auto locked=(root/"locked").string();fs::create_directory(locked+".partial");
        rejects([&]{djayvo::remix_file(input.string(),locked,{djayvo::Strategy::hiphop},8000,1,257,true,false,false);});
        check(fs::exists(locked+".partial"),"removed another export's lock");
        const auto linked=(root/"linked").string();fs::create_symlink(root/"missing.wav",linked+".hiphop.wav");
        rejects([&]{djayvo::remix_file(input.string(),linked,{djayvo::Strategy::hiphop},8000,1,257,true,false,false);});
        check(fs::is_symlink(fs::symlink_status(linked+".hiphop.wav")),"removed an existing dangling symlink");
    } catch (...) {fs::remove_all(root);throw;}
    fs::remove_all(root);
}
void arrangement_contrast() {
    const auto a=source();const auto analysis=djayvo::analyze(a);
    for (auto style:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental,djayvo::Strategy::funk})
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
void independent_voice() {
    for (const unsigned rate:{8000U,44100U,48000U,192000U}) {
        auto a=source();a.sample_rate=a.original_rate=rate;a.original_frames=rate*3;
        a.mono.resize(rate*3);
        for (std::size_t i=0;i<a.mono.size();++i)
            a.mono[i]=static_cast<float>(0.2*std::sin(6.283185307179586*220*static_cast<double>(i)/rate));
        auto p=djayvo::make_remix(a,djayvo::analyze(a),djayvo::Strategy::hiphop,4123,true,false);
        for (auto& track:p.music.tracks) track.notes.clear();
        p.clips={{0,a.mono.size(),1},{0,rate,1}};
        p.vocals={{0,1,-6,1,false,0,false},{9600,0,-6,1,false,0,true}};
        const auto capture=[&](std::size_t block) {
            djayvo::RemixRenderer renderer(p,a,block,true);
            const auto frames=djayvo::vocal_frames(p.vocals[0],p.clips[1]);
            std::vector<float> result(static_cast<std::size_t>(frames+32)*2),buffer(block*2);
            const auto before=allocations.load();
            std::size_t offset=0;
            while (offset<result.size()/2) {
                const auto n=renderer.process(buffer.data(),std::min(block,result.size()/2-offset));
                check(n>0,"transformed render stalled");
                std::copy_n(buffer.begin(),n*2,result.begin()+static_cast<std::ptrdiff_t>(offset*2));offset+=n;
            }
            check(allocations.load()==before,"transformed callback allocates");
            check(renderer.stats().nonfinite_samples==0,"transformed PCM is nonfinite");
            for (auto i=frames;i<frames+32;++i) check(result[static_cast<std::size_t>(i)*2]==0,"transform overruns its duration");
            return result;
        };
        for (double pitch:{-4.0,0.0,4.0}) for (double stretch:{0.8,1.0,1.25}) {
            auto& e=p.vocals[0];e.pitch_semitones=pitch;e.time_stretch=stretch;
            const auto pcm=capture(257);
            check(pcm==capture(113),"transform depends on block size");
            const auto frames=djayvo::vocal_frames(e,p.clips[1]);
            check(frames==static_cast<std::uint64_t>(std::ceil(rate*stretch)),"pitch changed target duration");
            const auto lo=rate/10,hi=static_cast<unsigned>(frames)-rate/10;
            unsigned crossings=0;
            for (auto i=lo+1;i<hi;++i) if (pcm[i*2-2]<=0 && pcm[i*2]>0) ++crossings;
            const double hz=static_cast<double>(crossings)*rate/(hi-lo);
            check(std::abs(hz-220*std::pow(2.0,pitch/12))<3,"stretch changed pitch or shift missed target");
            double peak=0,step=0;
            for (std::size_t i=2;i<frames*2;i+=2) {
                peak=std::max(peak,static_cast<double>(std::abs(pcm[i])));
                step=std::max(step,static_cast<double>(std::abs(pcm[i]-pcm[i-2])));
            }
            check(peak>0.02 && peak<0.3 && step<peak*(2*std::sin(3.14159265358979323846*220*std::pow(2.0,pitch/12)/rate)+2.0/(rate*0.003)),"tone has excess gain, discontinuity or dropout");
            if (pitch==4 && stretch==1.25) {
                e.reverse=true;const auto reverse=capture(113);e.reverse=false;
                for (std::size_t i=0;i<frames;++i)
                    check(pcm[i*2]==reverse[(frames-1-i)*2],"reverse escapes transformed crop");
            }
        }
        auto& e=p.vocals[0];e.pitch_semitones=4;e.time_stretch=0.8;
        p.clips[1]={0,rate*80ULL/1000,1};capture(113); // minimum crop, highest pitch, shortest duration
        p.clips[1]={0,1,1};rejects([&]{djayvo::validate(p,a);});
        p.clips[1]={0,rate,1};
        for (double pitch:{-4.01,4.01,std::numeric_limits<double>::infinity(),std::numeric_limits<double>::quiet_NaN()}) {
            e.pitch_semitones=pitch;rejects([&]{djayvo::validate(p,a);});
        }
        e.pitch_semitones=0;
        for (double stretch:{0.79,1.26,std::numeric_limits<double>::infinity(),std::numeric_limits<double>::quiet_NaN()}) {
            e.time_stretch=stretch;rejects([&]{djayvo::validate(p,a);});
        }
        e.time_stretch=1.25;e.rate=1.1;rejects([&]{djayvo::validate(p,a);});
        e.rate=1;e.clean=true;rejects([&]{djayvo::validate(p,a);});e.clean=false;
        e.start=djayvo::ticks_per_bar(p.music)*p.music.bars-960;
        rejects([&]{djayvo::validate(p,a);});e.start=0;
        auto bad=p;bad.clips[1].end=rate*2;bad.vocals.insert(bad.vocals.end(),8,e);
        rejects([&]{djayvo::validate(bad,a);}); // 22.5 seconds of transformed PCM exceeds work budget
        bad=p;bad.clips[1].end=rate*80ULL/1000;
        for (int i=1;i<33;++i) {auto copy=e;copy.start=i*240;bad.vocals.push_back(copy);}
        rejects([&]{djayvo::validate(bad,a);});
        p.clips[1]={rate,rate*2ULL,1};std::fill(a.mono.begin()+rate,a.mono.begin()+rate*2,0);
        const auto silent=capture(257);
        check(std::all_of(silent.begin(),silent.end(),[](float x){return x==0;}),"silent crop gained noise or read outside crop");
    }
}
void instrument_reverb() {
    for (unsigned rate:{8000U,16000U,48000U,192000U}) {
        djayvo::InstrumentReverb effect(rate);
        double early=0,late=0,stereo=0,peak=0;
        const auto before=allocations.load();
        for (unsigned i=0;i<rate*3;++i) {
            const auto wet=effect.process(i==0?1.0:0.0);
            for (double x:wet) {
                check(std::isfinite(x),"nonfinite impulse response");
                if (i<rate*31U/1000) check(x==0,"reverb starts before first delay");
                if (i<rate/2) early+=x*x;
                if (i>=rate) late+=x*x;
                peak=std::max(peak,std::abs(x));
            }
            stereo+=std::abs(wet[0]-wet[1]);
        }
        check(allocations.load()==before,"reverb allocates in callback");
        check(early>0.1 && late<early*1e-4 && peak<1 && stereo>0.1,"reverb missing stereo decay or unstable");
        for (unsigned i=0;i<rate;++i) {
            const auto wet=effect.process(i%2?1:-1);
            for (double x:wet) check(std::isfinite(x) && std::abs(x)<3,"reverb feedback grows without bound");
        }
    }
    rejects([]{djayvo::InstrumentReverb invalid(0);});
    const auto a=source();
    auto p=djayvo::make_remix(a,djayvo::analyze(a),djayvo::Strategy::hiphop,4123,true,false);
    p.music.tail_ms=3000;p.instrument_room_mix=0;
    for (auto& t:p.music.tracks) t.gain_db-=15;
    const auto dry=render(p,a),voice=render(p,a,257,true);
    p.instrument_reverb_mix=.25;
    const auto wet=render(p,a,113);
    check(wet!=dry && wet==render(p,a,512),"reverb absent or block dependent");
    check(voice==render(p,a,113,true),"reverb changed dry vocal stem");
    auto sum=voice;
    for (int solo=0;solo<3;++solo) {
        const auto stem=render(p,a,257,false,solo);
        for (std::size_t i=0;i<sum.size();++i) sum[i]+=stem[i];
    }
    for (std::size_t i=0;i<sum.size();++i) check(std::abs(sum[i]-wet[i])<2e-6,"reverb stems lost shared timing or ducking");
    for (std::size_t i=wet.size()-a.sample_rate/5;i<wet.size();++i) check(wet[i]==0,"reverb leaves truncated final tail");
    djayvo::RemixRenderer renderer(p,a,113);float buffer[226];const auto before=allocations.load();
    while(!renderer.finished()) renderer.process(buffer,113);
    check(allocations.load()==before,"reverb remix allocates in callback");
    for (double value:{-.01,.251,std::numeric_limits<double>::infinity(),std::numeric_limits<double>::quiet_NaN()}) {
        auto bad=p;bad.instrument_reverb_mix=value;rejects([&]{djayvo::validate(bad,a);});
    }
    p.music.tail_ms=500;rejects([&]{djayvo::validate(p,a);});
}
void vocal_echo() {
    for (const unsigned rate:{8000U,48000U}) for (const unsigned tempo:{96000U,123457U}) {
        auto a=djayvo::resample(source(),rate);
        auto p=djayvo::make_remix(a,djayvo::analyze(a),djayvo::Strategy::hiphop,4123,true,false);
        p.music.tempo_milli_bpm=tempo;
        for (auto& track:p.music.tracks) track.notes.clear();
        p.analysis.normalization_gain=1;
        p.clips={{0,a.mono.size(),1},{0,rate/5,1}};
        p.vocals={{0,1,0,1,false,0,false,2,1.1},{9600,0,-6,1,false,0,true}};
        const auto capture=[&](const djayvo::RemixPlan& plan,std::size_t block) {
            djayvo::RemixRenderer renderer(plan,a,block,true);
            std::vector<float> result(rate*3*2),buffer(block*2);
            const auto before=allocations.load();
            std::size_t offset=0;
            while (offset<result.size()/2) {
                const auto n=renderer.process(buffer.data(),std::min(block,result.size()/2-offset));
                check(n>0,"echo renderer stalled");
                std::copy_n(buffer.begin(),n*2,result.begin()+static_cast<std::ptrdiff_t>(offset*2));offset+=n;
            }
            check(allocations.load()==before,"echo callback allocates");
            check(renderer.stats().nonfinite_samples==0,"echo output is nonfinite");
            return result;
        };
        const auto dry=capture(p,257);
        for (djayvo::Tick interval:{120,960}) {
            p.vocals[0].echo_ticks=interval;p.vocals[0].echo_gain_db=-6;
            const auto actual=capture(p,257);
            check(actual==capture(p,113),"echo timing depends on block size");
            auto explicit_plan=p;explicit_plan.vocals[0].echo_ticks=0;
            for (int repeat=1;repeat<=3;++repeat) {
                auto e=explicit_plan.vocals[0];e.start+=repeat*interval;
                e.gain_db=-6+20*std::log10(0.35)*(repeat-1);e.pan=repeat%2?0.45:-0.45;
                explicit_plan.vocals.push_back(e);
            }
            const auto expected=capture(explicit_plan,113);
            double change=0;
            for (std::size_t i=0;i<actual.size();++i) {
                check(std::abs(actual[i]-expected[i])<1e-7,"echo differs from independent timed/attenuated repeats");
                change+=std::abs(actual[i]-dry[i]);
            }
            check(change>0.1,"echo treatment has no effect");
            const auto end=djayvo::tick_to_frame(interval*3,rate,tempo)+djayvo::vocal_frames(p.vocals[0],p.clips[1]);
            for (auto i=end*2;i<actual.size();++i) check(actual[static_cast<std::size_t>(i)]==0,"echo has an unbounded tail");
        }
        auto bad=p;bad.vocals[0].echo_ticks=119;rejects([&]{djayvo::validate(bad,a);});
        bad=p;bad.vocals[0].echo_ticks=961;rejects([&]{djayvo::validate(bad,a);});
        bad=p;bad.vocals[0].echo_ticks=-1;rejects([&]{djayvo::validate(bad,a);});
        for (double gain:{-24.1,-5.9,std::numeric_limits<double>::quiet_NaN()}) {
            bad=p;bad.vocals[0].echo_gain_db=gain;rejects([&]{djayvo::validate(bad,a);});
        }
        bad=p;bad.vocals[1].echo_ticks=480;rejects([&]{djayvo::validate(bad,a);});
        bad=p;bad.vocals[1].start=1920;rejects([&]{djayvo::validate(bad,a);});
        bad=p;bad.music.tail_ms=500;bad.vocals[0].start=djayvo::ticks_per_bar(p.music)*p.music.bars-960;
        rejects([&]{djayvo::validate(bad,a);});
        bad=p;bad.clips[1].end=rate;bad.vocals.insert(bad.vocals.end(),5,p.vocals[0]);
        for (auto& e:bad.vocals) if (!e.clean) e.echo_ticks=120;
        rejects([&]{djayvo::validate(bad,a);});
        bad=p;bad.clips[1].end=1;bad.vocals[0].pitch_semitones=0;bad.vocals[0].time_stretch=1;
        bad.vocals.insert(bad.vocals.end(),256,bad.vocals[0]);rejects([&]{djayvo::validate(bad,a);});
    }
}
}
int main() {
    const std::vector<std::pair<const char*,std::function<void()>>> tests{
        {"bounded stereo feedback reverb, clean vocals, stems, tail and allocation-free processing",instrument_reverb},
        {"SHA-256 known vectors",hashes},{"energy/onset/phrase/pitch analysis and silence",analysis},
        {"resampling duration, identity, round-trip and antialias",resampling},
        {"clean hook preservation, deterministic styles, finite bounded output",preservation},
        {"consent, crop, transform, polyphony and duration rejection",validation},
        {"quantized chop spacing and both clean hooks at 2/3/5 seconds",vocal_spacing},
        {"seeded clean, instrumental and fragment openings",varied_openings},
        {"hiphop harmonic/rhythmic seed diversity, recurring motifs and developed returns",hiphop_composition},
        {"reggae/experimental/club harmony, rhythm and form variety across 192 seeds",remaining_style_diversity},
        {"call-response turn taking, hybrid transitions and 128 seed structures",dialogue_hybrid_composition},
        {"funk syncopation, bass/kick lock, ghost notes, seed variety and input response",funk_composition},
        {"pause-aware crops, attack pre-roll, bounded fallback and EOF at four rates",pause_aware_chops},
        {"subtraction and return across styles and seeds",arrangement_contrast},
        {"instrument room timing, stereo, dry speech and finite tail",room_processing},
        {"independent voice pitch/time, four rates, exact duration/reverse, bounds and no callback allocation",independent_voice},
        {"tempo echo timing, stereo decay, bounded tails, hook clearance and callback safety",vocal_echo},
        {"club form, input-driven bass, electronic palette and stem-consistent kick ducking",club_direction},
        {"stem identity and linear mix reconstruction including room and ducking",stem_identity},
        {"tempo-map source preservation and echo timing across tempo changes",timeline_voice},
        {"club pause selection, deduplication, bounded fallback and transition accents",club_phrasing},
        {"cancel/render/publication rollback, concurrent destinations and stale-lock preservation",export_transactions},
        {"allocation-free sample and instrument processing",no_allocations}};
    int failures=0;
    for(const auto& t:tests)try{t.second();std::cout<<"PASS: "<<t.first<<'\n';}
    catch(const std::exception& e){++failures;std::cout<<"FAIL: "<<t.first<<": "<<e.what()<<'\n';}
    return failures?1:0;
}
