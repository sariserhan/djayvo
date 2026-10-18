#include "djayvo/audio.h"
#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdlib>
#include <filesystem>
#include <functional>
#include <iostream>
#include <limits>
#include <new>
#include <stdexcept>
#include <vector>

namespace {
std::atomic<std::size_t> allocations{0};
}
void* operator new(std::size_t n) {
    allocations.fetch_add(1, std::memory_order_relaxed);
    if (void* p = std::malloc(n == 0 ? 1 : n)) return p;
    throw std::bad_alloc();
}
void* operator new[](std::size_t n) { return ::operator new(n); }
void operator delete(void* p) noexcept { std::free(p); }
void operator delete[](void* p) noexcept { std::free(p); }
void operator delete(void* p, std::size_t) noexcept { std::free(p); }
void operator delete[](void* p, std::size_t) noexcept { std::free(p); }

namespace {
void check(bool value, const char* reason) { if (!value) throw std::runtime_error(reason); }
template<class F> void rejects(F function) {
    bool caught = false;
    try { function(); } catch (const std::exception&) { caught = true; }
    check(caught, "invalid input was accepted");
}
djayvo::PerformancePlan single(djayvo::Instrument instrument = djayvo::Instrument::piano,
                                int pitch = 69, int velocity = 100) {
    djayvo::PerformancePlan p;
    p.sample_rate = 16000; p.bars = 1;
    p.sections = {{"test", 0, 1}};
    p.tracks = {{instrument, -6.0, 0.0, {{137, 960, pitch, velocity}}}};
    return p;
}
std::vector<float> render(const djayvo::Schedule& schedule, std::size_t block = 257,
                           djayvo::AudioStats* stats = nullptr) {
    djayvo::Renderer renderer(schedule, block);
    std::vector<float> output;
    output.reserve(static_cast<std::size_t>(schedule.total_frames) * 2);
    std::vector<float> scratch(block * 2);
    while (!renderer.finished()) {
        const auto count = renderer.process(scratch.data(), block);
        check(count > 0, "render stalled");
        output.insert(output.end(), scratch.begin(), scratch.begin() + static_cast<std::ptrdiff_t>(count * 2));
    }
    check(renderer.process(scratch.data(), block) == 0, "render continues beyond tail");
    check(renderer.voice_overflows() == 0, "voice overflow");
    if (stats) *stats = renderer.stats();
    return output;
}
std::vector<float> render(const djayvo::PerformancePlan& p, std::size_t block = 257,
                           djayvo::AudioStats* stats = nullptr) {
    return render(djayvo::compile(p),block,stats);
}
double energy(const std::vector<float>& audio) {
    double sum = 0; for (float x : audio) sum += static_cast<double>(x) * x;
    return sum;
}
double magnitude(const std::vector<float>& audio, std::uint32_t rate, double frequency,
                 std::size_t start, std::size_t count) {
    double re = 0, im = 0;
    for (std::size_t n = 0; n < count; ++n) {
        const double window = 0.5 - 0.5 * std::cos(6.283185307179586 * static_cast<double>(n) / (count - 1));
        const double phase = 6.283185307179586 * frequency * static_cast<double>(n) / rate;
        re += audio[(start + n) * 2] * window * std::cos(phase);
        im += audio[(start + n) * 2] * window * std::sin(phase);
    }
    return std::hypot(re, im);
}
void timing() {
    check(djayvo::tick_to_frame(960, 48000, 120000) == 24000, "quarter note frame mismatch");
    check(djayvo::tick_to_frame(15360, 48000, 100000) == 460800, "four-bar duration mismatch");
    // Independent long-double oracle: >24 hours, irregular tempo, 100001 grid points.
    for (std::int64_t i = 0; i <= 100000; ++i) {
        const djayvo::Tick tick = i * 5003;
        const long double exact = static_cast<long double>(tick) * 44100.0L * 60000.0L / (960.0L * 137123.0L);
        const auto frame = djayvo::tick_to_frame(tick, 44100, 137123);
        check(std::abs(static_cast<long double>(frame) - exact) <= 0.500001L, "long timeline drift > half frame");
    }
    check(djayvo::tick_to_frame(1, 8000, 300000) == 2, "nearest-frame rounding mismatch");
    rejects([] { djayvo::tick_to_frame(-1, 48000, 100000); });
    rejects([] { djayvo::tick_to_frame(std::numeric_limits<djayvo::Tick>::max(), 192000, 30000); });
}
void scheduling() {
    auto p = single();
    p.tracks[0].notes.push_back({1097, 960, 72, 90});
    auto s = djayvo::compile(p);
    check(s.events.size() == 4, "event pair missing");
    check(s.events[1].frame == s.events[2].frame && s.events[1].kind == djayvo::EventKind::note_off,
          "note-off must precede simultaneous note-on");
    check(s.events[0].frame == 1370, "absolute onset frame mismatch");
    auto audio = render(p, 127);
    for (std::size_t i = 0; i <= s.events[0].frame; ++i)
        check(audio[i * 2] == 0, "note sounded before scheduled frame/attack");
    check(audio[(s.events[0].frame + 1) * 2] != 0, "note did not start on next attack sample");
    auto only = single();
    auto one = djayvo::compile(only);
    auto one_audio = render(only);
    const auto end = one.events[1].frame + djayvo::release_frames(djayvo::Instrument::piano, only.sample_rate);
    check(std::abs(one_audio[(end - 1) * 2]) < 1e-6, "release does not taper to zero");
    for (std::size_t i = static_cast<std::size_t>(end); i < one_audio.size() / 2; ++i)
        check(one_audio[i * 2] == 0, "stuck voice after note-off/release");
    check(std::abs(one_audio[one.events[1].frame * 2] - one_audio[(one.events[1].frame - 1) * 2]) < 0.1,
          "note-off discontinuity");
    auto overlap = single();
    overlap.tracks[0].notes = {{0, 240, 69, 70}, {120, 960, 69, 70}};
    const auto both = render(overlap);
    auto isolated=djayvo::compile(overlap);
    // Retain the second note's identity and take seed when isolating its release.
    isolated.events.erase(std::remove_if(isolated.events.begin(),isolated.events.end(),
                          [](const auto& e){return e.note_id==0;}),isolated.events.end());
    const auto second = render(isolated);
    const auto first_end = djayvo::tick_to_frame(240, overlap.sample_rate, overlap.tempo_milli_bpm) +
                           djayvo::release_frames(djayvo::Instrument::piano, overlap.sample_rate) + 1;
    for (std::size_t i = static_cast<std::size_t>(first_end) * 2; i < both.size(); ++i)
        check(both[i] == second[i], "note-off released a different overlapping note of the same pitch");
}
void deterministic() {
    auto p = djayvo::make_demo(); p.sample_rate = 16000;
    const auto a = render(p, 1);
    check(a == render(p, 257), "audio depends on block size");
    check(a == render(p, 4096), "audio depends on large block size");
    check(a == render(p, 257), "same-seed audio differs");
    ++p.seed;
    // Note-local RNG seed changes percussion independently of arrangement generation.
    check(a != render(p), "different synthesis seed produced identical audio");
    check(djayvo::make_demo(4123).tracks[0].notes[0].velocity ==
          djayvo::make_demo(4123).tracks[0].notes[0].velocity, "arrangement seed unstable");
}
void instruments() {
    for (const auto instrument : {djayvo::Instrument::piano, djayvo::Instrument::bass}) {
        auto p = single(instrument, instrument == djayvo::Instrument::piano ? 69 : 45);
        auto a = render(p);
        const double fundamental = instrument == djayvo::Instrument::piano ? 440.0 : 110.0;
        // Recorded piano may have a stronger second partial than fundamental.
        // Require a correctly tuned harmonic series rather than a sine-like tone.
        const auto harmonic = [&](const std::vector<float>& signal,double frequency) {
            double total=0;
            for (int h=1;h<=3;++h) total+=magnitude(signal,p.sample_rate,frequency*h,1600,4096)/h;
            return total;
        };
        const double peak=harmonic(a,fundamental);
        check(peak>10.0,"pitched instrument has no harmonic energy");
        check(peak>8*harmonic(a,fundamental*1.15),"wrong harmonic pitch");
        check(magnitude(a,p.sample_rate,fundamental,1600,4096)>
              8*magnitude(a,p.sample_rate,fundamental*1.15,1600,4096),"wrong fundamental pitch");
        p.tracks[0].notes[0].pitch += 12;
        auto octave = render(p);
        check(harmonic(octave, 2 * fundamental) >
              8 * magnitude(octave, p.sample_rate, fundamental, 1600, 4096), "octave transposition broken");
        p.tracks[0].notes[0].velocity = 40;
        const auto soft=render(p);
        check(energy(soft) < energy(octave) * 0.2, "velocity not audible in energy");
        const auto brightness=[](const std::vector<float>& signal) {
            double differences=0;
            for (std::size_t i=2;i<signal.size();i+=2) differences+=std::pow(signal[i]-signal[i-2],2);
            return differences/energy(signal);
        };
        check(brightness(soft)<brightness(octave),"soft notes are not darker after level normalization");
    }
    const auto kick = render(single(djayvo::Instrument::drums, 36));
    const auto snare = render(single(djayvo::Instrument::drums, 38));
    const auto hat = render(single(djayvo::Instrument::drums, 42));
    const auto open = render(single(djayvo::Instrument::drums, 46));
    check(energy(kick) > 1 && energy(snare) > 1 && energy(hat) > 0.1 && energy(open) > 0.1,
          "silent drum voice");
    check(kick != snare && snare != hat && hat != open, "drum sounds identical");
}
void sample_articulation() {
    const auto note=[](djayvo::Instrument instrument,int pitch,int velocity,std::uint32_t seed) {
        djayvo::Event e;e.instrument=instrument;e.pitch=pitch;e.velocity=velocity;e.noise_seed=seed;
        djayvo::Voice voice;voice.start(e,16000);
        std::vector<float> audio(16000);
        for (auto& x:audio) {x=voice.next();check(std::isfinite(x),"nonfinite articulated voice");}
        return audio;
    };
    const auto shape_difference=[](const std::vector<float>& a,const std::vector<float>& b) {
        const double aa=std::sqrt(energy(a)),bb=std::sqrt(energy(b));
        check(aa>0 && bb>0,"silent articulation");
        double difference=0;
        for (std::size_t i=0;i<a.size();++i) difference+=std::pow(a[i]/aa-b[i]/bb,2);
        return difference;
    };
    for (int pitch:{48,60,67,72,79,84,96}) {
        for (int velocity:{40,80,110}) {
            const auto a=note(djayvo::Instrument::piano,pitch,velocity,1);
            check(a==note(djayvo::Instrument::piano,pitch,velocity,1),"take selection is not deterministic");
            check(shape_difference(a,note(djayvo::Instrument::piano,pitch,velocity,8))>0.01,
                  "alternate piano take only changes gain");
        }
        for (int boundary:{55,95})
            check(shape_difference(note(djayvo::Instrument::piano,pitch,boundary,1),
                                   note(djayvo::Instrument::piano,pitch,boundary+1,1))>0.01,
                  "piano velocity layer only changes gain/filtering");
    }
    for (int pitch:{36,38,42,46})
        check(shape_difference(note(djayvo::Instrument::drums,pitch,80,1),
                               note(djayvo::Instrument::drums,pitch,80,8))>0.01,
              "alternate drum take only changes gain");
}
void mixing() {
    auto p = single(); p.tracks[0].pan = -1;
    const auto left = render(p);
    for (std::size_t i = 1; i < left.size(); i += 2) check(left[i] == 0, "hard-left leaked right");
    p.tracks[0].pan = 0;
    auto center = render(p);
    for (std::size_t i = 0; i < center.size(); i += 2) check(center[i] == center[i+1], "center pan unbalanced");
    p.tracks[0].gain_db = 0;
    const auto louder = render(p);
    check(energy(louder) > energy(center) * 3.9, "track gain ignored");
    p.tracks[0].gain_db = 12;
    p.tracks[0].notes.assign(64, {0, 960, 69, 127});
    djayvo::AudioStats stats;
    const auto hot = render(p, 512, &stats);
    const double ceiling = std::pow(10.0, p.ceiling_dbfs / 20);
    check(stats.pre_limiter_peak > 1 && stats.limited_samples > 0, "limiter stress did not overload mix");
    check(stats.nonfinite_samples == 0, "nonfinite audio");
    for (float x : hot) check(std::isfinite(x) && std::abs(x) <= ceiling + 1e-7, "limiter failed ceiling");
}
void validation() {
    auto p = single();
    p.tracks[0].notes[0].duration = 0; rejects([&] { djayvo::compile(p); });
    p = single(); p.tracks[0].notes[0].start = 3840; rejects([&] { djayvo::compile(p); });
    p = single(); p.tracks[0].notes[0].velocity = 128; rejects([&] { djayvo::compile(p); });
    p = single(); p.tracks[0].pan = std::numeric_limits<double>::quiet_NaN(); rejects([&] { djayvo::compile(p); });
    p = single(); p.sections[0].start_bar = 1; rejects([&] { djayvo::compile(p); });
    p = single(); p.denominator = 3; rejects([&] { djayvo::compile(p); });
    p = single(); p.tempo_milli_bpm = 0; rejects([&] { djayvo::compile(p); });
    p = single(); p.sample_rate = 0; rejects([&] { djayvo::compile(p); });
    p = single(); p.tracks[0].notes.assign(129, {0, 960, 69, 90}); rejects([&] { djayvo::compile(p); });
    p.tracks[0].notes.resize(128);
    render(p); // Capacity boundary is usable, rather than just rejecting every dense plan.
    p = single(djayvo::Instrument::drums, 60); rejects([&] { djayvo::compile(p); });
    p = single(); p.tracks[0].notes.clear();
    check(energy(render(p)) == 0, "empty score did not render silence");
    auto s = djayvo::compile(p);
    rejects([&] { djayvo::Renderer bad(s, 0); });
    rejects([&] { djayvo::Renderer bad(s, 65537); });
    djayvo::Renderer r(s, 17); float buffer[34]{};
    check(r.process(nullptr, 17) == 0 && r.process(buffer, 18) == 0 && r.process(buffer, 0) == 0,
          "invalid render request accepted");
    check(r.process(buffer, 17) == 17, "invalid request advanced render cursor");
}
void rates_and_meter() {
    for (auto rate : {8000U, 44100U, 48000U, 96000U, 192000U}) {
        auto p = single(); p.sample_rate = rate; p.numerator = 7; p.denominator = 8;
        check(djayvo::ticks_per_bar(p) == 3360, "7/8 bar math wrong");
        auto s = djayvo::compile(p);
        check(s.music_frames == static_cast<std::uint64_t>(rate) * 21 / 10, "meter duration wrong");
        auto a = render(p, 4096);
        check(a.size() == s.total_frames * 2 && energy(a) > 1, "rate render failed");
    }
}
void no_render_allocations() {
    auto p = djayvo::make_demo(); p.sample_rate = 8000;
    djayvo::Renderer r(djayvo::compile(p), 512);
    float buffer[1024]{};
    const auto before = allocations.load();
    while (!r.finished()) r.process(buffer, 512);
    const auto after = allocations.load();
    check(before == after, "render callback allocated memory");
}
void wav_errors() {
    const auto path = (std::filesystem::temp_directory_path() / "djayvo-unit-test.wav").string();
    rejects([&] { djayvo::WavWriter bad(path, 48000, std::numeric_limits<std::uint64_t>::max()); });
    {
        djayvo::WavWriter writer(path, 48000, 2);
        float samples[4] = {0.1F, -0.1F, 0, 0};
        writer.write(samples, 1);
        rejects([&] { writer.close(); });
        rejects([&] { writer.write(samples, 2); });
        float invalid[2] = {std::numeric_limits<float>::quiet_NaN(), 0};
        rejects([&] { writer.write(invalid, 1); });
        invalid[0] = 1.1F; rejects([&] { writer.write(invalid, 1); });
        writer.write(samples, 1); writer.close();
    }
    check(std::filesystem::file_size(path) == 52, "WAV length incorrect");
    std::filesystem::remove(path);
}
}
int main() {
    const std::vector<std::pair<const char*, std::function<void()>>> tests{
        {"rational timing and long-render drift", timing},
        {"sample onsets, ordering, note-off and release", scheduling},
        {"seed and block-size determinism", deterministic},
        {"instrument frequency, octave, velocity and drum output", instruments},
        {"recorded piano dynamics and seeded piano/drum takes", sample_articulation},
        {"pan, gain, finite audio and overload ceiling", mixing},
        {"plan bounds, polyphony, silence and invalid requests", validation},
        {"configurable sample rates and 7/8 meter", rates_and_meter},
        {"allocation-free processing", no_render_allocations},
        {"WAV bounds, nonfinite and incomplete writes", wav_errors}
    };
    int failures = 0;
    for (const auto& test : tests) {
        try { test.second(); std::cout << "PASS: " << test.first << '\n'; }
        catch (const std::exception& e) { ++failures; std::cout << "FAIL: " << test.first << ": " << e.what() << '\n'; }
    }
    std::cout << (failures ? "FAIL" : "PASS") << ": " << tests.size() - static_cast<std::size_t>(failures)
              << '/' << tests.size() << " test groups\n";
    return failures ? 1 : 0;
}
