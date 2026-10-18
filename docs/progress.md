# Djayvo: M0 continuation evidence

For completed development, open tasks and future milestones, use the
[development tracker](../TODO.md). This file retains the detailed evidence record.

Recorded 2026-10-17, America/New_York. The owner authorized continuing without
per-step approval, then requested a Mac handoff after finishing Linux work. The
master specification is unchanged. The original M0a record is
[m0a-report.md](m0a-report.md), with its initial Git commit `02d0e18`.

**Current Apple M5 and Linux arm64 technical checks: PASS. Overall M0: PARTIAL.**

Latest continuation, 2026-10-18: [native iOS Instant Remix](ios-instant-remix.md).
The app adds consented capture/import, trim, worker rendering, three styles/club,
playback, regeneration, persistent favorites, WAV sharing and scoped deletion.
A confirmed mobile worker stack overflow is fixed without changing DSP: the
voice pool allocates once at construction. Current M5 release/sanitizer and Linux
arm64 suites pass 9/9 each; 15 WAVs and all compared plans/event frames are exact.
Simulator and physical iPhone/Mac comparisons also have three byte-identical
masters each, with exact plans/event frames and zero PCM error.
Six final integration tests passed on the actual iPhone 14 Pro, including exact
two-second decimal trim regressions. A ten-test simulator smoke and final
three-test UI rerun pass. A follow-up signed Release launch and physical home-screen
inspection pass. The owner confirms recording, generation and playback work;
normal app metadata shows three styles completed in 1.830 s. Earlier locked
launch and UI-automation initialization failures are retained. The iPad simulator
completed its generation/playback/save/relaunch/share flow. Physical UI automation
failed to enable in two attempts. Three optimized phone trials average 1.828 s
for all three styles with peak physical memory at most 55,953 kB. Exact attempts and evidence are
in the [iOS gate ledger](ios-instant-remix.md). **M3: PARTIAL.**
Formal M1/model/live/public-release gates remain open. The new owner phone smoke
recording is not part of the frozen formal evaluation cohort; a diverse cleared
cohort and independent listening panel are still missing.

Previous continuation, 2026-10-18: [club refinement v8](club-refinement.md).
The owner requested all three areas: bass/drums, transitions and vocal clarity.
The electronic bank and balance are revised, build/return accents changed, and
club selects longer pause-ended crops without near-duplicate overlap. Both full
voice statements remain. A confirmed stem-export bug is fixed: instrument takes
now match the master's event IDs. New four-style exports reconstruct within two
PCM16 steps when no limiting engages; previous three-style masters are unchanged.
Nine suites pass on M5 release/sanitizers and actual Linux arm64 (10 foundation +
15 remix groups). Current club and legacy fixture plans/event frames agree,
with byte-identical cross-OS WAVs. The private thirteen-player v7/v8 comparison
passes muted browser playback. No hearing or listener judgment is inferred.
**Bass/drum, transition and vocal listening: NOT RUN. Production quality: PARTIAL.**
See [current measurements](evidence/club-refinement/report.json).

Previous musical continuation: [original electronic club direction](club-direction.md).
The new explicit `club` strategy adds 14 original electronic one-shots, kick
ducking, a 140 BPM build/drop/break/return and three differently opened
36-second owner mixes. Nine suites pass on M5 release/sanitizers and Linux arm64
(10 foundation + 13 remix groups), with final metadata regressions also passing.
Four club masters/eight stems match byte-for-byte across OSes; plans/event frames
agree exactly. All 15 checked v4 owner WAVs remain unchanged. Both full voice
hooks match within 0.0000242 PCM error. Eight matched local players have passed
muted browser playback; this supplies no listening evidence.

**Club listening/reference similarity: NOT RUN. Production quality: PARTIAL.**
Master specification, supplied speech fixture and original recordings remain
unchanged. The v4 frozen pilot is historical; it does not evaluate club. See
[the current report](evidence/club-direction/report.json) and [tracker](../TODO.md).

Previous continuation: [reproducible evaluation preparation](evaluation-batch.md).
Eight suites pass on M5 release/sanitizers and Linux arm64. A frozen local pilot
contains one owner source × three styles × three seeds, three baselines and
three blind packets. Distinct block/answer IDs prevent different seeds from
reusing response codes. All nine candidate WAVs, plans and event frames match
retained v4 outputs exactly. No audio-engine algorithm changed.

The owner confirmed no additional consented clips are available. Dataset and
preregistration are **PARTIAL**; reviewer assignment, formal listening and M1
quality are **NOT RUN**. Permission remains owner-only. See the
[current preparation report](evidence/evaluation-preparation/report.json).

Previous engineering checkpoint:
The latest [workflow revision](workflow-hardening.md) adds cancellable exports
with completion hashes and collision protection, native extensible WAV import,
and one-command local M4A conversion/render/listening preparation. Seven suites
pass on M5 release/sanitizers and Linux arm64 (10 foundation + 12 remix groups).
Current plans/event frames match exactly; six masters and twelve fixture stems
are byte-identical. Fifteen owner WAVs also exactly preserve v4 audio. All 33
representative offline benchmark renders pass. CI configuration and local recipe
checks are **PASS**; hosted CI is **NOT RUN**. See the
[current report](evidence/workflow-hardening/report.json).

The owner replied “they are fine” to the specific v4 piano/drum comparison
question: **PASS** informal feedback received/accepted; production realism is
**PARTIAL**, and formal M1 evaluation is **NOT RUN**. There are no invented
per-style scores, timestamps or recognition observations. The new M4A session
page has three browser-tested players; its listening remains **NOT RUN**.

Previous musical checkpoint:
The latest [instrument articulation revision](instrument-articulation.md) adds
three recorded piano dynamics and two takes per piano pitch/drum hit: 53 pinned
CC0 recordings. M5 release/sanitizer and Linux release each pass 7/7 suites
(10 foundation + 11 remix groups). Fresh fixture/owner plans and event frames
match; six masters and twelve fixture stems are byte-identical across Linux/M5.
Nine voice mixes, twelve stems, a new baseline and a sixteen-file matched
comparison page are ready. At that checkpoint v4 listening was **NOT RUN**;
the subsequent owner feedback is recorded above. Instrument realism and
production quality remain **PARTIAL**. See the historical [v4 report](evidence/instrument-articulation/report.json).

The previous [vocal boundary revision](vocal-boundaries.md) adds sustained quiet
endings and attack pre-roll with a bounded fallback. Its code and all earlier
recordings remain preserved. V2 owner acceptance was provisional, not a formal
listening result for subsequent revisions.

The preceding [arrangement revision](arrangement-review.md) added breaks and
returns, nearby chord inversions, softer-note tone filtering, instrumental early
reflections and 80 ms vocal clearance. Its renders and evidence are preserved.

Earlier acoustic checkpoint (superseded technically by the revision above): M0b/M0c
code and three complete recordings exist. Both the supplied synthetic speech
and one owner-consented human recording now render successfully. Human-recording
listening is **PARTIAL**: the owner accepts it as a start but reports awkward
experimental passages and game-like timbres, and requests more varied openings.
Recognition ratings remain **NOT RUN**. See [voice-trial.md](voice-trial.md).
The new [acoustic revision](acoustic-review.md) replaces oscillator instruments
with cleared note recordings, lowers piano registers, simplifies experimental
motifs, and varies the opening. Native release and sanitizer CTest are **PASS**
(7/7 each). Listening to this revision and its Linux/Mac comparison are **NOT RUN**.
Actual Apple M5 execution is now **PASS**, with the local results in
[mac-portability.md](mac-portability.md). M1 evaluation tools and a pilot are ready, without
claiming human evidence. At that historical checkpoint no iPhone UI existed;
the current app is documented above. AI models, training and live mode remain absent.

| Gate | Status | Evidence |
| --- | --- | --- |
| Linux release build | PASS | Current aarch64 Debian 12 container, GCC 12.2; physical Intel rerun NOT RUN |
| C++ unit tests | PASS | Current Mac/Linux: 10 foundation + 15 remix test groups |
| C ABI | PASS | Compiled-C render, bounded errors, ABI and additive cancellation/retry checked |
| End-to-end tests | PASS | Current Mac/Linux: CTest 9/9 including both asset banks and evaluation preparation |
| ASan/UBSan | PASS | Current Mac: nine suites, no findings |
| Evaluation preparation | PASS | Frozen actual one-source/three-seed pilot; nine unchanged candidate WAVs, distinct codes and blank ratings |
| Dataset/preregistration | PARTIAL | Owner has no additional clips; diverse cohort and reviewer assignments missing |
| Input decoding/bounds | PASS | PCM16/24/32, float32 and validated extensible variants; original owner WAV accepted; corruption/layout/precision/padding rejected |
| Safe export/cancellation | PASS | Complete marker/hashes, exclusive publication, rollback, real SIGINT/SIGKILL, existing files/symlinks and stale locks preserved |
| Local M4A workflow | PASS | Actual owner input converted locally; three mixes/twelve stems, provenance and browser page; source unchanged |
| Offline performance | PASS | 33 verified renders across 11 representative cases; [trials](evidence/workflow-hardening/benchmark.json) |
| CI preparation | PASS | Pinned four-job build matrix and local cross-OS control; no private audio uploaded |
| Hosted CI execution | NOT RUN | Workflow remains local; no hosted run/push |
| Resampling | PASS | Identity, duration, round trip, above-Nyquist rejection |
| Analysis controls | PASS | Energy, phrases, onsets, coarse tone pitch; not a speech-recognition claim |
| Clean hook preservation | PASS | Source waveform retained within gain/edge-fade/PCM tolerances |
| Source-driven arrangement | PASS | Changed input rhythm changes chops and melodic response |
| Three independent strategies | PASS | Different tempi, bass/drum/piano grammars and vocal treatment at the same seed |
| Crop/event validation | PASS | No out-of-source reads; clean hook, overlap, release, duration and numeric constraints |
| Master and stem output | PASS | Current v8: three 36-second owner mixes, four owner stems, fixture master/stems, score/frame trace/report |
| Audio bounds/headroom | PASS | Current club: 12 decoded master/stem WAVs; zero full-scale samples, finite engine output, silent final 100 ms |
| Determinism | PASS | 48 kHz speech remixes byte-identical at 512/113 blocks; 16 kHz integration repeats too |
| Formal export schemas | PASS | Preinstalled jsonschema 4.19.2 validates M0a/all remix exports; rejects recorded-kind without consent |
| Dependencies/assets | PASS | No third-party DSP runtime; 53 pinned CC0 acoustic recordings plus 14 original electronic one-shots; notices/hashes retained |
| Master specification | PASS | Original SHA-256 unchanged |
| Consented human recording technical render | PASS | One owner-supplied 4.862 s source; three masters and 12 stems decoded; [trial](voice-trial.md) |
| Human speech recognition by listeners | NOT RUN | No actual listener observations |
| Owner listening | PARTIAL | Earlier prototype accepted as a start; club v7/v8 listening NOT RUN; production quality remains open. Earlier concerns: awkward experimental passages, game-like timbres and repetitive openings |
| Revised vocal spacing on M5 | PASS | Release + sanitizer CTest 6/6; duplicate chop starts and clean-hook overlaps removed; `evidence/vocal-spacing/` |
| Revised arrangement Linux/Mac comparison | PASS | Prior v8 fixture/owner: 27 exact WAVs; current stack-fix rerun: 15 exact fixture WAVs, exact plans/events; actual phone/Mac: three exact masters |
| M0d Apple M5 execution | PASS | Native arm64 release and ASan/UBSan 6/6 each; exact plans/event frames and byte-identical Linux/Mac masters; [evidence](evidence/m0d/report.json) |
| M1 blinded quality gate | NOT RUN | Frozen one-owner pilot prepared; requires diverse cleared sources and actual blinded reviewers |
| M2 GPU/model benchmark | NOT RUN | Quality baseline and actual model measurements remain missing |
| M3 iPhone/device | PARTIAL | Native app, simulator flows and six actual iPhone integration tests; current limitations in [iOS evidence](ios-instant-remix.md) |
| M4 live work | PARTIAL | [Research protocol](live-research-protocol.md) defined; implementation/real-time measurements NOT RUN |
| M5 production preparation | PARTIAL | [Privacy/release preparation](release-readiness.md); publication/monetization NOT RUN |

The first sanitizer pass exposed a test-harness allocation/deallocation mismatch:
the allocation counter replaced throwing `new` but omitted the nothrow form used
by `stable_sort`. Matching overloads fixed it; checks were not disabled. The
initial failing log is retained as `evidence/m0/sanitizer-initial-failure.log`.
Final [release](evidence/m0/release-tests.log) and
[sanitizer](evidence/m0/sanitizer-tests.log) logs supersede that run.

## Recordings and measurements

Original input: `renders/fixtures/synthetic-speech.wav`, generated from the original
project phrase, 3.21129 s at mono 22.05 kHz. It is explicitly **not a person’s
recording**. Input SHA-256:
`c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e`.

| Master | BPM | Duration | Decoded sample peak | RMS L / R, dBFS |
| --- | --- | --- | --- | --- |
| `renders/m0/remix.hiphop.wav` | 96 | 32.000 s | -7.02432 dBFS | -25.98990 / -26.80066 |
| `renders/m0/remix.reggae.wav` | 80 | 32.000 s | -6.74673 dBFS | -26.00094 / -27.09516 |
| `renders/m0/remix.experimental.wav` | 124 | 32.96775 s | -7.05592 dBFS | -25.08490 / -25.64241 |

All are stereo PCM16 at 48 kHz, including two-second release space. None reaches
the master limiter’s knee. RMS includes the tail and is not integrated LUFS or
true peak. Full source is heard from the beginning, then cropped/arranged calls
and instrumental responses enter. Per strategy, `.piano.wav`, `.bass.wav`,
`.drums.wav`, and `.vocals.wav` share the exact timeline. Each also has
`.score.json`, `.events.tsv`, and `.report.json`.

`renders/m0/remix.baseline.wav` is the repeated original-loop comparison control.
`renders/listening-pilot/listener/` contains four anonymized, RMS-matched WAVs,
the source, blank ratings, and pairwise comparisons. Organizer keys stay outside
the listener folder. No listener IDs or ratings have been invented.

[Decoded measurements](evidence/m0/decoded-audio.json),
[all artifact hashes](evidence/m0/artifacts.json),
[48 kHz comparison self-test](evidence/m0/linux-comparison-selftest.json),
[integration evidence](evidence/m0/integration-validation.json),
[schema check](evidence/m0/schema-validation.json), and
[machine-readable gates](evidence/m0/report.json) retain the observations. The
Linux comparison explicitly leaves the Apple M5 gate NOT RUN.

## Reproduction and next machine

With CMake on PATH (here: `export PATH="/tmp/djayvo-build-tools/bin:$PATH"`):

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 4
ctest --test-dir build --output-on-failure
./build/djayvo_remix --input renders/fixtures/synthetic-speech.wav --synthetic-fixture --output renders/m0/remix --style all --stems
```

The prepared synthetic input travels in `dist/djayvo-mac-handoff.tar.gz` with Git
history and the Linux reference masters. See
[mac-agent-handoff.md](mac-agent-handoff.md) for verified transfer and
`sh scripts/mac_smoke.sh`. A self-contained signal fixture can also be recreated
with `python3 scripts/make_fixture.py`; the speech generator is optional. For
real recordings, pass `--consent` only with permission to process that input.

## Owner reference analysis

The owner supplied `down.mp3`, `question.mp3` and `blood_club.mp3` in Downloads.
Full-file signal analysis and 15 current level-matched audition files are **PASS**; interpretation is
**PARTIAL**, and direct listening is **NOT RUN** because this session cannot hear
audio. Strong section-to-section bass/level/width changes suggest arrangement
contrast deserves attention alongside timbre. The resulting engine changes are
documented in [arrangement-review.md](arrangement-review.md); no training was
performed. See [reference-analysis.md](reference-analysis.md) for measurements,
selected timestamps, reproduction, and the local audition package.

## Remaining limitations

The acoustic bank is mono and sample-based, with discrete piano layers and
seeded piano/drum takes; bass remains single-layer. The owner accepts v4 piano
and drums, but there are no formal ratings of realism or layer transitions.
No formal perceptual evaluation exists. Analysis is energy/onset/autocorrelation DSP with sustained quiet-boundary selection but
no word boundaries or reliable semantic labels. Pitch may have octave errors.
Varispeed couples pitch/time and can alias (current generated chops use rate 1).
Finite instrumental early reflections exist; independent pitch/time stretching,
feedback reverb/delay, tempo maps, external JSON import, and automatic fallback from an AI
plan are absent. Silence is explicitly rejected. Mixing is fixed per grammar,
with smooth clean-hook ducking; the soft-knee stage can color overloads.

WAV is PCM16 without dither, capped by RIFF size. Stems preserve master event IDs and instrument takes. Independent quantization
and nonlinear processing still prevent a promise of exact master reconstruction. The renderer is allocation-free in tests but not a live
device certification. Exports are synchronous and cancellable, with staged
publication and a completion marker; power-loss durability is not certified.
Run the C ABI off the UI/audio thread. Public C++ buffers are caller-owned and
must remain immutable during rendering. Current native app/library and simulator
privacy checks are recorded separately in the iOS report; live, battery and
physical route/session coverage remain unverified.

Next: audition the validated Mac renders, collect consented source clips,
and use the preregistered [evaluation protocol](evaluation-protocol.md) to find
musical defects. Improve from those observations before model experiments. The
handoff carries all work needed to continue without per-step permission pauses.
