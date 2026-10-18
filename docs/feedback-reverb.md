# Bounded instrument reverb

2026-10-18. Implementation and portability **PASS**; listening **NOT RUN**;
production musical quality **PARTIAL**. The master specification is unchanged.

Optional `1.6-remix` plans accept `instrument_reverb_mix` in [0, 0.25]. Zero
preserves previous rendering. Four original delay lines with damped, contracting
Hadamard feedback add stereo space to instruments. Voices stay dry. Preallocated
buffers keep processing allocation-free; a common full-plan tail preserves solo
stem reconstruction. Native validation reserves decay and final silence. This is
original C++17 code with no platform API or third-party runtime dependency.
Defaults and the browser controls do not enable the effect pending listening.

Evidence in [feedback-reverb](evidence/feedback-reverb/):

- **PASS:** M5 release and actual `mac_smoke.sh`, 13/13 current suites; Linux arm64
  release 13/13 (38.60 s). M5 ASan/UBSan 12/12 (480.40 s; snapshot before the
  Python-only word-timing test was registered).
- **PASS:** 91 byte-identical M5/Linux WAVs, exact score decisions and event
  frames, maximum and RMS PCM difference 0. Forty-five default WAVs unchanged.
- **PASS:** impulse stability/decay at 8/16/48/192 kHz, bounded driven response,
  block-size independence, allocation checks, native import/schema rejection,
  unchanged vocal stems and float stem reconstruction within 2e-6.
- **PASS:** seven default styles in Node/Chromium/WebKit agree with native.
  This checks regressions; opt-in reverb was exercised natively, not via browser.
- **PASS:** four private wet/dry pairs normalized to -24 LUFS, below -1 dBTP,
  final silence; 16 review players per browser loaded, played muted and sought.
  Chromium review screenshot visually inspected. These checks cannot hear audio.
- **NOT RUN:** perceived space, clarity, realism and preference.

[Measurements](evidence/feedback-reverb/measurements.json) retain wet/dry waveform
changes, hashes, levels and all cross-platform comparisons. Reproduction scripts
create fresh output; preserve existing recordings. Private audition:
`renders/feedback-reverb-20261018/review/index.html`.

Hardware/toolchain: Apple M5 arm64, 10 cores, 16 GiB; macOS 26.7.1 (25G241),
Xcode 27.1 (27A9275), SDK 27, Clang 21, CMake 4.4.2. Local Debian arm64 VM uses
GCC 12.2/CMake 3.25.1. Emscripten 6.0.1, Node 22.23.1, Playwright 1.61.1,
Chromium 149.0.7827.55/WebKit 26.5. Logs retain actual execution and smoke metadata.
