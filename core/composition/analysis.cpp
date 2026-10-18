#include "djayvo/remix.h"
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace djayvo {
InputAnalysis analyze(const AudioBuffer& source) {
    if (source.sample_rate < 8000 || source.sample_rate > 192000 || source.mono.empty() ||
        source.mono.size() > static_cast<std::size_t>(source.sample_rate) * 15)
        throw std::invalid_argument("invalid analysis input");
    InputAnalysis a;
    double sum = 0;
    for (float x : source.mono) {
        if (!std::isfinite(x) || std::abs(x) > 1) throw std::invalid_argument("nonfinite/out-of-range input");
        a.peak = std::max(a.peak, static_cast<double>(std::abs(x)));
        sum += static_cast<double>(x) * x;
    }
    a.rms = std::sqrt(sum / static_cast<double>(source.mono.size()));
    if (a.peak < 0.002 || a.rms < 0.0005) throw std::invalid_argument("input is silent or too quiet");
    a.normalization_gain = std::min(3.9810717055, 0.8 / a.peak);
    const std::size_t hop = source.sample_rate / 100;
    std::vector<double> envelope;
    for (std::size_t begin = 0; begin < source.mono.size(); begin += hop) {
        const auto end = std::min(begin + hop, source.mono.size());
        double square = 0;
        for (auto i = begin; i < end; ++i) square += static_cast<double>(source.mono[i]) * source.mono[i];
        envelope.push_back(std::sqrt(square / static_cast<double>(end - begin)));
    }
    const auto maximum = *std::max_element(envelope.begin(), envelope.end());
    const double threshold = std::max(0.002, maximum * 0.10);
    std::size_t first = envelope.size(), last = 0;
    for (std::size_t i = 0; i < envelope.size(); ++i) {
        if (envelope[i] > threshold) {
            if (first == envelope.size()) first = i;
            last = i;
        }
        if (first != envelope.size() && (i - last >= 16 || i + 1 == envelope.size())) {
            const auto begin = first > 2 ? (first - 2) * hop : 0;
            const auto end = std::min(source.mono.size(), (last + 3) * hop);
            if (end - begin >= source.sample_rate / 12)
                a.phrases.push_back({begin,end,0.65}); // heuristic energy, not speech confidence
            first = envelope.size();
        }
        const double previous = i ? envelope[i-1] : 0;
        if (envelope[i] > threshold * 1.5 && envelope[i] - previous > maximum * 0.08 &&
            (a.onsets.empty() || i * hop - a.onsets.back() >= source.sample_rate * 8U / 100U))
            a.onsets.push_back(i * hop);
    }
    if (a.phrases.empty()) throw std::invalid_argument("no usable energetic source region");
    // Coarse autocorrelation on one energetic window, deliberately model-free.
    const auto strongest = static_cast<std::size_t>(std::max_element(envelope.begin(),envelope.end()) - envelope.begin());
    const auto stride = std::max(1U, source.sample_rate / 8000U);
    const double analysis_rate = static_cast<double>(source.sample_rate) / stride;
    const auto window = std::min<std::size_t>(static_cast<std::size_t>(analysis_rate * 0.12), source.mono.size() / stride);
    const auto start = std::min(strongest * hop, source.mono.size() - window * stride);
    double best = 0; std::size_t best_lag = 0;
    const auto max_lag = std::min(window / 2, static_cast<std::size_t>(analysis_rate / 70));
    for (auto lag = static_cast<std::size_t>(analysis_rate / 450); lag <= max_lag; ++lag) {
        double xy = 0, xx = 0, yy = 0;
        for (std::size_t j = lag; j < window; ++j) {
            const double x = source.mono[start + j * stride];
            const double y = source.mono[start + (j-lag) * stride];
            xy += x*y; xx += x*x; yy += y*y;
        }
        const double correlation = xy / std::sqrt(std::max(1e-24, xx*yy));
        if (correlation > best) { best = correlation; best_lag = lag; }
    }
    if (best > 0.55 && best_lag) {
        a.pitch_hz = analysis_rate / static_cast<double>(best_lag);
        a.pitch_confidence = std::clamp(best,0.0,1.0);
    }
    return a;
}
} // namespace djayvo
