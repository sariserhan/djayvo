# Djayvo development tracker

Last updated: 2026-10-18 (America/New_York). Latest implementation: [Sustained instruments and broader arrangement variety](docs/sustained-instruments.md).

Use this file for past work, open issues and future development. Detailed test
results belong in [progress](docs/progress.md) and linked evidence reports.
The [specification completion ledger](docs/spec-status.md) lists unfinished code
as well as missing quality/device/release evidence. Overall specification: **PARTIAL**.
The [master specification](ai_improvisational_musician_master_spec_v1.md) remains
the source of truth and is not modified by this tracker.

## At a glance

| Milestone | Status | What is complete / what remains |
| --- | --- | --- |
| M0a — offline foundation | PASS | Portable engine, instruments, timing, WAV and automated tests |
| M0b — own sound into music | PARTIAL | Consented voice renders; formal recognizability observations missing |
| M0c — three musical strategies | PARTIAL | Owner accepts the current prototype as a start; production quality and formal listening remain open |
| M0d — Apple M5 portability | PASS | Native Mac and actual Linux arm64 tests; exact plans/events and 45 matching hip-hop/fixture WAVs; voice and other styles preserved |
| M1 — musical quality baseline | NOT RUN | Frozen one-source/three-seed pilot and distinct blind packets prepared; diverse sources and formal human evaluation missing |
| M2 — AI director benchmarks | PARTIAL | Offline import/fallback prerequisite complete; model integration and benchmark remain NOT RUN behind M1; separate pretrained feasibility trial measured |
| M3 — iPhone Instant Remix | PARTIAL | Release app launches; owner recording/generation/playback, six phone tests, metrics and simulator flow pass; XCTest UI initialization, routes/lifecycle and production acceptance remain |
| W0 — browser Instant Remix | PARTIAL | Local WebAssembly app and Chromium/WebKit technical flows pass; physical browser microphone and owner web listening remain open |
| M4 — live improvisation | PARTIAL | Research protocol and provisional budgets prepared; live implementation and hardware measurements NOT RUN |
| M5 — production and monetization | PARTIAL | Local privacy controls, bundled rights notices and release preparation exist; beta, demand, public policy details and release approval remain |

`PASS` means the named deliverable has evidence. `PARTIAL` means some required
work or evidence is missing. `FAIL` means a performed check did not meet its
criteria. `NOT RUN` means it has not been executed or assessed. A checked box
closes that task only; it does not automatically pass its parent milestone.

## Current product work

- [x] **C01 — PASS:** Ran the owner-authorized $10 pretrained music experiment
  on one Vast RTX 3090: ten successful 30-second hip-hop/club takes, pinned
  timing/memory/waveform evidence, verified retrieval and deletion. Observed
  debit about $0.09; final invoice reconciliation remains **PARTIAL**.
  [Trial report](docs/cloud-music-trial.md). No cloud voice upload, training,
  production integration or M1/M2 gate closure is implied.
- [ ] **C02 — PARTIAL:** [Owner audition of the cloud trial](renders/cloud-trial-20261018/review/index.html): owner says clips are
  “getting better” and requests occasional, context-dependent human voice.
  Formal realism, groove, variety, transitions and endings ratings remain missing.
  Stable Audio comparison requires gated model access and terms acceptance.
- [x] **C03 — PASS:** Six local selective-voice arrangements over retrieved club/hip-hop
  beds, six repeating-voice controls, stems and 18 matched audition files. Source
  fidelity, event/WAV repeatability, export safeguards and two-browser playback
  checked. [Evidence](docs/voice-research.md). Rule-based research; no cloud speech
  processing, new rental, training or production AI integration.
- [ ] **C04 — NOT RUN:** [Audition the selective-voice comparisons](renders/voice-research-20261018/review/index.html)
  for natural entrances, intelligibility, groove and enough instrumental space.
  Record timestamps; technical checks do not establish musical quality.
- [ ] **C05 — NOT RUN:** Learned contextual arrangement and perceptual novelty:
  verified phrase/beat placement, varied musical development and appropriate
  voice presence. Requires quality evidence before production AI integration;
  current energy/grid heuristics do not satisfy this gate.

Latest platform design: [ADR 0002](docs/decisions/0002-web-platform-auth-and-storage.md).
Owner selected Vercel, Better Auth, Neon PostgreSQL Free, R2 and the Next.js shell,
with private generation plus a reviewed public catalogue. Keep the database free;
no paid upgrade without owner approval. The owner chose email/password sign-in and
Resend for account email. [Local implementation/evidence](docs/web-accounts.md)
now exists; cloud resources remain unconfigured.

- [x] **W08 — PASS:** Document hosting/auth/database/object-storage boundaries, private save/public submission separation, logical model and upload/deletion lifecycle.
- [ ] **W09 — PARTIAL:** Next.js shell, Better Auth email/password, Resend adapter, generated auth schema, private metadata queries, migration safeguards and local Postgres/browser tests implemented. Live Neon/Resend, preview/production isolation, expired-auth cleanup, database compute/transfer budgets and overload limits remain. [Evidence](docs/web-accounts.md).
- [ ] **W10 — NOT RUN:** Implement explicit private cloud save, bounded direct uploads, immutable validated assets, quotas and retryable deletion in R2. Extend the remote metadata strategy constraint for funk/call_response/hybrid before cloud saving is enabled.
- [ ] **W11 — NOT RUN:** Build reviewed public catalogue, filters/search, track pages, persistent player and private playlists; verify publication consent and no private-data leaks.

The owner changed priority to “first lets make it web version of this” on
2026-10-18. **Phone work is paused by owner request.** Existing phone results and
unresolved device gates are preserved; this change does not mark them passed.
The current web deliverable and evidence are in [web Instant Remix](docs/web-instant-remix.md).

- [x] **W01 — PASS:** Compile the shared engine to WebAssembly in an isolated SDK; preserve the master, fixture and owner source. Seven browser styles match native Mac plans/events/WAVs exactly in Chromium and WebKit.
- [x] **W02 — PASS:** Consent, browser recording/import, waveform/2–5 s trim, three takes/club/funk/call-response/hybrid, regeneration, cancellation, playback, WAV downloads and responsive desktop/mobile layout implemented and automated flows checked.
- [x] **W03 — PASS:** Atomic local library, integrity verification, explicit scoped/all deletion, quota handling and ten-session limit. WebKit byte-buffer storage compatibility fixed. Original inputs are not persisted or uploaded.
- [x] **W04 — PASS:** Reproducible build, isolated local server, public-file/notice audit, native regression checks and committed browser/portability evidence.
- [ ] **W05 — NOT RUN:** Owner browser microphone and audible playback on the actual preferred browser; headphone/device switching and browser background behavior on real hardware. Fake microphone automation is not this gate.
- [ ] **W06 — NOT RUN:** Owner listening to web mixes, especially experimental/club/funk, and the already-required diverse blinded M1 cohort. No musical-quality inference from identical WAVs.
- [ ] **W07 — NOT RUN:** Firefox, installed Safari and mobile browser hardware coverage; public HTTPS hosting, installable/offline caching and release approval. No deployment is authorized or performed in this web pass.

[Native app and validation](docs/ios-instant-remix.md),
[release readiness](docs/release-readiness.md), and
[live research gate](docs/live-research-protocol.md) track the 2026-10-18 local
implementation authorized by “continue finish the spec all the way.” Missing
listening data, device observations, model prerequisites and release approval
are not supplied by this instruction. The master remains unchanged.

## Next: review the current music

Latest [instrument and groove comparisons](renders/sustained-instruments-20261018/review/index.html):
eight matched before/after pairs, isolated instruments and vocals. **Listening NOT RUN.**

Previous [recorded guitar comparisons](renders/guitar-20261018/review/index.html):
eight matched before/after pairs, isolated guitar and unchanged voice stems.
Technical gates PASS; listening NOT RUN.


Latest [eight call-response/hybrid mixes](renders/creative-strategies-20261018/review/index.html)
are loudness matched with voice stems. Technical gates PASS; listening NOT RUN.


Latest [four Funk seeds](renders/funk-20261018/review/index.html): distinct note
structures, two preserved clean hooks each, loudness-matched mixes and isolated
voices. Technical checks PASS; human listening NOT RUN. Available in the web
studio as Funk. [Evidence](docs/funk.md).

Previous [hip-hop before/after pairs](renders/hiphop-diversity-20261018/review/index.html):
four seeds at matched loudness. Hip-hop now varies chord cycles, coordinated
bass/kick/chord rhythms and swing, with recurring phrases and developed returns.
**Technical variety: PASS; perceived variety and new listening: NOT RUN.**
This is a bounded rule bank; combinations can repeat. [Evidence](docs/hiphop-diversity.md).

Latest [voice and instrumental comparisons](renders/voice-research-20261018/review/index.html):
six 30-second club/hip-hop arrangements, matched repeating-voice controls and
instrumental-only options. Owner requests performer-level craft and selective
human voice; this is a quality target, not an artist-imitation or cloning task.
**Local technical checks: PASS; new voice-mix listening: NOT RUN.**
[Research evidence and limitations](docs/voice-research.md).

Latest [v7/v8 listening comparison](renders/voice-club-v8/review/index.html):
three before/after pairs plus bass/drum/voice pairs and the reference. The owner
requested all three improvement areas; that is not an acceptance rating. Bass
balance/harmonics, drum impact/decay, transitions and pause-ended vocal selection
are implemented. Stem exports now preserve the master's instrument takes.
**V8 listening: NOT RUN; production quality: PARTIAL.**
[Current evidence](docs/club-refinement.md).

New [club listening page](renders/voice-club-v7/review/index.html): three original
36-second electronic arrangements, matched reference/previous mix and isolated
instruments. Drops at 0:10 and 0:24. **Club listening: NOT RUN.** The latest
request is production-level quality in the direction of Blood Club; the new
palette/form are implemented, without claiming reference similarity or production
acceptance. [Evidence and limits](docs/club-direction.md).

Local [listening page](renders/voice-articulation-v4/review/index.html): v3/v4 pairs
and six alternate-seed mixes plus isolated piano/drum comparisons at matched
levels. Earlier reference auditions
remain linked. V4 piano/drum feedback: **PASS** (informal owner acceptance).
The [one-command recording session](renders/recording-workflow-v5/index.html)
provides three mixes and downloads; its new conversion has not received a
separate listening assessment.
Audio links work in this checkout; private recordings are intentionally absent
from Git and will not appear in a remote repository viewer.

Latest listening feedback (2026-10-17): “they are fine,” in response to the v4
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
- [ ] **N06 — PARTIAL:** Club v8 adds bass harmonics, revised drum balance/decay,
  build/return accents, longer deduplicated voice fragments and matched comparisons.
  V4 piano/drums have prior owner acceptance; club listening/reference similarity,
  formal quality, recognizability and diverse-input listening remain open.
- [ ] **N07 — NOT RUN:** Audition v8 club bass balance, drum impact, texture, voice
  clarity and transitions at 0:10/0:17/0:24; record exact version/timestamp and
  desired change before claiming this meets the requested production direction.

Record against [club v8](docs/club-refinement.md) or the relevant prior revision, with the exact
filename/seed, timestamp, observation, desired change and eventual evidence.
Do not close N02–N05 merely because another implementation is committed.

## Completed development

Entries follow implementation order. Historical results apply to their revision;
current platform results are in [the refinement report](docs/evidence/club-refinement/report.json).
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
| [x] | P23 | PASS | Original 14-sample electronic bank, club form and source-driven bass, stem-consistent kick ducking, CLI/C ABI/import/schema/CI support; nine M5/Linux suites, exact WAVs and eight-player comparison | [Club evidence](docs/club-direction.md) |
| [x] | P24 | PASS | Club v8 bass/drum revision, transition accents, pause-ended deduplicated crops; corrected stem take identity; nine M5/Linux suites, current portability and 13-player comparison | [Refinement evidence](docs/club-refinement.md) |
| [x] | P25 | PASS | Native Instant Remix app: consent, record/import, waveform/trim, worker C ABI, three styles/club, replay/regeneration, saved sessions, WAV sharing/deletion and verified recovery | [iOS evidence](docs/ios-instant-remix.md) |
| [x] | P26 | PASS | Fix mobile worker stack overflow by allocating the fixed voice pool at construction; retain allocation-free processing and unchanged PCM/events | `394743f` · [iOS evidence](docs/ios-instant-remix.md) |
| [x] | P27 | PASS | Release bundle audit, privacy manifest/notices, policy draft, release checklist and live feasibility protocol prepared; implementation does not close launch gates | [Readiness](docs/release-readiness.md) |
| [x] | P28 | PASS | Bounded RTX 3090 pretrained music trial: ten clips, timings/memory, retrieval and verified rental deletion | `f0e95d0` · [Trial](docs/cloud-music-trial.md) |
| [x] | P29 | PASS | Local selective-voice research: six arrangements, controls/stems, matched review page, six tests and Chromium/WebKit playback | [Evidence](docs/voice-research.md) |
| [x] | P30 | PASS | Strict offline JSON plan replay, explicit deterministic fallback, completion receipts, adversarial tests and actual M5/Linux/WASM comparisons | [Evidence](docs/plan-import.md) |
| [x] | P31 | PASS | Independent voice pitch/duration controls, bounded 1.1 import/export, preserved clean hooks, owner comparisons and fixed 32-bit resampling overflow | [Evidence](docs/voice-transforms.md) |
| [x] | P32 | PASS | Bounded tempo echo with clean-hook clearance, stereo decay, 1.2 plan import/export, private owner comparisons and actual M5/Linux/WASM checks | [Evidence](docs/vocal-echo.md) |
| [x] | P33 | PASS | Hip-hop harmonic/rhythmic seed variety, recurring phrases and developed returns; 64-seed structural audit, four owner comparisons, exact M5/Linux/WASM agreement | [Evidence](docs/hiphop-diversity.md) |
| [x] | P34 | PASS | Shared tempo maps and gain/pan automation; native/import/schema/echo/stem contracts, 40 exact M5/Linux WAVs, four private comparisons | [Evidence](docs/timeline.md) |
| [x] | P35 | PASS | Funk grammar with seed/input variation; CLI/C ABI/schemas/export and web generate/save/play/download; 50 exact M5/Linux WAVs, five WASM styles and four owner comparisons | [Evidence](docs/funk.md) |
| [x] | P36 | PASS | Call-response/hybrid, recent-structure rejection, native/browser contracts and private review; commit `a09220e` | [Evidence](docs/creative-strategies.md) |
| [x] | P37 | PASS | Recorded CC0 guitar, alternating strum/staccato, versioned import/stems and notices; commit `8fbdfbb` | [Evidence](docs/guitar.md) |
| [x] | P38 | PASS | Organ/pad/lead, wider harmony/groove, eight-attempt history checks, 93 exact cross-OS WAVs and 42 old-score replay WAVs | [Evidence](docs/sustained-instruments.md) |

## Engineering backlog

These are known gaps or candidate improvements, not promises that every feature
is needed. Prioritize by recorded listening defects and product requirements.

- [ ] **E01 — PARTIAL:** V4 implements three recorded piano dynamics and two
  seeded piano/drum takes from the pinned cleared libraries. Evaluate realism,
  layer transitions and repeated hits. Bass layers and longer acoustic tails
  remain candidates. The new electronic club palette needs listening assessment.
- [ ] **E02 — PARTIAL:** Improve phrase/chop selection if N03/N05 show cut words.
  V3 adds sustained low-energy endings and attack pre-roll. Club v8 extends
  the pause search, deduplicates overlapping candidates and prefers pause-ended crops;
  reliable word boundaries, semantic selection and listening acceptance remain open.
- [ ] **E03 — PARTIAL:** Independent pitch/time DSP, bounded 1.1 plans, cached
  preparation and four owner comparisons implemented. Four-rate technical checks,
  exact M5/Linux PCM, preserved clean hooks and a three-pulse probe pass. Formant
  preservation, diverse transient/word clarity and human acceptance remain open;
  default generated chops still use original speed. [Evidence](docs/voice-transforms.md).
- [ ] **E04 — PARTIAL:** Expand expressive mixing/effects when justified by
  listening. Early reflections, hook/kick ducking and opt-in three-repeat tempo
  echoes and track gain/pan automation exist. Clean-hook clearance, bounded tails,
  exact cross-OS PCM and local comparisons checked. Human acceptance and
  continuous feedback/reverb remain open. [Echo evidence](docs/vocal-echo.md);
  [automation evidence](docs/timeline.md).
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

- [x] **E10 — PASS:** Fix solo-export renumbering that changed sample takes/gains.
  Filter compiled events with original IDs, retaining kick ducking. New float
  reconstruction regression and real four-style PCM checks pass; old masters
  remain unchanged, and earlier stems are preserved as historical files.
- [x] **E11 — PASS:** Read bounded `1.0-remix` plans in the offline CLI, verify
  caller/source/permission and native constraints, replay exact events, and record
  explicitly requested deterministic fallback. Five-style round trips, 50 rejected
  candidates and preserved actual owner audio verified. [Evidence](docs/plan-import.md).
- [ ] **E12 — PARTIAL:** Tempo maps and track gain/pan automation implemented,
  with opt-in native/CLI plans and cross-platform tests. Recorded guitar with up/down strums, normal/staccato attacks, two dynamics and
  alternate takes is implemented across plans/stems/web. Organ, dedicated pad/lead
  voices, versioned import and optional stems are now implemented. Their audible
  quality remains unassessed. [Instrument evidence](docs/sustained-instruments.md). Independent pitch/time and
  expanded effects remain under E03/E04. [Timeline evidence](docs/timeline.md).
  Do not call the engine feature-complete.

- [ ] **E13 — PARTIAL:** All six named Stage A rule directions now exist, plus
  club and the baseline. Hip-hop/funk seed variety, standalone call-response and
  hybrid with phrase-boundary rhythm changes are implemented. The local web
  worker rejects exact recent instrumental structures with at most eight candidate
  renders, ignoring instrument swaps as a source of novelty, preserving actual selected seeds and previous saved mixes. Native,
  Linux, browser and input-response checks pass. Reggae/experimental/club now vary
  harmony and groove, with seed-selected later breaks in reggae/experimental; perceived variety, broader
  listening and learned contextual direction remain open. Finite rules can still
  sound similar. [Evidence](docs/creative-strategies.md).

## M1: formal musical-quality evaluation

Prerequisites: a reviewable revision, an eligible consented dataset and real
listeners. Preparation does not pass this milestone. Follow the
[evaluation protocol](docs/evaluation-protocol.md); retain per-style failures.

- [ ] **Q01 — PARTIAL:** Engine/source/binary/preparation/rubric hashes, technical
  rules and seed schedule frozen for the one-source pilot. Final cohort and
  actual reviewer assignment are still missing. [Preparation](docs/evaluation-batch.md).
- [ ] **Q02 — PARTIAL:** One owner-consented source is inventoried with owner-only
  review scope. Owner previously confirmed no additional clips were available; the later phone
  smoke recording is not added to this frozen cohort or granted independent-review
  permission. Collect 20–50 diverse cleared clips, including multiple
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

### M2: constrained AI direction — PARTIAL (offline prerequisite only; quality hold remains)

- [ ] **A01 — NOT RUN:** After the quality baseline, review candidate model/code
  licenses and benchmark actual M5 latency, memory, GPU use and CPU fallback in a
  separate environment; keep `~/mlx-env` unchanged.
- [ ] **A02 — PARTIAL:** Typed offline plan ingestion, strict validation and explicit
  deterministic fallback now pass. No model is called; provider integration,
  timeout/cost/retry policy and measured model schema-valid rate remain NOT RUN.
  The importer makes one bounded attempt with zero retries. [Contract](docs/plan-import.md).
- [ ] **A03 — NOT RUN:** Compare model-directed arrangements with the rule engine
  in a blinded trial. Advance only with measured benefit and bounded cost.
- [ ] **A04 — NOT RUN:** Consider learned action ranking only with cleared,
  opt-in data and speaker/phrase/session holdouts. Do not train on the references.

### M3: iPhone Instant Remix — PARTIAL

- [x] **I01 — PASS:** Build the SwiftUI consent → record/import → waveform/trim
  → three mixes/club → replay/remix again → save/share flow. No account or cloud.
  [Implementation and tests](docs/ios-instant-remix.md).
- [x] **I02 — PASS:** Existing C ABI runs on a worker with honest indeterminate
  progress, errors/cancellation, hash-verified recovery and scoped local deletion.
  Fix the oversized inline voice pool exposed by the mobile worker stack.
- [ ] **I03 — PARTIAL:** Final simulator consent, denied microphone fallback, playback,
  persistence, sharing/deletion and large-text checks pass. Physical UI automation
  failed to enable twice; owner sees no prompt/switch despite enabled Developer Mode.
  Follow-up Release launch and owner recording/generation/playback pass; three
  styles completed in 1.830 s. Complete interruption, route, headphone/speaker,
  save/share/relaunch and lifecycle validation on hardware.
- [ ] **I04 — PARTIAL:** Six physical iPhone integration tests and three optimized timing/CPU/memory trials pass;
  [current device results](docs/ios-instant-remix.md) distinguish real execution
  from simulator checks. Sustained CPU, memory, battery/thermal and codec assessment remain.

### M4: live improvisation — PARTIAL

- [ ] **L01 — PARTIAL:** [Provisional latency/glitch budgets and measurement protocol](docs/live-research-protocol.md) defined; validate feasibility on real hardware before committing to live mode.
- [ ] **L02 — NOT RUN:** Implement explicit opt-in capture, phrase buffering and
  bar-boundary scheduling without allocations, blocking or model work in callbacks.
- [ ] **L03 — NOT RUN:** Test feedback, route changes, interruptions and sustained
  sessions; measure actual end-to-end latency and consent/recording behavior.

### M5: production and monetization — PARTIAL

- [ ] **R01 — PARTIAL:** Existing instrument provenance, bundled notices, local privacy/deletion controls, manifest and [policy draft](docs/privacy-policy-draft.md) prepared. Public entity/contact/URL, rights review and sharing-policy acceptance remain.
- [ ] **R02 — PARTIAL:** [Release preparation](docs/release-readiness.md) and local app checks exist. Complete device/beta/App Store readiness checks, collect
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

- 2026-10-18: Added call-response and hybrid across native/CLI/C ABI/web contracts;
  local recent-composition rejection, 80 exact cross-OS WAVs and seven-style
  browser agreement. [Evidence](docs/creative-strategies.md).

- 2026-10-18: Added recorded CC0 guitar, strum/staccato planning, versioned
  import/export/stems and bundled notices. [Evidence](docs/guitar.md).

- 2026-10-18: Added original organ/pad/lead, richer reggae/experimental/club variation,
  eight-candidate recent-body rejection, complete stems/import/version contracts
  and corrected instrument-bank reports. 93 exact cross-OS WAVs and 42 exact
  old-score replay WAVs; eight matched owner pairs. [Evidence](docs/sustained-instruments.md).
