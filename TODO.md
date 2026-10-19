# Djayvo development tracker

**Current authorization — 2026-10-18:** The owner's latest “continue with the
spec, finish everything” supersedes the earlier console-only increment and
M0a review stop for remaining local implementation. Continue the browser musical
improviser and available specification work without per-step approval; preserve
local changes, recordings, evidence and the immutable master. The
[prepared A + C session](docs/prepared-session.md) connects the local phrase director to the mixer.
Human quality, actual hardware/venue evidence and M1 prerequisites for production
learned AI remain required. Phone and hosted-infrastructure work remain paused;
new paid compute, publication and monetization still need explicit authorization.


Last updated: 2026-10-19 (America/New_York). Latest validation: [Linux browser portability](docs/linux-browser.md).
Latest engine fix: [Offset-resistant vocal pause detection](docs/chop-offset.md).
Latest research: [Phrase articulation comparisons](docs/phrase-articulation.md); [adapter effect and split audit](docs/style-adapter-effect.md); [completed Blood Club GPU trial](docs/blood-training-run.md).
Current priority: musical intelligence and training quality; Spotify/YouTube integration deferred.

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
| M1 — musical quality baseline | NOT RUN | Licensed multi-source cohort and blind packet workflow prepared; formal human evaluation missing |
| M2 — AI director benchmarks | PARTIAL | Offline import/fallback prerequisite complete; model integration and benchmark remain NOT RUN behind M1; separately authorized pretrained and style-adapter feasibility trials measured |
| M3 — iPhone Instant Remix | PARTIAL | Release app launches; owner recording/generation/playback, six phone tests, metrics and simulator flow pass; XCTest UI initialization, routes/lifecycle and production acceptance remain |
| W0 — browser Instant Remix | PARTIAL | Local WebAssembly app and Chromium/WebKit/Firefox technical flows pass; physical browser microphone and owner web listening remain open |
| M4 — live improvisation | PARTIAL | Prepared A/C session and live instrument/MIDI input implemented locally; general live transport, physical timing and venue evidence remain |
| M5 — production and monetization | PARTIAL | Local privacy controls, bundled rights notices and release preparation exist; beta, demand, public policy details and release approval remain |

`PASS` means the named deliverable has evidence. `PARTIAL` means some required
work or evidence is missing. `FAIL` means a performed check did not meet its
criteria. `NOT RUN` means it has not been executed or assessed. A checked box
closes that task only; it does not automatically pass its parent milestone.

## DJ studio development

- [x] **DJ19 — PASS (validation and fallback scope):** [Linux browser validation and recording fallback](docs/linux-browser.md).
  Linux Chromium session/manual suites pass 29/40 checks; 22 Mac/Linux WAVs
  match exactly. Linux WebKit manual startup/repeat is **FAIL** (DJ14).
  Actual isolated Linux ARM64 browser execution; unavailable recording is visibly
  disabled in both studios and consented import remains usable. Native Mac
  capability controls pass. Linux WebKit's full session is **PARTIAL** because
  its build lacks MediaRecorder: two capture checks **NOT RUN**. Physical Intel
  Linux, microphone/MIDI, latency, formal listening and venue validation remain
  **NOT RUN**; this does not close DJ14/DJ17 or the full specification.

- [x] **DJ18 — PASS (technical):** [Cancellable prepared playback](docs/start-cancellation.md):
  pending A/C start state, working Stop during resume, guarded stale errors,
  explicit retry, and consent withdrawal during pending C preview. 26 unit and
  56 final session checks, integrated/offline controls and ten unchanged piano
  WAVs. Before-fix and test-harness failures retained. DJ14/DJ17 remain open.

- [x] **DJ16 — PASS (technical):** [Rhythmic C echoes](docs/beat-echo.md): eighth,
  dotted-eighth and triplet spacing from confirmed C tempo, retained manual value,
  disabled MIDI spacing while synced, and requested delay targets preserved when
  clearing mid-ramp across A/B/C/instruments. 26 unit, 80 DJ and 50 session checks;
  54 rhythmic tap peaks within half a frame, 24 exact post-clear peaks, six new
  WAVs and unchanged preceding output. Integrated/offline controls PASS.
- [ ] **DJ17 — PARTIAL:** [Startup repeatability and continuity diagnostics](docs/beat-echo.md).
  One Chromium prepared-A signal assertion failed after a 300 ms wait; cause
  unconfirmed, later runs pass unchanged threshold. Corrected the timestamp-only
  dropout detector using an independent PCM counter: focused stress reproduced
  stale timestamps with continuous samples. Final session PCM checks PASS;
  failed receipts retained, physical/venue validation NOT RUN. DJ18 fixes a
  separate reproducible pending-start control defect; it does not establish the
  cause of the earlier 300 ms failure.

- [x] **DJ15 — PASS (technical):** [Performance C tone and echo](docs/performance-effects.md):
  preview/bar-entry effects before C/Master gains, three MIDI Learn targets,
  cleared voice echoes on stop/deletion/consent and accurate preview-stop status.
  80 DJ, 46 session and 24 unit checks; integrated/offline browser audio, exact
  echo frames and playable comparisons PASS. Physical/listening/venue NOT RUN.

- [x] **DJ13 — PASS (technical):** [MIDI Learn](docs/midi-learn.md): 23 allowed
  absolute CC controls, channel-specific assignment, pickup/manual rearm,
  clear/cancel/input lifecycle and existing audio/permission paths. 80 final DJ,
  38 session, 24 unit checks and integrated/offline behavior pass. Physical MIDI
  and latency NOT RUN; native Web MIDI unavailable in tested WebKit.
- [ ] **DJ14 — FAIL (Linux WebKit startup/repeat), PARTIAL (cause):**
  [Linux browser validation](docs/linux-browser.md) reproduces an EOF restart
  stuck seeking at zero; full suite fails and focused repeats fail on iteration 2.
  Waiting for seek and decoder reload candidates also failed; neither shipped.
  A software-only audio sink removes missing-device errors but native media
  startup/repeat failures remain. Isolate Blob/range delivery and native media
  decoding before changing transport; later Linux WebKit manual checks NOT RUN.
  These traces extend, but do not establish the cause of, the prior Mac issue:
  investigate intermittent WebKit whole-track loop start:
  one timeout at paused 59.9 s before MIDI activation; final suite and 20 isolated
  repeats pass. Root cause unconfirmed; failure receipt and diagnostics retained
  in [MIDI Learn evidence](docs/midi-learn.md). Another 15 cue/jog/rate sequences
  and two full WebKit runs passed on 2026-10-19 ([evidence](docs/performance-effects.md));
  cause remains unconfirmed. Fifteen further integrated sequences pass in
  [startup-cancellation validation](docs/start-cancellation.md). Do not call venue looping validated.

- [x] **DJ12 — PASS (technical):** [Deck tone and echo](docs/deck-effects.md):
  independent A/B effects including prepared A, post-effect mute/crossfader,
  cleared delay buffers on reset/unload/permission withdrawal and Pause all.
  70 DJ and 38 prepared-session browser checks; 23 unit checks, offline/integrated
  site, exact echo frames and playable dry/echo WAVs. Listening/venue NOT RUN.

- [x] **DJ11 — PASS (technical):** [Major/minor context](docs/session-modes.md):
  all twelve tonics, seeded major progressions and scale-bound answers, validated
  version 1.7 plan import/export, explicit mode selection and C invalidation.
  288 native plans, eight Mac/Linux/WASM comparisons and browser/offline checks;
  historical minor output unchanged. Perceptual quality NOT RUN.

- [x] **DJ10 — PASS (technical):** [MIDI instrument input](docs/midi-input.md):
  explicit single-input permission/selection, note velocity, per-channel sustain,
  channel-10 drum/percussion mapping and safe disconnect/cancellation. Synthetic
  MIDI drives real C++ worklet audio in browser and disconnected-server tests;
  integrated desktop/mobile controls checked. Physical MIDI hardware NOT RUN.

- [x] **DJ08 — PASS (technical):** [Talk bass and extra percussion](docs/talk-bass.md):
  shared C++ original formant synth with OO/AH/EE control, low C2 register, clap,
  rimshot, low tom and shaker; twelve pads total. Local `pipe.mp3` measurements,
  native Mac/Linux/WASM checks, browser/offline coverage and three original demos.
  Reference rig identification PARTIAL; sound similarity/listening NOT RUN.

- [x] **DJ07 — PASS (technical):** [Instrument tone and echo](docs/instrument-effects.md):
  real low-pass tone, three fading echoes, manual spacing, dry reset and mute-safe
  routing for keys/pads. 46 DJ checks, 19 unit checks, 40 voice regressions and
  integrated site checks PASS; playable piano pairs and timing/waveform evidence
  retained. Human musical quality and physical latency remain NOT RUN.

- [x] **DJ05 — PASS (technical):** [Console and live instruments](docs/dj-console.md):
  rotating/joggable platters, cue/hot cues, ±16% pitch/key lock, manual tempo match,
  full-track loops, three-band EQ, 88-key piano, nine melodic patches and eight
  drum pads, sustain/velocity/level/panic. Actual Mac/Linux/WASM and browser audio
  evidence recorded: 42 DJ browser checks, 18 unit checks, 40 voice regressions,
  15/15 CTest suites per native platform, sanitizer and bit-identical PCM PASS.
  Professional/artist-reference quality remains NOT RUN.
- [ ] **DJ06 — PARTIAL:** Fixed MIDI input mapping is implemented by DJ10;
  instrument tone/echo is covered by DJ07, deck tone/echo by DJ12 and absolute CC
  MIDI Learn by DJ13 and C effects by DJ15. Physical controller validation, human audition, relative
  encoders/custom pad layouts, audible scratching, beat-sized loops and headphone
  cue routing remain open. Whole-track loop reliability is tracked in DJ14.

- [x] **DJ01 — PASS:** [Manual two-deck foundation](docs/dj-mixer.md): actual local
  playback, seek/levels/crossfader/master, stereo meter, permission and unload,
  failed-replacement preservation, interruption recovery and prepared offline
  reload. 16 unit checks, 26 DJ browser checks and 40 voice regressions PASS.
- [x] **DJ09 — PASS (technical):** [Prepared A + C session](docs/prepared-session.md):
  shared C++ absolute bar grid, context-aware phrase plan, real scheduled browser
  audio, capture/import, preview, C fader/stop, safe cancellation/failure and
  disconnected-server generation/playback. Native Mac/Linux/WASM agreement and
  short callback continuity checks recorded. No learned model or quality claim.
- [ ] **DJ02 — PARTIAL:** Prepared A/C now share the AudioContext clock using the
  shared C++ bar grid; tempo/triad estimates plus mandatory manual confirmation.
  Remaining: general beat tracking, modulating/chord-aware harmony, unified A/B/C
  transport, sample-frame live note/chop scheduling and tempo changes in flight.
- [ ] **DJ03 — PARTIAL:** Consented capture/import while A plays, source-driven C,
  manual preview/entry/level/stop, local fallback and failure isolation work in
  Chromium/WebKit. Physical microphone/session check and learned-director
  automation/quality remain NOT RUN; synthetic capture is not physical evidence.
- [ ] **DJ04 — PARTIAL:** Automated Apple M5 browser sessions, prepared offline
  playback, CPU block timing and repeated transport checks PASS. Actual Linux
  browser, physical latency, long-session glitch checks, cue/device routing and
  human musical evaluation remain NOT RUN. Cached-page tests do not pass venue readiness.

## Existing product work — local specification work active; phone and hosted infrastructure paused

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
- [ ] **C06 — PARTIAL:** [Source-led musical development](docs/reference-xyz-analysis.md):
  x/y/z are the owner's style/quality targets. Call & Response now preserves
  chronological phrase rhythm and energy accents across a two-bar answer, with
  a shifted/harmonized return and bass reinforcement. [Four owner comparisons](docs/source-motif.md)
  and Mac/Linux/browser agreement PASS. Owner says After feels “More connected”
  (informal listening PARTIAL). Formal listening, broader style coverage,
  adaptive form/voice roles, expressive pitch contours and reference-level quality
  remain open; reference measurements do not establish listening or training rights.

- [ ] **C07 — PARTIAL:** [Style-adapter trial](docs/style-training-retry.md):
  owner-authorized replacement completed actual RTX 3090 training (250 steps),
  verified adapter/checkpoint, exact base repeat, four changed matched pairs and
  two-browser review. Decode headroom corrected in fresh copies; 25 local checks
  PASS. Both rentals/key cleanup PASS; observed combined debit $0.193221, final
  invoice NOT RUN. Dataset is five provisional excerpts, not a verified corpus;
  formal quality and production advancement remain open.
- [ ] **C08 — NOT RUN:** Audition [four concealed adapter comparisons](http://127.0.0.1:4193/review/)
  for musicality, reference direction, voice artifacts, groove, development and
  endings. Record pair/version/timestamps; waveform differences are not quality.
- [ ] **C09 — PARTIAL:** [Local waveform diagnostics](docs/style-waveform-diagnostics.md)
  PASS: calibrated 40-pair training-excerpt scan, internal repetition and two-seed
  measurements, three tests and protected-file checks. No training-excerpt flags;
  repeated windows in both second-seed bass takes need listening review. Curate
  verified musical windows, captions and session groups; independently evaluate
  perceptual copying and generalization. Detailed automatic captions proved unstable. Source-to-response
  learning also needs appropriate paired examples; a style adapter does not
  implement that behavior. Further paid rentals need separate authorization.

- [ ] **C10 — PARTIAL:** Source-contour research completed with four matched
  comparisons; actual Mac/Linux 15/15 suites, 65 exact cross-OS WAVs and native/
  browser agreement PASS. Owner said **“No clear difference”**; audible benefit
  not established, promotion FAIL. Candidate retained as a patch and playable
  research artifacts; original studio engine restored. No new model training.
  Prioritize paired phrase/response examples, reviewed session splits and real
  preference evidence for C05/C09. [Evidence](docs/source-contour.md).

- [ ] **C11 — PARTIAL:** Approved Blood Club trial executed: 16 training clips,
  verified 80/160-step checkpoints, 13 retrieved WAVs, exact base repeat, 38 local
  regressions and rental/key cleanup PASS. Fixed decimal checkpoint-name loading.
  Four concealed A/B/C groups at `http://127.0.0.1:4195/review/`; no strong training
  waveform matches, but repetition flags remain. Paired annotations, independent
  generalization, human preference and production acceptance remain open; no
  checkpoint promoted. Observed debit about $0.12; final billing PARTIAL.
  [Execution evidence](docs/blood-training-run.md).
  [Local follow-up](docs/style-adapter-effect.md): bass/funk remain strongly
  waveform-correlated with base; independent source-group split **FAIL** and
  two cross-split windows flagged. Five diagnostic tests, repeated 64-pair audit,
  exact legacy-result agreement and four playable reference crops **PASS**.
  Do not treat greater waveform change or this same-source holdout as quality proof.

- [x] **C12 — PASS (technical):** [Offset-resistant phrase analysis](docs/analysis-offset.md).
  Correct attacks/pauses/pitch despite constant electrical offset without editing
  the recording. Old-library failure reproduced; Mac/Linux 15/15 suites, sanitizer
  and 12 WASM comparisons pass. 70 exact cross-platform WAVs; 65 original-input
  WAVs unchanged, six saved-score replays. New musical benefit and physical
  microphone/browser interaction **NOT RUN**; C05/C06/C11 and M1 stay open.

- [ ] **C13 — PARTIAL:** [Phrase articulation candidate](docs/phrase-articulation.md):
  four concealed A/B pairs at `http://127.0.0.1:4196/review/`. Piano answer note
  lengths follow phrase spacing; all other events remain intact. Five tests,
  eight actual Mac/Linux imports, 40 exact WAVs and 16 matched/HTTP-decoded review
  files **PASS**. Default engine preserved. Human benefit, generalization and
  promotion **NOT RUN**; this is rule-based research, not further model training.

- [x] **C14 — PASS (technical):** [Sustained-note period selection](docs/pitch-period.md).
  Stop later period multiples selecting the wrong pitch/key; 180 known-tone
  cases, Mac/Linux suites, sanitizer and 12 WASM comparisons pass. 74 exact
  cross-platform WAVs; 65 owner/fixture WAVs unchanged; six saved-score replays.
  Four of 20 licensed speech inputs change selected tonic and have fresh renders;
  their pitch accuracy/listening **NOT RUN**, frozen study preserved. No learned
  behavior or production-quality advancement is inferred.

- [x] **C15 — PASS (technical):** [Offset-resistant vocal pause detection](docs/chop-offset.md).
  Center crop energy so constant recording offsets do not hide pauses and force
  premature fallback slices; retain original PCM and edge selection. 48 controls,
  Mac/Linux 15/15 suites, sanitizer, 107 exact cross-OS WAVs, 17 WASM comparisons
  and 11 saved-score replays pass. All 65 owner/fixture WAVs preserved. One of
  20 licensed speech sources changes crops; human benefit **NOT RUN**. Frozen
  evaluation and prior reviews remain intact; no new training or paid compute.

Latest platform design: [ADR 0002](docs/decisions/0002-web-platform-auth-and-storage.md).
Owner selected Vercel, Better Auth, Neon PostgreSQL Free, R2 and the Next.js shell,
with private generation plus a reviewed public catalogue. Keep the database free;
no paid upgrade without owner approval. The owner chose email/password sign-in and
Resend for account email. [Local implementation/evidence](docs/web-accounts.md)
now exists; cloud resources remain unconfigured.

- [x] **W08 — PASS:** Document hosting/auth/database/object-storage boundaries, private save/public submission separation, logical model and upload/deletion lifecycle.
- [ ] **W09 — PARTIAL:** Next.js shell, Better Auth email/password, Resend adapter, generated auth schema, private metadata queries, migration safeguards and local Postgres/browser tests and bounded expired-auth cleanup implemented. Live Neon/Resend, preview/production isolation, cleanup scheduling, database compute/transfer budgets and overload limits remain. [Account evidence](docs/web-accounts.md); [cleanup evidence](docs/auth-cleanup.md).
- [ ] **W10 — PARTIAL:** Explicit private save, checksum/WAV validation, all seven strategies, atomic quotas, owner-scoped playback/download, retryable deletion and bounded cleanup implemented. Local Postgres/files, 20 unit/integration checks and ten workflows in each Chromium/WebKit pass. R2 adapter and signed-request contract exist but live R2/CORS/lifecycle, late-write reconciliation, hosted cleanup scheduling and cost/overload validation remain NOT RUN. [Evidence](docs/private-account-audio.md).
- [ ] **W11 — PARTIAL:** Local submission/revision review, filters/search, track pages, persistent player, private playlists, reports and withdrawal implemented; 28 unit/integration checks and 16 catalogue browser checks PASS. Withdrawal recovery, stale-review and displayed-report-batch safeguards also implemented and tested. Hosted publication, actual permission/quality review and moderation operations remain NOT RUN. [Initial evidence](docs/reviewed-catalogue.md); [recovery evidence](docs/catalogue-withdrawal.md).

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
- [ ] **W07 — PARTIAL:** Firefox 151.0 full workflow and seven exact native/Firefox styles PASS; installed Safari and mobile browser hardware coverage remain NOT RUN; optional offline caching and installation support PASS; manifest/icons and Chromium installability diagnostics pass at root/site scopes; physical installed-app launch, public HTTPS hosting and release approval remain NOT RUN. No deployment is authorized or performed in this web pass. [Installation evidence](docs/web-installation.md); [offline evidence](docs/offline-studio.md); [Firefox/recovery evidence](docs/web-recovery.md).

[Native app and validation](docs/ios-instant-remix.md),
[release readiness](docs/release-readiness.md), and
[live research gate](docs/live-research-protocol.md) track the 2026-10-18 local
implementation authorized by “continue finish the spec all the way.” Missing
listening data, device observations, model prerequisites and release approval
are not supplied by this instruction. The master remains unchanged.

## Next: review the current music

Latest [Blood Club training comparisons](http://127.0.0.1:4195/review/): four
concealed A/B/C groups, matched to −22.2 LUFS. Choose a preferred version or no
clear winner, with awkward timestamps. **Technical PASS; listening NOT RUN.**
Both checkpoints remain research candidates. [Run evidence](docs/blood-training-run.md).

Previous [instrument and groove comparisons](renders/sustained-instruments-20261018/review/index.html):
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
| [x] | DJ13 | PASS | MIDI Learn with channel-specific pickup, bounded controls and real audio/offline checks | [Evidence](docs/midi-learn.md) |
| [x] | DJ12 | PASS | Independent deck tone/echo, safe buffer clearing, browser timing/PCM and offline checks | [Evidence](docs/deck-effects.md) |
| [x] | DJ08 | PASS | Original Talk bass, four percussion voices, local reference analysis and portable/browser audio checks | [Evidence](docs/talk-bass.md) |
| [x] | DJ07 | PASS | Local instrument tone/echo, measured browser timing, stereo sweep fix and playable piano pairs | [Effects evidence](docs/instrument-effects.md) |
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
| [x] | P39 | PASS | Bounded opt-in instrument feedback reverb; 91 exact M5/Linux WAVs, native/import/stem tests; commit `ceaf0b9` | [Evidence](docs/feedback-reverb.md) |
| [x] | P40 | PASS | Optional local CPU word-time/crop tools and schema-preserving voice transforms; commit `ceaf0b9`; accuracy/listening remain open | [Evidence](docs/word-timing.md) |
| [x] | P41 | PASS | Preserve licensed evaluation credits and add anonymous listening pages; commit `0a078b3` | [Evidence](docs/licensed-evaluation.md) |
| [x] | P42 | PASS | Accept short energetic transients with bounded context; commit `6912218`; M5/Linux regression checks | [Evidence](docs/licensed-evaluation.md) |
| [x] | P43 | PASS | Licensed 23-source technical cohort, 276 mixes, 69 blank review packets, 92 exact cross-OS WAVs; listener summary tool commit `e798f8b` | [Evidence](docs/licensed-evaluation.md) |
| [x] | P44 | PASS | Preserve healthy mixes when a stored session is malformed; explicit browser selection, fresh artifacts, 56 browser checks and seven exact Firefox/native WAVs | [Evidence](docs/web-recovery.md) |
| [x] | P45 | PASS | Opt-in offline studio with verified bounded caches, safe waiting updates/removal, root/site integration and player cleanup before URL revocation | [Evidence](docs/offline-studio.md) |
| [x] | P46 | PASS | Optional install prompt/guidance, scope-safe manifest and original app icons; 38 offline/manifest checks, 20 Chromium workflow checks and 14 unit tests; physical installation NOT RUN | [Evidence](docs/web-installation.md) |
| [x] | P47 | PASS | Reject constant-offset input without changing accepted music; M5/Linux 13/13, 16 exact before/after and cross-OS renders, 23 frozen source checks, seven exact browser/native renders and 59 browser flow checks | [Evidence](docs/dc-input-validation.md) |
| [x] | P48 | PASS | Reject constant offsets and empty decoded speech in optional research tools; 11 unit tests plus crop integration, 42 unchanged comparison WAVs, six exact event plans and unchanged M5 model estimates; accuracy/listening remain open | [Evidence](docs/research-input-validation.md) |
| [x] | P49 | PASS | Local private account audio: explicit voice-storage consent, verified save/play/seek/download/remove, PostgreSQL quota/crash/retry tests and 20 browser checks; live R2 remains NOT RUN | [Evidence](docs/private-account-audio.md) |
| [x] | P50 | PASS | Local reviewed catalogue and private playlists: explicit public consent, distinct reviewer, privacy/revocation tests, responsive persistent player and two-browser account regressions | [Evidence](docs/reviewed-catalogue.md) |
| [x] | P51 | PASS | Bounded expired-auth cleanup: expiry indexes, target guard, active-account preservation, locked-row/concurrent retry tests and local usage counts | [Evidence](docs/auth-cleanup.md) |
| [x] | P52 | PASS | Recover unavailable playlist slots, keep withdrawn reports out of the actionable queue, reject stale decisions and retain unseen concerns; database/concurrency and two-browser checks | [Evidence](docs/catalogue-withdrawal.md) |
| [x] | P53 | PASS | Local blinded rating form, frozen-packet/hash/scope protection, compatible CSV exports and two-browser checks; original 483 rows remain blank, human listening NOT RUN | [Evidence](docs/listening-review.md) |
| [x] | P54 | PASS | Full-file x/y/z signal measurements, plots, unchanged source hashes and seven CLI/repeatability checks; direct listening NOT RUN | [Evidence](docs/reference-xyz-analysis.md) |
| [x] | P55 | PASS | Two-bar source-derived Call & Response answers, accent response and developed returns; 65 exact cross-OS WAVs, 21 WASM comparisons, old-score replay and four private matched pairs | [Evidence](docs/source-motif.md) |
| [x] | P56 | PASS | Bounded RTX 3090 adapter pilot: corrected decode headroom, five provisional clips, 250 training steps, verified checkpoint, exact base repeat, four changed matched pairs, two-browser playback and rental/key cleanup; musical quality NOT RUN | [Evidence](docs/style-training-retry.md) |
| [x] | P57 | PASS | Local calibrated waveform diagnostics: 40 training-excerpt pairs, internal repetition, same-brief seed comparison, three tests and preserved artifacts; perceptual novelty and musical quality NOT RUN | [Evidence](docs/style-waveform-diagnostics.md) |
| [x] | P58 | PASS | Document revised improviser/DJ-studio direction separately, preserve M0a scope and master, verify existing playable demo and stop later implementation pending review | [Addendum](docs/web-studio-addendum.md) · [Receipt](docs/evidence/web-studio-direction/review.json) |
| [x] | P59 | PASS | Two local DJ decks and real manual mixing, stereo metering, consent/failure handling and disconnected-server playback; 16 unit, 26 DJ browser and 40 voice regression checks | [Evidence](docs/dj-mixer.md) |
| [x] | P60 | PASS | Complete source-contour experiment and cross-platform evidence; record inconclusive owner listening and restore unchanged production engine. Musical benefit not established; candidate not promoted | [Evidence](docs/source-contour.md) |
| [x] | P61 | PASS | Execute bounded Blood Club training, fix checkpoint loader, verify both adapters and 13 WAVs, prepare four matched groups, scan waveform reuse, preserve originals and delete rental/keys; musical-quality gate stays open | [Evidence](docs/blood-training-run.md) |
| [x] | P62 | PASS | Measure adapter effect after gain/DC fitting, merge overlapping detection coverage, audit train/holdout similarity and export four exact reference crops; independent split fails and human-quality gate remains open | [Evidence](docs/style-adapter-effect.md) |
| [x] | P63 | PASS | Fix electrical offset masking source attacks/pauses and inventing noise pitch; validate Mac/Linux/WASM, preserve 65 existing renders and saved-score replay | [Evidence](docs/analysis-offset.md) |
| [x] | P64 | PASS | Prepare controlled phrase-articulation research, verify score isolation and 40 Mac/Linux WAVs, deliver 16 matched private A/B listening files; human benefit and default promotion remain open | [Evidence](docs/phrase-articulation.md) |
| [x] | P65 | PASS | Correct sustained-tone period/key selection; calibrate 180 cases, verify native/WASM output and saved-score compatibility, characterize four changed speech keys | [Evidence](docs/pitch-period.md) |
| [x] | P66 | PASS | Fix recording-offset energy masking vocal pauses; preserve edge selection and 65 existing WAVs, verify Mac/Linux/WASM and saved scores, audit 20 licensed speech sources | [Evidence](docs/chop-offset.md) |

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
  optional offline word-time estimates/crop proposals are implemented. [Offset-resistant pause detection](docs/chop-offset.md) now retains known endings under constant recording offsets; reliable word boundaries, semantic selection and listening acceptance remain open.
- [ ] **E03 — PARTIAL:** Independent pitch/time DSP, bounded 1.1 plans, cached
  preparation and four owner comparisons implemented. Four-rate technical checks,
  exact M5/Linux PCM, preserved clean hooks and a three-pulse probe pass. Formant
  preservation, diverse transient/word clarity and human acceptance remain open;
  default generated chops still use original speed. [Evidence](docs/voice-transforms.md).
- [ ] **E04 — PARTIAL:** Expand expressive mixing/effects when justified by
  listening. Early reflections, hook/kick ducking and opt-in three-repeat tempo
  echoes and track gain/pan automation exist. Clean-hook clearance, bounded tails,
  exact cross-OS PCM and local comparisons checked. Bounded instrument feedback reverb is now implemented; human acceptance remains open. [Echo evidence](docs/vocal-echo.md);
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
  rules and seed schedule frozen for the licensed cohort. Actual reviewer
  assignment remains missing. [Cohort](docs/licensed-evaluation.md).
- [ ] **Q02 — PARTIAL:** Twenty public-license speech sources from distinct speaker
  IDs, three public-domain non-speech recordings and one synthetic silence control
  acquired with attribution and hashes. Recorded quiet-input coverage and human
  category verification remain. The owner recording keeps its owner-only scope.
- [x] **Q03 — PASS:** Corrected 23-recorded-source, three-seed technical cohort:
  69/69 exports per style, 276 mix WAVs and 69 blank blinded packets; three expected
  synthetic-silence rejections. Before-fix failures remain in the record. This
  closes technical preparation only. [Evidence](docs/licensed-evaluation.md).
- [ ] **Q04 — NOT RUN:** Run randomized, blinded comparisons with the fixed-loop
  baseline and at least three independent reviewers per eligible block.
- [ ] **Q05 — NOT RUN:** Assess the provisional targets: >=85% technically usable,
  >=90% speech recognition, >=70% enjoyment ratings >=4/5, >=30% share intention,
  audible strategy variety, zero critical glitches and preference over baseline.
- [ ] **Q06 — PARTIAL:** Bounded response validator and per-clip summaries with
  uncertainty, style-specific failures and reviewer-ID coverage implemented.
  A verified local browser questionnaire now exports compatible CSVs without
  modifying frozen packets or supplying answers. [Form evidence](docs/listening-review.md).
  [Workflow](docs/evaluation-batch.md). Real submissions and M1 evidence review
  remain **NOT RUN**; no ratings are generated.

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
  opt-in data and speaker/phrase/session holdouts. The owner subsequently confirmed
  x/y/z training permission; C07 records the completed research-only adapter
  trial. It does not advance production M1/M2 or establish distribution rights.

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

- 2026-10-18: Joined the browser phrase director to prepared A/C playback, with
  confirmed tempo/minor key, shared native/WASM bar timing, capture/import, preview,
  manual mixing and offline generation. Four Mac/Linux/WASM WAVs and event streams
  identical; 34 session checks, 48 DJ regressions, 40 voice regressions, 22 unit
  checks and 15/15 native suites per OS PASS. [Evidence](docs/prepared-session.md).
