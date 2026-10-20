# Jamloom Q0 — final review report

2026-10-20. **Q0 musical-recovery success: FAIL. Technical delivery: PASS.
Full requirement coverage: PARTIAL. Production promotion: NOT RUN.**

The owner heard both latest owner-speech candidates at 4211 and answered
**“Both still bad.”** This completes the requested owner listening checkpoint
with a negative result. It does not successfully complete the musical-recovery
objective. The prior full five-condition comparison was also rejected, with
creativity identified as poor despite acceptable instruments in some candidates.

[Exact latest question, answer, packet and audio hashes](evidence/q0-final/owner-feedback.json).
One owner provided qualitative feedback; no numeric ratings, independent
reviewers, effect sizes or judgments about unheard source sections are inferred.
The later corrected reggae note does not change either owner-speech candidate.
No missing owner verdict is used to explain the failed recovery anymore.

This report concludes the current Q0 experiment series for review. It does not
waive unfinished quality requirements, authorize training or advance to another
milestone. Original recordings, frozen plans, failed candidates and benchmark
thresholds remain intact. The additional five-condition packet proposed before
this reply was not created: repackaging these rejected recordings would not
supply a new musical result.

## Requirement-by-requirement delivery

| Requested step | Gate | Delivered evidence and limits |
|---|---|---|
| 1. Audit before engine modification | PARTIAL | Instruments, voice, scheduler, composition and mix inspected and measured; concrete mechanisms found. Perceptual causal contributions remain unranked. Production engine unchanged; rendering interventions use isolated copies. |
| 2. Five representative real baselines | PASS | Owner conversation, three licensed speech excerpts and expressive laughter; original WAVs, plans, event TSVs, individual stems, masters, velocity/timing/loudness/clipping measurements preserved. This small cohort does not establish population coverage. |
| 3. Instrument realism, SFZ and licenses | PARTIAL | Fourteen native probes; eight native/SFZ pairs and exact replays; layers, envelopes, one-shot drums, round robins and guitar muting tested where available. Owner rejected the instrument packet; convincing realism, broader recorded articulations and production sfizz integration remain unestablished. |
| 4. Modular performance expression | PASS | Deterministic genre groove, shared microtiming, velocity accents/ghosts, swing/offbeats, supported articulations, phrase dynamics, bass/kick accents and transition pickups. Functional execution, not musical acceptance. |
| 4. Groove MIDI reference | PASS | Authorized descriptive MIDI analysis and license/hash review, official splits preserved; no training or fitted jitter model. |
| 5. Improved composition | FAIL | Executable intact calls, source motifs, vocal hooks, related harmonic returns, development, contrast and endings; latest owner comparison rejected. Composition code exists; improvement did not pass. |
| 6. Controlled A/B/C/D/E audio | PASS | Five sources × five matched conditions; native plans, stems and replay evidence. B is a drum-decay hypothesis, not a proven superior instrument library. E changes composition. |
| 6. Blind owner comparisons | PASS | Anonymous candidate labels, matched levels and real qualitative verdicts recorded. This is the procedure's execution, not successful recovery. |
| 6. Substantial improvement | FAIL | Prior full packet and latest owner pair rejected. No acceptable creative performance established. |
| 6. Independent scored study | NOT RUN | No independent listeners or submitted numeric rating forms; no statistics fabricated from qualitative feedback. |
| 7. Reproducible reporting | PASS | Source/build/audio hashes, exact commands, test/failure logs, waveform differences, rights inventory, feedback and this report. |
| Q0 success criterion | FAIL | Substantially less robotic, more coherent music has not been demonstrated. |

## Diagnosis: established findings versus hypotheses

The main product failure is now clear from the owner's judgments: the tested
arrangements are not sufficiently creative or musically satisfying. The data
does not isolate one DSP change that would solve that failure.

| Area | Established finding | Remaining limitation |
|---|---|---|
| Instruments | Piano, bass, drums and guitar already use recorded samples; organ/pad/lead are synthesized. Bass/drum recorded articulation layers are sparse. | Another sampler or louder mix alone has not demonstrated recovery. |
| Velocity | Owner baseline piano/bass/drums have 33/17/43 distinct event velocities. | Uniform velocity is not the general cause; changing gain does not create missing timbre/articulation. |
| Timing | Event frames agree exactly with the musical score; grid-heavy patterns exist. | Accurate scheduling does not prove good groove, acoustic attack alignment or performance feel. |
| Articulation | Short note gates truncate drum tails; guitar layer boundaries have measurable level discontinuities. | Isolated corrections failed to establish substantial owner-perceived improvement. |
| Composition/repetition | Baseline inputs share entire instrumental components. Later plans derive rhythm and uncertain pitch from speech but still use a small authored grammar. | No musician-approved creative decision process or accepted original control performance exists. |
| Voice | Some baseline chops are 134–516 ms. Pitch/stretch/reverse were disabled in those rejected renders. Later candidates preserve intact calls and use padded word estimates. | Boundary/semantic hook selection and recognizability still need listening; DSP/transcript estimates are not musical understanding. |
| Phrasing | Phrase shaping, returns, rhythmic development and stops execute. One developed note was lost during the final rest pass and is now restored. | Complete phrases on paper do not establish a compelling performance. |
| Mixing | Baselines have no full-scale PCM or limiter interventions; owner clean-call accompaniment ducking is about −16.5 dB. | Large vocal/instrument contrast remains a listening hypothesis; no evidence supports clipping as the main cause. |
| Experimental isolation | Global note IDs seed sample takes and small gain variation; adding an organ note changes bass/drum PCM despite unchanged bass/drum scores. | Composition comparisons cannot claim identical accompaniment waveforms solely from identical track notes. |

Sources: [baseline audit](q0-quality-recovery.md#what-the-evidence-says),
[reference reassessment](q0-reference-reassessment.md),
[composition study](q0-source-development.md),
[final performed-note correction](q0-motif-completion.md).
Reference MP3s were decoded/analyzed, not directly heard by the agent. No
spectral measurement is presented as aesthetic listening or performer annotation.

## Implemented components

| Component | Source files |
|---|---|
| Baseline, rights, loudness and timing | `scripts/q0_audit.py`, `scripts/q0_measure_comparisons.py` |
| Instrument probes and isolated rendering | `experiments/q0/instrument_probe.cpp`, `experiments/q0/sfizz_probe.cpp`, `scripts/q0_sfz_samples.py`, `scripts/q0_decay_build.py`, `scripts/q0_guitar_layer_trial.py` |
| Expression | `experiments/q0/expression-profiles.json`, `scripts/q0_expression.py`, `scripts/q0_performance.py` |
| Composition | `scripts/q0_composition.py`, `scripts/q0_authored_score.py`, `scripts/q0_phrase_form.py`, `scripts/q0_development.py` |
| Controlled trials and review | `scripts/q0_expression_trial.py`, `scripts/q0_development_trial.py`, `scripts/q0_independent_packet.py`, `scripts/q0-review.js`, `scripts/q0_listening_results.py` |
| Portability and regression | `scripts/q0_wasm_trial.py`, `scripts/q0_linux_trial.py`, `tests/integration/verify_q0.py`, `tests/q0_review_browser.mjs` |

The shared C++ runtime retains C++17 and its existing dependency boundary.
No musical-quality patch was promoted into the production engine. No dashboard
redesign, large-model training, new paid compute or service purchase occurred.

## Playable artifacts

All paths are relative to the repository. Source audio stays local and ignored
by Git. Historical comparisons have not been overwritten.

| Purpose | Location |
|---|---|
| Five original sources and baseline A masters/stems/events | `renders/q0-baseline-v2-20261020/<source>/` |
| Full B/C/D/E plans, masters/stems/events/replays | `renders/q0-performance-20261020/<source>/` |
| Five-condition matched listening packet | `renders/q0-performance-form-v2-20261020/listener/` |
| Latest owner-rejected composition pair and four other source pairs | `renders/q0-development-v2-20261020/listener/` — [private 4211 page](http://127.0.0.1:4211/) |
| Latest composition masters/stems/plans | `renders/q0-development-v2-20261020/<source>/candidate.<style>.*` |
| Corrected reggae master/stems/events | `renders/q0-motif-completion-v2-20261020/ls-2277-149896-0026/candidate.reggae.*` |
| Native individual instruments | `renders/q0-instrument-probes-20261020/` |
| Licensed-only independent-review preparation | `renders/q0-independent-form-v2-20261020/listener/` — not evidence that independent listening happened |

The corrected reggae export is a technical correction and has no listening
acceptance. Its final 168 on/off rows replace the earlier 166; the other four
latest plans are unchanged. Do not substitute it into a frozen packet or
reinterpret the owner's earlier verdict as a verdict on this unreviewed WAV.

## Test results and measured differences

| Validation | Gate | Result |
|---|---|---|
| Current Q0 regression suite | PASS | 18 tests, including failing-before/passing-after missing-note regression and final-event checks |
| Latest actual Linux execution | PASS | Fresh local Debian ARM64 build; core/remix/live groups 3/3; corrected plan matches Mac exactly |
| Full five-condition schedule | PASS | 8,264 instrument on/off rows, zero frame error; twenty new-condition block-size replays |
| Latest final candidates | PASS | 1,604 event rows including corrected reggae; zero frame error; preserved exports rechecked |
| Native/WASM/Linux parity | PASS | Five original development candidates byte-identical across those targets; corrected reggae independently executed and byte-identical too |
| Full trial headroom | PASS | 112 new masters/stems decoded; no full-scale PCM, nonfinite samples or native limiting |
| Full trial loudness matching | PASS | 25 listening mixes −23.05 to −22.99 LUFS, maximum true peak −4.91 dBTP; unchanged 0.15 LU tolerance |
| Composition-pair loudness matching | PASS | Ten mixes −23.05 to −23.00 LUFS, highest true peak −5.03 dBTP |
| Browser forms/decode/privacy | PASS | Existing Chromium/WebKit runs validate responsive controls, local downloads, blank unheard scores and organizer-key exclusion |
| Physical browser audio/latency | PARTIAL | Headless WebKit clock limitation; no acoustic latency or venue proof |
| Physical Intel Linux/iPhone/AudioWorklet | NOT RUN | ARM64 VM and Node/WASM do not establish these targets |
| Final delivery integrity | PASS | Fresh verification: 732 retained file hashes, five authorized sources, 25 five-condition exports and five latest exports |

[18-test log](evidence/q0-motif-completion/tests.log),
[Linux execution](evidence/q0-motif-completion/linux-execution.log),
[full-trial measurements](evidence/q0-performance/measurements.json),
[final verification output](evidence/q0-final/verification.log),
[final verification report](evidence/q0-final/verification.json).
Final verification rechecked existing evidence; it did not repeat compilation,
browser tests or human listening.

Waveform differences are descriptive, not quality scores. In the owner's full
trial, A→B maximum/RMS changes are 1167/45.417 PCM16 units; C→D are
1089/44.406. The newer owner composition differs from prior E by
14789/1637.157. The corrected reggae differs from its previous composition by
6165/301.236. Exact portability/replay comparisons have maximum/RMS error zero.
The established portability tolerances remain 0.001/0.0001 normalized PCM.

Hardware/toolchains recorded in the execution evidence: Apple M5, 16 GiB,
macOS 26.7.1, Xcode 27.1, Apple Clang 21, CMake 4.4.2, Python 3.14.6,
FFmpeg 9.0.2, Node 22.23.1, Emscripten 6.0.1; local Debian 12 ARM64,
GCC 12.2.0/CMake 3.25.1. `~/mlx-env` remains unchanged.

## Licensing and provenance

Existing source/hash checks pass for private owner speech, three attributed
CC-BY-4.0 LibriSpeech excerpts and the CC0 laughter excerpt. Public dataset
licensing is distinguished from individual study consent. Owner speech is
local/private only; no training or redistribution permission is inferred.

Existing VSCO/VCSL and Karoryfer guitar manifests retain CC0 sample provenance.
The local sfizz 1.2.3 experiment and dependencies have an audited license-file
inventory, but distribution notices and target-specific integration review
remain open; sfizz was not added to the shared runtime. GMD's CC-BY-4.0
MIDI archive was verified and descriptively analyzed (1,138 eligible files,
official splits retained), never used to train or fit the expression profiles.
Unused later sample-library research remains unintegrated.

[Detailed license findings](q0-quality-recovery.md#licenses-and-provenance),
[sfizz dependency inventory](evidence/q0/sfizz-license-inventory.json),
[GMD analysis](evidence/q0/gmd-analysis.json).
No statement here clears third-party performer recordings for training,
sampling into released music or publication.

## Reproduction and next decision

```sh
.venv-q0/bin/python tests/integration/verify_q0.py
.venv-q0/bin/python docs/evidence/q0-final/verify.py \
  --output /tmp/jamloom-q0-final-verification-NEW.json
```

The verifier refuses existing output, preserves frozen evidence, checks current
rights/hashes and validates final exported event schedules. Rendering/build
commands remain in the linked experiment reports. Local private sources and
frozen binaries are required; a clean clone intentionally excludes them.

**Recommended next experiment, not started:** obtain a listening-approved
original short score/control from an authorized musician, then render that
same score through Jamloom. Use it to distinguish execution problems from
planner decisions before more automatic composition or any training. A further
independently scored comparison requires actual listeners, not synthesized
ratings. Paid help/assets still require approval.

**Stop decision:** Report Q0 as failed against its success criterion, retain
all negative results, and review the approach. Do not call the product
professional, musical recovery complete or training-ready. Core development
commits include `27256bc`, `03d99a0`, `208594a`, `408b0a3` and `8708534`;
this final report/feedback commit follows `8708534` on `main` and is not pushed.
