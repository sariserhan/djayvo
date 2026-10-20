# R1 continuation — private studio mix recording

**R1 overall: PARTIAL.** The browser can now retain a 30-second stereo recording
of its actual studio mixer output, including Decks A/B/C, instruments, effects,
faders and limiting. This complements [instrument/source pairs](r1-phrase-response.md).
It does not train a model or establish that a performance sounds professional.

## Try it locally

Open <http://127.0.0.1:3000/studio/dj.html#mix-recording> or
<http://127.0.0.1:4173/dj.html#mix-recording>.

1. Load permitted music, prepare C, or enable instruments as usual.
2. In **Record the studio mix**, give the separate permission to record all
   included music, performances and voices for private use.
3. Choose **Record mix**, then play/mix. Choose **Stop recording** when finished;
   recording also stops automatically at 30 seconds.
4. Play the recording, download its stereo WAV and recording-details JSON,
   or delete it. Delete the current recording before starting another.

Stopping recording leaves decks/instruments playing. Capture includes only
the studio mixer: raw microphone input, preview audio players and operating
system audio are excluded. A generated voice performance playing through C is
included. No extra fade or tail is synthesized at the recording boundary.

Everything stays in this tab until explicitly downloaded. No upload, library
save, device identity, transcript or training permission is inferred.
Removing recording/music/voice permission or replacing/deleting a source phrase
discards the recording, including pending export results. Unfinished recordings
are discarded on focus loss, hidden page, audio interruption or recorder error.
Completed recordings remain until deletion/page exit; downloaded copies need
separate deletion. Permission is a user attestation, not verified legal clearance.

## Components and bounds

- `apps/web/mix-recording-worklet.js`: a passive copy of `mixer.meter` after the
  existing limiter. Its own output is silent and routed through a zero-gain sink;
  the existing speaker route is unchanged. Missing input is recorded as silence;
  mono is duplicated to stereo. Stop/cancel transfer/free the preallocated buffer
  outside `process()`. Cancellation is acknowledged before the controller closes
  its message port. The audio callback does not allocate, serialize, infer,
  fetch, log, wait or grow its buffer.
- `apps/web/mix-recording.js`: consent/start/stop/delete, preview, exclusive active
  recording, bounded startup/finish waits, generation-token checks after awaits,
  cleanup and a strict versioned receipt. Reuses `resumeAudio`, `stereoWav`,
  `sha256` and the existing 30-second limit.
- `apps/web/dj.js`, `dj.html`, `dj.css`: route the existing mix to the optional
  recorder, propagate interruption/source changes and add responsive controls.
- `apps/web/tests/mix-recording.test.js`, `mix-recording.mjs`: worklet/resource/
  receipt tests and actual browser PCM, consent, interruption and UI checks.
  `tests/dj.mjs` also exercises capture from the prepared offline cache.

The recorder is absent until requested. At 48 kHz it allocates 11,520,000 bytes
for stereo float32 capture; supported rates are 32–192 kHz, bounded at 46,080,000
bytes at the maximum rate. PCM16 encoding/download buffers are additional and
bounded. The audio-thread limit works even when the main-thread timer is late,
including a final partial block at 44.1 kHz. No dependency, C++ change, model,
paid API, cloud job or compiler-cache regeneration was needed.
Startup allocates on the worklet thread; its deadline/glitch behavior on physical
devices is not benchmarked. An unchanged signal route is not a zero-glitch claim.

The `1.0-mix-recording` receipt contains fixed scope
`post_limiter_studio_mix`, `unreviewed_live_capture`, private-use attestation,
`training_authorized: false`, sample rate, frame count, WAV SHA-256,
observed first AudioContext frame, timestamp-discontinuity count and limit flag.
Unknown fields, unsupported rates, excessive lengths, malformed hashes,
training authorization and incompatible limits are rejected.

This receipt is **not** a replayable plan or an asset/rights ledger. It does not
record every transport/automation action, bind all source permissions, or align
independent instrument takes/stems. Those are unfinished R1 tasks. Browser
timestamp anomalies are diagnostics, not proof that audio samples were lost.

## Validation — 2026-10-20

Apple M5, 16 GiB, macOS 26.7.1 (25G241), Node 22.23.1, Playwright 1.61.1;
Chromium 149.0.7827.55 and WebKit 26.5. Existing shared-engine WASM retained.

| Gate | Status | Evidence |
| --- | --- | --- |
| Unit tests | PASS | 59/59; five new recording tests, including 44.1/48 kHz limits |
| Full-mix browser flow | PASS | Six checks each in Chromium/WebKit; actual WAV/receipt downloads and playback |
| PCM capture accuracy | PASS | Recorded stereo float32 equals each browser's actual mixer destination: max/RMS error 0, identical encoded WAV hashes |
| Mixer behavior | PASS | Four mixer inputs, tone/echo, gain automation, limiter and silent tail; stopping capture leaves deck playback running |
| Consent/failure handling | PASS | Withdrawal during hashing, source changes, focus/audio interruption, recorder error, retry and deletion |
| Automatic stop | PASS | Both browsers recorded exactly 1,440,000 frames at 48 kHz (30 s), limit flag true |
| Existing phrase-pair flow | PASS | Seven Chromium checks, including exact instrument replay and private source pairing |
| DJ regressions / offline capture | PASS | 48 Chromium checks; server disconnected, recorder creates/downloads/plays nonzero hash-verified PCM from cached assets |
| Static bundle | PASS | 40 audited files; no private audio/tests in the public bundle |
| UI / runtime / localhost | PASS | Desktop 1440×1000, mobile 390×844; inspected screenshots, no overflow/app errors; actual local website record/play/delete |
| Cross-browser mixer identity | PARTIAL | Existing Web Audio graphs produce different samples and async stop boundaries; see measurements below |
| Full live-mix replay / stems / automation trace | NOT RUN | Not implemented by this PCM recorder |
| Verified dataset rights / expert corpus | PARTIAL | Private attestation only; no reviewed expert dataset produced |
| Human musical quality | NOT RUN | n=0 listening ratings; original test tones/automated notes are technical probes |
| Physical devices / hardware latency / venue | NOT RUN | Browser execution is not hardware/venue validation |
| Current Linux / iPhone runs | NOT RUN | No new execution on those targets |
| Model training / paid compute / public release | NOT RUN | No training, spend, push or deployment |

The offline PCM probe routes independent stereo signals through all four mixer
paths. Capture starts at context frame 0. Chromium recorded 36,096 frames and
WebKit 48,000 frames; the stop command is asynchronous and the browsers serviced
it at different points around offline suspension/render completion. Within each
captured interval every sample matches the separately rendered destination.
This does not establish sample-accurate response to a live UI stop command.

Across the common 36,096 stereo frames, the browser mixer outputs differ by
max 2,158 PCM16 units and RMS 12.9221764230; 15,325 channel samples differ.
The largest difference is at frame 9,600, left channel. Each capture has zero
timestamp-discontinuity diagnostics. No cross-browser DSP parity threshold was
relaxed; exact cross-browser mixer identity remains **PARTIAL**.

The first Chromium error-injection test failed because the assigned processor
error property did not trigger cleanup. The recorder now uses the same explicit
`addEventListener('processorerror', ...)` pattern as the working instrument rack,
removing the listener on disconnect. The rerun proves cleanup, continued native
instrument audio and successful retry. The initial failure log is retained.
Final review added cancellation acknowledgement before closing the message port.
An extra WebKit test listener missed that terminal event when the controller
closed the port; the test now observes the controller's terminal port closure
directly. That observer timeout is retained alongside passing reruns.

Two known WebKit screenshot-tool stylesheet CSP warnings are isolated in its
report; application errors and external requests are absent. CSP is unchanged.
Browser-plugin discovery failed twice with
`unsupported call: tool_searchtool_search_tool`; the existing authorized
repository Playwright workflow provided actual browser validation.

## Reproduce and artifacts

```sh
cd apps/web
npm test
cd ../..
node apps/web/tests/mix-recording.mjs
JAMLOOM_BROWSER=webkit node apps/web/tests/mix-recording.mjs
node apps/web/tests/instrument-take.mjs
node apps/web/tests/dj.mjs
python3 scripts/verify_web_bundle.py
```

Playable local probes, not quality demonstrations:

- [Chromium live mix](../renders/mix-recording-chromium-J0ZldT/mix.wav) and
  [four-input reference](../renders/mix-recording-chromium-J0ZldT/post-limiter-reference.wav).
- [WebKit live mix](../renders/mix-recording-webkit-yxH1Yz/mix.wav) and
  [four-input reference](../renders/mix-recording-webkit-yxH1Yz/post-limiter-reference.wav).
- Each directory retains receipts, automatic-stop metadata, browser report and
  desktop/mobile screenshots. The automatic 30-second WAVs were verified in-tab
  and discarded after receipt download to limit retained audio.
- [Disconnected-browser mix](../renders/dj-chromium-9N0vSX/offline-mix.wav) and
  its receipt were produced with the actual test server stopped.
- [Committed evidence and waveform measurements](evidence/r1-mix/artifacts.json).
  WAVs remain ignored by Git.

Both local public bundles/offline manifests were refreshed. The existing local
Next server initially returned 404 for new modules; restarting the same existing
production build made them available. Its actual record/play/delete flow passed
with no app errors or external requests. The server remains running. Full Next
rebuild and public deployment are **NOT RUN**.

Both specifications, original recordings, supplied synthetic speech fixture,
shared C++ engine and `~/mlx-env` remain unchanged. Next R1 work is frame-linked
automation/source provenance and reviewed, permissioned expert demonstrations;
R2/R3 training still requires its authorization and evidence gates.

Gain/EQ scheduling capture is now implemented in the [R1 automation follow-up](r1-mix-automation.md). Full effect/transport/source replay remains open.
