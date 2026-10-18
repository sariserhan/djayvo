#pragma once
#include <cstddef>
#include <vector>

namespace djayvo::detail {
// Internal kernel: callers validate finite PCM, bounded length and positive ratio.
std::vector<float> resample_pcm(const float* source, std::size_t frames, double ratio, std::size_t output_frames);
}
