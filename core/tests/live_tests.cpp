#include "djayvo/live.h"
#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <new>
#include <limits>
#include <vector>
static unsigned allocations = 0;
void* operator new(std::size_t n) { ++allocations; if (void* p = std::malloc(n)) return p; throw std::bad_alloc(); }
void operator delete(void* p) noexcept { std::free(p); }
void operator delete(void* p, std::size_t) noexcept { std::free(p); }
static void require(bool ok) { if (!ok) { std::cerr << "FAIL live instrument assertion\n"; std::exit(1); } }
int main(int argc, char** argv) {
    require(!djayvo_live_note(1, 0, 60, 96));
    require(!djayvo_live_init(0) && !djayvo_live_init(192001));
    require(djayvo_live_init(48000));
    require(!djayvo_live_note(0,0,60,96) && !djayvo_live_note(1,13,60,96));
    require(!djayvo_live_note(1,0,20,96) && !djayvo_live_note(1,0,109,96));
    require(!djayvo_live_note(1,0,60,0) && !djayvo_live_note(1,0,60,128));
    require(!djayvo_live_note(1,4,39,96) && !djayvo_live_note(1,9,60,96));
    require(!djayvo_live_render(0) && !djayvo_live_render(2049));
    require(!djayvo_live_mouth(-.01) && !djayvo_live_mouth(1.01) && !djayvo_live_mouth(std::numeric_limits<double>::quiet_NaN()));
    require(!djayvo_live_note(1,12,36,96));
    const auto before = allocations;
    for (unsigned rate : {32000U, 44100U, 48000U, 96000U, 192000U}) {
        require(djayvo_live_init(rate));
        for (unsigned id = 1; id <= 32; ++id) require(djayvo_live_note(id, id % 2 ? 11 : 6, 36, 127));
        require(!djayvo_live_note(33,12,39,100) && !djayvo_live_note(1,12,39,100));
        for (int block = 0; block < 300; ++block) {
            require(djayvo_live_mouth((block % 101)/100.0)); require(djayvo_live_render(128));
            for (int i=0; i<256; ++i) require(std::isfinite(djayvo_live_buffer()[i]) && std::abs(djayvo_live_buffer()[i]) <= .8F);
        }
        djayvo_live_panic();
        for (unsigned frame=0; frame<rate; frame+=128) require(djayvo_live_render(128));
        require(djayvo_live_active() == 0);
    }
    for (int pitch : {37,39,41,70}) {
        require(djayvo_live_init(48000) && djayvo_live_note(1,12,pitch,100));
        double energy=0;
        for (int block=0;block<500;++block) {
            require(djayvo_live_render(128));
            for (int i=0;i<256;++i) energy+=djayvo_live_buffer()[i]*djayvo_live_buffer()[i];
        }
        require(energy>.001 && djayvo_live_active()==0);
    }
    for (unsigned patch = 0; patch < 13; ++patch) {
        require(djayvo_live_init(48000));
        require(djayvo_live_note(1,patch,patch == 12 ? 39 : patch >= 9 ? 36 : 60,100));
        double energy = 0;
        for (int block = 0; block < 100; ++block) {
            require(djayvo_live_render(128));
            for (int i = 0; i < 256; ++i) {
                const auto v = djayvo_live_buffer()[i];
                require(std::isfinite(v) && std::abs(v) <= .8F); energy += v*v;
            }
        }
        require(energy > .001);
        djayvo_live_panic();
        for (int block = 0; block < 400; ++block) require(djayvo_live_render(128));
        require(!djayvo_live_active());
    }
    for (int note = 21; note <= 108; ++note) {
        require(djayvo_live_init(48000)); require(djayvo_live_note(1,0,note,100));
        double energy = 0;
        for (int block = 0; block < 32; ++block) {
            require(djayvo_live_render(128));
            for (int i = 0; i < 256; ++i) energy += std::abs(djayvo_live_buffer()[i]);
        }
        require(energy > .001);
    }
    require(djayvo_live_init(48000));
    for (unsigned id = 1; id <= 32; ++id) require(djayvo_live_note(id,6,60,127));
    require(!djayvo_live_note(33,6,60,127) && !djayvo_live_note(1,6,60,127));
    djayvo_live_off(1);
    for (int i = 0; i < 100; ++i) require(djayvo_live_render(128));
    require(djayvo_live_active() == 31 && djayvo_live_note(33,0,60,96));
    require(allocations == before);
    const auto program = [](unsigned block_size) {
        require(djayvo_live_init(48000) && djayvo_live_note(1,11,36,100));
        std::vector<float> pcm(16384*2);
        for (unsigned frame=0; frame<16384;) {
            if (frame==2048) require(djayvo_live_mouth(1));
            if (frame==4096) djayvo_live_off(1);
            const unsigned boundary=frame<2048?2048:frame<4096?4096:16384;
            const unsigned count=std::min(block_size,boundary-frame);
            require(djayvo_live_render(count));
            std::copy_n(djayvo_live_buffer(),count*2,pcm.begin()+frame*2); frame+=count;
        }
        return pcm;
    };
    require(program(37) == program(128));
    // Emit the same deterministic program for native/WASM frame and PCM comparison.
    if (argc == 2) {
        std::ofstream out(argv[1], std::ios::binary);
        require(static_cast<bool>(out));
        for (unsigned patch = 0; patch < 13; ++patch) {
            require(djayvo_live_init(48000));
            for (unsigned block = 0; block < 750; ++block) {
                if (block == 0) require(djayvo_live_note(1,patch,patch == 12 ? 39 : patch >= 9 ? 36 : 60,100));
                if (patch == 11 && block == 100) require(djayvo_live_mouth(1));
                if (block == 187) djayvo_live_off(1);
                require(djayvo_live_render(128));
                out.write(reinterpret_cast<const char*>(djayvo_live_buffer()), 256*sizeof(float));
            }
        }
        require(static_cast<bool>(out));
    }
    std::cout << "PASS live instruments: 88 piano keys, 13 patches, bounds, release, voice cap, zero render/note allocations\n";
}
