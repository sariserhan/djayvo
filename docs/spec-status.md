# Specification completion ledger

Current non-iOS continuation: [2026-10-21 implementation and remaining gates](non-ios-finish.md).
Overall remains **PARTIAL**. The entries below preserve earlier checkpoints and are
superseded where the current report records newer implementation or evidence.

Latest manual deck start repair — 2026-10-19:
[Metadata readiness](media-readiness.md) **PASS (bounded start ordering)**:
Play waits for the actual deck metadata before asking the native decoder to play;
the existing deadline, cancellation and progress checks remain. Three new unit
regressions fail against the old helper and pass with the fix. The report records
browser/build/PCM gates and all intermediate failures. Broader Linux WebKit
transport reliability stays **PARTIAL** after an intermittent cue mismatch and
2 GiB container OOM failures; a larger functional-test container does not qualify
that smaller memory budget. Physical audio, listening, production and hosted
service gates remain open. Master, engine and source recordings are unchanged.

Latest local product increment — 2026-10-19:
[Save and reuse performances](saved-mixes.md) connects generated C to the existing
browser library and loads verified saved mixes into A/B. Explicit local saving,
quota recovery, duplicate prevention, permissions, integrity checks and shared
Voice studio deletion are covered. Offline fragment navigation and WebKit select
clipping are repaired. R2 and Resend remain deferred at the owner's request;
cloud synchronization, full session recall and production/listening gates remain
open. See the report for exact PASS/PARTIAL/FAIL/NOT RUN receipts, including the
unresolved Linux WebKit manual-deck check. The master and source recordings are
unchanged.

Latest Neon setup — 2026-10-19:
[Neon setup and evidence](neon-setup.md) **PASS (Postgres scope)** under the owner's
explicit init/deploy authorization for the existing production branch. Five
migrations rehearsed then applied; build, seven unit tests, typecheck, secret
bundle audit and nine Chromium checks pass. Real browser registration,
verification, sign-in, isolated library reads and sign-out use Neon. Test records
and rehearsal branch removed; initial rate-limit cleanup failure and repair
retained. Local email outbox is used: Resend/R2/Vercel deployment **NOT RUN**.
Website remains at http://localhost:3000; previous local DB/audio retained.
Overall production **PARTIAL**; master, audio and quality gates unchanged.

Latest bounded audio wake-up — 2026-10-19:
[Audio resume recovery](audio-resume.md) **PASS (recovery scope)**: all five
production resume sites have a ten-second deadline; late failures cannot release
newer notes. Mac/Linux each pass 41 unit checks. Mac Chromium/WebKit and Linux
Chromium pass 46 studio checks each. Linux WebKit passes the new recovery checks
but its complete studio gate is **FAIL**: valid reload rejection, then a fresh-run
browser crash. Precise cause remains **PARTIAL**. Mac and Linux Chromium prepared
sessions pass 29 checks each; Linux WebKit is **PARTIAL**, with 28 PASS and two
capture checks **NOT RUN**. All 44 offline WAVs are byte-identical; recorded event
frames match baselines (fractional echo targets within 0.474 sample frame).
Physical latency, venue and new listening **NOT RUN**; specification/production
**PARTIAL**. Master, recordings and shared engine preserved; local copies updated
and isolated Linux containers/VM stopped. See report for retained setup failures.

Previous local-file playback repair — 2026-10-19:
[Preload, routing and transport transitions](media-preload.md) **PASS (bounded
technical scope)**: connect before loading, use metadata preload, coalesce pitch
changes after pause and fade the native input to prevent post-pause effect refill.
All four Mac/Linux Chromium/WebKit runs pass 43 studio checks; 38 unit checks per
platform pass. Mac prepared A/C sessions pass 29 checks in each browser after
isolating the missing-recorder test context; failed setup runs are retained.
All 34 offline WAVs are byte-identical; echo frames and prepared timing agree
exactly, with no missing signal frames in the measured A/C sessions. Linux WebKit completes 60 strict restart cycles and 45 local-file
active-rate cycles. HTTP active-rate control remains **FAIL**; precise native
cause and historical screenshot-freeze repeatability **PARTIAL**. Physical
latency, venue and new listening **NOT RUN**. Overall specification/production
**PARTIAL**. Master, recordings and shared engine unchanged; local bundles
refreshed and isolated Linux services stopped afterward.

Previous browser playback reliability — 2026-10-19:
[Bounded manual starts and native-media restart diagnostics](media-restart.md)
**PASS (recovery scope)**: stuck/never-resolving starts report failure and restore
controls; cancellation and late-result handling preserve newer playback and the
other deck. Mac Chromium/WebKit and Linux Chromium each pass 42 studio checks;
Mac/Linux each pass 34 unit tests. All 24 WAVs are unchanged and measured echo
frames agree exactly. Linux WebKit startup/restart remains **FAIL**, reproduced
outside Djayvo in a fresh container without memory-limit events; precise cause
**PARTIAL**. Rejected restart workarounds and initial harness/test failures are
retained. Physical latency, venue and new human listening **NOT RUN**. Master,
recordings and DSP unchanged; local bundles refreshed and Linux services stopped.

Previous shared-engine optimization — 2026-10-19:
[Precomputed common interpolation coefficients](interpolation-table.md) **PASS
(technical)**: empty-cache sampled-note setup avoids the common filter calculation.
Mac/Linux 15/15 suites, sanitizer, exact coefficients, 75 unchanged WAVs per
platform, 1,170 old/new WASM note cases, 11 remix comparisons and four browser
captures pass. All compared PCM and event frames agree exactly. Native load
has no observed deadline misses this run; three browser timing screens still
**FAIL** (3–10 ms). Overall live/production readiness **PARTIAL**; physical latency,
venue and musical quality **NOT RUN**. Master and recordings preserved; local
bundles refreshed and isolated Linux services stopped.

Previous shared-engine optimization — 2026-10-19:
[Reuse unchanged interpolation coefficients](interpolation-cache.md) **PASS
(technical)**: sampled voices reuse only an exactly matching cutoff table,
reset all note state and recompute on change. Mac/Linux 15/15 suites, sanitizer,
756 regression cases, exact before/after voice samples, 75 unchanged WAVs per
platform, 11 remix WASM comparisons and four actual browser captures pass.
Repeated note setup improves; total stress throughput is similar and cold starts
still compute coefficients. Browser timing screens **FAIL** (3–8 ms readings);
precise deadline/outlier cause and production remain **PARTIAL**. Physical
latency, venue and new listening **NOT RUN**. Updated local bundles audited;
master/recordings preserved; Linux test services stopped afterward.

Previous browser audio-host evidence — 2026-10-19:
[Production instrument AudioWorklet](worklet-load.md) **PASS (functional scope)**:
sixty-second Mac/Linux Chromium and WebKit runs, exact native reference PCM,
all 1,920 command frames, zero captured sample/timestamp gaps. Six captures,
playable excerpts and 30 Mac / 4 Linux unit checks retained. Coarse timing
screens **FAIL** (3–13 ms readings versus 2.667 ms); precise deadline/cause
**PARTIAL**. Chromium underrun snapshots report zero; WebKit API **NOT RUN**.
Physical latency, full-session/venue and new listening **NOT RUN**. DJ14/DJ17,
M1 and production remain open. Engine/master/recordings unchanged; isolated
Linux container removed, VM stopped and default Docker context preserved.

Previous actual audio-host evidence — 2026-10-19:
[macOS output callback](audio-callback.md) **PASS (bounded technical scope)**:
60 real seconds on the M5's DisplayPort output route, 5,625 callbacks at 512
frames/48 kHz, exact offline PCM and command-frame agreement, no sample-time
gaps or counted C++ allocations. Longest measured callback 4.262 ms against
10.667 ms. Self-tests, sanitizer and focused live suite pass. Prior 128-frame
benchmark failures remain **FAIL**; cause and full live readiness **PARTIAL**.
Browser AudioWorklet, acoustic loopback, microphone latency, venue endurance
and new listening **NOT RUN**. Engine, recordings and master unchanged.

Previous local timing evidence — 2026-10-19:
[Live instrument load and deadlines](live-deadline.md): **PASS** for 600 virtual
seconds per run, 32 simultaneous voices, 60 identical programs, exact Mac/Linux/
WASM PCM and command frames, native allocation checks and focused live tests.
**FAIL** for the strict offline no-overrun gate: initial Mac, first Linux and
Node WASM runs exceed 2.667 ms; clean reruns do not erase those observations.
Cause **PARTIAL**; actual browser AudioWorklet, physical latency, venue endurance
and musical benefit **NOT RUN**. Production remains **PARTIAL**. This adds
reproducible diagnostics and playable instrument output; production engine,
recordings, training candidates and master remain unchanged.


Latest renderer improvement: [Bounded active vocals](active-vocals.md)
**PASS (technical)**: stable event scheduling, unchanged native/WASM audio and
measured offline timing. Live latency and new musical quality **NOT RUN**;
M1 and production remain open.

Previous engine fix: [Offset-resistant vocal pause detection](chop-offset.md)
**PASS (technical)**: known endings, native/WASM agreement and saved-score
compatibility. One licensed speech source changes crops; new word accuracy and
musical benefit **NOT RUN**. M1 and production remain open.

Previous engine fix: [Sustained-note period selection](pitch-period.md) **PASS**
for known-tone calibration and native/WASM portability. Four licensed speech
inputs change selected tonic; verified speech pitch and musical benefit remain
**NOT RUN**. This does not close M1 or production gates.

Latest local research: [Phrase articulation](phrase-articulation.md) has four
matched owner A/B pairs and exact Mac/Linux rendering. **PASS:** technical
isolation and playable audio. **NOT RUN:** listening benefit, default promotion
and learned source-response behavior. Existing quality/release gates remain open.

**Current authorization — 2026-10-18:** The owner's latest “continue with the
spec, finish everything” supersedes the earlier console-only increment and
M0a review stop for remaining local implementation. Continue the browser musical
improviser and available specification work without per-step approval; preserve
local changes, recordings, evidence and the immutable master. The
[prepared A + C session](prepared-session.md) connects the local phrase director to the mixer.
Human quality, actual hardware/venue evidence and M1 prerequisites for production
learned AI remain required. Phone and hosted-infrastructure work remain paused;
new paid compute, publication and monetization still need explicit authorization.


Latest local validation: [Linux browser portability and recording fallback](linux-browser.md).
**PASS (technical):** Linux ARM64 Chromium prepared session (29 checks), WebKit
imported-phrase/playback/offline paths (28 checks), explicit unavailable-recording
UI on both studios, and native Mac Chromium/WebKit capability controls.
**PASS:** Chromium manual decks (40 checks); 22 exact Mac/Linux piano WAV
comparisons and matching event frames.
**FAIL:** Linux WebKit manual startup/repeat; software-sink diagnostics still fail.
Two focused restart candidates failed and were not applied.
**PARTIAL:** Linux WebKit session overall: its build lacks MediaRecorder; two
capture checks are **NOT RUN**. DJ14/DJ17 reliability and full specification remain
**PARTIAL**. Physical Intel Linux, microphone/MIDI, latency, venue and formal
listening evidence remain **NOT RUN**.

Previous local implementation: [Cancellable prepared playback](start-cancellation.md).
**PASS (technical):** visible pending A/C starts, usable Stop during resume,
protected retries and pending-preview consent cleanup; 26 unit / 56 final session
checks, integrated/offline browser flows, exact event frames and ten unchanged
piano WAVs. Fifteen further WebKit manual-loop sequences pass.
**PARTIAL:** original intermittent startup/loop failures (DJ17/DJ14) remain
unexplained; full specification. **NOT RUN:** new native/Linux browser, physical
latency, formal listening and venue readiness.

Previous local implementation: [Rhythmic C echoes and reset timing](beat-echo.md).
**PASS (technical):** tempo subdivisions, manual/MIDI restoration, requested delay
retention after mid-ramp clearing; 26 unit, 80 DJ and 50 session checks, integrated/
offline controls and playable WAVs. Independent PCM counter replaces unreliable
timestamp-only dropout inference; original failures and calibration retained.
**PARTIAL:** startup repeatability (DJ17), manual loop reliability (DJ14) and full
studio. **NOT RUN:** formal listening, physical timing and venue readiness.

Previous local implementation: [Performance C tone and echo](performance-effects.md).
**PASS (technical):** C preview/bar-entry effects, three additional MIDI Learn
controls, cleared voice echoes and accurate preview-stop status; 80 DJ/46 session
and 24 unit checks, integrated/offline audio and playable PCM comparisons.
**PARTIAL:** full studio and unexplained WebKit manual-loop timeout (DJ14), despite
15 additional passing cue/jog/rate sequences and two full passing WebKit runs.
**NOT RUN:** physical MIDI/microphone/latency, Linux browser, formal listening and venue.

Previous local implementation: [MIDI Learn](midi-learn.md).
**PASS (technical):** 23 bounded CC targets with pickup, manual rearm and safe
input lifecycle; 80 final DJ/38 session checks, 24 unit checks and integrated/
offline audio evidence. **PARTIAL:** studio and intermittent WebKit whole-track
loop reliability (DJ14); failed receipt retained despite successful final/isolated
reruns. **NOT RUN:** physical MIDI, latency, Linux browser, formal listening and venue.

Previous local implementation: [Deck tone and echo](deck-effects.md).
**PASS (technical):** independent A/B controls including prepared A, mute-safe
routing and cleared delay buffers; 70 DJ/38 session browser checks, 23 unit checks,
exact echo frames, playable WAVs and offline/integrated desktop/mobile evidence.
**PARTIAL:** full studio. **NOT RUN:** new native/Linux browser execution,
physical latency, formal listening and venue endurance.

Previous local implementation: [Major/minor prepared performances](session-modes.md).
**PASS (technical):** 288 context plans, actual Mac/Linux tests, eight exact
Mac/Linux/WASM event/PCM comparisons, unchanged historical minor outputs and
major-mode browser generation with safe context changes. **PARTIAL:** full live
studio. **NOT RUN:** new formal listening, physical timing and venue readiness.

Previous local implementation: [MIDI instrument input](midi-input.md).
**PASS (technical):** opt-in input selection, velocity, channel sustain and drum
mapping, safe switching/disconnect/permission races, real worklet output and
cached operation. Chromium/WebKit synthetic-port and integrated-site evidence
is retained in the report. **PARTIAL:** DJ06 and full studio. **NOT RUN:** physical
MIDI controllers, round-trip latency, Linux browser and musical-quality acceptance.

Previous local implementation: [Prepared A + C session](prepared-session.md).
**PASS:** context-bound C++ phrase responses, absolute bar scheduling, prepared
Deck A playback plus C preview/entry/fader/stop, opt-in capture/import, cancellation
and local failure handling. Reproducible native/browser/offline evidence is in the
linked report. **PARTIAL:** full live/production studio. **NOT RUN:** formal
listening, physical microphone/output latency and venue endurance for this path.

Audited 2026-10-18 against the complete, unchanged master specification and the
owner's later instructions. **Overall specification: PARTIAL.** Continuing
implementation does not waive formal quality evidence or authorize publication.
The web is the selected product platform; phone and hosted infrastructure work
remain paused. The latest instruction authorizes remaining local implementation; external evidence gates remain required.
[TODO](../TODO.md) tracks individual past/future work and evidence links.

Previous local implementation: [Talk bass and extra percussion](talk-bass.md).
**PASS:** original shared-core formant bass, four new pads, local pipe-reference
measurements, Mac/Linux 15/15 suites each, sanitizer, PCM agreement, 48 DJ browser
checks, 19 unit and 40 voice regressions. Playable demos retained locally.
Exact artist rig identification **PARTIAL**; reference listening, musical quality,
physical latency and venue readiness **NOT RUN**. Full studio remains **PARTIAL**.

Previous local follow-up: [Instrument tone and echo](instrument-effects.md).
**PASS:** real tone/echo controls, 46 two-browser DJ checks, 19 unit checks,
40 voice regressions, playable dry/echo piano WAVs, offline reload and integrated
site verification. Browser timing/waveform measurements are retained; native
and Linux browser execution this increment are **NOT RUN**. Full workflow remains
**PARTIAL**; musical quality, hardware latency and venue acceptance **NOT RUN**.

Previous local implementation: [Performance console and live instruments](dj-console.md).
**PASS:** 88 piano keys, nine melodic patches/two drum kits, real deck transport,
EQ, pitch/cue/loop and instrument controls; native Mac/Linux and WASM comparison
with identical PCM; playable palette retained locally. **PARTIAL:** full DJ/AI
workflow and live timing. **NOT RUN:** human reference-quality acceptance,
physical latency, Linux browser, venue endurance and production release.
The master, supplied speech fixture, owner source and x/y/z originals are unchanged.

Historical local follow-up: [Waveform diagnostics](style-waveform-diagnostics.md).
**PASS:** calibrated training-excerpt scan (40 pairs; no flags), repetition and
two-seed measurements, three tests and preserved artifacts. Sixteen repeated
windows occur in the second bass seed across base/adapter; musical significance
is unassessed. Copying/variety assessment **PARTIAL**; human quality, independent
holdout and production **NOT RUN**. Owner “continue” is not a listening rating.
No new rental or model promotion; concealed review unchanged.

Latest model research: [Completed style-adapter trial](style-training-retry.md).
Owner-approved replacement GPU training, verified adapter/checkpoint, exact base
repeat, four changed matched pairs, two-browser playback and rental/key cleanup
**PASS**. Observed combined debit $0.193221; final billing **PARTIAL**. Dataset
readiness remains **PARTIAL**: five provisional excerpts, unstable detailed
machine labels discarded. Human quality, independent holdout, perceptual copying
and learned source-response behavior **NOT RUN**. The research-only M1 exception
does not advance production gates; master unchanged. Initial host SSH **FAIL**
remains in the historical evidence.

Latest engine change: [Source phrase development](source-motif.md) **PASS**
technically: chronological rhythm, source accents and two-bar Call & Response
answers/returns. Owner reports “More connected” on four labeled comparisons
(informal listening PARTIAL); reference-level quality and
general contextual development remain **NOT RUN**. C06 remains **PARTIAL**.

Latest research: [x/y/z reference measurements](reference-xyz-analysis.md) **PASS**;
direct listening **NOT RUN**. Owner emphasizes source-led musical development.
Current rules provide phrase responses but no general contextual development of
a source motif; C06 remains **PARTIAL**, with new engine work/evaluation open.

| Master area | Status | Implemented / remaining |
| --- | --- | --- |
| §1 Instant Remix product | PARTIAL | Record/import, trim, three takes, regeneration, play/save/share implemented; human recognizability, meaningful audible diversity and production acceptance remain |
| §2 portable hardware workflow | PASS | Actual M5 and Linux arm64 execution; isolated environments; original physical Intel rerun remains NOT RUN |
| §3 portable engine and clock | PASS | C++17, deterministic integer-frame scheduling, bounded polyphony, offline WAV/stems, source provenance and cancellation |
| §3.1 full instrument/effect breadth | PARTIAL | Sampled piano/bass/drums, electronic palette, bounded independent voice pitch/time and finite tempo echoes; recorded guitar strum/muting now implemented; organ and dedicated pad/lead roles now implemented; opt-in bounded feedback reverb implemented; tempo maps and track mix automation now implemented; transformed-voice listening remains open |
| §3.2 input analysis | PARTIAL | Bounded decoding/resampling, energy/onset/pitch heuristics and pause-aware crops; optional offline CPU word-time estimates and conservative crop proposals implemented; verified timing, semantic selection and classifier remain open |
| §3.3–3.4 plans and creative direction | PARTIAL | Rule grammars with seed-selected hip-hop and syncopated funk, developed returns and input-timed responses, typed native plans, JSON export and now strict offline import with explicit fallback; standalone hybrid/call-response and bounded recent-structure rejection and broader reggae/experimental/club harmony/groove implemented; learned direction/ranking, provider retry policy and quality comparisons remain NOT RUN |
| §4 musical quality and creativity | PARTIAL | Informal owner improvement feedback and matched controls; diverse blinded comparison, perceptual novelty and target thresholds remain NOT RUN |
| §5 bundled rights | PASS | Pinned cleared acoustic bank, original electronic bank, asset hashes and notices; model weights are not bundled. A private research adapter used owner-permitted references; model/catalogue release rights still require their own review |
| §6 model strategy | PARTIAL | Separate bounded RTX 3090 inference and adapter-training trials executed, artifacts retrieved and rentals removed; M5 constrained-director benchmark, source identity evaluation and formal model-versus-rule listening remain NOT RUN |
| §7 iOS | PARTIAL | Native app, simulator and some actual-phone tests, owner capture/playback confirmation; hardware lifecycle/routes, sustained thermal/battery and production release remain open; paused by owner |
| §8 privacy/trust | PARTIAL | Local consent, validation, no automatic upload, delete and bundle checks; local explicit submissions, distinct reviewer approval, reports and withdrawal now implemented; deployed moderation operations, retention/deletion and final public policy remain unverified |
| §9 economics | PARTIAL | Local rendering has no per-play provider cost; bounded trial recorded. Production entitlements, credits/payment ledger, production TTL/budget enforcement and margin validation remain unimplemented; local storage reservations/quotas and cleanup are implemented; no monetization authorized |
| §10 evaluation/telemetry | PARTIAL | Machine reports, reproducibility, frozen licensed multi-source cohort and blank blinded packets; recorded quiet coverage, human category verification, independent reviewers, human scores and retention/share outcomes missing |
| §11 repository/builds | PARTIAL | Monorepo, dependency/asset records, local commands and CI configuration; hosted CI execution and hosted release remain NOT RUN |

## Current milestone gates

| Gate | Status | Required next evidence or implementation |
| --- | --- | --- |
| M0a technical foundation | PASS | Retain technical regression evidence |
| M0b/M0c musical acceptance | PARTIAL | Readable hooks, coherent/enjoyable music and audible strategy variety assessed by listeners |
| M0d portability | PASS | Actual M5/Linux arm64 evidence; scope does not include unavailable Intel hardware |
| M1 formal quality baseline | NOT RUN | Licensed cohort prepared; remaining coverage/verification and independent blinded observations required; owner recording stays owner-only |
| M2 constrained AI director | PARTIAL | Offline import/fallback prerequisite implemented; model integration/benchmark and quality advancement remain NOT RUN behind M1 |
| M3 device prototype | PARTIAL | Existing implementation and device evidence retained; remaining phone work paused |
| M4 live improvisation | PARTIAL | Prepared A/C session and live instrument controls implemented; bounded M5 native callback and Mac/Linux instrument worklet validation PASS, coarse timing screens FAIL; full browser scheduling, continuous capture/feedback, actual round-trip latency and battery/venue evidence remain open |
| M5 production/monetization | PARTIAL | Release/privacy preparation exists; quality, demand, moderation, infrastructure, economics and release approval remain open |

This ledger exposes unfinished code as well as missing tests. Neither a successful
model rental nor an accepted JSON plan closes musical-quality gates. No ratings,
speaker consent, release approval or artist-level quality are inferred from
“continue finish the spec.” The owner has already said no additional cleared clips
are available; repeated requests do not supply that dataset.

Latest evaluation workflow: [Blinded listening form](listening-review.md).
Local verified packet copying, blank questionnaire and CSV export PASS; original
study forms untouched. Actual observations and independent M1 evidence NOT RUN.
Latest lifecycle fixes: [Catalogue recovery](catalogue-withdrawal.md).
Playlist slot recovery, withdrawn-report queue filtering, stale-review rejection
and displayed-report-only resolution pass local database/browser checks. Actual
moderation operations, rights review and hosted behavior remain NOT RUN.
Latest maintenance: [Expired-auth cleanup](auth-cleanup.md).
Bounded expiry deletion, indexes and local usage checks PASS. Live scheduling,
Neon compute/transfer, overload and production retention remain NOT RUN.
Latest product implementation: [Reviewed catalogue and playlists](reviewed-catalogue.md).
Local submission/review, public-only queries, persistent playback and private
playlists pass database and two-browser checks. Test approvals are synthetic and
removed; real permissions, musical quality, live publication and moderation
operations remain NOT RUN. No commercial/training rights are inferred.
Previous: [Private account audio](private-account-audio.md).
Private saves, storage consent, owner-scoped playback/download, quota reservations
and retryable deletion are locally implemented and tested. Live provider behavior,
cleanup scheduling, hosted public catalogue and production budgets remain unverified or
unfinished. Music quality and release gates remain open.
Previous: [Research input validation](research-input-validation.md).
Optional voice/speech utilities reject constant offsets and empty decoded speech.
M5 tests and unchanged comparison outputs PASS; timing accuracy, existing model
platform disagreement and independent musical-quality evidence remain open.
Previous: [Constant-offset input rejection](dc-input-validation.md).
The core no longer exports mixes from constant electrical offsets. Accepted
owner/fixture/cohort outputs retain exact PCM and event frames; human quality,
learned direction, paused infrastructure/device work and release remain open.
Previous: [Optional web installation](web-installation.md).
Manifest, original icons and user-triggered install support are implemented and
locally checked at root/site scopes. Physical installation/launch, independent
listening and release remain NOT RUN; full specification remains PARTIAL.
Previous: [Optional offline studio](offline-studio.md).
The user can retain the app/engine for offline creation and remove that cache
without deleting mixes. Bounded verified caches and lifecycle checks pass; this
does not close installation, hosting, human-quality or release gates.
Previous: [Browser recovery and Firefox validation](web-recovery.md).
Healthy sessions survive malformed stored entries, all three browser workflows
pass, and seven Firefox/native renders agree exactly. Human quality and release
remain open.
Previous: [Licensed multi-source evaluation and transient-input fix](licensed-evaluation.md).
The wider cohort exposed a short-transient rejection, now fixed with bounded
context; source acquisition never supplies human ratings.
Previous local engine work: [Bounded instrument reverb](feedback-reverb.md) and
[optional offline word timing](word-timing.md). Reverb portability PASS; model
fixture timing agreement FAIL; human timing accuracy/listening NOT RUN.
Previous local engine work: [Sustained instruments and broader arrangement variety](sustained-instruments.md).
New organ/pad/lead voices, compatible saved-score replay and private comparisons.
Perceived quality and variety remain NOT RUN.
Previous local engine work: [Recorded guitar and articulated strums](guitar.md).
90 exact M5/Linux WAVs and seven browser styles pass; eight matched owner pairs
are ready. Guitar realism/acceptance NOT RUN.
Previous local engine work: [Call-response, hybrid and recent-composition rejection](creative-strategies.md).
80 exact M5/Linux WAVs, seven browser styles and retry/persistence flows pass.
Eight private owner takes are ready; listening NOT RUN.
Previous local engine work: [Funk composition and web integration](funk.md).
Native/CLI/C ABI/export contracts, five WASM styles, full local browser flow and
50 exact M5/Linux WAVs pass. Four owner comparisons are ready; listening NOT RUN.
Previous local engine work: [tempo maps and mix automation](timeline.md).
Native/import/schema/echo/stem contracts and 40 exact M5/Linux WAVs pass.
The optional plans are ready for listening; automatic selection remains open.
Previous local engine work: [hip-hop composition variety and evidence](hiphop-diversity.md).
64 tested seeds yield 48 distinct instrumental structures; human-perceived
variety is NOT RUN. Four owner before/after pairs are matched for listening.
Previous local engine work: [selective tempo echo and evidence](vocal-echo.md).
Independent pitch/time evidence is retained in [the previous report](voice-transforms.md).
The default apps keep original-speed fragments pending listening.
Previous local prerequisite: [plan import/fallback and reproducible evidence](plan-import.md).
Current M5/Linux release and WASM technical checks: **PASS**; hip-hop comparison
has exact event frames and 45 cross-platform WAVs. Final M5 sanitizer tests pass
10/10 suites. These do not close any listening/release gate above.
Latest creative listening package: [selective human-voice comparisons](../renders/voice-research-20261018/review/index.html).
