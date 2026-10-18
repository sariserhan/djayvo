# Browser DJ mixer — first working increment

2026-10-18. **Manual mixer technical checks PASS. Professional DJ studio / revised
workflow PARTIAL.** Following the M0a review stop, the owner said “okaycontinue”.
This authorizes the next local increment under the
[web-studio addendum](web-studio-addendum.md); it is not a musical-quality rating,
release approval or new paid-compute authorization. The master is unchanged.

Open http://localhost:4173/dj.html or http://localhost:3000/studio/dj.html.
Confirm permission, load local tracks into A and B, play A, start B, and move the
crossfader toward B. Start with a low listening volume. Each deck can independently
pause, seek, change level or unload. Master level and Pause both decks work on
the real signal/transport. A stereo sample-peak monitor reflects output audio.

The dedicated page avoids the existing voice studio's intentional one-player-at-
a-time behavior. The voice studio links to it, and its capture/generation/library
behavior is unchanged. Opening the other workspace ends the current DJ session;
recording over an uninterrupted deck is not implemented yet.

## Implemented behavior

- Two local media-element sources route through native Web Audio gain nodes.
  No custom DSP is duplicated in JavaScript; the shared C++17/WASM engine is
  unchanged and remains available in the voice studio.
- A linear crossfade, channel levels and master level determine the two gains.
  Maximum combined gain is 0.8, even for identical full-scale tracks. Gain
  automation uses a 5 ms exponential time constant; this is smoothing, not a
  measured end-to-end latency or a limiter/true-peak guarantee.
- Separate left/right analysis prevents opposite-polarity stereo from looking
  silent. The displayed value samples recent buffers; it is not a continuous
  peak-hold, loudness meter or glitch detector.
- Permission is required before loading/playing. Withdrawing it aborts loading,
  stops both decks and detaches/revokes their local URLs. No upload, persistence,
  recording, cloud inference or new rental occurs.
- Files are bounded at 100 MiB / 20 minutes. Metadata and browser decode errors
  reject invalid files. A bad replacement preserves the previous paused track;
  a playing deck cannot be replaced. The other deck keeps playing.
- Playback starts only by user action. Failed graph setup remains silent on
  subsequent Play attempts and asks for a reload. Interrupted audio pauses both decks;
  resumption requires Play. Page exit stops playback. Tracks are not saved and
  must be reselected after reload.
- The existing opt-in offline asset cache includes the new page/modules. Save
  the app in Voice studio → Privacy & credits, reopen the DJ workspace, and load
  local files. There is no promise of storage retention or venue reliability.

The AudioWorklet/shared-frame-clock transport, beat/phase/key estimation,
headphone cue bus, synchronized Deck C, microphone flow and AI musical commands
remain future work. Media-element playback is deliberately not described as
sample-synchronized. Full session persistence, tempo controls and EQ are not
present as nonfunctional controls.

## Validation

The flow tested was: open DJ workspace → permission → load two local analytic
WAVs → play simultaneously → crossfade/channel/master adjustments → pause/seek
and failed replacement → interruption/recovery → revoke permission → reopen
with the real test server disconnected → load and play local audio.

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Static/WASM build and public bundle audit | PASS | Build, hash-bound offline manifest, audited public files and unchanged WASM engine hash |
| Web unit tests | PASS | 16/16, including crossfade/headroom/invalid controls and file boundaries |
| DJ Chromium / WebKit flows | PASS | 13 checks each; real PCM and media graph measurements, corruption preservation, permission, offline reload and URL cleanup |
| Voice studio regressions | PASS | Chromium 21 checks, WebKit 19; actual generation, library, privacy and mobile flows retained |
| Rendered QA | PASS | Page identity, meaningful content, no error overlay, desktop 1440×1000 and mobile 390×844, no overflow, interactions and screenshots; no application console errors |
| Site integration | PASS | Prepared audited bundle; restarted existing local Next server to discover new static files; /studio/index.html link and consent controls verified at /studio/dj.html |
| Offline local playback | PASS | Both browser engines reload and play local tracks after the disposable server is closed; no subsequent server requests |
| Protected files | PASS | Master, supplied synthetic fixture, consented source and x/y/z hashes preserved |
| Linux browser execution / physical Safari/iPhone | NOT RUN | This browser pass ran on Apple M5 only; retained engine portability is separate |
| Live synchronization / event-frame agreement | NOT RUN | No shared transport or Deck C event trace in this increment |
| Sustained venue operation / physical latency / audible glitches | NOT RUN | No physical output, long-session, route-change or battery experiment |
| Human listening / musical-quality approval | NOT RUN | Test output muted downstream of the measured graph; no listening inference |

Five real OfflineAudioContext experiments measured stereo output for A-only,
B-only, center blend, channel mute and master mute. Maximum settled PCM error
against expected coefficients was **5.96046446e−9** in both browsers. Live analytic
media at the default level measured approximately **0.15 peak**; channel and
master mute measurements were **0**. An opposing-polarity stereo WAV also gave
a nonzero stereo meter while the mono monitor cancelled. These are signal tests,
not musical-quality or end-to-end device benchmarks.

Hardware/toolchain: Apple M5 MacBook Air (Mac17,3), 10 CPU cores, 16 GB,
macOS 26.7.1 (25G241), Node 22.23.1, Playwright 1.61.1,
Chromium 149.0.7827.55 and WebKit 26.5. Both audio contexts reported 48 kHz.
Browser-reported base/output latencies were 5.333/24 ms in Chromium and
2.667/1.833 ms in WebKit. They are **not measured hardware latency**.

## Failures investigated

The first WebKit calibration runner crashed in JavaScriptCore's
`DFG::VirtualRegisterAllocationPhase::run()` with EXC_BREAKPOINT/SIGTRAP, after
its combined nested signal-test loop. Running the same five numerical cases as
separate evaluations avoided the crash without disabling JIT or changing product
audio. Initial failure logs are retained; installed Safari is not validated.

WebKit's emulated offline mode then rejected service-worker navigation with an
internal error. Reused the repository's existing offline-test method: a disposable
loopback server is actually stopped before reload. Both engines passed this real
server-disconnection test. The owner-facing servers were not stopped for it.
One early offline assertion sampled before WebKit's graph produced its initial
buffer; the final test waits up to five seconds for actual nonzero PCM rather
than treating media-element time alone as proof of audio output.

WebKit emits a CSP warning when Playwright injects screenshot styling. Only that
specific warning during screenshot capture is classified as a tooling warning;
application errors remain fatal. Screenshots were visually inspected.

## Reproduce and evidence

```sh
sh scripts/web_build.sh
python3 scripts/verify_web_bundle.py
npm --prefix apps/web test
node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
node apps/site/scripts/prepare-studio.mjs
```

The DJ runner creates a private browser context and its own disposable server,
uses analytic test tones in memory, writes a fresh ignored artifact directory,
and closes the browser/server afterward. It never alters the supplied speech
fixture or the owner's library. Existing voice regressions use
`node apps/web/tests/browser.mjs` and its WebKit variant against localhost:4173.

- [Chromium result](evidence/dj-mixer/chromium.json), [WebKit result](evidence/dj-mixer/webkit.json)
- [Unit tests](evidence/dj-mixer/unit-tests.log), [bundle audit](evidence/dj-mixer/bundle.json), [preservation/environment](evidence/dj-mixer/summary.json)
- [Voice Chromium regression](evidence/dj-mixer/voice-chromium.json), [voice WebKit regression](evidence/dj-mixer/voice-webkit.json)
- Local screenshots: `renders/dj-chromium-oYduoC/{desktop,mobile}.png` and
  `renders/dj-webkit-2kmBUi/{desktop,mobile}.png`.

Context7 resolve/query tools were unavailable. API behavior was checked against
MDN's [media-element audio source](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource),
[gain smoothing](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime),
and [analyser](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) documentation.
The in-app browser skill was available but its required runtime tool was absent
after two discovery passes. Testing reused the project's authorized Playwright
workflow. No new dependency or `~/mlx-env` change was required.
