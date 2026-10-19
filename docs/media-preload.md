# Local-file playback: preload, routing and transport transitions

2026-10-19. Follow-up to [the bounded-start investigation](media-restart.md).
The change addresses four observed manual-deck failures without replacing the
shared engine or adding a dependency. Production/venue readiness remains
**PARTIAL**; musical benefit is **NOT RUN**.

## Changes

1. Both media elements use metadata preload. Eager preload failed repeated
   local-file EOF restarts; metadata preload passed the isolated comparison.
2. The mixer connects each media element before its source is assigned. Connecting
   already-preloaded media stalled the Linux WebKit startup test. The audio graph
   now prepares during a validated track load, with its manual inputs muted;
   Play remains explicit. Initialization failure rejects the load before attaching
   a source and cannot fall back to unprocessed audio.
3. An active pitch change waits for the native pause event, coalesces rapid slider
   input to the latest value, then resumes. Pause All, unload or replacement
   invalidate the old resume. An immediate manual Play is safely paused again
   before applying the pending rate. This still briefly pauses audio; it is not
   continuous time stretching or a sample-accurate DJ transport.
4. Each native-media input has a five-millisecond gain fade. Pause stops further
   input from reaching the effects while allowing existing effect tails to finish.
   This addresses the observed signal that could refill cleared delay buffers
   after the media element reported paused. Prepared A/C sources keep their
   existing transport and routing. Playback errors also close the manual input.

The prior ten-second failed-start safeguard remains. C++/WASM, plans, samples,
the supplied speech fixture and the owner's recording are unchanged.

## Gates

Final studio and waveform results are recorded in
[the machine-readable summary](evidence/media-backend/summary.json).

| Gate | Status | Scope |
| --- | --- | --- |
| Rate ordering and cancellation unit checks | PASS | Four regressions, including source replacement and immediate replay |
| Full web unit checks | PASS | 38 on Mac; 38 in Linux |
| Final Mac Chromium/WebKit and Linux Chromium/WebKit studio | PASS | 43 checks each, including rate bursts, cancellation, echo reset, all 13 instruments, synthetic MIDI and disconnected reload |
| Mac prepared A/C session | PASS | 29 checks in each browser, including generation, synchronized entry, consent cancellation and disconnected operation; simulated capture only |
| Strict Linux WebKit native restart probe | PASS | Blob, File, input File and HTTP each complete 15 cycles with exactly 15 EOF callbacks |
| Local-file active-rate diagnostic | PASS | Blob, File and input File each complete 15 reset/restart cycles with pause-event sequencing |
| HTTP active-rate control | FAIL | The bounded diagnostic reports a play timeout; manual decks accept local files, not remote URLs |
| Offline WAV and echo-frame preservation | PASS | 34 stereo 48 kHz piano WAVs byte-identical to retained baselines; maximum absolute/RMS error zero and all measured echo peak frames exact |
| Prepared event-frame agreement | PASS | A/C timing matches retained baselines at 44.1/48/96 kHz; both measured sessions have zero silent blocks and zero missing signal frames |
| Precise browser-internal cause | PARTIAL | Controlled reproductions and backend logs identify failing conditions, not a verified native-code patch |
| Full-page Mac WebKit capture repeatability | PARTIAL | Two intermediate capture freezes retained; later unchanged capture code passed |
| Physical microphone/MIDI, acoustic output, round-trip latency, venue endurance | NOT RUN | Browser execution and virtual audio do not qualify these |
| New human listening, M1 acceptance, musical quality | NOT RUN | No new rating, training or model promotion |
| Full specification / production | PARTIAL | These fixes do not waive listening, device, deadline or release gates |

## Evidence and rejected approaches

The old failing conditions remain reproducible. With eager preload, fixing the
rate at 1, disabling pitch preservation, removing the Web Audio connection,
deferring the EOF handler, waiting for seek completion, reducing seek activity,
or reloading the same URL did not produce a reliable local-file path. The plain
media variant checks timeline progression only; it is not a PCM-output check.

Two metadata-only minimal trials completed all 60 cycles each. Moving the graph
connection until Play then failed all four source modes at startup. Using
`preload=none` with that late connection allowed some starts but still failed
local-file repeats. The first full-studio candidate with metadata alone likewise
failed startup. Connecting before assigning the source got the full studio past
startup and EOF repeat, then exposed the active-rate stall.

Immediate rate reset/resume failed its first isolated cycle. Waiting for pause
before changing rate passed 15 Blob cycles. Merely waiting before resume passed
the three local-file cases, but rapid input in the full studio still stalled.
Coalescing changes until pause completion passed that interaction, cancellation,
reload and EQ, then exposed the existing post-pause/reset signal. The manual
input fade addresses that final observed input-feed condition. All intermediate
failures remain in the summary and logs; they are not overwritten by later runs.

Eager-preload backend logs include WAV parser/header and buffering errors despite
the same generated WAV being accepted in calibration browsers. Current upstream
WebKit explicitly disables on-disk buffering for Blob media in
[`updateDownloadBufferingFlag`](https://github.com/WebKit/WebKit/blob/3a7a2fc7cfa015de245a11892a1f059ddc29e7e1/Source/WebCore/platform/graphics/gstreamer/MediaPlayerPrivateGStreamer.cpp#L3467).
This supports investigating buffering, but does **not** prove that this source
revision is in the installed test binary or identify its exact faulty native
instruction. The [source receipt](evidence/media-backend/upstream.json) pins the
read-only comparison. Preload is a browser hint, so behavior is qualified by
executed browsers, not assumed universal. See the
[HTML media specification](https://html.spec.whatwg.org/multipage/media.html#attr-media-preload).
Context7 tools were unavailable; primary upstream sources were used instead.

## Test-harness findings

- A one-second natural-loop variant originally printed PASS after 15 iterations,
  but inspection found **1,266** EOF callbacks. That is **FAIL (invalid cycle
  accounting)**, not listening or loop-reliability evidence. The permanent probe
  now asserts exactly one EOF callback per cycle. The successful metadata trials
  had exactly 15; the strict final probe also passes. The full 2 MB backend log
  is retained under `renders/media-backend-20261019/natural-backend.log`, with a
  hash and excerpt in the evidence directory.
- An early active-rate diagnostic awaited `play()` without a deadline and hung
  on HTTP after its three local-file cases passed. Only its Node process was
  terminated. It has no complete receipt and is **PARTIAL**. The bounded repeat
  retains the HTTP **FAIL** instead of hanging or counting it as passed.
- A macOS `mktemp` suffix mistake prevented one planned repeat from executing.
  It is not counted; the independent final probe supplies the stricter result.
- Two intermediate Mac WebKit runs froze during full-page screenshot capture.
  Their partial functional checks and failure receipts remain **FAIL**.
  Later 43-check runs, including the delivered version, passed with the same capture implementation. Cause is
  **PARTIAL**; no timeout, audio threshold or screenshot requirement was relaxed.

- Two extra Mac WebKit prepared-session runs failed initial navigation after the
  missing-recorder simulation shared the audio test context; no track was loaded.
  The initial failure reporter also waited indefinitely for that page. Its state
  capture is now bounded to two seconds. Giving the simulated capability check
  its own browser context allowed the unchanged product to complete all 29 checks;
  Chromium also passes with that isolation. Failed receipts remain in the summary.
  This identifies a working test setup, not a proven browser-internal cause.

## Reproduction and environment

The flow under test is: confirm music rights, load local tracks, play both decks,
seek/repeat/change pitch, cancel or unload during a pending transition, then
verify output, effect clearing, instruments, MIDI, permissions and offline reload.
The studio suite also checks page identity, nonblank content, console errors,
desktop/tablet/mobile overflow, and captures the rendered controls.

The in-app browser execution tool was unavailable after discovery. The existing
Playwright runner was used for the authorized Mac/Linux checks. No new package
or system tool was installed, and `~/mlx-env` was untouched.

Mac: Apple M5, 16 GiB, macOS 26.7.1 (25G241), Node 22.23.1,
Playwright 1.61.1, Chromium 149.0.7827.55, WebKit 26.5.
Linux: existing Ubuntu 24.04.4 ARM64 VM, kernel 6.8.0-117, Node 24.17.0,
Chromium 149.0.7827.0, WebKit 26.5/revision 2311, PulseAudio 16.1 null sink,
GStreamer 1.24.2 packages. This is not installed Safari, physical Intel Linux
or speaker/microphone latency evidence. Tests used generated tones and cleared
regression instruments; no private recording was mounted into Linux.

```sh
sh scripts/web_build.sh
node --test apps/web/tests/*.test.js
DJAYVO_BROWSER=chromium node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
DJAYVO_BROWSER=chromium node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/media-restart.mjs
# Negative control, expected to expose the affected Linux WebKit behavior:
DJAYVO_BROWSER=webkit DJAYVO_PRELOAD=auto node apps/web/tests/media-restart.mjs
sh docs/evidence/media-restart/linux-run.sh
python3 docs/evidence/media-backend/measure.py
```

The existing Linux wrapper uses a fresh output directory, the cached image and
network-disabled container, then restores the initial VM state. Equivalent
commands were executed for this evidence. `variants.py NEW_DIRECTORY` recreates
the historical probes from the pinned pre-fix source and current strict probe;
16 generated scripts were checked byte-for-byte. Use the bounded rate variant
and an outer `timeout -k 5 60` inside Linux; the unbounded variant is retained
only to reproduce the diagnostic mistake.

Raw run locations, receipt hashes, final source hashes and playable WAVs are
listed in the summary. The unchanged WAV comparison covers offline piano/effect
regressions (24 manual-studio and 10 prepared-C WAVs); manual media playback now intentionally has a five-millisecond
start/pause fade and is not claimed sample-identical to its old output. Historical PCM baselines are preserved. No C++ or native
sanitizer suite was rerun for this browser-host change. Local bundle, served-copy
and cleanup receipts are retained alongside the report; no push or deployment
is part of this work.

## Final receipts and cleanup

- [Mac Chromium — 43 PASS](../renders/dj-chromium-9PpttK/report.json); [desktop](../renders/dj-chromium-9PpttK/desktop.png), [mobile](../renders/dj-chromium-9PpttK/mobile.png).
- [Mac Webkit — 43 PASS](../renders/dj-webkit-xFxj41/report.json); [desktop](../renders/dj-webkit-xFxj41/desktop.png), [mobile](../renders/dj-webkit-xFxj41/mobile.png).
- [Linux Chromium — 43 PASS](../renders/media-backend-20261019/dj-chromium-pHz89g/report.json); [desktop](../renders/media-backend-20261019/dj-chromium-pHz89g/desktop.png), [mobile](../renders/media-backend-20261019/dj-chromium-pHz89g/mobile.png).
- [Linux Webkit — 43 PASS](../renders/media-backend-20261019/dj-webkit-9MQzwu/report.json); [desktop](../renders/media-backend-20261019/dj-webkit-9MQzwu/desktop.png), [mobile](../renders/media-backend-20261019/dj-webkit-9MQzwu/mobile.png).

The prepared A/C run receipts are [Mac Chromium — 29 PASS](../renders/session-chromium-O6n9NC/report.json)
and [Mac WebKit — 29 PASS](../renders/session-webkit-RxGTiO/report.json).
The Linux prepared-session suite was **NOT RUN** again in this change; the four
main studio suites include Linux. No physical microphone was used.

Final rendered checks include the 1440×1000 desktop, 390×844 mobile and a
tablet viewport, with full-page captures. Page identity, meaningful content,
controls and console-error checks pass. WebKit retains the known screenshot-time
stylesheet CSP warnings; these are recorded rather than counted as app errors.
The final Mac WebKit desktop screenshot was also visually inspected.

The long-running 2 GiB Linux container reached its memory limit during this
investigation, without OOM kills; see [final counters](evidence/media-backend/linux-final-memory.txt).
This was functional testing, not a performance or memory-capacity qualification.
Both localhost origins serve the delivered HTML/JS and unchanged engine hashes:
[served-copy receipt](evidence/media-backend/served.json). The
[audited bundle](evidence/media-backend/bundle-audit-delivery.json) excludes private
audio, tests and credentials. The master/recording/engine hashes are checked in
the summary. The diagnostic container was removed, the initially stopped VM
was stopped again, and Docker context `desktop-linux` was preserved:
[cleanup](evidence/media-backend/cleanup.log).
