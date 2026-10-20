# R1 continuation — private live instrument takes

Follow-up: [optional private source-phrase pairing](r1-phrase-response.md) now
connects an existing phrase to its instrument response. The original dry
instrument trace/replay format below is unchanged.

**R1 overall: PARTIAL.** The browser studio now captures real instrument
performances as frame-addressed commands plus playable WAVs. The earlier
[offline plan editor](r1-demonstrations.md) remains intact. No model was trained,
and these private, unreviewed captures are not an expert training corpus.

## Try it locally

Open <http://127.0.0.1:4173/dj.html#instruments> (the standalone studio) or
<http://127.0.0.1:3000/studio/dj.html#instruments> (the existing local website).
Both local bundles were refreshed; no public deployment was performed.

1. Enable instruments, then check the separate capture-consent box under
   **Keep an instrument take**.
2. Choose **Record instrument take**. Play computer/touch keys, drum pads, or a
   connected MIDI controller; use talk-bass mouth shape and sustain as desired.
3. Release notes to let their tails finish, then choose **Stop take**. Capture
   automatically stops at 30 seconds.
4. Replay the take, download its WAV and musical-actions JSON, or delete it.
   Starting another take requires deleting the current one first.

This captures the instrument engine **before channel effects and volume**.
It excludes decks, microphone/source phrases, tone/echo, channel faders and the
master mix. The UI states that boundary explicitly. Starting a take resets
instrument voices/filter state for reproducible replay; stopping records through
the stop boundary, not an invented extra tail. It does not stop the decks.

## What changed

- [live-take.js](../apps/web/live-take.js): bounded capture buffer, strict
  `1.0-live-instrument-take` validator, existing C ABI command dispatcher,
  PCM16 stereo WAV encoding, engine/audio hashes and deterministic replay.
- [instrument-worklet.js](../apps/web/instrument-worklet.js): opt-in recording
  of accepted commands at their next rendered frame and the actual engine PCM.
  Rejected voices never become successful note events. No network, inference,
  serialization, growing buffer or allocation was added to `process()`.
- [instrument-take.js](../apps/web/instrument-take.js): consent/start/stop/delete,
  playback/download, bounded start/finish deadlines, stale-result suppression,
  and discard on focus loss, hidden tab, audio interruption or engine failure.
- [keyboard.js](../apps/web/keyboard.js), [instrument-rack.js](../apps/web/instrument-rack.js),
  [dj.js](../apps/web/dj.js), [dj.html](../apps/web/dj.html), [dj.css](../apps/web/dj.css):
  existing computer/touch/MIDI controls feed capture; the rack binds its actual
  WASM hash; theme-matched responsive controls use existing layout conventions.
- [replay_live_take.mjs](../scripts/replay_live_take.mjs): local CLI replay
  through this checkout's existing shared-engine WASM. Refuses to replace an
  existing file and writes owner-only output.
- [Unit/worklet tests](../apps/web/tests/live-take.test.js),
  [browser flow](../apps/web/tests/instrument-take.mjs), and two updated existing
  test callers. The older load diagnostic now serves the shared worklet module;
  A/B-specific player assertions target A/B rather than every audio element.

No C++ code, master/addendum specification, original source recording, auth,
database, cloud storage, email, telemetry or CSP setting changed. No dependency
or paid service was added, and `~/mlx-env` was not used.

## Format and privacy

Each take contains sample rate, exact captured frame count, initial mouth shape,
accepted `{frame, command}` entries, engine SHA256, WAV SHA256 and explicit
`scope: dry_instruments`, `origin: unreviewed_live_capture`,
`training_authorized: false`. Commands are the existing live engine's
`note`, `off`, `mouth` and `panic` operations. Patch IDs retain the full existing
palette, including talk bass and percussion. Sustain is represented by its
effective note-off timing, not a fabricated immediate release.

Frames are relative to the first captured engine block. Same-frame command order
is preserved. These are engine acceptance positions, not timestamps of physical
key contacts, OS input arrival or acoustic speaker output. No hardware latency
or glitch-free venue claim follows from exact replay.

The live C ABI supports patches absent from the older offline remix score. This
format therefore identifies that live contract explicitly; it does not silently
map talk bass/percussion to another sound or pretend to be a native remix-plan
edit. Both paths use the shared C++ engine. The existing Python R1 dataset
exporter does **not** accept live takes as training examples.

Capture is off by default. No microphone is opened, no device names or transcripts
are recorded, and no take is uploaded, stored in IndexedDB or sent to analytics.
The initial permission is local capture only. Removing it discards pending and
completed in-tab data; delete detaches playback and revokes download URLs before
allowing another take. Already downloaded files remain the owner's responsibility.
Rights verification, source/performer grouping, explicit learning opt-in and human
review remain separate prerequisites.

The fixed buffer is allocated only on explicit start: 30 seconds, stereo Float32,
11.52 MB at 48 kHz (46.08 MB at the maximum supported 192 kHz), plus bounded event
metadata and final WAV. At most 4,096 accepted commands are kept. Overflow discards
the incomplete take while instruments continue. Captures stop copying at the
frame limit even if a background UI timer is late. No steady-state capture buffer
exists when the feature is off. Recording initialization and event receipt still
run on the worklet thread; worst-case deadline/GC behavior during capture needs a
separate load study.

## Validation

Flow: DJ workspace → enable instruments → capture permission → record keys,
talk-bass movement and simulated MIDI drums → stop → download/play → replay exact
WAV → delete/revoke permission → interruption/failure cancellation.

| Gate | Status | Evidence |
| --- | --- | --- |
| Unit/worklet contracts | PASS | 50 web tests, including six new capture tests. Exact worklet frames, real WASM replay, rejected voice exclusion, overflow, cancellation, rate/frame/command limits, provenance hashes and private-use flags. [Log](evidence/r1-live/unit.log) |
| Chromium rendered flow | PASS | Chromium 149.0.7827.55, desktop 1440×1000 and mobile 390×844; real AudioWorklet/C++ audio. [Report](evidence/r1-live/chromium.json) |
| WebKit rendered flow | PASS | WebKit 26.5, same two viewports and actual audio/replay. [Report](evidence/r1-live/webkit.json) |
| Page identity / nonblank / no overlay | PASS | Expected title/heading and working controls, no app runtime error; screenshots retained with the local browser artifacts. |
| Console / network | PASS | No app errors or external requests. Two WebKit screenshot-tool stylesheet warnings retained separately; CSP unchanged. |
| Visual / interaction proof | PASS | Capture/download/delete states, playable audio, desktop/mobile screenshots inspected, no horizontal overflow at 390 px. |
| Existing DJ regressions | PASS | 47 Chromium checks: mixer PCM, instrument/effect/MIDI/deck behavior, permission revocation, interrupted audio, and disconnected cached instruments. [Report](evidence/r1-live/dj.json) |
| Audio/event agreement | PASS | Each browser's captured WAV matches offline replay of its accepted-event trace byte-for-byte; maximum/RMS PCM16 difference zero. Unit trace event positions: 128, 384 and 512; total 640 frames. |
| Public bundle / offline manifest | PASS | Audited public file set and regenerated content hashes include both new modules; no private traces/audio bundled. [Audit](evidence/r1-live/bundle.json) |
| Local website refresh | PASS | Existing local server returns updated studio HTML; no C++ rebuild required. |
| New native/Linux/iPhone/full Next build | NOT RUN | C++/Next application code unchanged; no new target/toolchain or deployment claim. |
| Physical MIDI / physical output latency / sustained venue load | NOT RUN | Browser MIDI input is simulated; actual browser/WASM PCM is measured. |
| Model training / human musical quality / expert dataset | NOT RUN | n=0 expert demonstrations/listeners, no learning opt-in inferred, $0 paid compute. |
| Complete R1 multimodal demonstration workflow | PARTIAL | Live instrument take and offline plan editing work; microphone/source pairing, mixed A/C performance capture, full automation context and reviewed corpus remain. |

Both browsers ran on the current Apple M5/macOS checkout with Node v22.23.1 and
the already-installed Playwright 1.61.1. The Browser skill was read, but its
required execution tool was unavailable: discovery returned
`unsupported call: tool_searchtool_search_tool`, and the exposed tool registry
contained no `node_repl` execution tool. Used the repository's existing standalone
Playwright workflow for the authorized reproducible checks.

The first DJ regression attempt failed because its old assertion expected
exactly two `audio` elements. It was corrected to test the two deck players.
The first WebKit capture run reached the end of the interaction/audio checks but
failed its console assertion on two screenshot-injected stylesheet warnings.
The test now records only that known, screenshot-scoped tooling warning, matching
the existing browser suites. Other console errors still fail. These were not
fixed by weakening app security or removing functional checks.

The browser performances have different event arrival times; their WAVs are not
claimed identical **to each other**. Each matches replay of its own frozen trace.
No comparison establishes musical improvement or professional sound.

## Reproduce

```sh
cd apps/web
npm test
cd ../..
node apps/web/tests/instrument-take.mjs
JAMLOOM_BROWSER=webkit node apps/web/tests/instrument-take.mjs
node apps/web/tests/dj.mjs
python3 scripts/verify_web_bundle.py

# After downloading a take; choose a new WAV path.
node scripts/replay_live_take.mjs /path/to/jamloom-instrument-take.json \
  /path/to/new-replay.wav
```

The CLI uses `dist/web/engine/jamloom_live.wasm` and rejects a mismatched engine,
unsupported/version-changed metadata, reordered/out-of-range events, rejected
native commands or a different output WAV hash. It accepts JSON files up to
2 MiB and never turns a hash check into rights or training approval.

A fresh checkout uses the existing `sh scripts/web_build.sh` to create the
public bundle. This increment reused unchanged WASM and refreshed only public
JS/HTML/CSS plus offline manifests to avoid regenerating compiler caches and
retired recordings. Local current takes and reproducible hashes are listed in
[artifact receipt](evidence/r1-live/artifacts.json); raw WAVs remain ignored.

Next R1 work: pair a consented source phrase and arrangement context with the
performance, capture reviewed full-mix decisions and establish diverse,
permissioned expert sessions. Model training and R2/R3 quality milestones remain
gated. Local commit is the commit containing this report
(`git log -1 --format=%H -- docs/r1-instrument-capture.md`); no push/deploy.
