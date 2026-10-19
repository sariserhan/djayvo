#include "djayvo/live.h"
#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <new>
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
    require(!djayvo_live_note(0,0,60,96) && !djayvo_live_note(1,11,60,96));
    require(!djayvo_live_note(1,0,20,96) && !djayvo_live_note(1,0,109,96));
    require(!djayvo_live_note(1,0,60,0) && !djayvo_live_note(1,0,60,128));
    require(!djayvo_live_note(1,4,39,96) && !djayvo_live_note(1,9,60,96));
    require(!djayvo_live_render(0) && !djayvo_live_render(2049));
    const auto before = allocations;
    for (unsigned patch = 0; patch < 11; ++patch) {
        require(djayvo_live_init(48000));
        require(djayvo_live_note(1,patch,patch >= 9 ? 36 : 60,100));
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
    // Emit the same deterministic program for native/WASM frame and PCM comparison.
    if (argc == 2) {
        std::ofstream out(argv[1], std::ios::binary);
        require(static_cast<bool>(out));
        for (unsigned patch = 0; patch < 11; ++patch) {
            require(djayvo_live_init(48000));
            for (unsigned block = 0; block < 750; ++block) {
                if (block == 0) require(djayvo_live_note(1,patch,patch >= 9 ? 36 : 60,100));
                if (block == 187) djayvo_live_off(1);
                require(djayvo_live_render(128));
                out.write(reinterpret_cast<const char*>(djayvo_live_buffer()), 256*sizeof(float));
            }
        }
        require(static_cast<bool>(out));
    }
    std::cout << "PASS live instruments: 88 piano keys, 11 patches, bounds, release, voice cap, zero render/note allocations\n";
}
