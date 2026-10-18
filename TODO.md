# Djayvo development tracker

Last updated: 2026-10-17 (America/New_York). Latest implementation: [vocal boundaries v3](docs/vocal-boundaries.md).

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
| M1 — musical quality baseline | NOT RUN | Protocol, fixed-loop control and pilot prepared; formal human evaluation missing |
| M2 — AI director benchmarks | NOT RUN | Depends on quality baseline and measured model feasibility |
| M3 — iPhone Instant Remix | NOT RUN | Portable C ABI exists; app and actual device validation remain |
| M4 — live improvisation | NOT RUN | Requires separate real-device latency, audio and capture evidence |
| M5 — production and monetization | NOT RUN | Requires product, rights, privacy, release and demand evidence |

`PASS` means the named deliverable has evidence. `PARTIAL` means some required
work or evidence is missing. `FAIL` means a performed check did not meet its
criteria. `NOT RUN` means it has not been executed or assessed. A checked box
closes that task only; it does not automatically pass its parent milestone.

## Next: review the current music

Local [listening page](renders/voice-boundaries-v3/review/index.html): v2/v3 pairs
and six alternate-seed mixes at matched levels. Earlier reference auditions
remain linked. V3 listening: **NOT RUN**.
Audio links work in this checkout; private recordings are intentionally absent
from Git and will not appear in a remote repository viewer.

Latest owner feedback (2026-10-17): “for now they are okay but we have to improve
in a production quality but as a start they are fine.” **Owner review: PARTIAL.**
This accepts the prototype as a starting point. It does not establish per-style,
per-seed or production-quality acceptance. The next quality priorities remain
instrument realism/articulation, coherent arrangements, clean vocal treatment
and evaluation across diverse consented inputs.

- [ ] **N01 — PARTIAL:** General prototype feedback received. Complete the review
  of all three new styles. Record timestamps and
  separate judgments for instrument sound, groove, coherence, ending and enjoyment.
  Owner supplies observations; development work records and acts on them.
- [ ] **N02 — PARTIAL:** Resolve the reported artificial/game-like instrument
  sound. Acoustic samples, articulation and room treatment are implemented;
  instrument realism still needs specific listening assessment despite general
  prototype acceptance.
- [ ] **N03 — PARTIAL:** Resolve experimental's awkward passages. Fewer melody
  notes, longer bass notes and better-spaced chops are implemented; listen for
  remaining problems before closing this issue.
- [ ] **N04 — PARTIAL:** Confirm the varied openings and new break/return structure
  feel intentional across seeds 4123–4125. Code coverage is not listening evidence.
- [ ] **N05 — NOT RUN:** Rate whether the original speech remains recognizable
  in each style. Waveform preservation passes, but intelligibility is unmeasured.
- [ ] **N06 — PARTIAL:** Production-quality continuation now includes pause-aware
  vocal endings, nine fresh mixes and matched v2/v3 comparisons. Prior audio is
  retained; actual listening to the new crop behavior remains NOT RUN.

Record against [vocal boundaries v3](docs/vocal-boundaries.md), with the exact
filename/seed, timestamp, observation, desired change and eventual evidence.
Do not close N02–N05 merely because another implementation is committed.

## Completed development

Entries follow implementation order. Historical results apply to their revision;
current platform results are in [the v3 report](docs/evidence/vocal-boundaries/report.json).

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

## Engineering backlog

These are known gaps or candidate improvements, not promises that every feature
is needed. Prioritize by recorded listening defects and product requirements.

- [ ] **E01 — NOT RUN:** Evaluate richer instrument articulation if N02 still
  fails: multiple velocity layers, repeated-hit variation, longer natural tails,
  and suitable electronic timbres. Verify asset rights before adding any bank.
- [ ] **E02 — PARTIAL:** Improve phrase/chop selection if N03/N05 show cut words.
  V3 adds sustained low-energy endings and attack pre-roll with a bounded fallback;
  reliable word boundaries, semantic selection and listening acceptance remain open.
- [ ] **E03 — NOT RUN:** Evaluate independent pitch/time transformation with
  transient and intelligibility checks. Current generated chops use original speed.
- [ ] **E04 — PARTIAL:** Expand expressive mixing/effects when justified by
  listening. Early reflections and hook ducking exist; feedback delay/reverb and
  richer automation do not.
- [ ] **E05 — NOT RUN:** Make multi-file exports transactional/cancellable so an
  interrupted export cannot leave an apparently complete result set.
- [ ] **E06 — PARTIAL:** Improve the import experience for actual recordings.
  PCM WAV is supported; the owner's M4A required external local conversion, and
  WAVE_FORMAT_EXTENSIBLE required repacking.
- [ ] **E07 — NOT RUN:** Validate this revision on the original physical Intel
  Linux machine when available. Current cross-OS PASS covers Linux arm64 on M5.
- [ ] **E08 — NOT RUN:** Add Linux/macOS CI when runner access is available,
  retaining fixture integrity, asset checks, C ABI and deterministic comparisons.
- [ ] **E09 — PARTIAL:** Measure render time and memory across realistic source
  and event loads. Allocation-free processing passes; real-time/device performance
  certification remains absent.

## M1: formal musical-quality evaluation

Prerequisites: a reviewable revision, an eligible consented dataset and real
listeners. Preparation does not pass this milestone. Follow the
[evaluation protocol](docs/evaluation-protocol.md); retain per-style failures.

- [ ] **Q01 — NOT RUN:** Freeze engine commit, rubric, technical acceptance
  rules, hashes, seed schedule and reviewer assignment before collecting scores.
- [ ] **Q02 — NOT RUN:** Collect 20–50 diverse cleared clips, including multiple
  speakers/sessions, speech, laughter, claps, noise and silence controls. Keep
  permission records and raw audio local; separate speech and non-speech results.
- [ ] **Q03 — NOT RUN:** Render each eligible clip in three styles and three
  seeds; measure technically usable outputs and record every rejected input.
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
