# Djayvo development tracker

Last updated: 2026-10-17 (America/New_York). Latest implementation: [reproducible evaluation preparation](docs/evaluation-batch.md).

Use this file for past work, open issues and future development. Detailed test
results belong in [progress](docs/progress.md) and linked evidence reports.
The [master specification](ai_improvisational_musician_master_spec_v1.md) remains
the source of truth and is not modified by this tracker.

## At a glance

| Milestone | Status | What is complete / what remains |
| --- | --- | --- |
| M0a — offline foundation | PASS | Portable engine, instruments, timing, WAV and automated tests |
| M0b — own sound into music | PARTIAL | Consented voice renders; formal recognizability observations missing |
| M0c — three musical strategies | PARTIAL | Owner accepts the current prototype as a start; production quality and formal listening remain open |
| M0d — Apple M5 portability | PASS | Native Mac and actual Linux arm64 tests; exact current plans/events and 18 matching WAVs |
| M1 — musical quality baseline | NOT RUN | Frozen one-source/three-seed pilot and distinct blind packets prepared; diverse sources and formal human evaluation missing |
| M2 — AI director benchmarks | NOT RUN | Depends on quality baseline and measured model feasibility |
| M3 — iPhone Instant Remix | NOT RUN | Portable C ABI exists; app and actual device validation remain |
| M4 — live improvisation | NOT RUN | Requires separate real-device latency, audio and capture evidence |
| M5 — production and monetization | NOT RUN | Requires product, rights, privacy, release and demand evidence |

`PASS` means the named deliverable has evidence. `PARTIAL` means some required
work or evidence is missing. `FAIL` means a performed check did not meet its
criteria. `NOT RUN` means it has not been executed or assessed. A checked box
closes that task only; it does not automatically pass its parent milestone.

## Next: review the current music

Local [listening page](renders/voice-articulation-v4/review/index.html): v3/v4 pairs
and six alternate-seed mixes plus isolated piano/drum comparisons at matched
levels. Earlier reference auditions
remain linked. V4 piano/drum feedback: **PASS** (informal owner acceptance).
The [one-command recording session](renders/recording-workflow-v5/index.html)
provides three mixes and downloads; its new conversion has not received a
separate listening assessment.
Audio links work in this checkout; private recordings are intentionally absent
from Git and will not appear in a remote repository viewer.

Latest owner feedback (2026-10-17): “they are fine,” in response to the v4
piano/drum comparison question. Prior overall feedback: “for now they are okay
but we have to improve in a production quality but as a start they are fine.”
**Overall owner review: PARTIAL.**
This accepts the prototype as a starting point. It does not establish per-style,
per-seed or production-quality acceptance. The next quality priorities remain
instrument realism/articulation, coherent arrangements, clean vocal treatment
and evaluation across diverse consented inputs.

- [ ] **N01 — PARTIAL:** General prototype feedback received. Complete the review
  of all three new styles. Record timestamps and
  separate judgments for instrument sound, groove, coherence, ending and enjoyment.
  Owner supplies observations; development work records and acts on them.
- [x] **N02 — PASS:** The reported piano/drum concern has informal owner
  acceptance on v4: “they are fine.” Acoustic samples, three piano dynamics,
  alternate takes and room treatment are implemented. Production realism and
  diverse-input assessment remain open under E01/M1; no rating was invented.
- [ ] **N03 — PARTIAL:** Resolve experimental's awkward passages. Fewer melody
  notes, longer bass notes and better-spaced chops are implemented; listen for
  remaining problems before closing this issue.
- [ ] **N04 — PARTIAL:** Confirm the varied openings and new break/return structure
  feel intentional across seeds 4123–4125. Code coverage is not listening evidence.
- [ ] **N05 — NOT RUN:** Rate whether the original speech remains recognizable
  in each style. Waveform preservation passes, but intelligibility is unmeasured.
- [ ] **N06 — PARTIAL:** Production-quality continuation now includes pause-aware
  vocal endings and recorded instrument layers/takes, nine fresh mixes and
  matched v3/v4 comparisons. Prior audio is retained; the owner accepts v4
  piano/drums. Formal quality, recognizability and diverse-input listening remain.

Record against [instrument articulation v4](docs/instrument-articulation.md), with the exact
filename/seed, timestamp, observation, desired change and eventual evidence.
Do not close N02–N05 merely because another implementation is committed.

## Completed development

Entries follow implementation order. Historical results apply to their revision;
current platform results are in [the workflow report](docs/evidence/workflow-hardening/report.json).
The [evaluation preparation report](docs/evidence/evaluation-preparation/report.json)
adds an eighth passing suite and confirms the unchanged renderer/audio.

| Done | ID | Status | Development | Commit / evidence |
| --- | --- | --- | --- | --- |
| [x] | P01 | PASS | C++17 foundation, sample-frame scheduling, polyphony, WAV output, validation and deterministic tests | `02d0e18` · [M0a](docs/m0a-report.md) |
| [x] | P02 | PASS | Input decoding/resampling, onset analysis, three rule-based styles, clean hooks, stems, score exports and C ABI | `5837dfa` · [architecture](docs/remix-architecture.md) |
| [x] | P03 | PASS | Transfer archive, supplied speech fixture and reviewed-branch handoff packaging | `5837dfa`, `1cb2e92` · [handoff](docs/mac-agent-handoff.md) |
| [x] | P04 | PASS | Actual M5 release/sanitizer execution, original cross-OS comparison and isolated build interpreter | `64e4185` · [portability](docs/mac-portability.md) |
| [x] | P05 | PASS | Import and technically validate the owner's consented voice; preserve original M4A and PCM conversion | `bac1bf4` · [voice trial](docs/voice-trial.md) |
| [x] | P06 | PASS | Prevent duplicate chop starts and chops masking complete speech hooks | `b29fb74` · [spacing evidence](docs/evidence/vocal-spacing/report.json) |
| [x] | P07 | PASS | Fourteen pinned CC0 instrument samples, provenance/license ledger and integrity verification | `176b9b9` · [acoustic revision](docs/acoustic-review.md) |
| [x] | P08 | PASS | Seeded clean-speech, instrumental and fragment openings; reduced high-note density | `176b9b9` · [acoustic revision](docs/acoustic-review.md) |
| [x] | P09 | PASS | Full local signal analysis of Down, Question and Blood Club; selected matched-level excerpts | `48342ca`, `2260689` · [reference analysis](docs/reference-analysis.md) |
| [x] | P10 | PASS | Actual rhythm-section breaks, varied returns, nearby chord inversions and shorter melodic responses | `2260689` · [v2 changes](docs/arrangement-review.md) |
| [x] | P11 | PASS | Velocity-dependent tone, instrumental early reflections and 80 ms vocal breathing room | `2260689` · [v2 changes](docs/arrangement-review.md) |
| [x] | P12 | PASS | Fresh M5 release/sanitizer and Linux arm64 release: seven suites each; exact plans/events and 15 identical WAVs | `2260689` · [comparison](docs/evidence/arrangement-review/portability-report.json) |
| [x] | P13 | PASS | Nine new owner-voice mixes, twelve stems, a baseline, 15-file review page and browser playback checks | `2260689` · [audio/browser evidence](docs/arrangement-review.md) |
| [x] | P14 | PASS | Shuffled baseline comparison tools, blank ratings and preregistered evaluation protocol | [Protocol](docs/evaluation-protocol.md) · [pilot preparation](docs/evidence/arrangement-review/listening-preparation.log) |
| [x] | P15 | PASS | Smoke-test overwrite protection and comparison of mix settings | `2260689` · [verification](docs/evidence/arrangement-review/report.json) |
| [x] | P16 | PASS | Pause-aware vocal crop endings and attack pre-roll, four-rate regression, fresh M5/Linux validation and nine voice mixes | [v3 evidence](docs/vocal-boundaries.md) |
| [x] | P17 | PASS | Three recorded piano dynamics, two piano/drum takes, 53 pinned samples, release-test identity fix, fresh M5/Linux checks and matched comparison | [v4 evidence](docs/instrument-articulation.md) |
| [x] | P18 | PASS | Exclusive staged exports, completion hashes, C ABI/CLI cancellation, collision/interrupt tests and extensible WAV decoding | [Workflow evidence](docs/workflow-hardening.md) |
| [x] | P19 | PASS | Actual consented M4A conversion, three-style/stem workflow, browser playback and separate-prefix blind pilot | [Workflow evidence](docs/evidence/workflow-hardening/report.json) |
| [x] | P20 | PASS | 33 offline timing/RSS trials; current M5/Linux release and M5 sanitizers; 18 identical cross-OS WAVs | [Benchmark](docs/evidence/workflow-hardening/benchmark.json) |
| [x] | P21 | PASS | Pinned Linux/macOS CI matrix and cross-OS comparison recipe prepared and locally checked; hosted execution remains open | [Workflow](.github/workflows/core.yml) |
| [x] | P22 | PASS | Frozen consent/hash/rubric batch, three seeds, retained failure counts, distinct answer codes, actual owner pilot and eighth M5/Linux test suite | [Evaluation preparation](docs/evaluation-batch.md) |

## Engineering backlog

These are known gaps or candidate improvements, not promises that every feature
is needed. Prioritize by recorded listening defects and product requirements.

- [ ] **E01 — PARTIAL:** V4 implements three recorded piano dynamics and two
  seeded piano/drum takes from the pinned cleared libraries. Evaluate realism,
  layer transitions and repeated hits; bass layers, longer tails and suitable
  electronic timbres remain candidates requiring evidence.
- [ ] **E02 — PARTIAL:** Improve phrase/chop selection if N03/N05 show cut words.
  V3 adds sustained low-energy endings and attack pre-roll with a bounded fallback;
  reliable word boundaries, semantic selection and listening acceptance remain open.
- [ ] **E03 — NOT RUN:** Evaluate independent pitch/time transformation with
  transient and intelligibility checks. Current generated chops use original speed.
- [ ] **E04 — PARTIAL:** Expand expressive mixing/effects when justified by
  listening. Early reflections and hook ducking exist; feedback delay/reverb and
  richer automation do not.
- [x] **E05 — PASS:** CLI/C ABI exports stage files, preserve existing paths,
  publish a verified completion marker last and support cancellation. Actual
  SIGINT/SIGKILL and collision tests pass. Abrupt kills may leave incomplete
  files/`.partial`; consumers must verify completion. Power-loss durability and
  automatic recovery are not claimed. [Contract](docs/workflow-hardening.md).
- [x] **E06 — PASS:** Native extensible WAV works without repacking; a local
  consented M4A/WAV script converts, renders and builds a listening page. Actual
  owner M4A and integration tests pass. Optional installed FFmpeg is required;
  this is a desktop developer workflow, not the future iPhone UI.
- [ ] **E07 — NOT RUN:** Validate this revision on the original physical Intel
  Linux machine when available. Current cross-OS PASS covers Linux arm64 on M5.
- [ ] **E08 — PARTIAL:** Linux/macOS release/sanitizer matrix, asset/C ABI tests
  and procedural-control comparison are committed and locally verified. Hosted
  execution is **NOT RUN**; no push or runner result is claimed.
- [x] **E09 — PASS:** Measure representative offline time/memory: 11 source/style/
  rate/stem cases × 3 trials, each export verified. [Results](docs/evidence/workflow-hardening/benchmark.json).
  Worst-case/live/iPhone performance remains separately open under I04/L01/L03.

## M1: formal musical-quality evaluation

Prerequisites: a reviewable revision, an eligible consented dataset and real
listeners. Preparation does not pass this milestone. Follow the
[evaluation protocol](docs/evaluation-protocol.md); retain per-style failures.

- [ ] **Q01 — PARTIAL:** Engine/source/binary/preparation/rubric hashes, technical
  rules and seed schedule frozen for the one-source pilot. Final cohort and
  actual reviewer assignment are still missing. [Preparation](docs/evaluation-batch.md).
- [ ] **Q02 — PARTIAL:** One owner-consented source is inventoried with owner-only
  review scope. Owner confirmed no additional clips are available. Collect 20–50 diverse cleared clips, including multiple
  speakers/sessions, speech, laughter, claps, noise and silence controls. Keep
  permission records and raw audio local; separate speech and non-speech results.
- [ ] **Q03 — PARTIAL:** Actual pilot: one source × three styles × three seeds,
  plus three baselines; 3/3 technical exports per style. Batch tool retains
  failed attempts and expected silence controls. Full diverse dataset is absent.
- [ ] **Q04 — NOT RUN:** Run randomized, blinded comparisons with the fixed-loop
  baseline and at least three independent reviewers per eligible block.
- [ ] **Q05 — NOT RUN:** Assess the provisional targets: >=85% technically usable,
  >=90% speech recognition, >=70% enjoyment ratings >=4/5, >=30% share intention,
  audible strategy variety, zero critical glitches and preference over baseline.
- [ ] **Q06 — NOT RUN:** Aggregate per clip, report uncertainty and each style's
  failures, fix demonstrated problems and review whether M1 can pass.

## Later milestones

The master specification places M1–M5 behind evidence gates. Continuing without
per-step pauses does not supply missing listener/device evidence or authorize
paid infrastructure, training on reference tracks, publishing or charging users.

### M2: constrained AI direction — NOT RUN

- [ ] **A01 — NOT RUN:** After the quality baseline, review candidate model/code
  licenses and benchmark actual M5 latency, memory, GPU use and CPU fallback in a
  separate environment; keep `~/mlx-env` unchanged.
- [ ] **A02 — NOT RUN:** Add typed plan ingestion, strict validation, bounded
  retries and deterministic fallback; keep model calls outside audio processing.
- [ ] **A03 — NOT RUN:** Compare model-directed arrangements with the rule engine
  in a blinded trial. Advance only with measured benefit and bounded cost.
- [ ] **A04 — NOT RUN:** Consider learned action ranking only with cleared,
  opt-in data and speaker/phrase/session holdouts. Do not train on the references.

### M3: iPhone Instant Remix — NOT RUN

- [ ] **I01 — NOT RUN:** Build the SwiftUI flow: consent → record → waveform/trim
  → make three mixes → replay/remix again → save/share; no mandatory account.
- [ ] **I02 — NOT RUN:** Call the existing C ABI from a worker thread, with
  progress/error/cancellation handling and local deletion.
- [ ] **I03 — NOT RUN:** Test microphone permissions, recording indicators,
  interruptions, routes, headphones/speaker behavior and app lifecycle on a real iPhone.
- [ ] **I04 — NOT RUN:** Measure device CPU, memory, battery and generation time;
  verify WAV export and assess other codecs before adding them.

### M4: live improvisation — NOT RUN

- [ ] **L01 — NOT RUN:** Define real-device latency/glitch acceptance limits.
- [ ] **L02 — NOT RUN:** Implement explicit opt-in capture, phrase buffering and
  bar-boundary scheduling without allocations, blocking or model work in callbacks.
- [ ] **L03 — NOT RUN:** Test feedback, route changes, interruptions and sustained
  sessions; measure actual end-to-end latency and consent/recording behavior.

### M5: production and monetization — NOT RUN

- [ ] **R01 — NOT RUN:** Complete release asset-rights review, privacy policy,
  retention/deletion rules and appropriate public-sharing safeguards.
- [ ] **R02 — NOT RUN:** Run device/beta/App Store readiness checks, collect
  opt-in crash/performance evidence and measure replay, save/share and retention.
- [ ] **R03 — NOT RUN:** If paid/cloud generation is pursued, establish explicit
  budgets, timeouts, retries, cost accounting and entitlement limits first.
- [ ] **R04 — NOT RUN:** Review demand and quality evidence, obtain the required
  release authorization, and only then publish or enable monetization.

Still deferred by the master: Android, multiuser sessions, creator marketplace,
manual DAW, personalized generative singing and artist/voice imitation. These
are not silently included in the active backlog.

## Keeping this useful

Update the relevant task whenever code, listening feedback or gate evidence
changes. Keep its ID stable, attach the commit/report, and check it only when
its stated completion criterion is met. Reopen failed or regressed work with
`FAIL` or `PARTIAL` and the concrete observation. Preserve completed history.
New tasks use the matching prefix and next unused number. Update the milestone
table and [progress](docs/progress.md) together; do not invent scores or dates.
