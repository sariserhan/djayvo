# Djayvo: Apple M5 agent handoff

Continue without per-step approval. The owner authorized autonomous continuation
and asked to finish Linux work, then move to the Mac. Read `AGENTS.md` and the
complete master specification. Never modify the master; its SHA-256 is
`389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2`.

**Current priority, 2026-10-18: music quality research; infrastructure and phone work paused by the owner.**
Read [selective voice research](voice-research.md) and [cloud model trial](cloud-music-trial.md).
Latest local engine work: [Sustained instruments and broader arrangement variety](sustained-instruments.md).
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
