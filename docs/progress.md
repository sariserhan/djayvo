# Jamloom: M0 continuation evidence

Latest product rename — 2026-10-19: **Jamloom** is the official product name.
See [rename scope and validation](jamloom-rename.md). Historical evidence below
retains its original names, paths, receipts and observations; it is not fresh
validation of the renamed build. Use the current README for build commands.

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

Latest deployment-build repair — 2026-10-19:
[Clean website build](vercel-clean-build.md) **PASS (local build scope)**.
Fresh Amazon Linux 2023 x86_64 and Mac source builds compile both WASM engines
before auditing/copying them. Missing SDK/CMake/Python are isolated locally.
Seven site unit tests per platform and bundle audits pass; seven browser render
WAVs/plans/event frames match exactly, PCM differences zero. Initial failures
and fixes are retained in the report; CI regression job added. Actual Vercel
redeployment and remote CI **NOT RUN**; overall production remains **PARTIAL**.

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

**Current authorization — 2026-10-18:** The owner's latest “continue with the
spec, finish everything” supersedes the earlier console-only increment and
M0a review stop for remaining local implementation. Continue the browser musical
improviser and available specification work without per-step approval; preserve
local changes, recordings, evidence and the immutable master. The
[prepared A + C session](prepared-session.md) connects the local phrase director to the mixer.
Human quality, actual hardware/venue evidence and M1 prerequisites for production
learned AI remain required. Phone and hosted-infrastructure work remain paused;
new paid compute, publication and monetization still need explicit authorization.


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

Latest renderer improvement — 2026-10-19:
[Bounded active vocal processing](active-vocals.md) **PASS (technical)**:
keep at most 16 active triggers, expire at measured frame boundaries and preserve
summation order. Mac/Linux suites, sanitizer, 75 byte-identical old/new/cross-OS
WAVs and 11 WASM comparisons pass. Dense/echo plans and 129-event scheduling
regression validate full-pool reuse, original output and allocation-free processing.
Dense/echo offline renders improve by 2.16–2.39× on M5 and 1.90–2.14× on Linux;
sparse medians are slightly slower (2.9%/1.0%), so no general speedup is claimed. Live/device
latency and new musical quality **NOT RUN**; full production remains **PARTIAL**.
No new training, rental, upload or change to the listening comparisons.


Previous shared-engine fix — 2026-10-19:
[Offset-resistant vocal pause detection](chop-offset.md) **PASS (technical)**:
48 controls, actual Mac/Linux 15/15 suites, sanitizer, 107 exact cross-OS WAVs,
17 WASM comparisons and 11 saved-score replays. All 65 original owner/fixture
WAVs remain identical. Source PCM and waveform edge selection are preserved.
One of 20 licensed speech inputs changes crops; fresh club comparisons exist,
but new word-boundary accuracy and musical preference are **NOT RUN**. Frozen
study and prior reviews intact; local web engine rebuilt/audited. Overall
quality/production **PARTIAL**; no model training, upload or paid compute.


Previous shared-engine fix — 2026-10-19:
[Sustained-note period selection](pitch-period.md) **PASS (technical)**: later
period multiples no longer win merely by fitting the integer sample grid.
180 known-tone combinations, Mac/Linux suites, sanitizer, 74 exact cross-OS WAVs,
six saved-score replays and 12 WASM comparisons pass. All 65 original owner/
fixture WAVs stay identical. Four of 20 licensed speech inputs select a different
tonic; fresh comparisons exist, but speech F0 accuracy and musical preference
are **NOT RUN**. Frozen study and pending reviews preserved; rebuilt local web
engine; no model training or paid compute. Overall quality/production **PARTIAL**.


Latest local musical experiment — 2026-10-19:
[Phrase articulation candidate](phrase-articulation.md) **PASS (technical)**:
five tests, four controlled pairs, eight Mac/Linux plan imports, 40 exact WAVs,
unchanged voice/bass/drum stems and note attacks, 16 matched HTTP-decoded review
files. Listen at `http://127.0.0.1:4196/review/`, including piano-only versions.
Piano durations follow phrase spacing; no new learned behavior or quality claim.
**NOT RUN:** human preference, candidate browser/device checks and promotion.
Default engine, sources and previous reviews preserved; no paid compute. C13 and
broader musical quality remain **PARTIAL**. No further preferences were inferred.


Previous shared-engine fix — 2026-10-19:
[Offset-resistant phrase analysis](analysis-offset.md) **PASS (technical)**.
Remove constant electrical offset from analysis only, retaining original PCM,
raw levels and gain rules. The control recovers 15 source attacks instead of
six distorted detections. Mac/Linux 15/15 suites, ASan/UBSan, 70 exact cross-OS
WAVs, six saved-score replays and 12 native/WASM comparisons pass; 65 original-
input WAVs remain unchanged. Rebuilt/audited local web engine. **NOT RUN:** new
human quality, physical microphone and rendered-browser interaction. Overall
music/production **PARTIAL**; no new rental, training or quality-gate promotion.
[Full measurements](evidence/analysis-offset/measurements.json).


Previous local training follow-up — 2026-10-19:
[Adapter effect and split audit](style-adapter-effect.md) **PASS (technical)**:
five tests, 16 matched-checkpoint comparisons, 64 train/holdout pairs, exact
agreement with prior diagnostic results, four playable reference crops and
preserved originals/models. Blood Club bass/funk remain strongly correlated
with the matched base. Two waveform windows cross the train/holdout split;
independent source-group split **FAIL**. Perceptual interpretation **PARTIAL**;
independent generalization, human preference and musical improvement **NOT RUN**.
No new training, rental, upload or production change.


Latest training execution — 2026-10-19: [Blood Club GPU trial](blood-training-run.md)
**PASS (technical)**: 16 clips, verified 80/160-step adapters, 13 retrieved WAVs,
exact base repeat, 38 local regression tests and confirmed rental/key cleanup.
Fixed decimal checkpoint-name loading and resumed without retraining or another
rental. Four matched A/B/C groups: `http://127.0.0.1:4195/review/`. No strong
training-waveform matches; repeated passages remain. Dataset/pairing and novelty
**PARTIAL**; independent generalization, human preference and production release
**NOT RUN**. No checkpoint promoted. Observed debit $0.124824; final billing
**PARTIAL**. Originals, master, previous adapter and C++ engine preserved.


Prior contour experiment — 2026-10-19: the owner deferred streaming-library integration
and prioritized musical intelligence and training quality. [Source-contour
research](source-contour.md) produced four matched pairs and passed Mac/Linux/
WASM technical checks. Owner response: **“No clear difference.”** Audible-benefit
promotion **FAIL**; owner listening **PARTIAL**. The candidate patch and audio
are retained as research; the original engine and local studio were restored.
That contour experiment did not train a model or use paid compute. Its formal
quality remained **NOT RUN**. The later Blood Club run above adds style-training
evidence; paired source/response data and independent evaluation remain missing.


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

For completed development, open tasks and future milestones, use the
[development tracker](../TODO.md). This file retains the detailed evidence record.

Recorded 2026-10-17, America/New_York. The owner authorized continuing without
per-step approval, then requested a Mac handoff after finishing Linux work. The
master specification is unchanged. The original M0a record is
[m0a-report.md](m0a-report.md), with its initial Git commit `02d0e18`.

**Current Apple M5 and Linux arm64 technical checks: PASS. Overall M0: PARTIAL.**

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

Latest model research, 2026-10-18: [Completed adapter trial](style-training-retry.md).
**PASS:** owner-approved replacement GPU, corrected decode headroom, five selected
clips preprocessed, 250 optimizer steps, finite/nonzero adapter, nine retrieved
WAVs, exact base repeat, four changed level-matched pairs, two-browser playback
and rental/key cleanup. Review: http://127.0.0.1:4193/review/ . Observed combined
cost $0.193221; final billing **PARTIAL**. **PARTIAL:** provisional dataset/content
readiness; automatic detailed labels were inconsistent and discarded. **NOT RUN:**
human quality, independent holdout, learned source-response
behavior and production advancement. C07/full specification remain **PARTIAL**.
Master, original references, initial candidates, supplied fixture and owner voice
are preserved; z and owner microphone audio stayed local. Initial host SSH
**FAIL** and recovered training path errors remain in the evidence.

Latest engine work, 2026-10-18: [Source phrase development](source-motif.md).
Call & Response preserves chronological source rhythm/energy accents in two-bar
answers and develops the return, leaving more vocal space. **PASS:** M5/Linux
14/14 release suites each, 65 exact cross-OS WAVs, 21 native/WASM comparisons,
five old-score replays, seven unchanged styles and two-browser review playback.
Four private matched pairs: http://127.0.0.1:4192/review/ . Owner reports After
feels “More connected” (**PARTIAL** informal listening); formal/reference quality
**NOT RUN**, C06/full specification **PARTIAL**. Sanitizer details remain
in the linked report. Master, existing recordings and frozen cohort preserved.

Latest owner reference research, 2026-10-18: [x/y/z analysis](reference-xyz-analysis.md).
Full-file signal measurements, four CLI safeguards and three exact measurement
reruns **PASS**. Direct listening **NOT RUN**. The owner's requested direction
is to develop the source phrase into an original composition; current finite
grooves/forms and limited onset motifs leave that goal **PARTIAL**. Report maps
the planner gaps and next source-led development checks. No engine, frozen cohort,
source recording or master specification changed; no new musical-quality claim.

Latest local evaluation workflow, 2026-10-18: [Blinded listening form](listening-review.md).
Verified packet copies now include a private browser questionnaire with blank
judgments and two compatible CSV downloads. **PASS:** 21 packaging checks, 2/2
affected CTest suites, ten synthetic browser workflow checks and real licensed
packet play/seek in Chromium/WebKit. Five audio copies are byte-identical; all
483 frozen form rows remain blank. Actual observations, M1 and musical quality
**NOT RUN**; full specification **PARTIAL**. Local ready page: http://127.0.0.1:4191.

Latest local lifecycle fixes, 2026-10-18: [Catalogue recovery](catalogue-withdrawal.md).
Unavailable playlist entries are removable without exposing former metadata;
withdrawn reports stay archived; new reports invalidate stale decisions; reviews
resolve only their displayed ten concerns. **PASS:** 33 unit/integration checks,
22 catalogue browser checks, 20 account regression checks, build/types/bundle.
No DSP/audio changes. Live providers, human listening and phone **NOT RUN**;
W11/full specification **PARTIAL**. Test content remains synthetic and local.

Latest local maintenance, 2026-10-18: [Expired-auth cleanup](auth-cleanup.md).
Target-guarded batches remove expired sessions/verification records, skip locked
rows and preserve active accounts. Migration 0005 adds expiry indexes. **PASS:**
29 unit/integration checks, build/types, local migration and guarded execution;
local database is 8,821,783 bytes with no user accounts or saved tracks after
fixture cleanup. **NOT RUN:** hosted scheduling/provider capacity and cost proof.
W09/full specification remain **PARTIAL**.

Latest local web implementation, 2026-10-18: [Reviewed catalogue and playlists](reviewed-catalogue.md).
Separate publication consent, revision-bound independent review, search/filtering,
track pages, persistent player, private playlists and report/withdrawal controls
are implemented locally. **PASS:** 28 unit/integration checks, 16 catalogue browser
checks plus 20 account regression flows, build/types/bundle checks. Public WAVs
match uploaded bytes exactly. **NOT RUN:** actual permission/quality reviews,
live provider/publication and moderation operations. W11/full spec **PARTIAL**.
Synthetic test approvals were removed; no owner recording was published.

Previous local web implementation, 2026-10-18: [Private account audio](private-account-audio.md).
Explicit private saves, validated metadata-free WAVs, quotas, playback/download,
removal and retryable cleanup now exist. **PASS:** 20 unit/integration checks,
Node 22 build, Chromium/WebKit ten flows each, byte-identical stored/downloaded
mixes and unchanged studio bundle. Live R2/Neon/Resend, cleanup scheduling and
new listening **NOT RUN**; W10 and full specification **PARTIAL**. Hosted services
and phone work remain paused; only the isolated local database/files were changed.

Latest local research validation, 2026-10-18: [Research input validation](research-input-validation.md).
Optional speech/voice tools now reject constant offsets; the speech worker also
rejects empty/short decoded buffers before inference. **PASS:** 11 unit tests,
existing crop integration, all 42 existing comparison WAVs and six event plans
unchanged (maximum/RMS difference zero), and identical M5 owner/fixture speech
estimates. New Linux/device execution and listening **NOT RUN**; earlier model
platform agreement remains **FAIL**. Full specification **PARTIAL**.

Latest engine validation, 2026-10-18: [Constant-offset input rejection](dc-input-validation.md).
The silence gate now rejects constant electrical offsets and subthreshold
variation without altering source samples or accepted arrangements. **PASS:**
M5/Linux 13/13, 12 rejected controls on each, 16 exact before/after and cross-OS
WAVs, 23 unchanged frozen cohort outputs, seven exact Chromium/native renders
and 59 browser workflow checks. Final M5 ASan/UBSan affected suites: **PASS**,
3/3 in 200.55 seconds. **Human listening NOT RUN; full specification PARTIAL.**

Latest web continuation, 2026-10-18: [Optional web installation](web-installation.md).
Relative manifest identity/scope, original icons and a user-triggered installation
flow now work at the root and `/studio/`. **PASS:** 38 offline/manifest checks,
20 Chromium workflow checks, 14 unit tests and public/site bundle audits.
**NOT RUN:** physical OS installation/launch, microphone, new listening and
release. Full specification **PARTIAL**; music engine and protected audio unchanged.

Previous web continuation, 2026-10-18: [Optional offline studio](offline-studio.md).
Explicit offline storage now verifies a bounded public bundle; account/API/audio
requests stay outside the cache. Corrupt installation/update, waiting activation,
cache bounds and removal preserve saved mixes. **PASS:** 32 offline checks across
root/site scopes, 56 ordinary browser checks, 12 unit tests and public bundle
audits. WebKit resource cleanup now detaches players before revoking audio URLs.
**NOT RUN:** physical microphone, home-screen installation, human listening and
release. Full specification: **PARTIAL**; C++/WASM unchanged.

Previous web continuation, 2026-10-18: [Browser recovery and Firefox validation](web-recovery.md).
Malformed stored entries no longer hide healthy mixes; damaged data is retained
until explicit deletion. **PASS:** ten JavaScript tests, 20 Chromium / 18 WebKit /
18 Firefox workflow checks, all seven Firefox/native WAVs and event frames exact
(max/RMS error zero), rebuilt public bundles and privacy audits. Browser selection
now rejects unknown engines and retains each run in a fresh folder. **NOT RUN:**
physical browser microphone and human listening. Full specification: **PARTIAL**.

Previous evaluation continuation, 2026-10-18: [Licensed multi-source evaluation](licensed-evaluation.md).
Twenty distinct public-license speech speakers, three public-domain non-speech
recordings and a separate synthetic silence control are acquired with hashes
and attribution. The wider test found rejection of energetic short transients;
commit `6912218` adds bounded context without changing ordinary speech decisions.
M5/Linux 13-suite release checks and seven-direction browser/native comparisons
**PASS**. The corrected cohort has 276 mixes and 69 blank blinded packets, 69/69 accepted
attempts per style, plus three expected synthetic-silence rejections. All 92
first-seed M5/Linux mixes/events agree exactly (max/RMS PCM error 0); retained
before-fix counts were 66/69 per style. Full M5 ASan/UBSan **PASS**, 13/13 (633.11 s); actual Mac smoke 13/13
(44.99 s). Summary-tool tests pass on M5/Linux; all 483 real packet form rows are
blank and ignored. Independent listening, word-boundary accuracy and formal M1 remain
**NOT RUN**; production/full specification remain **PARTIAL**.

Previous effects/analysis continuation, 2026-10-18: [Reverb](feedback-reverb.md) and
[optional word timing](word-timing.md). **PASS:** M5/Linux current release 13/13,
actual Mac smoke, 91 exact cross-platform WAVs/events, unchanged default/vocal
controls and browser playback. **PASS:** M5 ASan/UBSan 12/12 (480.40 s; snapshot
before the Python word-timing suite). CPU speech analysis runs locally on M5
and Linux; owner frame boundaries agree, but synthetic model estimates differ
(**FAIL** exact model agreement). Crop proposals preserve clean hooks and timing.
**NOT RUN:** timing accuracy and human listening. **PARTIAL:** production/full
specification. New tools and model are optional local research, not bundled.

Previous instrument continuation, 2026-10-18: [Sustained instruments and broader arrangement variety](sustained-instruments.md).
Original organ/pad/lead voices, versioned plans/import/stems, accurate bank reports
and wider reggae/experimental/club harmony/groove are implemented. **M5 release
and actual smoke, Linux release, 93 exact cross-platform WAVs, 42 exact saved-score
replay WAVs and seven-style browser agreement: PASS.** Full M5 ASan/UBSan: **PASS**,
12/12 suites (531.68 s), with final band-edge core/provenance rechecks. Eight matched private
before/after pairs retain full clean hooks. **Human listening: NOT RUN; production
and full specification: PARTIAL.** Existing recordings, fixture and master preserved.
No model, upload, rental, deployment or new phone execution.

Previous instrument continuation, 2026-10-18: [Recorded guitar and articulated strums](guitar.md).
78 pinned CC0 note recordings provide normal/staccato, two normal dynamics and
alternate takes; funk/hybrid now use alternating strums. Plans, strict import,
validation, stems, completion verification and bundled notices include guitar.
**M5/Linux release 11/11, 90 exact cross-OS WAVs, 30 unchanged other-style WAVs,
unchanged owner voice stems, seven-style WASM and full browser flow: PASS.**
Final M5 ASan/UBSan: **PASS**, 11/11 suites (461.89 s).
Eight matched before/after pairs are prepared. **Listening: NOT RUN; full spec:
PARTIAL.** At this checkpoint organ/pad/lead remained open; the continuation above implements them. Later effects/quality/release gates remain open.
No cloud use, reference-track sampling, model, deployment or phone execution.

Previous creative continuation, 2026-10-18: [Call-response, hybrid and repeat checking](creative-strategies.md).
Both new directions, strict plan replay and local web persistence are implemented.
**M5/Linux release 10/10, actual Mac smoke, 80 exact cross-OS WAVs, 30 preserved
legacy WAVs, seven styles in Node/Chromium/WebKit, seven web unit groups and full
UI/retry flows: PASS.** Final ASan/UBSan: **PASS**, 10/10 suites. Eight matched owner takes retain two clean hooks each.
**Listening: NOT RUN; specification/production quality: PARTIAL.** No upload,
model, phone work, paid resource or deployment. Details and first failed UI-test
attempt are retained in the linked report.

Previous composition continuation, 2026-10-18: [Funk and web integration](funk.md).
A distinct syncopated grammar now uses the existing sampled instruments, seed
variation and phrase-timed responses. CLI/C ABI, schemas, completion verification
and local web generation/save/reload/download support it. **M5/Linux release
10/10, 64-seed structural checks, 50 exact cross-OS WAVs, 25 unchanged legacy
WAVs/scores/events, six-style plan replay, five-style WASM and Chromium/WebKit
user flows: PASS.** Four matched owner mixes are ready; **new listening: NOT RUN;
full specification: PARTIAL.** Final M5 ASan/UBSan passes 10/10 suites.
No paid service, audio upload, device work, deployment or new assets.

Latest timeline continuation, 2026-10-18: [tempo maps and mix automation](timeline.md).
Native scheduling, voice/echo timing, stems, versioned export/import, schemas and
Python preparation now share the new timeline. **M5/Linux release 10/10, WASM
12 core groups plus four default styles, 90 invalid-plan cases, 40 exact cross-OS
WAVs, 25 unchanged legacy WAVs and Chromium/WebKit playback: PASS.**
Four private comparisons are ready. **Human listening: NOT RUN; E12 and full
specification: PARTIAL.** Default app arrangements are unchanged. No model, cloud
call, phone work or deployment. The current smoke reference is
`renders/arrangement-linux/timeline-20261018/fixture`. **Final M5 ASan/UBSan
10/10 and the actual Mac smoke script: PASS.**

Latest arrangement continuation, 2026-10-18: [hip-hop composition variety](hiphop-diversity.md).
The previous engine fails the new structural regression: seeds share one harmonic
cycle. The revised shared planner selects chord/rhythm/swing choices and develops
the return. **M5/Linux release 10/10, 64-seed structural audit, 45 identical cross-OS
WAVs, unchanged voice/other styles, old-score replay, four-style WASM agreement
and matched browser audition: PASS.** Final-source M5 ASan/UBSan also passes
10/10 suites. Four owner pairs are ready; **new listening: NOT RUN;
E13 and production quality: PARTIAL.** No learned director, cloud call, phone
work or publication. The immutable master, supplied fixture and owner source
remain unchanged. This phase used smoke reference
`renders/arrangement-linux/hiphop-diversity-20261018/fixture`.

Latest effect continuation, 2026-10-18: [selective tempo echo](vocal-echo.md).
Optional 1.2 plans add three fading stereo repeats to selected fragments, with
native clean-hook clearance, compiled voice limits and finite-tail checks.
**Mac/Linux release and M5 sanitizer 10/10 each, 70 invalid-plan cases, 25 exact cross-OS owner WAVs,
unchanged clean hooks, default WASM and Chromium/WebKit playback: PASS.**
Four private comparisons are ready. This is a finite repeat effect, not a
continuous feedback/reverb implementation or learned creative judgment.
**E04: PARTIAL; new human listening and production acceptance: NOT RUN.**
The master, supplied fixture and owner source are unchanged; no cloud call or
publication. Detailed sanitizer results and versions are in the linked evidence.

Latest engine continuation, 2026-10-18: [independent voice pitch and timing](voice-transforms.md).
Bounded 1.1 plans, offline cached transforms and four private owner comparisons
are implemented. **Four-rate technical tests, strict import/schema limits, exact
Mac/Linux event plans and 20 WAVs, unchanged clean hooks, default WASM regressions
and Chromium/WebKit playback: PASS.** A three-pulse probe retains attacks with
at most 4 ms displacement; it is not an intelligibility result. A reproduced
32-bit WASM resampling overflow is fixed. **E03: PARTIAL; human listening and
production acceptance: NOT RUN.** Default arrangements remain unchanged; no
model, cloud call, phone work or public deployment. Preserved inputs and versions
are recorded in the linked evidence.

Latest engineering continuation, 2026-10-18: [offline plan import and fallback](plan-import.md).
The CLI accepts bounded `1.0-remix` JSON with explicit caller consent and matching
source/request identity, native musical/sample limits and a limited tonal check.
Malformed plans fail by default; opt-in fallback records the decision and runs
the same rule planner. **Five-style exact round trip, 50 rejected candidates,
actual owner replay, M5/Linux release and M5 sanitizer tests (10/10 each), 20 identical cross-OS
WAVs and WASM regressions: PASS.** No model, cloud call, new quality result or
public deployment. Source freezing includes the new CLI header. M2 is **PARTIAL
for this offline prerequisite only**; model integration/benchmark stays **NOT RUN**
behind M1. [Full specification status](spec-status.md) explicitly records remaining
features as well as missing listening/device/release evidence.

Latest local research, 2026-10-18: [selective voice over GPU instrumentals](voice-research.md).
Owner reports the instrumentals are “getting better” and requests human voice
sometimes, with context-dependent creative choices. Six club/hip-hop arrangements
now combine the existing consented source with retrieved beds, leaving roughly
75–78% of their scheduled duration without voice events. Controls, stems and
matched instrumental-only playback accompany them. **Source fidelity, exact
event/WAV repeatability, six regression tests and Chromium/WebKit playback: PASS.**
This uses local energy/grid heuristics, not learned musical judgment. **Prior
GPU owner feedback: PARTIAL; new mix listening, beat alignment, word clarity and
formal quality: NOT RUN.** No new rental, cloud voice transfer, training or app
integration. Master/fixture/owner source hashes are unchanged. C03–C05 track
technical delivery and the remaining creative-quality work separately.

Latest separate model research, 2026-10-18: the owner-funded, $10-bounded
[Vast music trial](cloud-music-trial.md) ran ACE-Step 1.5 on one RTX 3090.
**GPU execution, ten 30-second outputs, verified retrieval, waveform checks and
rental cleanup: PASS.** Warm direct generation took 2.447–2.492 s; the two
planning-LM cases took 23.189/26.344 s. The same-seed repeat is byte-identical;
other seeds produce measured waveform differences, not proven musical variety.
Observed debit is about $0.09; final invoice reconciliation is **PARTIAL**.
**GPU owner listening: PARTIAL** (informal “getting better” feedback); **formal
listening, Stable Audio comparison, cloud speech processing, production
integration and M1/M2 advancement: NOT RUN.** Only original text briefs left
the machine; the master, supplied fixture, owner source and Mac ML environment
remain unchanged. C01/C02 in the tracker separate technical completion from
the outstanding human evaluation.

Latest web implementation, 2026-10-18: [accounts foundation](web-accounts.md)
adds the Next.js shell, Better Auth email/password, verification/reset via a
Resend adapter, generated auth migrations and owner-scoped private track metadata.
**Local build, Postgres lifecycle/security checks, Chromium/WebKit flows and
bundle audit: PASS. W09: PARTIAL. Live Neon/Resend, R2, catalogue and deployment:
NOT RUN.** Final tests run on Node 22 with a separate local Postgres cluster and
captured test email. The existing studio, DSP, supplied speech fixture, master
and owner's recordings are preserved. No new musical-quality claim.

Latest platform design, 2026-10-18: owner accepted Vercel, Better Auth, the Next.js
shell, R2 and private generation plus a reviewed public catalogue, then selected
Neon PostgreSQL Free with no paid database upgrade without approval.
[ADR 0002](decisions/0002-web-platform-auth-and-storage.md) records relational
records in Postgres and audio in R2, with explicit cloud save,
direct transfers, validated immutable assets and separate catalogue approval.
At the design checkpoint, implementation was NOT RUN; the local account slice
above supersedes that implementation status. **Architecture/technology selection:
PASS; hosted integrations, budget validation, provisioning and deployment: NOT RUN.**
Tasks W08–W11 track the remaining work.

Latest priority change, 2026-10-18: the owner requested the web version first
and paused further phone work. [Browser Instant Remix](web-instant-remix.md) now
implements local capture/import, trim, three takes/club, playback, regeneration,
atomic browser persistence, WAV download and confirmed deletion. The same engine
runs as WebAssembly in a worker. Chromium and WebKit generate all four styles with
exact native-Mac plan/event agreement and zero waveform differences. Automated
desktop/mobile flows pass; fake microphone automation is separate from physical
capture and listening. The supplied fixture, owner PCM and master hashes remain
unchanged. **Web technical checks: PASS. Overall web acceptance: PARTIAL.**
No public deployment, new quality cohort, learned AI or production-quality claim.

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
| C++ unit tests | PASS | Current Mac/Linux: 10 foundation + 17 remix test groups |
| C ABI | PASS | Compiled-C render, bounded errors, ABI and additive cancellation/retry checked |
| End-to-end tests | PASS | Current Mac/Linux: CTest 10/10 including both asset banks, evaluation preparation and plan import |
| ASan/UBSan | PASS | Current echo revision: ten suites, no findings |
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
| M2 constrained director | PARTIAL | Offline import/fallback prerequisite PASS; quality baseline and model director benchmark NOT RUN; separate [pretrained trial](cloud-music-trial.md) has GPU timing/memory evidence |
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
optional unverified word-time estimates but no reliable semantic labels. Pitch may have octave errors.
Varispeed couples pitch/time and can alias (current generated chops use rate 1).
Finite instrumental early reflections, bounded independent pitch/time transforms
and opt-in three-repeat tempo echoes exist. Transforms use opt-in 1.1 plans and echoes use 1.2, without formant correction or
human acceptance; bounded opt-in instrument feedback reverb now exists. Tempo maps and mix automation are implemented. Offline CLI JSON import and
explicit rule fallback are now implemented; provider-connected AI planning is
absent. Silence is explicitly rejected. Mixing is fixed per grammar,
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
