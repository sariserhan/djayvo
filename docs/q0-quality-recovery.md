# Q0 — Musical quality recovery: diagnosis and controlled experiments

2026-10-20. **Implementation: PARTIAL. Current owner listening acceptance: FAIL.**

**Newest study:** [Original score and palette controls](q0-authored-study.md)
now provide 20 new 36.8-second mixes using recorded guitar articulations, intact
voice calls and phrase-derived melodic responses. Technical checks pass;
new musical acceptance remains **NOT RUN**. Previous rejections remain **FAIL**.

**Latest continuation:** [The five-condition trial](q0-five-arm-trial.md) now
renders B/D/E alongside the preserved A/C controls. A copied native build tests
longer drum decay; E tests intact vocal calls and a source-rhythm instrumental
answer. Technical execution passes; the owner subsequently rejected the new
packet too: **FAIL**. [Reference reassessment](q0-reference-reassessment.md)
records the remaining implementation gaps. All rejected recordings remain unchanged.

The technical audit, five-input baseline, instrument probes and an expression-only
comparison are available. The owner responded “still bad” and clarified “All of
them,” covering the baseline (4197), A/C expression comparison (4198) and
native/SFZ probes (4199). All three packets fail owner acceptance; none is
promoted as an accepted improvement. This is one qualitative reviewer, without
numeric scores, pairwise preferences or component timestamps.
Main *perceptual* causes and relative effect sizes are not yet established.
The prior R0 owner rejection also remains **FAIL**.

The shared engine, production composer, dashboard, master, learning addendum and
existing musical plans were not changed. Nothing was trained, purchased,
published or sent to a cloud inference service. The new expression transform
operates on copies of plans in an offline experiment.

## Gates

| User requirement | Status | Evidence / remaining work |
|---|---|---|
| Audit instruments, scheduling, voice, arrangement and mix | PARTIAL | Code and rendered-waveform evidence below; human causal diagnosis pending |
| Five representative inputs with original audio, events, stems, master and measurements | PASS | Five frozen real recordings; metadata-based conversational/phrase/laughter selection, not a listener-validated population sample |
| Preserve existing plans and master | PASS | New output directories, source/plan hashes, immutable spec hashes |
| Separate instrument realism evaluation | PARTIAL | Probes and measurements complete; owner rejects the packet, without instrument-specific ratings or causal ranking |
| SFZ/sfizz dependency investigation | PARTIAL | Local Mac build and rendering PASS after isolated compatibility fixes; production integration, distribution notice assembly and other targets NOT RUN |
| Modular deterministic performance expression | PARTIAL | Shared onset shifts, accents, existing ghost strokes, gates, guitar muting and phrase dynamics; new fills/transitions, deeper melodic phrasing and listening acceptance remain open |
| Groove MIDI Dataset evaluation | PASS | License/checksum review and descriptive MIDI analysis; no training or fitting |
| Improved composition | PARTIAL | Copied-plan call/response candidate rendered; no musical improvement claimed |
| A: existing renderer | PASS | Five native baseline mixes and stems |
| B: instrument candidate only, full mix | PASS | New isolated drum-decay arm; realism remains unproven |
| C: expression only | PASS | Five copied plans, actual mixes/stems, deterministic replay and blind level-matched A/C packet |
| D: instruments + expression | PASS | Decay build with exactly C's plan/events |
| E: composition + D | PASS | New copied composition with the same expression transform and decay build |
| Technical event timing/replay and comparison level matching | PASS | Latest five-arm trial: 8,216 instrument event rows, zero frame errors, 20 exact block-size replays |
| Browser listening controls | PARTIAL | Form, decoding, downloads and layouts pass; headless WebKit playback clock stalled; physical playback/listening NOT RUN |
| Q0 Linux/iPhone/WASM audio execution | NOT RUN | Prior R0 portability evidence is retained separately; not relabeled as Q0 |
| Current owner listening acceptance | FAIL | Owner rejects all three packets; exact replies retained; no numeric ratings or relative preference inferred |
| Formal comparative improvement / independent study | NOT RUN | Qualitative rejection is not a measured effect size or an independent study |

The user required diagnosis before modifying the engine. These measurements
identify specific mechanisms to audition but do not establish which dominates
the perceived robotic sound. The continuation tests a narrow mechanism in an
isolated source copy; production remains unchanged. This is an incomplete Q0
checkpoint for review, not a completed quality milestone.

## Listen locally

- [Latest blind A/B/C/D/E comparison](http://127.0.0.1:4200/)
- [Unchanged mixes, original recordings and stems](http://127.0.0.1:4197/)
- [Isolated unchanged instruments](http://127.0.0.1:4197/instruments/)
- [Blind A/C expression comparison](http://127.0.0.1:4198/)
- [Level-matched native/SFZ instrument probes](http://127.0.0.1:4199/)

Servers bind only to `127.0.0.1`. The combined packet is owner-only because it
contains the owner's private voice. Sources are copied byte-for-byte from the
existing PCM recordings. The owner's original M4A also remains untouched.
No private audio is committed to Git.

The blind packet has two anonymized candidates per input, randomized order,
blank 1–5 ratings for musicality, realism, groove, creativity, recognizability
and enjoyment, plus notes. It downloads responses locally with a packet ID.
The organizer key is outside the served folder. The instrument probe page is
explicitly labeled and diagnostic, not a blind preference study.

Start with the owner-speech pair and the short/long drum probes if time is
limited. Component/timestamp feedback is useful even without completing all
ratings. No numerical score will be inferred from a qualitative response.

### Owner review received after the initial checkpoint

[Exact feedback](evidence/q0/owner-feedback.json): “still bad,” then “All of
them” when asked to distinguish the three pages. The current candidate set
fails acceptance. The new expression and sample-playback trials did not
produce an acceptable result for this listener. This does not prove zero
relative improvement, equal quality between candidates or a specific cause.
The frozen run reports retain their original pre-listening statuses; this
separate feedback record and the current gates above supersede those statuses
for owner acceptance.

## What the evidence says

| Suspected source | Actual finding | Interpretation and audible check |
|---|---|---|
| Poor instrument sound | Existing acoustic piano, bass, drums and guitar already use recordings. Prepared samples are mono, 22.05 kHz, duration-capped and individually peak-normalized. Bass is pizzicato double bass; kick is orchestral bass drum. Organ/pad/lead are procedural synthesis. | Instrument identity, preparation and articulation are candidates; “all instruments are primitive oscillators” is false. Compare the isolated native/SFZ versions at 4 seconds. |
| Uniform velocity | Piano/bass/drums in the owner baseline have 33/17/43 distinct velocities. Bass/drums have only one **recorded velocity layer**, while piano has three and ordinary guitar two. | Uniform MIDI velocity is disproven. Recorded timbre variation remains limited, especially bass/drums. Volume variation cannot create a missing recorded articulation. |
| Mechanical timing | All bass attacks are on the sixteenth grid. Reggae/experimental drums are entirely on it; hip-hop drums have 65/85 attacks on it. Rolled piano chords already have offsets. | Grid placement is measurable, but quantization alone is not proof of bad groove. C tests coordinated, bounded shifts without independent jitter. |
| Inappropriate articulation | The unchanged open-hat probe with a 125 ms gate becomes silent after its 180 ms release. With a 1.5 s gate, 19.56% of its two-second note-window energy remains after 320 ms. Every baseline uses short drum gates. | A confirmed note-off truncation mechanism. Compare native drums-short versus drums-long at 4.0–5.0 s. It is not yet a proven dominant perceptual cause. SFZ one-shot drums ignore note-off, confirmed by identical short/long WAVs. |
| Weak/repeated composition | Owner and second hip-hop input have identical drum events, but different keys and some piano timing. The short-phrase/laughter experimental pair shares piano, bass and drums, while five lead start times differ. | Repeated components and limited input response, not wholly input-independent arrangements. No claim that every seed sounds identical. An early commentary overstated whole-track identity; exact comparisons corrected it. |
| Bass/drum/vocal synchronization | All 1,700 instrument events in A and 1,700 in C agree exactly with independently calculated plan frame positions. Bass/kick coincidences vary by style: 8/22, 1/16, 12/23, 8/22, 12/23. | No scheduler-frame discrepancy found. Syncopation is not automatically an error. Event logs do not measure sample attack latency or prove musical lock between parts. Vocal placement still needs listening. |
| Unnatural chopping | Nonclean vocal excerpts span roughly 134–516 ms in these plans. All five use rate 1, zero pitch shift, no stretch change and no reverse. | Pitch/stretch artifacts cannot explain these renders through those disabled transforms. Fragment selection, repetition, boundaries and context remain candidates. Owner hip-hop vocal stem: clean phrase at 5 s, shorter hooks around 10 s and 11.875 s. |
| Missing phrasing | Existing velocities, chord rolls, sections and some guitar muting already exist; the sampled bass/drum articulation inventory is sparse. | Neither “no expression exists” nor “expression is solved” is supported. C is a limited hand-authored hypothesis, not learned musicianship. |
| Mixing/mastering | All five raw masters have zero full-scale samples and zero limiter interventions. Owner instrumental clean-hook ducking is about −16.5 dB; owner mix LRA is 14.7 LU. | Clipping/crushing is not supported as the cause in this cohort. The large vocal/instrument contrast warrants audition at 5 s and 15 s; loudness range is not itself a quality score. |

These are signal/code observations tied to playable evidence and listening
locations, not a claim that an automated tool heard and ranked the defects.
The previous R0 owner report rejected all candidates as awkward and robotic in
both voice and instruments. It concerned the earlier packet, not these five new baselines.

## Baseline and measurements

All native rendering uses the frozen executable, seed `4123`, 48 kHz PCM16 stereo.
The default render block is 512; C also replays at 113 frames. Each input has
`source.wav`, `A.<style>.score.json`, `A.<style>.events.tsv`, a completion receipt,
native render report, actual instrument/vocal stems and final WAV.
Organ/lead stems are included when used. The standard piano stem can be silent
when organ is the actual harmonic instrument.

| Input | Style / BPM | Mix duration | Raw integrated LUFS | Raw true peak dBTP | LRA LU |
|---|---|---:|---:|---:|---:|
| Owner conversational speech | hip-hop / 96 | 32.000 s | −23.33 | −7.00 | 14.7 |
| `ls-2277-149896-0026` | reggae / 80 | 32.000 s | −24.01 | −7.67 | 5.2 |
| `ls-2035-147960-0013` | experimental / 124 | 32.968 s | −25.40 | −7.48 | 6.8 |
| `ls-2086-149220-0047` | hip-hop / 96 | 32.000 s | −24.78 | −7.62 | 9.4 |
| Commons laughter | experimental / 124 | 32.968 s | −25.19 | −7.95 | 3.8 |

The eight native/SFZ probe pairs test piano, bass, drums and guitar with short and
long gates. The existing native organ/pad/lead probes are also available; a
sample-based counterpart for these synthesizers was not added.

The five A/C pairs measure −23.01 to −22.99 LUFS after fixed-gain matching.
Their highest true peak is −5.08 dBTP. Instrument-pair matching is within 0.13 LU
of its per-pair target, using the unchanged 0.15 LU tolerance and −1.9 dBTP
ceiling. FFmpeg `loudnorm` is used only to measure input loudness, never to write
processed comparison audio. The outputs use a constant gain, not a limiter or
compressor. R128 gating can change after gain; the helper remeasures and retries
from the original audio, never by repeatedly processing a PCM16 intermediate.

| Input | Maximum A→C onset shift | Raw max PCM16 difference | Raw RMS PCM16 difference |
|---|---:|---:|---:|
| Owner | 11.719 ms | 11,474 | 760.140 |
| `ls-2277…` | 4.688 ms | 21,211 | 946.560 |
| `ls-2035…` | 4.032 ms | 15,948 | 271.340 |
| `ls-2086…` | 11.719 ms | 8,368 | 436.546 |
| Laughter | 4.032 ms | 8,031 | 147.650 |

Differences show that C actually changes the waveform; they do not measure
improvement. For each C render, 512/113-block WAV, score and event files are
byte-identical: replay maximum/RMS waveform error is zero. Eight SFZ probes
also reproduce exactly on repeat execution. All ten matched A/C WAV hashes
were reverified after the matching helper repair.

Native exported stems are rendered through the native stem paths and mix
processing; they are not guaranteed to sum exactly to the master. Summing
external SFZ stems with a different mixer would change more than instruments,
so this was not passed off as B.

## Implemented files

- `scripts/q0_audit.py`: source authorization/hash checks, frozen baseline,
  export verification, event descriptors, WAV and EBU measurements, fixed-gain matcher.
- `experiments/q0/instrument_probe.cpp`, `scripts/q0_probe_review.py`: unchanged
  engine instrument probes, release-window measurements and audition page.
- `experiments/q0/expression-profiles.json`, `scripts/q0_expression.py`:
  constant-tempo 4/4 plan transform for the three existing styles. Shared onset
  shifts protect kicks, clean voice starts and bar boundaries; existing offbeat
  snare/hat accents, phrase velocity curves, note gates and guitar muting are
  deterministic. Same-pitch gates are bounded before the next attack.
- `scripts/q0_expression_trial.py`: native validation, C stems, exact block replay,
  blind A/C packet, level checks and packet-bound response download.
- `scripts/q0_measure_comparisons.py`: independent tick/frame validation,
  waveform differences, vocal-transform inventory and exact component comparisons.
- `experiments/q0/sfizz_probe.cpp`, `scripts/q0_sfz_samples.py`,
  `experiments/q0/sfizz-apple-clang.patch`: optional offline SFZ tests using
  existing hash-pinned CC0 samples. Original sample resolution/stereo/dynamics,
  recorded velocity regions, deterministic round robins, guitar mute selection,
  pitched envelopes and one-shot drums are exercised.
- `scripts/q0_groove_reference.py`, `experiments/q0/requirements.txt`: descriptive
  GMD analysis with pinned Mido in `.venv-q0`.
- `tests/integration/verify_q0.py`, `tests/q0_review_browser.mjs`: experiment
  invariants and local browser checks.
- [`docs/evidence/q0/`](evidence/q0/README.md): exact results, plans, traces,
  event exports, hashes, environment, diagnostic failures and browser screenshots.

The expression profiles are explicitly hand-authored and were not fitted to GMD
or listener outcomes. The seed selects deterministic strength; it does not
promise an unlimited variety of learned performances. No independent random
timing noise was added. New fills, richer instrument articulation, convincing
melodic development and a composition candidate remain unimplemented.

## Licenses and provenance

| Material | Finding and scope |
|---|---|
| Owner recording | Existing explicit local processing/private audition consent, hash checked. No upload, redistribution or training. |
| Three LibriSpeech clips | CC-BY-4.0 per [OpenSLR](https://www.openslr.org/12/), with retained attribution. Public license, not individual study consent; no training performed. |
| Laughter | [sagetyrtle recording on Commons](https://commons.wikimedia.org/wiki/File:Laughter(s).ogg), CC0; pinned existing excerpt and provenance. Expressive category follows metadata, not new human classification. |
| Piano/bass/drums | Existing [VSCO 2 CE](https://github.com/sgossner/VSCO-2-CE) / VCSL CC0 manifests and cached sample hashes. Commercial use permitted by the recorded license. No new sound library bought. |
| Guitar | Existing [Karoryfer Black and Green](https://github.com/sfzinstruments/karoryfer.black-and-green-guitars) CC0 manifest and license evidence. |
| Synthesizers | Existing original project synthesis; project outbound software license remains a separate distribution decision. |
| GMD | [Google/Magenta dataset](https://magenta.tensorflow.org/datasets/groove), CC-BY-4.0. MIDI-only archive SHA-256 `651cbc524ffb891be1a3e46d89dc82a1cecb09a57c748c7b45b844c4841dcc1e`. No audio download or training. |

GMD contains human-played MIDI, while its associated audio is synthesized;
it is useful for drum-performance reference, not acoustic sample realism.
Of 1,150 metadata records, 1,138 constant-tempo 4/4 files were analyzed,
keeping official splits separate: 887 train, 122 validation, 129 test.
Twelve variable-tempo/non-4/4 records were excluded and listed.
Nearest-sixteenth residuals combine swing, subdivisions and timing; they must
not be copied as an independent random-jitter distribution.

The optional [sfizz](https://github.com/sfztools/sfizz/tree/1.2.3) checkout is
tag 1.2.3, resolved commit `4e70dc0bef53b41f2853ed46e26f5911114c92d0`, BSD-2-Clause.
Its selected dependencies were inspected locally and license-file hashes retained:
Abseil Apache-2.0; atomic_queue, SIMD Everywhere, pugixml, tuning code, libaiff
and st_audiofile MIT-family; filesystem, spline, KISS FFT, cephes, cpuid and
WavPack BSD-family; hiir WTFPL-2.0; dr_libs MIT-0; stb_vorbis MIT alternative.
Faust filter sources declare STK-4.3 and LGPL-with-generated-code exception;
the exception was read, not assumed to apply to every LGPL dependency.
Mido is MIT; packaging is Apache-2.0/BSD.

libsndfile, JACK, plugins, sfizz's MIDI renderer, benchmarks and upstream tests
were not enabled. Their optional dependencies are not silently added to Jamloom.
The upstream minimum deployment target still produces warnings under modern
Xcode; this local experiment does not certify older macOS support.
Distribution notices and an integration-specific legal/dependency review remain
open before shipping sfizz. It is not linked into the shared engine or browser.

SFZ mapping follows the documented
[one-shot behavior](https://sfzformat.com/opcodes/loop_mode/),
[round robin sequencing](https://sfzformat.com/opcodes/seq_length/) and
[release envelopes](https://sfzformat.com/opcodes/ampeg_release/).
The comparison changes playback engine, preparation, envelopes and velocity
response together; it cannot isolate any one of those effects.

## Tests, failures and environment

**PASS:** Eight Q0 tests; three native groups (`core`, `remix_core`,
`live_instruments`); five baseline exports; five C exports and exact replays;
14 native probes; eight SFZ probes and exact replays; 3,400 instrument event
rows with zero frame error; loudness checks; original sample hashes.

**PARTIAL:** Chromium and WebKit review form/decode checks at 1440×1000 and
390×844. Blank mandatory ratings, responsive width, automatic pause, packet-bound
download, key isolation and reload reset pass. Synthetic form answers were
deleted and never counted as listener evidence. No external requests or page
runtime errors remained. Chromium muted playback clock advances; unmuted
headless playback and WebKit's clock stalled. Real speaker/headphone playback
and browser acoustic latency were not established.

The Browser runtime could not be invoked because its JS tool was not exposed;
the existing project Playwright installation was used for reproducible checks.

Failures retained rather than hidden:

1. Initial baseline analysis failed because FFmpeg wrote a status line after its
   JSON. Fixed parsing and reran into a new directory; the first incomplete run
   is excluded from accepted evidence.
2. sfizz's ARM32 compiler flags were selected for `arm64`. Configuring its
   processor name as `aarch64` avoided those flags without changing Jamloom.
3. Modern Clang rejected four unnecessary dependent `template` keywords in
   sfizz's bundled atomic_queue. The isolated, retained patch fixes them.
4. Browser testing caught an invalid HTML pattern under current regex rules.
   Reviewer-code validation was repaired and the form checks rerun.
5. One-pass instrument level matching missed the target by 0.17 LU for a quiet
   bass probe. Bounded remeasurement fixed this without widening the tolerance.
6. Headless audio-clock stalls remain a validation limitation; decode/form
   success is not relabeled as physical playback success.

Hardware/toolchain: Apple M5, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1
(27A9275), Apple Clang 21.0.0, CMake 4.4.2, Python 3.14.6, FFmpeg 9.0.2,
Node 22.23.1, Playwright 1.61.1. Exact browser versions and binary/spec hashes
are in [`environment.json`](evidence/q0/environment.json) and
[`browser.json`](evidence/q0/browser.json). `~/mlx-env` was not touched.

## Reproduction

Run from the existing checkout. Choose fresh output names on reruns; do not
overwrite frozen plans or listener responses. Source recordings and cached CC0
samples are local prerequisites; a clean clone intentionally contains no
private voice recording.

```sh
.venv-build/bin/python -m venv .venv-q0
.venv-q0/bin/python -m pip install -r experiments/q0/requirements.txt
.venv-q0/bin/python tests/integration/verify_q0.py
ctest --test-dir build-mac --output-on-failure -R '^(core|remix_core|live_instruments)$'

mkdir -p build-q0-tools
c++ -std=c++17 -O2 -Icore/include experiments/q0/instrument_probe.cpp \
  build-mac/libjamloom_core.a -o build-q0-tools/instrument-probe
build-q0-tools/instrument-probe renders/q0-instrument-probes-NEW
.venv-build/bin/python scripts/q0_probe_review.py \
  renders/q0-instrument-probes-NEW renders/q0-instrument-review-NEW
.venv-build/bin/python scripts/q0_audit.py --output renders/q0-baseline-NEW
.venv-build/bin/python scripts/q0_expression_trial.py \
  --baseline renders/q0-baseline-NEW --output renders/q0-expression-NEW
.venv-build/bin/python scripts/q0_measure_comparisons.py \
  renders/q0-baseline-NEW renders/q0-expression-NEW renders/q0-expression-NEW/measurements.json

.venv-q0/bin/python scripts/q0_groove_reference.py \
  renders/q0-gmd-reference/groove-v1.0.0-midionly.zip \
  renders/q0-gmd-reference/analysis-NEW.json
```

Optional sfizz setup (reuse the existing dependency checkout; do not clone the
Jamloom project). On a new environment, fetch sfizz tag 1.2.3 with its recursive
submodules into `build-q0-tools/sfizz`, verify the resolved commit above, then
apply `experiments/q0/sfizz-apple-clang.patch` once:

```sh
git -C build-q0-tools/sfizz apply ../../experiments/q0/sfizz-apple-clang.patch
cmake -S build-q0-tools/sfizz -B build-q0-tools/sfizz-build \
  -DCMAKE_BUILD_TYPE=Release -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DPROJECT_SYSTEM_PROCESSOR=aarch64 -DSFIZZ_JACK=OFF -DSFIZZ_RENDER=OFF \
  -DSFIZZ_TESTS=OFF -DSFIZZ_SHARED=ON -DENABLE_LTO=OFF -DSFIZZ_USE_SNDFILE=OFF
cmake --build build-q0-tools/sfizz-build --target sfizz_shared -j 4
c++ -std=c++17 -O2 -Icore/include -Ibuild-q0-tools/sfizz/src \
  experiments/q0/sfizz_probe.cpp build-mac/libjamloom_core.a \
  -Lbuild-q0-tools/sfizz-build/library/lib -lsfizz \
  -Wl,-rpath,"$PWD/build-q0-tools/sfizz-build/library/lib" -o build-q0-tools/sfizz-probe
.venv-build/bin/python scripts/q0_sfz_samples.py \
  renders/q0-sfz-probes-NEW build-q0-tools/sfizz-probe
```

The SFZ comparison script intentionally uses the frozen
`renders/q0-instrument-probes-20261020` native probes as its control.
Commands above are the Mac experiment; the processor workaround is not a
generic cross-platform build setting.

Restart the existing packets in separate terminals:

```sh
.venv-build/bin/python -m http.server 4197 --bind 127.0.0.1 --directory renders/q0-baseline-v2-20261020
.venv-build/bin/python -m http.server 4198 --bind 127.0.0.1 --directory renders/q0-expression-20261020/listener
.venv-build/bin/python -m http.server 4199 --bind 127.0.0.1 --directory renders/q0-sfz-probes-20261020/listener
```

With port 4198 running:
`/Users/serhansari/.nvm/versions/node/v22.23.1/bin/node tests/q0_review_browser.mjs`.
Screenshots and the browser report are written to a new temporary directory.

## Remaining work and recommendation

The current A/C and sample-playback candidates have been rejected. Do not repeat
them as a new improvement or promote small parameter changes on technical
metrics alone. Causal diagnosis and a materially different composition/instrument
experiment remain necessary before completing B/D/E with the same native mixing
path and frozen controls. Longer vocal units, bass/drum articulation, phrase
response and restrained contrast remain hypotheses, not accepted improvements.
Do not use extra random offsets or louder masters to manufacture a preference.

There is no new numerical “professional quality” threshold and no change to the
existing M1/listener benchmarks. Q0's required substantial improvement remains
unestablished; current owner acceptance is FAIL. Independent listener evidence,
broader inputs, acoustic attack
timing, physical playback and fresh cross-platform execution remain open.
No later milestone or model training is recommended until Q0's controlled
comparison has a credible listening result.

Implementation parent: `87ede36382b3ef76168b60b03f709026c7371799`.
Q0 implementation/evidence commit: `8ba06bf8f7c45ddf863f2b6496fc184afba9219b`.
Subsequent owner feedback is recorded separately without changing frozen renders.
