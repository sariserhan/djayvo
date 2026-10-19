#include "djayvo/live.h"
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdlib>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <new>
#include <vector>

static std::size_t allocations = 0;
void* operator new(std::size_t n) {
    ++allocations;
    if (auto p = std::malloc(n)) return p;
    throw std::bad_alloc();
}
void operator delete(void* p) noexcept { std::free(p); }
void operator delete(void* p, std::size_t) noexcept { std::free(p); }
static void check(bool ok) { if (!ok) { std::cerr << "FAIL live deadline probe\n"; std::exit(1); } }
struct Event { unsigned frame, on, id, patch, pitch, velocity; };
struct Miss { unsigned repeat, frame; double wall_us, cpu_us; bool attack; };

int main(int argc, char** argv) {
    check(argc == 2);
    const std::string prefix = argv[1];
    for (const auto suffix : {".json", ".f32", ".tsv"}) check(!std::filesystem::exists(prefix + suffix));
    constexpr unsigned rate = 48000, block = 128, frames = 10 * rate, repeats = 60;
    constexpr unsigned blocks = frames / block;
    std::vector<Event> events;
    constexpr unsigned percussion[] = {37,39,41,70}, drums[] = {36,38,42,46};
    for (unsigned group = 0; group < 5; ++group) {
        for (unsigned i = 0; i < 32; ++i) {
            const unsigned patch = group == 0 ? 0 : group == 1 ? 6 + i % 3 : group == 3 ? 11 + i % 2 : i % 13;
            const unsigned pitch = patch == 12 ? percussion[i%4] :
                patch == 9 || patch == 10 ? drums[i%4] :
                patch == 11 ? 24 + i % 13 : 48 + i;
            events.push_back({group * 2 * rate, 1, i + 1, patch, pitch, 70 + i % 58});
            events.push_back({(group * 2 + 1) * rate, 0, i + 1, 0, 0, 0});
        }
    }
    std::stable_sort(events.begin(), events.end(), [](const auto& a, const auto& b) { return a.frame < b.frame; });
    std::vector<float> reference(frames * 2);
    std::vector<double> times(blocks * repeats), attacks, regular;
    std::vector<Miss> misses; misses.reserve(times.size());
    attacks.reserve(5 * repeats); regular.reserve(times.size());
    check(djayvo_live_init(rate));
    const auto allocation_start = allocations;
    double peak = 0, square = 0;
    unsigned max_active = 0, quiet_blocks = 0, missed = 0;
    const double deadline = 1e6 * block / rate;
    const auto run_start = std::chrono::steady_clock::now();
    for (unsigned repeat = 0; repeat < repeats; ++repeat) {
        std::size_t next = 0;
        for (unsigned frame = 0; frame < frames; frame += block) {
            const bool attack = next < events.size() && events[next].frame == frame && events[next].on;
            const auto start = std::chrono::steady_clock::now();
            const auto cpu_start = std::clock();
            while (next < events.size() && events[next].frame == frame) {
                const auto& e = events[next++];
                if (e.on) check(djayvo_live_note(e.id, e.patch, static_cast<int>(e.pitch), static_cast<int>(e.velocity)));
                else djayvo_live_off(e.id);
            }
            check(djayvo_live_render(block));
            const double cpu_us = 1e6 * static_cast<double>(std::clock()-cpu_start) / CLOCKS_PER_SEC;
            const double us = std::chrono::duration<double,std::micro>(std::chrono::steady_clock::now()-start).count();
            times[repeat * blocks + frame / block] = us;
            (attack ? attacks : regular).push_back(us);
            missed += us > deadline;
            if (us > deadline) misses.push_back({repeat,frame,us,cpu_us,attack});
            max_active = std::max(max_active, djayvo_live_active());
            const bool quiet = frame % (2 * rate) >= rate * 19 / 10;
            quiet_blocks += quiet;
            for (unsigned i = 0; i < block * 2; ++i) {
                const float sample = djayvo_live_buffer()[i];
                check(std::isfinite(sample) && std::abs(sample) <= .8F);
                if (quiet) check(std::abs(sample) < 1e-7F);
                if (!repeat) reference[frame * 2 + i] = sample;
                else check(sample == reference[frame * 2 + i]);
                peak = std::max(peak, static_cast<double>(std::abs(sample)));
                square += static_cast<double>(sample) * sample;
            }
        }
        check(next == events.size() && !djayvo_live_active());
    }
    const auto allocation_delta = allocations - allocation_start;
    check(!allocation_delta && max_active == 32 && peak > .01 && quiet_blocks > 0);
    const double wall = std::chrono::duration<double>(std::chrono::steady_clock::now()-run_start).count();
    std::ofstream pcm(prefix + ".f32", std::ios::binary);
    pcm.write(reinterpret_cast<const char*>(reference.data()), static_cast<std::streamsize>(reference.size() * sizeof(float)));
    pcm.close(); check(static_cast<bool>(pcm));
    std::ofstream trace(prefix + ".tsv");
    trace << "frame\ton\tid\tpatch\tpitch\tvelocity\n";
    for (const auto& e : events) trace << e.frame << '\t' << e.on << '\t' << e.id << '\t' << e.patch << '\t' << e.pitch << '\t' << e.velocity << '\n';
    trace.close(); check(static_cast<bool>(trace));
    std::ofstream report(prefix + ".json"); report.precision(17);
    report << "{\"sample_rate\":48000,\"block_frames\":128,\"virtual_seconds\":600,\"repeats\":60,\"blocks\":" << times.size()
           << ",\"events_per_repeat\":" << events.size() << ",\"wall_seconds\":" << wall
           << ",\"callback_allocations\":" << allocation_delta << ",\"peak\":" << peak
           << ",\"rms\":" << std::sqrt(square / (frames * 2.0 * repeats))
           << ",\"max_active\":" << max_active << ",\"quiet_blocks\":" << quiet_blocks
           << ",\"deadline_us\":" << deadline << ",\"blocks_over_deadline\":" << missed;
    const auto stats = [&](const char* label, std::vector<double>& values) {
        std::sort(values.begin(), values.end());
        report << ",\"" << label << "\":{\"count\":" << values.size();
        for (const auto q : {50U,95U,99U,100U})
            report << ",\"p" << q << "_us\":" << values[(values.size()-1)*q/100];
        report << '}';
    };
    stats("all", times); stats("attack", attacks); stats("other", regular);
    report << ",\"misses\":[";
    for (std::size_t i=0; i<misses.size(); ++i) {
        const auto& m=misses[i];
        if (i) report << ',';
        report << "{\"repeat\":" << m.repeat << ",\"frame\":" << m.frame << ",\"wall_us\":" << m.wall_us
               << ",\"cpu_us\":" << m.cpu_us << ",\"attack\":" << (m.attack?"true":"false") << '}';
    }
    report << "]}\n"; report.close(); check(static_cast<bool>(report));
    std::cout << "PASS 600 virtual seconds, 225000 blocks, 60 identical programs, zero engine allocations; deadline misses " << missed << '\n';
}
