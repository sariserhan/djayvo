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
    double sum = 0, sample_sum = 0;
    for (float x : source.mono) {
        if (!std::isfinite(x) || std::abs(x) > 1) throw std::invalid_argument("nonfinite/out-of-range input");
        a.peak = std::max(a.peak, static_cast<double>(std::abs(x)));
        sum += static_cast<double>(x) * x;
        sample_sum += x;
    }
    a.rms = std::sqrt(sum / static_cast<double>(source.mono.size()));
    if (a.peak < 0.002 || a.rms < 0.0005) throw std::invalid_argument("input is silent or too quiet");
    // A constant electrical offset is not usable sound; keep source PCM and reported raw levels unchanged.
    const double mean = sample_sum / static_cast<double>(source.mono.size());
    double signal_square = 0, signal_peak = 0;
    for (float x : source.mono) {
        const double signal = x - mean;
        signal_square += signal * signal;
        signal_peak = std::max(signal_peak, std::abs(signal));
    }
    if (signal_peak < 0.002 || signal_square / static_cast<double>(source.mono.size()) < 0.0005 * 0.0005)
        throw std::invalid_argument("input is silent or too quiet");
    a.normalization_gain = std::min(3.9810717055, 0.8 / a.peak);
    const std::size_t hop = source.sample_rate / 100;
    std::vector<double> envelope;
    for (std::size_t begin = 0; begin < source.mono.size(); begin += hop) {
        const auto end = std::min(begin + hop, source.mono.size());
        double square = 0;
        for (auto i = begin; i < end; ++i) {
            const double signal = source.mono[i] - mean;
            square += signal * signal;
        }
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
    const auto strongest = static_cast<std::size_t>(std::max_element(envelope.begin(),envelope.end()) - envelope.begin());
    // Short claps/clicks need context padding when every energetic region is below the phrase minimum.
    if (a.phrases.empty() && !a.onsets.empty() && maximum>threshold) {
        const auto length=std::min(source.mono.size(),static_cast<std::size_t>(source.sample_rate)/5);
        if (length>=source.sample_rate/12) {
            const auto attack=strongest*hop;
            const auto begin=std::min(attack>2*hop?attack-2*hop:0,source.mono.size()-length);
            a.phrases.push_back({begin,begin+length,0.4});
        }
    }
    if (a.phrases.empty()) throw std::invalid_argument("no usable energetic source region");
    // Coarse autocorrelation on one energetic window, deliberately model-free.
    const auto stride = std::max(1U, source.sample_rate / 8000U);
    const double analysis_rate = static_cast<double>(source.sample_rate) / stride;
    const auto window = std::min<std::size_t>(static_cast<std::size_t>(analysis_rate * 0.12), source.mono.size() / stride);
    const auto start = std::min(strongest * hop, source.mono.size() - window * stride);
    double best = 0;
    const auto min_lag = static_cast<std::size_t>(analysis_rate / 450);
    const auto max_lag = std::min(window / 2, static_cast<std::size_t>(analysis_rate / 70));
    std::vector<double> correlations(max_lag + 2);
    for (auto lag = min_lag - 1; lag <= max_lag + 1; ++lag) {
        double xy = 0, xx = 0, yy = 0;
        for (std::size_t j = lag; j < window; ++j) {
            const double x = source.mono[start + j * stride] - mean;
            const double y = source.mono[start + (j-lag) * stride] - mean;
            xy += x*y; xx += x*x; yy += y*y;
        }
        const double correlation = xy / std::sqrt(std::max(1e-24, xx*yy));
        correlations[lag] = correlation;
        if (lag >= min_lag && lag <= max_lag) best = std::max(best, correlation);
    }
    // A later multiple of the period can fit the integer grid better than the fundamental.
    for (auto lag = min_lag; best > 0.55 && lag <= max_lag; ++lag) {
        const auto left = correlations[lag-1], middle = correlations[lag], right = correlations[lag+1];
        if (middle < std::max(0.55, best * 0.9) || middle <= left || middle < right) continue;
        const double offset = std::clamp(0.5*(left-right)/(left-2*middle+right), -0.5, 0.5);
        a.pitch_hz = analysis_rate / (static_cast<double>(lag)+offset);
        a.pitch_confidence = std::clamp(middle,0.0,1.0);
        break;
    }
    return a;
}
} // namespace djayvo
