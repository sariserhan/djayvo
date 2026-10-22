# Live Source Mac companion

**Current update — 2026-10-22:** Owner confirms the previous controls work. The [two-deck upgrade](live-dual-decks.md) supersedes the single-deck layout and protocol described in the historical report below; its new real-source listening gate remains open.

**2026-10-22 owner feedback:** Only volume worked on both native and website controls. The [deck/control update](live-deck.md) is ready locally with passing technical checks; exact live-source cause and owner retest remain open. Earlier implementation evidence below is not a claim that this complaint is resolved.

2026-10-21. **PARTIAL overall:** native implementation, local UI, DSP and control
transport are tested; actual system capture and physical routing are not yet verified.
Human checks remain deferred. The owner requires all deployments through GitHub
pushes; no direct deployment was run for this change.

## Implemented

- A SwiftPM macOS 14.2+ app at `apps/desktop-companion`, packaged by
  `script/build_and_run.sh` as `dist/Jamloom Live.app`. It starts stopped, with
  explicit source consent, selection of one currently playing audio process,
  stereo speaker selection, visible status and Stop / Panic. Pairing cannot start
  capture; only the native Start button can.
- A private Core Audio process tap, excluding the companion by construction.
  `CATapMutedWhenTapped` suppresses the selected source while the tap is read.
  A private aggregate routes input directly through the portable DSP to the
  selected output. No system default device/volume is changed. Stop destroys IO,
  aggregate and tap in that order. Device loss/rate change, source exit, clock gaps,
  callback stalls, sleep and app quit stop the route. No input signal for ten
  seconds after starting is reported as silent/protected/denied and released.
- Native three-band EQ, low-pass, bounded echo, a one-beat roll, level, smoothed
  bypass and limiting. Pulse confidence needs repeated stable onset intervals;
  it resets on silence. Optional percussion reuses the original portable
  `PerformanceVoice` timbres, and waits for confidence above 65%. It is heuristic
  pulse following, not a verified beat grid or learned musical accompaniment.
  Roll uses 120 BPM while uncertain.
- Website controls at `/live-dj`, paired with the app through loopback HTTP.
  Native and browser capture controls are mutually exclusive in this page.
  An acknowledged stop releases browser capture immediately; a lost connection holds
  browser capture for eight seconds to cover the native watchdog and in-flight requests.
  Failed reconnects preserve that hold. The existing browser effects remain.
- Native output telemetry includes measured peak, processed frames, pulse
  confidence and maximum callback CPU time. These counters are not physical
  round-trip latency measurements.

## Architecture and limits

Apple documents private process taps and capture-time source muting in
[Capturing system audio with Core Audio taps](https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps)
and [CATapMuteBehavior](https://developer.apple.com/documentation/coreaudio/catapmutebehavior).
Current installed SDK headers were also inspected; Context7 was unavailable.
The bundle includes `NSAudioCaptureUsageDescription`. No recording permission
was granted or bypassed by automation.

Audio processing stays entirely native, avoiding a PCM-over-HTTP/WebSocket queue,
browser clock conversion and a second audio-output path. This is the architecture
chosen for the first supported Mac route; a comparative physical latency benchmark
against a browser PCM bridge is **NOT RUN**. The portable header contains no OS
APIs, allocation, networking or logging in its sample path. Its fixed stereo
history/echo storage totals approximately 1.54 MB. Native controls/counters cross
the render boundary through atomic values; object creation/destruction and device
queries stay off the callback.

The current route accepts stereo Float32 devices at 32–96 kHz, with matching
aggregate input/output formats. Unexpected or additional input channels are
rejected rather than inadvertently routing a hardware microphone. Multi-channel
interfaces, separate headphone cue, Windows/WASAPI and Linux/PipeWire adapters
are not implemented. Bluetooth/USB hot-plug and route restoration need physical
evidence. No transport control, DRM workaround, cloud upload, persistent PCM,
recording or third-party music integration is added. Microphone phrase sampling
remains in the existing studio; continual phrase-based Live Improviser is a
separate open M4 requirement.

## Pairing boundary

The listener binds only `127.0.0.1:48191`. Every request requires that literal Host
and the exact origin selected at pairing: `https://www.jamloom.com`, apex Jamloom,
or explicit development origins `http://127.0.0.1:3000` and `:4234`. There are no
wildcards, cookies, remote bind addresses, discovery endpoints or capture-start
commands. A random 256-bit token expires after 15 minutes; a five-second heartbeat
timeout revokes a connected session and stops capture. Rotation stops the previous
paired capture. Browser commands are limited to status, validated complete control
values and stop. Requests, bodies, concurrent sockets and incomplete-request time
are bounded; duplicate framing headers and chunked/pipelined requests are rejected.

The native button copies a concealed clipboard pairing code and opens a clean
website URL. The code stays in client memory after connection, never in a URL,
local storage, provider credentials or server logs. HTTPS browser local-network
permission/mixed-content behavior may differ; **hosted HTTPS pairing is NOT RUN**.
The app's native controls work independently. There is no claim that all browsers
can connect to native loopback from a hosted page.

## Evidence

| Gate | Status | Evidence |
|---|---|---|
| Native build, bundle and stopped app launch | PASS | [Launch](evidence/live-source/launch.log), [actual app window](evidence/live-source/native-stopped.png); loopback-only listener inspected with `lsof` |
| Native protocol/security tests | PASS | [Five Swift tests](evidence/live-source/swift-tests.log): real loopback HTTP, origin/Host/token/expiry/heartbeat, malformed framing, typed controls and invalid native source; the separate browser fixture test is explicitly skipped in ordinary tests |
| Portable DSP / ASan+UBSan | PASS | [PCM tests](evidence/live-source/dsp-tests.log), [sanitizers](evidence/live-source/sanitizers.log): bounds, stereo, filter/bypass, roll/echo finite ceiling, nonfinite input, explicit silent output, pulse lock/unlock |
| Actual native HTTP with browser UI | PASS | [Chromium/WebKit](evidence/live-source/results.json): synthetic source telemetry (not OS audio), real pairing/CORS/control/stop requests, rejected tokens/origins, 1440/390/320 layouts and axe. Browser output muted |
| Existing browser-source regression | PASS / PARTIAL | [17 routes per browser](evidence/live-source/product-regression.json); Chromium actual generated PCM/filter/bypass/stop passes. WebKit headless destination produces no audio track; unavailable-source path passes, its PCM check is NOT RUN |
| Site build/typecheck/35 tests/bundle audit | PASS | [Build](evidence/live-source/site-build.log), [TypeScript](evidence/live-source/typecheck.log), [tests](evidence/live-source/site-tests.log), [secret audit](evidence/live-source/bundle.log); existing WASM unchanged |
| GitHub CI / deployment | PASS | [Full CI 39680630588](evidence/live-source/github-ci.json), runtime `94e7084` [production READY](evidence/live-source/production.json), GitHub source `main`; www.jamloom.com resolves to that deployment. [Public gates](evidence/live-source/hosted-gates.json) preserved; no direct deployment |
| Actual Core Audio capture and physical acceptance | NOT RUN | OS permission, selected-app PCM, no doubled playback, Stop/crash restoration, device changes, physical latency and 60-minute set require an arranged owner/device check |
| Public native distribution | NOT RUN | Ad-hoc local signing only; Developer ID, notarization and public downloads remain open |

The first WebKit browser fixture expected permission denial but received a valid
no-audio fallback; it failed before controls were tested. The corrected assertion
accepts those two distinct supported failure states. Earlier temp receipts remain
preserved; current screenshots and receipts are from the passing rerun. The handoff test initially checked browser availability before the stop response
arrived; it now waits for the acknowledged stop and separately verifies the lost-connection
hold, including failed reconnects. No private audio, pairing grants or generated
recordings are committed.

## Reproduce

From the repository root:

```sh
./script/build_and_run.sh --verify       # Opens stopped; never auto-captures
swift test --package-path apps/desktop-companion
cmake -S . -B build-live-source -DCMAKE_BUILD_TYPE=Release
cmake --build build-live-source --target jamloom_live_source_tests -j 4
ctest --test-dir build-live-source -R '^live_source$' --output-on-failure
```

Close the app before the browser test because both bind the same local port.
From `apps/site`:

```sh
npm run build
npm run typecheck
npm test
npm run audit:bundle
node --import tsx tests/live-companion-browser.mjs
```

The fixture starts the real native listener with synthetic status, never a tap.
No database or provider changes, paid compute, live charges or emails are involved.
Local CPU processing has no new per-play cloud expense; physical resource/cost
measurements and musical quality are not inferred from that fact.
