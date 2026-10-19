# Djayvo: Apple M5 agent handoff

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

Historical authorization (bounded by the current scope above): the owner authorized autonomous continuation
and asked to finish Linux work, then move to the Mac. Read `AGENTS.md` and the
complete master specification. Never modify the master; its SHA-256 is
`389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2`.

**Historical priority: local DJ-studio foundation. Current musical-quality priority is above; hosted infrastructure and phone work remain paused.**
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

Latest model research: [Completed adapter trial](style-training-retry.md).
The owner approved one replacement with “yes try”, sharing the original $10
ceiling. Actual RTX 3090 training PASS: five provisional x/y clips, 250 steps,
verified adapter and nine WAVs. Four concealed, level-matched pairs are at
http://127.0.0.1:4193/review/ ; restart with the report's server command. Both
rentals are deleted and temporary keys removed; observed combined debit $0.193221,
final invoice NOT RUN. Do not create another rental under these spent instance
approvals. The original and replacement state directories remain separate.
Dataset readiness PARTIAL: detailed machine captions were inconsistent, so
training used a broad caption and no guessed lyrics/tempo/key. Decode headroom
was fixed in fresh copies; old recordings, originals, master and fixture remain
unchanged. z and microphone audio stayed local. Human listening, perceptual copying checks,
independent holdout validity, source-conditioned learning and production gates
remain NOT RUN. Private results/checkpoint: `renders/style-training-20261018/results`.

Latest engine work: [Source phrase development](source-motif.md). Call & Response
now gives the source rhythm/energy accents a two-bar instrumental answer and
developed return. Four owner pairs are at http://127.0.0.1:4192/review/ ; use the
report's loopback server command to restart, preserving all recordings. Native
release, Linux and browser agreement PASS. Owner says After feels “More connected”
(informal listening PARTIAL); formal/reference quality NOT RUN.
Other styles and old saved-score replay remain exact. C06 remains PARTIAL.
Latest owner direction: develop original music from the input phrase, with
selective voice and instrumental motif development. [x/y/z reference report](reference-xyz-analysis.md)
contains complete signal measurements and code-grounded planner limitations.
Seven CLI/repeatability checks PASS; direct listening NOT RUN. Do not describe
measured boundaries as heard musical transitions. Original Downloads MP3s stay
unchanged/outside Git. C06 tracks remaining source-led engine/evaluation work;
the master and frozen listening cohort remain unchanged.
Latest evaluation tool: [Blinded listening form](listening-review.md).
A verified copy of one licensed cohort block is served at http://127.0.0.1:4191
from `renders/listening-review-v2-20261018/packet`. No answers are supplied or
uploaded; two CSV downloads feed the existing summary tool. Packaging and two-
browser checks PASS; all 483 frozen rows remain blank. Keep organizer keys out
of the served directory. Formal listening/independence and M1 remain NOT RUN.
Latest local lifecycle fixes: [Catalogue recovery](catalogue-withdrawal.md).
Generic unavailable entries can be removed; archived reports return on resubmit;
new concerns invalidate stale reviews and unseen report batches remain pending.
33 database/unit and 42 browser checks PASS. No new schema or audio changes.
Hosted publication, actual permission review and quality evidence remain open.
Latest local web work: [Reviewed catalogue and playlists](reviewed-catalogue.md).
Local database migrations through 0005 are applied. Private audio, separate
submission/review, catalogue search, persistent player and private playlists work
at localhost:3000 with Node 22. Tests: 28 unit/integration, 16 catalogue browser
and 20 account regression checks PASS. Test users/approvals removed; no actual
reviewers configured. Hosted catalogue and R2 remain disabled; provider validation,
cleanup scheduling, moderation operations and new listening remain open. Read the
site README before migrations/cleanup; never print `.env.local` credentials.
Latest local maintenance: [Expired-auth cleanup](auth-cleanup.md).
Target-guarded 500-row batches, expiry indexes and usage counts added; 29 checks
PASS, active accounts preserved. Scheduling remains NOT RUN.
Catalogue implementation commit: `b43410e`.
Previous: [Private account audio](private-account-audio.md), commit `f5d2fd7`.
Read [selective voice research](voice-research.md) and [cloud model trial](cloud-music-trial.md).
Latest research: [Optional-tool input validation](research-input-validation.md).
Constant offsets and invalid decoded speech now fail before arrangement/inference.
M5 tests PASS, 42 comparison WAVs and six event plans unchanged, owner/fixture
model estimates unchanged. Research tools remain optional; no Linux/model-parity
fix, new listening, phone execution or infrastructure work is claimed.
Latest engine validation: [Constant-offset input rejection](dc-input-validation.md).
No-signal DC inputs now fail before export; source PCM and accepted arrangements
remain unchanged. M5/Linux release, 16 exact cross-OS renders, all 23 frozen
recorded source checks and 59 browser flows PASS. Native/Chromium events and PCM
are exact. Phone binary not rebuilt; no new listening or deployment. Existing
smoke references remain valid because accepted waveforms are unchanged.
Latest web: [Optional web installation](web-installation.md).
Manifest/icons and user-triggered install guidance are implemented for both scopes.
38 offline/manifest and 20 Chromium flow checks PASS; physical install/launch,
phone execution and musical quality remain NOT RUN. Installation does not
automatically enable offline storage or transfer mixes between browser stores.
Previous web: [Optional offline studio](offline-studio.md).
Enable through Privacy & credits, then reopen. Cached files exclude recordings,
account/API responses; removal preserves mixes. Three-engine lifecycle checks
PASS, including failed updates and actual test-server shutdown. Mobile installed
app/physical microphone/listening remain NOT RUN.
Previous web: [Browser recovery and Firefox validation](web-recovery.md).
All seven Firefox/native WAVs and event frames agree; malformed saved entries
no longer hide healthy sessions. Chromium/WebKit/Firefox workflow checks PASS.
Physical browser microphone and human listening remain NOT RUN.
Latest evaluation: [Licensed multi-source cohort and transient fix](licensed-evaluation.md).
Use the validated cohort and retained failures described there; independent
listening remains NOT RUN. Private owner sources retain their original scope.
Previous: [Reverb](feedback-reverb.md) and [optional word timing](word-timing.md).
Private reviews: renders/feedback-reverb-20261018/review/index.html and
renders/word-timing-20261018/review/index.html. Technical checks PASS; model
fixture agreement FAIL; new listening/word-boundary accuracy NOT RUN.
Previous local engine work: [Sustained instruments and broader arrangement variety](sustained-instruments.md).
Private review: `renders/sustained-instruments-20261018/review/index.html`.
Listening NOT RUN; production quality PARTIAL.
Use `renders/arrangement-linux/sustained-instruments-20261018/fixture` as the
current default-style smoke reference; older regenerated defaults intentionally differ.
Previous local engine work: [Recorded guitar and articulated strums](guitar.md).
Funk/hybrid add recorded guitar with versioned import/stems and bundled notices.
M5/Linux 11/11, 90 exact WAVs and seven WASM styles pass. Private comparison:
renders/guitar-20261018/review/index.html. Listening NOT RUN.
Previous local engine work: [Call-response, hybrid and recent-composition rejection](creative-strategies.md).
CLI styles call_response/hybrid, C ABI 7/8 and web directions are implemented.
M5/Linux release, 80 exact WAVs, seven-style WASM and full browser flows pass.
Private review: renders/creative-strategies-20261018/review/index.html. Listening
NOT RUN. Fresh smoke reference: renders/arrangement-linux/creative-strategies-20261018/fixture.
Previous local engine work: [Funk composition and web integration](funk.md).
Choose Funk in the local web studio or CLI `--style funk` (C ABI 6). Shared
seeded syncopation, short chord stabs and phrase-derived responses preserve two
clean hooks. Native M5/Linux, 50 exact WAVs, five-style WASM and full browser
flows pass. Four matched owner mixes: `renders/funk-20261018/review/index.html`.
Human listening remains NOT RUN. Final M5 ASan/UBSan passes 10/10 suites.
For a fresh Mac smoke use `renders/arrangement-linux/funk-20261018/fixture`.
Existing five strategies are byte-identical; the default three-take set stays
unchanged. Remote library infrastructure remains paused; add funk to its database
strategy constraint before enabling cloud saving.
Previous local engine work: [tempo maps and mix automation](timeline.md).
Optional 1.3-remix plans support step tempo changes and smooth instrument gain/pan
movement. Notes, vocals, echoes and stems share timing. M5/Linux release, 40 exact
WAVs, schema/import and WASM core checks pass. Four private comparisons:
`renders/timeline-20261018/review/index.html`. New listening remains NOT RUN;
default app generation is unchanged. Current smoke reference:
`renders/arrangement-linux/timeline-20261018/fixture`, with a fresh output directory.
Final M5 ASan/UBSan 10/10 and actual Mac smoke: PASS; see the linked report.
Previous local engine work: [hip-hop composition variety](hiphop-diversity.md).
Default hip-hop now varies harmony, coordinated rhythms and swing by seed.
Four matched owner pairs: `renders/hiphop-diversity-20261018/review/index.html`.
M5/Linux release, exact 45-WAV portability, preserved voice and four-style WASM
checks pass; human acceptance remains NOT RUN. That phase used smoke reference:
`renders/arrangement-linux/hiphop-diversity-20261018/fixture`; use a fresh output
directory. Old hip-hop scores replay exactly, but regeneration uses the new
arranger. Other style outputs are unchanged. Final M5 sanitizer tests pass 10/10.
Previous local engine work: [selective tempo echo](vocal-echo.md).
Version 1.2 adds optional bounded echoes; 25 Mac/Linux owner WAVs agree exactly,
with clean hooks unchanged. Private review: `renders/vocal-echo-20261018/index.html`.
Human acceptance remains NOT RUN; apps still select dry default voice treatment.
Previous local engine work: [independent voice pitch/time](voice-transforms.md).
Four owner comparisons are ready at `renders/voice-transforms-20261018/index.html`.
Technical cross-platform and clean-hook checks pass; listening remains NOT RUN.
Default plans remain 1.0/original-speed; opt-in transforms use 1.1. The shared
resampler also fixes a reproduced 32-bit WASM frame-count overflow.
Previous local prerequisite: [validated plan import/fallback](plan-import.md).
The CLI can replay or edit existing scores with explicit consent and bounded
validation. M5/Linux release tests pass 10/10; 20 cross-platform WAVs and event
traces match exactly. This does not connect a model or waive the quality hold.
Use [the full specification ledger](spec-status.md) to distinguish missing code
from missing human/device/release evidence.
The bounded Vast rental was destroyed after verified retrieval. Six new local
voice arrangements and matched controls are ready for listening. Owner says GPU
clips are improving and requests context-dependent voice; new voice-mix listening
is NOT RUN. Do not confuse the local heuristic with a learned director or close
formal M1/M2 gates. Preserve existing recordings and keep speech local.

Web remains the selected product platform:
Read [web Instant Remix](web-instant-remix.md) and [web run instructions](../apps/web/README.md).
The local app is served at http://localhost:4173 by `python3 scripts/web_serve.py`.
Build with `sh scripts/web_build.sh`; the isolated SDK is `build-web-tools/emsdk`
(6.0.1), with no change to `~/mlx-env`. Browser and Node WASM outputs match native
Mac masters/event frames for hiphop/reggae/experimental/club; current human web
listening and physical browser microphone gates are NOT RUN. WebKit persistence
uses byte buffers because its ephemeral context rejected IndexedDB Blobs. Keep
all recordings in `renders/`, outside the static bundle. No deployment was done.
The exact unconfigured Mac smoke command still compares historical M0 artifacts;
use `DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/ios-core-v9/remix` for the
current engine, as documented below. The stale-reference failure and corrected
successful run are both retained in the web evidence.

Update 2026-10-17: actual Apple M5 portability is **PASS**. See
[mac-portability.md](mac-portability.md) for the completed run, exact environment,
reproduction commands, and listening/recording next steps. The original Linux
handoff below is retained as historical context. Human quality remains **NOT RUN**.

Subsequent owner feedback is **PARTIAL** and led to an
[acoustic/arrangement revision](acoustic-review.md), tested natively on M5.
The transferred Linux references belong to the older engine. A subsequent
[arrangement revision](arrangement-review.md) has fresh **PASS** results against
actual Linux arm64 execution in an isolated local VM/container: exact plans/events
and 15 identical WAVs. Native M5 release and sanitizer suites pass 7/7 each.
This does not rerun the original physical Intel machine. Preserve the old
references and the owner's recordings. Read `docs/progress.md` for current gates.

Current v4 adds recorded piano dynamics and alternate piano/drum takes. See
[instrument-articulation.md](instrument-articulation.md): fresh M5/Linux checks
are **PASS**, with 18 matching WAVs. The owner subsequently replied “they are
fine” about v4 piano/drums; formal quality is still **NOT RUN**.

The current [workflow revision](workflow-hardening.md) adds safe/cancellable
exports, extensible WAV import and a consented M4A workflow. M5/Linux and M5
sanitizer suites pass 7/7 each (22 native test groups); 18 cross-OS WAVs and
all 15 previous v4 owner WAVs match exactly. The [tracker](../TODO.md) records
completed work and the remaining listening/device/hosted-CI gates.

Previous continuation: [evaluation preparation](evaluation-batch.md), with eight
passing suites on M5 release/sanitizers and Linux arm64. The renderer is unchanged;
all nine fresh owner candidates match v4 exactly. Only one consented source is
available; formal dataset/reviewer prerequisites remain missing. Preserve the
private ledger and recordings under `renders/`; owner-only permission is not
independent-review permission.

Previous musical continuation: [original club direction](club-direction.md).
Nine suites pass on M5 release/sanitizers and actual Linux arm64. New club
masters/stems match exactly across systems; 15 prior v4 owner WAVs are unchanged.
Use `--style club` explicitly; C ABI strategy 5. The private eight-player review
is `renders/voice-club-v7/review/index.html`. Club listening is **NOT RUN** and
production quality is **PARTIAL**. No additional consented clips are available.

Previous musical continuation: [club refinement v8](club-refinement.md). All three requested
areas are implemented, and solo stems now retain the master's sample-take IDs.
Nine suites pass on M5 release/sanitizers and Linux arm64 (25 native groups).
Current club/fixture WAVs match across systems; original-style masters are
unchanged, while corrected stems intentionally differ. Latest local review:
`renders/voice-club-v8/review/index.html`. Human listening is **NOT RUN**.
Current Linux smoke reference: `renders/arrangement-linux/club-v8/legacy`.

Latest continuation: [native iOS Instant Remix](ios-instant-remix.md).
M3 is **PARTIAL**: the SwiftUI app and worker C ABI are implemented, six integration
tests passed on the physical iPhone 14 Pro, and ten simulator tests passed.
Three optimized phone trials average 1.828 s for three styles; peak physical
memory is at most 55,953 kB. Phone/Mac WAVs, scores and events agree exactly.
The signed Release app now launches on the phone. The owner confirms recording,
generation and playback work; normal-library metadata records three completed
styles in 1.830 s. XCTest UI initialization still fails despite enabled Developer
Mode/DDI; the owner sees no prompt or switch. Do not repeat missing-toggle advice
or assume authorization is the proven cause. See the owner-phone-smoke evidence.
Read the linked gate ledger for exact UI/performance attempts and remaining
microphone/routes/battery/accessibility evidence. A real worker stack overflow
was fixed with a construction-time heap voice pool; M5 release/sanitizer and
Linux release each pass 9/9, with 15 exact fixture WAVs and exact plans/events.
Current Linux reference: `renders/arrangement-linux/ios-core-v9/remix`.
Raw iOS evidence is under `renders/ios-validation/`; signed build products and
private device identifiers are ignored. Do not confuse simulator performance or
unsigned compilation with device certification. Owner-only music permission
has not expanded; M1/model/live/release gates remain open. The release checklist,
policy draft and live protocol are preparation, not approval or measurements.

For the previous workflow checkpoint, run the smoke test with `DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/workflow-v5/remix`
and a new `DJAYVO_OUTPUT_DIR`. The script now rejects existing output directories;
its default is timestamped. Do not compare the revised music to historical M0
renders as a portability test. All unchanged instructions below describe the
original transfer/checkpoint.

## Original transfer state (historical)

Linux has working C++17 M0a instruments and M0b/M0c source-driven remixing:
three grammars, slicing, clean-hook preservation, WAV/stems, score JSON, source
SHA-256, frame traces, native validation, and C ABI. Release and ASan/UBSan CTest
suites are 6/6 PASS. See `docs/progress.md` and `docs/evidence/m0/`. No human
listening, real-person recording, Mac compile, GPU inference, or device result
has been claimed. No model or UI exists.

The fixture is **synthetic speech**, not consented human speech. External eSpeak
NG 1.52.0 generated original project text: “Say anything. Make music. This is
Djayvo.” Duration 3.21129 s, mono 22.05 kHz; SHA-256:
`c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e`.
The GPL developer executable/data is not linked or bundled. The actual WAV and
provenance travel in the transfer: **do not regenerate it** for comparison. The
Mac does not need eSpeak installed.

Known Mac: Apple M5, 16 GB unified memory, Xcode/developer account, verified MLX
environment in `~/mlx-env`. Keep it unchanged. A matrix demo is not a music-model
benchmark. No SSH host/address was provided and no remote access was attempted.

## Transfer and setup

Linux output `dist/djayvo-mac-handoff.tar.gz` has a SHA-256 sidecar. It contains
committed Git history, this handoff, synthetic input, and three Linux master
WAVs/scores/reports/frame traces. Audio stays outside Git. After transferring:

```sh
shasum -a 256 -c djayvo-mac-handoff.tar.gz.sha256
tar -xzf djayvo-mac-handoff.tar.gz
git clone --branch main djayvo-transfer/repository.bundle djayvo
cp -R djayvo-transfer/renders djayvo/renders
cd djayvo
```

Compare the checksum with the supplied sidecar. If a checkout already exists,
use a new sibling directory or carefully import the bundle; preserve user work.
If cloning an eventual remote, copy the same reference `renders/` separately.

## Run M0d on the actual M5

Use Xcode's toolchain. If CMake is missing, install the tested tool in a new
project environment, never `~/mlx-env`:

```sh
python3 -m venv .venv-build
.venv-build/bin/python -m pip install cmake==3.31.6
export PATH="$PWD/.venv-build/bin:$PATH"
sh scripts/mac_smoke.sh
```

The script rejects Linux, builds native arm64, runs all tests including C ABI,
renders the exact fixture, records CPU/compiler/platform, and compares Linux/Mac
plan decisions, compiled event frames, duration, and PCM. Outputs are
`renders/mac/remix.*` and `renders/mac/portability-report.json`. Decisions/event
frames must match exactly. PCM tolerances: maximum absolute error <=0.001, RMS
error <=0.0001. Hashes may differ. Apple M5 gate PASS requires a real
Darwin/arm64/Apple M5 environment record and successful comparisons.

Record actual toolchain/OS/results in new evidence. Investigate differing
analysis decisions at their threshold; do not loosen frame comparisons to hide
failures. Fix failures and rerun relevant checks before claiming PASS. Run a Mac
sanitizer build if supported by the actual toolchain.

## Listening and continuation

```sh
afplay renders/fixtures/synthetic-speech.wav
afplay renders/mac/remix.hiphop.wav
afplay renders/mac/remix.reggae.wav
afplay renders/mac/remix.experimental.wav
```

Have the owner audition and record observations. The existing single-source
pilot has no observations. `scripts/prepare_listening.py` prepares blinded,
RMS-matched candidates and blank ratings/pairwise forms. Follow
`docs/evaluation-protocol.md`: M1 requires diverse consented recordings and real
blinded responses. Do not infer recognizability, enjoyment, realism, or audible
style distinction from code alone.

The continuation instruction removes permission pauses, not evidence gates.
Advance work with valid prerequisites and keep missing observations open.
Avoid model training, cloud spending, publishing, App Store submission, and
artist/voice imitation. Improve timbre/arrangements from actual defects, then
test real consented input. AI planning needs the quality baseline and measured
Mac experiments. Future iPhone integration must use the tested C ABI
`djayvo_render_file` on a worker thread; do not duplicate the tick clock in Swift.
Only claim an iPhone app after an actual build/device test.
