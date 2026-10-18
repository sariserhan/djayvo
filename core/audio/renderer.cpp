#include "djayvo/audio.h"
#include <algorithm>
#include <cmath>
#include <limits>
#include <stdexcept>
#include <utility>

namespace djayvo {
namespace {
constexpr double pi = 3.14159265358979323846;
bool before(const Event& a, const Event& b) {
    if (a.frame != b.frame) return a.frame < b.frame;
    if (a.kind != b.kind) return a.kind == EventKind::note_off;
    return a.note_id < b.note_id;
}
std::uint32_t mix_seed(std::uint32_t seed, std::uint32_t id) {
    std::uint32_t x = seed ^ ((id + 1U) * 0x9e3779b9U);
    x ^= x >> 16U; x *= 0x7feb352dU; x ^= x >> 15U;
    x *= 0x846ca68bU; x ^= x >> 16U;
    return x == 0 ? 1U : x;
}
double limit(double sample, double ceiling) noexcept {
    const double knee = ceiling * 0.8;
    const double a = std::abs(sample);
    if (a <= knee) return sample;
    return std::copysign(knee + (ceiling - knee) * std::tanh((a - knee) / (ceiling - knee)), sample);
}
}
Schedule compile(const PerformancePlan& p) {
    validate(p);
    Schedule s;
    s.sample_rate = p.sample_rate;
    s.kick_duck_db = p.kick_duck_db;
    s.music_frames = tick_to_frame(ticks_per_bar(p) * p.bars, p);
    s.total_frames = s.music_frames + (static_cast<std::uint64_t>(p.tail_ms) * p.sample_rate + 500) / 1000;
    s.ceiling = std::pow(10.0, p.ceiling_dbfs / 20.0);
    std::vector<std::pair<std::uint64_t, int>> occupancy;
    std::uint32_t id = 0;
    for (const auto& track : p.tracks) {
        const double gain = std::pow(10.0, track.gain_db / 20.0);
        const float left = static_cast<float>(gain * std::cos((track.pan + 1.0) * pi / 4.0));
        const float right = static_cast<float>(gain * std::sin((track.pan + 1.0) * pi / 4.0));
        int automation=-1;
        if (!track.automation.empty()) {
            automation=static_cast<int>(s.automation.size());s.automation.emplace_back();
            for (const auto& point:track.automation) {
                const auto amplitude=std::pow(10.0,point.gain_db/20);
                s.automation.back().push_back({tick_to_frame(point.tick,p),
                    static_cast<float>(amplitude*std::cos((point.pan+1)*pi/4)),
                    static_cast<float>(amplitude*std::sin((point.pan+1)*pi/4))});
            }
        }
        for (const auto& n : track.notes) {
            const auto on = tick_to_frame(n.start, p);
            const auto off = tick_to_frame(n.start + n.duration, p);
            if (off <= on) throw std::invalid_argument("note shorter than a sample");
            if (p.kick_duck_db<0 && track.instrument==Instrument::drums && n.pitch==36) s.kick_frames.push_back(on);
            s.events.push_back({on, EventKind::note_on, id, track.instrument, n.pitch, n.velocity,
                                left, right, mix_seed(p.seed, id),track.electronic,automation,n.muted});
            s.events.push_back({off, EventKind::note_off, id, track.instrument, n.pitch, 0,
                                left, right, 1,track.electronic,automation,n.muted});
            // Voice is reclaimable on the sample AFTER its final release sample.
            const auto end = off + release_frames(track.instrument, p.sample_rate) + 1;
            if (end > s.total_frames) throw std::invalid_argument("tail truncates an instrument release");
            occupancy.emplace_back(on, 1);
            occupancy.emplace_back(end, -1);
            ++id;
        }
    }
    std::sort(occupancy.begin(), occupancy.end()); // ends before starts at same frame
    int active = 0;
    for (const auto& boundary : occupancy) {
        active += boundary.second;
        if (active > static_cast<int>(max_voices))
            throw std::invalid_argument("plan exceeds 128 simultaneous voices including releases");
    }
    std::sort(s.events.begin(), s.events.end(), before);
    std::sort(s.kick_frames.begin(),s.kick_frames.end());
    return s;
}

Renderer::Renderer(Schedule schedule, std::size_t max_block)
    : schedule_(std::move(schedule)), max_block_(max_block), voices_(max_voices) {
    if (max_block == 0 || max_block > 65536 || schedule_.sample_rate < 8000 ||
        schedule_.sample_rate > 192000 || schedule_.total_frames == 0 ||
        schedule_.music_frames > schedule_.total_frames || !std::isfinite(schedule_.ceiling) ||
        schedule_.ceiling <= 0 || schedule_.ceiling >= 1 || !std::isfinite(schedule_.kick_duck_db) ||
        schedule_.kick_duck_db>0 || schedule_.kick_duck_db < -12 ||
        !std::is_sorted(schedule_.events.begin(), schedule_.events.end(), before) ||
        !std::is_sorted(schedule_.kick_frames.begin(),schedule_.kick_frames.end()) ||
        (!schedule_.kick_frames.empty() && schedule_.kick_frames.back()>=schedule_.total_frames))
        throw std::invalid_argument("invalid compiled schedule or block size");
    duck_minimum_=std::pow(10.0,schedule_.kick_duck_db/20);
    duck_attack_=1-std::exp(-1.0/(schedule_.sample_rate*0.002));
    duck_release_=1-std::exp(-1.0/(schedule_.sample_rate*0.100));
    if (schedule_.automation.size()>32) throw std::invalid_argument("compiled automation budget exceeded");
    for (const auto& points:schedule_.automation) {
        if (points.empty() || points.size()>128 || points.front().frame!=0)
            throw std::invalid_argument("invalid compiled mix automation");
        for (std::size_t i=0;i<points.size();++i) {
            const auto& point=points[i];
            if (point.frame>schedule_.music_frames || !std::isfinite(point.left) || !std::isfinite(point.right) ||
                point.left<0 || point.right<0 || point.left>4 || point.right>4 ||
                (i && (point.frame<=points[i-1].frame || point.frame-points[i-1].frame<schedule_.sample_rate/200U)))
                throw std::invalid_argument("invalid compiled mix point");
        }
    }
    automation_positions_.resize(schedule_.automation.size());
    automation_gains_.resize(schedule_.automation.size());
    for (const auto& e : schedule_.events) {
        instrument_name(e.instrument);
        if ((e.muted && e.instrument!=Instrument::guitar) ||
            (e.instrument==Instrument::guitar && (e.electronic || e.pitch<40 || e.pitch>79)))
            throw std::invalid_argument("invalid compiled guitar event");
        if (e.frame >= schedule_.total_frames || !std::isfinite(e.left_gain) || !std::isfinite(e.right_gain) ||
            e.automation < -1 || (e.automation>=0 && static_cast<std::size_t>(e.automation)>=schedule_.automation.size()))
            throw std::invalid_argument("invalid compiled event");
    }
}

std::size_t Renderer::process(float* stereo, std::size_t requested) noexcept {
    if (stereo == nullptr || requested == 0 || requested > max_block_) return 0;
    const auto count = static_cast<std::size_t>(std::min<std::uint64_t>(requested, schedule_.total_frames - cursor_));
    std::fill(stereo, stereo + requested * 2, 0.0F);
    for (std::size_t i = 0; i < count; ++i, ++cursor_) {
        for (std::size_t track=0;track<schedule_.automation.size();++track) {
            const auto& points=schedule_.automation[track];auto& index=automation_positions_[track];
            while (index+1<points.size() && points[index+1].frame<=cursor_) ++index;
            const auto& a=points[index];const auto& b=points[std::min(index+1,points.size()-1)];
            const double fraction=a.frame==b.frame?0:static_cast<double>(cursor_-a.frame)/static_cast<double>(b.frame-a.frame);
            automation_gains_[track]={{static_cast<float>(a.left+(b.left-a.left)*fraction),
                                      static_cast<float>(a.right+(b.right-a.right)*fraction)}};
        }
        while (next_kick_<schedule_.kick_frames.size() && schedule_.kick_frames[next_kick_]==cursor_) {
            duck_hold_=schedule_.sample_rate/50U; ++next_kick_;
        }
        while (next_event_ < schedule_.events.size() && schedule_.events[next_event_].frame == cursor_) {
            const auto& e = schedule_.events[next_event_++];
            if (e.kind == EventKind::note_off) {
                for (auto& v : voices_) if (v.active() && v.id() == e.note_id) v.stop();
            } else {
                bool started = false;
                for (auto& v : voices_) {
                    if (!v.active()) { v.start(e, schedule_.sample_rate); started = true; break; }
                }
                if (!started) ++voice_overflows_; // Never silently steal a held note.
            }
        }
        double left = 0, right = 0;
        if (schedule_.kick_duck_db<0) {
            duck_gain_+=(duck_hold_?duck_attack_:duck_release_)*((duck_hold_?duck_minimum_:1)-duck_gain_);
            if (duck_hold_) --duck_hold_;
        }
        for (auto& v : voices_) {
            if (!v.active()) continue;
            const float x = v.next()*static_cast<float>(v.instrument()==Instrument::drums?1:duck_gain_);
            if (v.automation()<0) {left += x * v.left_gain(); right += x * v.right_gain();}
            else {
                const auto& gain=automation_gains_[static_cast<std::size_t>(v.automation())];
                left+=x*gain[0];right+=x*gain[1];
            }
        }
        const double channels[2] = {left, right};
        for (std::size_t c = 0; c < 2; ++c) {
            double x = channels[c];
            if (!std::isfinite(x)) { ++stats_.nonfinite_samples; x = 0; }
            stats_.pre_limiter_peak = std::max(stats_.pre_limiter_peak, std::abs(x));
            if (std::abs(x) > 0.8 * schedule_.ceiling) ++stats_.limited_samples;
            const float output = static_cast<float>(limit(x, schedule_.ceiling));
            stereo[i * 2 + c] = output;
            stats_.peak = std::max(stats_.peak, static_cast<double>(std::abs(output)));
            stats_.max_step = std::max(stats_.max_step, static_cast<double>(std::abs(output - previous_[c])));
            previous_[c] = output;
            if (c == 0) stats_.square_sum_left += static_cast<double>(output) * output;
            else stats_.square_sum_right += static_cast<double>(output) * output;
        }
        ++stats_.frames;
    }
    return count;
}
} // namespace djayvo
