# Independent voice pitch and timing

Recorded 2026-10-18. **Technical implementation: PASS. Musical acceptance: NOT RUN.
Overall E03: PARTIAL.** The complete master specification is unchanged.

Optional fragments can now change pitch without changing their scheduled length,
or change length without intentionally shifting pitch. The full clean statement
remains untransformed. Default rule arrangements still use original-speed voice;
existing recordings are preserved. This is local DSP, not a learned creative director.

## Contract and implementation

An imported `1.1-remix` plan may add `pitch_semitones` (−4 through +4, default 0)
and `time_stretch` (0.8 through 1.25, default 1) to a vocal event. Duration is
`ceil(source_crop_frames * time_stretch / rate)`; pitch does not enter this calculation.
Nonidentity independent transforms require legacy `rate=1`, a crop at least 80 ms,
at most 32 transformed events and at most 20 seconds of summed transformed output.
Repeated events count toward this conservative budget even when their PCM is cached.
Clean events require zero pitch shift and unit stretch, in addition to existing
forward/centered/minimum-length constraints. Source, overlap and music-end checks still apply.

Version 1.0 rejects the new fields. The exporter emits 1.1 only when a nonidentity
independent transform is present; identity-only plans canonicalize to 1.0.
The importer, JSON Schema and native validator enforce their respective structural
and relational rules. Existing 1.0 export bytes and legacy varispeed behavior are
preserved. CLI fallback remains explicitly opt-in. App/C ABI default planners do
not select this treatment yet; no new studio controls or automatic pitch correction
are claimed.

The existing windowed-sinc resampler supplies pitch conversion. A bounded
waveform-similarity overlap-add stage controls duration: 40 ms windows, 20 ms hops,
an 8 ms alignment search, complementary cosine crossfades and anchored crop ends.
Identical clip/pitch/stretch combinations share a prepared buffer. Reverse is
applied to the resulting buffer. Preparation occurs in renderer construction;
processing performs no allocation, locking, I/O or model calls. Instrument-only
stems skip the transform work. The shared C++17 engine gains no runtime dependency.

Algorithm background: Driedger and Müller describe waveform-similarity methods
and their limitations for transients in [A Review of Time-Scale Modification of
Music Signals](https://www.mdpi.com/2076-3417/6/2/57). This implementation was written
locally; no external implementation or model weights were copied. It is not
formant-preserving and does not establish intelligibility. Consonants may smear,
attacks may move or repeat, and pitch shifts can change voice character. These
limits are why E03 remains PARTIAL pending listening and broader transient tests.

## Evidence

| Gate | Status | Evidence and scope |
| --- | --- | --- |
| Native pitch/time behavior | PASS | 36 tone combinations across 8, 44.1, 48 and 192 kHz; pitch within 3 Hz of the analytical target, exact requested frame length, block-size identity, reverse/crop boundaries and no callback allocation |
| Native rejection limits | PASS | Nonfinite/range, short crop, changed clean hook, legacy-rate combination, music-end and event/work-budget rejection |
| CLI and schema | PASS | Five legacy style round trips plus transformed replay and unchanged instrument stems; 59 rejected candidates; 16 valid schema plans and five invalid schema cases |
| M5/Linux portability | PASS | Four actual owner plans, exact instrument event traces and 20 byte-identical owner WAVs plus 15 final fixture WAVs after the frame-count fix; maximum/RMS cross-platform PCM difference 0; derived voice start/end frames recorded |
| Clean hooks and old recordings | PASS | Both full owner hooks identical in each comparison; five previous owner WAVs and 15 previous fixture WAVs unchanged; protected input/master hashes unchanged |
| Output bounds | PASS | 20 new owner master/stem WAVs below −1 dBFS sample ceiling, no full-scale PCM, silent final 100 ms |
| Pulse probe | PASS | Three Gaussian attacks retained in each of three treatments; maximum displacement from nominal scaled timing 4 ms; this narrow probe does not certify speech transients |
| General transient/formant/intelligibility quality | PARTIAL | Limited pulse evidence; no formant correction and no human intelligibility observations |
| WASM defaults and resampling | PASS | Existing four styles still match native; actual 32-bit 44.1 kHz three-second input regression reproduced and fixed |
| Private audition page | PASS | Chromium/WebKit load eight players, muted play/pause/seek, one-at-a-time playback, no autoplay/errors and 1280/375/320 px layouts |
| New voice treatment in product UI | NOT RUN | Available through native plans/offline import; default apps do not enable it |
| Human listening / production quality | NOT RUN | No musical quality, speaker identity or artist-level comparison inferred from signal tests |
| Cloud, new phone checks, deployment | NOT RUN | No rental, upload, model call, phone action or publication this step |

M5 and Linux release suites pass 10/10 each. The full M5 ASan/UBSan suite
passes 10/10; the subsequent frame-count correction receives a rebuilt focused
core/remix/C-ABI sanitizer run: 3/3 PASS, reported separately.

Actual hardware/toolchain: Apple M5, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1
(27A9275), Apple Clang 21.0.0, SDK 27.0, CMake 4.4.2 and isolated Python 3.14.6.
The local Linux arm64 VM uses GCC 12.2.0/CMake 3.25.1/Python 3.11.2. Both Colima
profiles are returned to their stopped state. Emscripten 6.0.1 builds the browser
engine; Chromium 149.0.7827.55 and WebKit 26.5 exercise the private page.

The Browser plugin's required JavaScript execution tool and tool discovery were
unavailable. Under the owner's autonomous validation instruction, the existing
Playwright installation was used. Flow: local file page → play first mix → play
voice stem (first player pauses) → pause and seek to 29.5 s. Page identity/content,
absence of error overlays, console health and desktop/mobile screenshots pass.
This is playback automation, not hearing. No additional browser dependency was installed.

One test initially used an absolute tone-step bound unsuited to the tested pitch
and gain. It was corrected to use the analytical tone slope plus the 3 ms edge
fade slope; frequency and duration bounds were retained. The first ultra-short
pulse-only input was correctly rejected by the energetic-phrase gate. The final
probe adds a voiced calibration region outside the transformed crop, preserving
the failed attempt and the supplied speech fixture.

Inspection also found a real pre-existing 32-bit overflow in the resampler's
`frames * target_rate` numerator. Three seconds at 44.1 kHz became less than two
seconds in WASM and failed validation. A uint64 numerator fixes this without
changing native output. The retained failing/fixed WASM probe and new native/WebAssembly
regressions protect this path. Two older WASM narrowing warnings in the crop
planner remain; no new warning originates from these transforms.

See [gate summary](evidence/voice-transforms/report.json),
[measurements and hashes](evidence/voice-transforms/measurements.json),
[pulse results](evidence/voice-transforms/transients.json),
[native tests](evidence/voice-transforms/mac-final-tests.log),
[Linux tests](evidence/voice-transforms/linux-final-tests.log),
[sanitizer tests](evidence/voice-transforms/sanitizer-tests.log),
[final affected sanitizer checks](evidence/voice-transforms/sanitizer-final-tests.log),
[browser results](evidence/voice-transforms/browser.json), and
[M5 environment](evidence/voice-transforms/mac-environment.json).
The four owner master-plus-stem renders took 0.83–0.98 s each in single observed
runs alongside other work. These are observations, not a worst-case latency benchmark.

## Reproduce and audition

Open [the private eight-player comparison](../renders/voice-transforms-20261018/index.html)
locally. It contains control, +2 semitones at original length, 1.12× duration at
original pitch, and −2 semitones at 0.9× duration. All use the existing owner-consented
source and club arrangement. Gains are identical, not perceptually loudness-matched;
this is a diagnostic comparison, not a blinded quality evaluation. Keep it owner-only.

```sh
.venv-build/bin/python scripts/prepare_voice_transforms.py \
  --renderer build-mac/djayvo_remix \
  --input renders/voice-20261017-221411/source-pcm.wav \
  --plan renders/voice-club-v8/final/remix.club.score.json \
  --output renders/voice-transforms-new-review --consent
```

Choose a fresh output directory; existing recordings are never replaced. The
script requires explicit local-processing consent, verifies the source/plan,
checks export receipts and clean-hook metadata, and leaves `.partial` on failure.
Reproduction/measurement code and logs are retained under `docs/evidence/voice-transforms/`;
private PCM remains in ignored `renders/`. `~/mlx-env` was not used or modified.
