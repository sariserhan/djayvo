# Correct sustained-note period selection

2026-10-19. **Technical fix PASS; musical benefit NOT RUN.** The shared analyzer
now selects the first strong local autocorrelation peak and refines its period
between samples. Previously it selected the global maximum across integer lags.
A later multiple of the fundamental period can fit that integer grid better,
producing a confident but incorrect frequency and sometimes a different key.

For a generated 48 kHz Float32 440 Hz tone, the old estimate was 73.3945 Hz
(D), while the corrected estimate is about 440.03 Hz (A). The independently
quantized PCM16 control exposes the same defect differently: its old estimate
is 87.9121 Hz (F), while the new estimate is 440.0297 Hz (A). Small input changes
could make a different period multiple win. The old estimate must not be
mistaken for a reliable pitch simply because its correlation is near one.

## Implementation and scope

Within the existing approximately 70–450 Hz search, the first local peak must
exceed both 0.55 and 90% of the strongest correlation. Its adjacent samples
provide a bounded ±0.5-sample parabolic period refinement. If there is no such
peak, analysis leaves pitch unset and the existing rule planner falls back.
Confidence remains a raw periodicity measure, **not a probability that the
fundamental or musical key is correct**.

This is still a one-window heuristic. Strong partials, speech transitions,
missing fundamentals, noise, out-of-band input and polyphonic sound can defeat
it; this change does not establish a general pitch tracker or semantic musical
director. Tempo, phrase/onset detection, normalization, source PCM and render
processing are unchanged. The CLI/C ABI and rebuilt browser WASM use the same
shared C++17 implementation, with no new dependency or public schema.

## Tests and actual output

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Defect reproduction | PASS | [Old-library regression](evidence/pitch-period/before-tests.log) and [before probe](evidence/pitch-period/before-probe.txt) |
| Known-note calibration | PASS | 180 combinations: five input rates, nine frequencies 70–450 Hz, two phases, pure tones or a stronger second harmonic plus third harmonic and DC; <5 cents error, correlation >0.9 and expected source-derived tonic |
| Existing offsets/noise/input checks | PASS | Onsets and boundaries remain exact; fractional pitch differs by at most 1.3232e-7 Hz in the offset probe; noise voicing, silence rejection and source preservation checks retained |
| Actual Apple M5 release | PASS | 14 suites pass in the [initial full run](evidence/pitch-period/mac-tests-initial.log); the affected suite passes after correcting its integer-pitch assumption ([final rerun](evidence/pitch-period/mac-tests-final.log)); 15/15 covered |
| Actual Linux arm64 release | PASS | [15/15 suites plus renders](evidence/pitch-period/linux-build-tests-render.log), 33.38 s; local VM, not physical Intel hardware |
| ASan/UBSan | PASS | [Affected remix suite](evidence/pitch-period/sanitize-tests.log), 129.78 s |
| Owner/fixture compatibility | PASS | All 65 previous original-input master/stem WAVs remain byte-identical; selected keys and music unchanged despite refined analysis metadata |
| Native portability | PASS | 70 master/stem WAVs across 13 primary plans plus four changed-cohort masters: **74 exact Mac/Linux WAVs**, exact musical decisions/event frames and zero maximum/RMS PCM error |
| Saved scores | PASS | Six old Call & Response plans, including the old incorrect-tone estimate, replay with 30 identical master/stem WAVs |
| WASM engine | PASS | 12 native/WASM comparisons: seven fixture styles, four owner seeds, PCM16 tone control; exact decisions, event frames and WAVs |
| Local delivery | PASS | Audited/rebuilt web bundle and site copy; ports 3000/4173 serve the exact new engine hash ([receipt](evidence/pitch-period/http-engine.json)) |
| Speech pitch accuracy / new musical preference | NOT RUN | No verified speech F0 labels or new listener judgments; the calibration does not supply them |
| Rendered browser / physical microphone / venue | NOT RUN | Node WASM and HTTP delivery do not certify these layers |
| Full musical quality / production | PARTIAL | M1 and existing device/live/release gates remain open |

The first corrected-build run failed an older test that demanded bit-identical
pitch under a constant recording offset. That was appropriate when the result
was an integer-lag quotient; interpolation reveals tiny Float32 quantization
differences. The measured maximum was **1.3231988305051345e-7 Hz**. The updated
test bounds that difference at 1e-4 Hz and retains exact onset/phrase comparisons
and the existing confidence tolerance. No event-frame or waveform tolerance
was relaxed. The initial failure is retained.

The first output-measurement assertion also assumed the PCM16 tone would select
the same old key as the Float32 probe. Inspection showed F versus D because a
different later period won. The [initial assertion failure](evidence/pitch-period/measure-initial.log)
is retained; the corrected check explicitly requires old F and new A for that
specific saved PCM16 control. The [final measurements](evidence/pitch-period/measurements.json)
record the actual values and waveform differences.

Playable local technical control:
[before](../renders/pitch-period-20261019/before/a4.call_response.wav) /
[after](../renders/pitch-period-20261019/after/a4.call_response.wav).
This is a newly generated pure tone, **not the supplied speech fixture**, a
human recording or a musical-quality comparison. Source tone PCM is identical
in both renders. The supplied fixture and owner's original hashes are unchanged.
The existing [piano phrasing A/B review](http://127.0.0.1:4196/review/) and Blood
Club training/checkpoints are preserved; neither is promoted by this fix.

## Broader speech impact

Read-only analysis of the 20 licensed LibriSpeech inputs found four changes in
source-derived tonic. These are not verified corrections to speech pitch:

| Source suffix | Old estimate / tonic | New estimate / tonic |
| --- | --- | --- |
| 1988-147956-0018 | 160 Hz / D♯ | 161.288 Hz / E |
| 84-121123-0012 | 190.476 Hz / G | 188.406 Hz / F♯ |
| 6295-244435-0035 | 470.588 Hz / A♯ | Unset / existing A-minor fallback |
| 1993-147965-0001 | 266.667 Hz / C | 270.566 Hz / C♯ |

Three cross a rounding boundary after fractional refinement. One has no credible
local peak in the search interval. [Analysis records](evidence/pitch-period/cohort-analysis.json)
retain all 20 inputs and source hashes. The four changed cases have fresh before/
after renders in `renders/pitch-period-20261019/cohort/`; their new masters match
Linux exactly and pass peak/tail checks ([results](evidence/pitch-period/cohort-renders.json)).
The frozen evaluation cohort, its generated mixes and blank ratings were not
regenerated. These recordings retain their [existing license/attribution scope](licensed-evaluation.md),
which is not individual study consent or new training authorization.

## Reproduce

Use the existing project environment and fresh output paths:

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
c++ -std=c++17 -O2 -I core/include docs/evidence/pitch-period/probe.cpp \
  build-mac/libdjayvo_core.a -o /tmp/djayvo-pitch-probe
/tmp/djayvo-pitch-probe
sh scripts/web_build.sh
node apps/web/tests/wasm.mjs
node docs/evidence/pitch-period/wasm-check.mjs
```

The old renderer/library are preserved under `renders/pitch-period-20261019/`.
Existing `docs/evidence/source-motif/render.py` creates fresh owner/fixture renders
and replays previous scores with `--plans`. The tone control is mono PCM16 at
48 kHz for three seconds: `round(0.2 × 32768 × sin(2π × 440 × frame / 48000))`.
[measure.py](evidence/pitch-period/measure.py) checks the fixed evidence folders
and refuses to overwrite its report; use new paths for another run. The
[file probe](evidence/pitch-period/file-probe.cpp) analyzes supplied WAV paths
without writing audio; its synthetic flag is only for constructing an in-memory
diagnostic plan, not a reclassification of licensed recordings.

Actual toolchains: Apple M5, 16 GiB, macOS 26.7.1, Xcode 27.1, Apple Clang
21.0.0, CMake 4.4.2, Python 3.15.0, Node 22.23.1, Emscripten 6.0.1; Linux
arm64, GCC 12.2.0, CMake 3.25.1, Python 3.11.2. [Mac](evidence/pitch-period/mac-environment.json)
and [Linux](evidence/pitch-period/linux-environment.log) receipts retain detail.
The local Linux VM/container are stopped afterward. `~/mlx-env` is unchanged;
no new paid compute, upload or model training occurred.
