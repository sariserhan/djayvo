#include "jamloom/taste.h"
#include "jamloom/audio.h"
#include "jamloom/jamloom_c.h"
#include <filesystem>
#include <fstream>
#include <iterator>
#include <array>
#include <stdexcept>
#include <iostream>

void check(bool ok) { if (!ok) throw std::runtime_error("Taste invariant failed"); }
int main() {
    try {
        for (unsigned mask=1;mask<=31;++mask) for (unsigned energy=0;energy<3;++energy) {
            const auto p=jamloom::make_taste(4123,60+energy*60,energy,mask,80,30,energy);
            const auto schedule=jamloom::compile(p);
            check(schedule.total_frames>=26*48000 && schedule.total_frames<=31*48000);
            for (const auto& track:p.tracks) {
                const auto bit=track.instrument==jamloom::Instrument::piano?1:track.instrument==jamloom::Instrument::guitar?2:
                    track.instrument==jamloom::Instrument::bass?4:track.instrument==jamloom::Instrument::drums?8:16;
                check(mask&bit); check(!track.notes.empty());
            }
        }
        const auto a=jamloom::make_taste(1,110,1,31,50,30,0);
        const auto b=jamloom::make_taste(2,110,1,31,50,30,1);
        check(jamloom::compile(a).events.size()!=jamloom::compile(b).events.size() || a.tracks[0].notes[0].pitch!=b.tracks[0].notes[0].pitch);
        jamloom::Renderer left(jamloom::compile(a),512),right(jamloom::compile(a),113);
        std::vector<float> pcm,other;
        std::array<float,1024> buffer{};
        while (!left.finished()) { auto n=left.process(buffer.data(),512); pcm.insert(pcm.end(),buffer.begin(),buffer.begin()+n*2); }
        while (!right.finished()) { auto n=right.process(buffer.data(),113); other.insert(other.end(),buffer.begin(),buffer.begin()+n*2); }
        check(pcm==other);check(left.stats().peak>.001 && left.stats().peak<.89);
        check(!left.stats().nonfinite_samples && !left.stats().limited_samples && !left.voice_overflows());
        for (unsigned invalid:{0U,32U,0xffffffffU}) {
            bool rejected=false;
            try { jamloom::make_taste(1,110,1,invalid,50,30,0); } catch(const std::invalid_argument&) { rejected=true; }
            check(rejected);
        }
        const auto long_plan=jamloom::make_taste(1,180,2,31,100,180,2);
        check(jamloom::compile(long_plan).total_frames<=180ULL*48000);
        jamloom::render_taste(long_plan,"taste-long-test");
        jamloom::render_taste(a,"taste-test");
        namespace fs=std::filesystem;
        const auto directory=fs::current_path()/"taste-c-api-test";
        check(!fs::exists(directory));
        char error[128];
        int calls=0;
        const auto cancel=[](void* context) { return ++*static_cast<int*>(context)>4?1:0; };
        check(jamloom_render_taste(directory.string().c_str(),1,110,1,31,50,30,0,cancel,&calls,error,sizeof(error))==4);
        check(!fs::exists(directory));
        check(jamloom_render_taste(directory.string().c_str(),1,110,1,0,50,30,0,nullptr,nullptr,error,sizeof(error))==1);
        check(!fs::exists(directory));
        check(jamloom_render_taste(directory.string().c_str(),1,110,1,31,50,30,0,nullptr,nullptr,error,sizeof(error))==0);
        const auto bytes=[](const fs::path& path) { std::ifstream f(path,std::ios::binary); return std::vector<char>((std::istreambuf_iterator<char>(f)),{}); };
        const auto before=bytes(directory/"music.wav");
        check(before==bytes("taste-test.wav"));
        check(jamloom_render_taste(directory.string().c_str(),2,110,1,31,50,30,0,nullptr,nullptr,error,sizeof(error))==1);
        check(before==bytes(directory/"music.wav"));
        for(const auto* file:{"music.wav","music.score.json","music.report.json"}) fs::remove(directory/file);
        fs::remove(directory);
        std::cout<<"PASS: preference bounds, instrument masks, duration, distinct plans, exact block replay, real WAV\n";
    } catch(const std::exception& e) { std::cerr<<e.what()<<'\n'; return 1; }
}
