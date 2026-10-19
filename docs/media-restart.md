# Manual deck start recovery and native-media restart investigation

2026-10-19, Apple M5 and isolated Linux ARM64 VM. **PASS** for bounded manual
start failure handling in the tested working browsers. **FAIL** for Linux
WebKit native-media reliability; exact cause and full production readiness
remain **PARTIAL**. No musical-quality claim follows from these tests.

## Change

Manual A/B starts now stay in `Starting…` until the native play promise resolves
and playback time advances without a pending seek (or a very short track has
already ended). A nominal ten-second timeout reports failure, pauses that deck
and restores its controls. The user can unload/reload it; the other deck keeps
playing. Cancellation clears the check, and late results cannot overwrite a
newer start. Ordinary errors retain their native message.

The shared manual start path covers Play, jog/rate resume and EOF repeat. This
does not change the prepared A/C scheduler, C++/WASM, audio routing, source URL
handling or the recordings. It does not automatically retry a failed source.
The timer covers `audio.play()` after `AudioContext.resume()` completes, not a
pending context resume. Browser scheduling may delay the nominal timeout;
this is a UI recovery bound, not an audio deadline or proof of audible output.

## Gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Start helper regressions | PASS | Four tests: resolved-but-stuck, never-resolving, cancellation/late result, native errors, short playback and timer cleanup |
| Full web unit checks | PASS | 34 tests on Mac and 34 in Linux |
| Mac Chromium studio | PASS | 42 checks, including real other-deck audio during an injected failed start, cancellation/retry, looping, offline instruments and consent/unload |
| Mac WebKit studio, final | PASS | Same 42 checks after correcting a fixed-sleep platter test; initial failure retained below |
| Linux Chromium studio | PASS | Same 42 checks |
| Linux WebKit studio | FAIL | Four offline checks pass, then initial media does not advance; the new timeout is visible in the failure receipt |
| Native restart calibration | PASS | Mac WebKit and Linux Chromium each complete 15 cycles for each of Blob, File, input File and HTTP: 60 each |
| Linux WebKit native restart | FAIL | Stalls at time 0, seeking, after EOF without Djayvo code; fresh-container reproduction also fails |
| Precise native-media cause | PARTIAL | Reproduced outside application and without container memory pressure; specific WebKit/media-backend cause not established |
| Waveform preservation | PASS | 24 stereo 48 kHz WAVs byte-identical to retained baselines; maximum absolute and RMS difference both zero |
| Echo event-frame agreement | PASS | Instrument and both deck echo peaks match expected frames exactly in all three successful studio runs; failed Linux WebKit run passes offline frame assertions before startup failure |
| Build, bundle privacy and served copies | PASS | Static build, 35-asset audit and integrated copy; changed JS and unchanged WASM match localhost responses |
| Desktop/mobile failure UI | PASS | Error and usable controls visible in retained screenshots; full suites check page identity, content, responsive overflow and interactions |
| Physical microphone/MIDI, acoustic output, round-trip latency, venue endurance | NOT RUN | Virtual browser audio and synthetic MIDI do not establish these gates |
| New human listening / M1 / production musical quality | NOT RUN | No new listening judgment or model promotion |
| Overall M4 and full specification | PARTIAL | DJ14/DJ17 and prior timing failures remain open |

## Native-media investigation

[`media-restart.mjs`](../apps/web/tests/media-restart.mjs) creates a disposable
60-second 220 Hz PCM16 tone. It exercises rapid paused seeks, rate changes,
pitch preservation and restart after EOF in a minimal page. A media element
feeds an analyser before a muted output; success requires actual signal and
advancing, non-seeking playback. Four source modes use the same bytes. HTTP
supports byte ranges. There is no Djayvo mixer, WASM, worklet or private audio
in this test. Fifteen cycles per source are a diagnostic, not venue endurance.

| Linux WebKit trial | Blob cycles | File cycles | Input File cycles | HTTP cycles |
| --- | --- | --- | --- | --- |
| Native ended-handler restart, no request interception | FAIL 0/15 | FAIL 0/15 | FAIL 3/15 | FAIL 11/15 |
| Native `loop` property | FAIL 2/15 | FAIL 0/15 | FAIL 2/15 | PASS 15/15 |
| Fresh source URL each restart | FAIL 0/15 | FAIL 3/15 | FAIL 1/15 | PASS 15/15 |
| Fresh URL plus metadata readiness | FAIL 0/15 | FAIL 7/15 | FAIL 0/15 | PASS 15/15 |
| Fresh container, original ended-handler restart | FAIL 0/15 | FAIL 0/15 | FAIL 2/15 | PASS 15/15 |

Zero completed cycles can mean startup failure or failure of the first restart;
the [summary](evidence/media-restart/summary.json) retains each final state and
last events. In both original un-intercepted and fresh-container ended-handler
runs, failing Blob/File paths reach EOF and then remain at time 0, `paused=false`,
`seeking=true`, with no reported media error and no signal. Native-loop and
fresh-source trials additionally expose unsupported/load/metadata errors.
None is reliable across the required local-file paths, so none was shipped.
HTTP passed several trials but failed another; switching source type would
not be an evidenced fix.

The long-running 2 GiB container reached its limit (`memory.events max=3404`)
without OOM kills. To separate that observation from playback failure, a fresh
2 GiB container reran only the minimal WebKit probe. It reproduced Blob/File
failures at a 671,952,896-byte peak with **zero** memory-limit events and OOM
kills. This rules out that container limit as a necessary condition for this
reproduction; it does not identify a precise browser/backend defect or exclude
other VM effects.

## Retained failures and test corrections

- The first diagnostic mistakenly blocked Blob URLs through its request guard.
  Those failures are **FAIL (harness)**, not application evidence. A corrected
  allowlist and then removal of interception produced the independent failures
  above. Both earlier reports/logs remain available.
- The first new unit harness used promises across VM realms and cancelled four
  tests before simulated timers settled. Injecting the same Promise constructor
  fixed the harness; the four focused tests and both full unit suites then pass.
- Initial Mac WebKit studio testing passed both new recovery checks but failed
  a pre-existing platter assertion after a fixed 200 ms sleep. The final test
  waits for completed startup and observable rotation, retaining the original
  failure. This is a functional check, not a claim of sub-200 ms startup.
  Mac Chromium passed before this test-only wait correction; final Mac WebKit
  and Linux runs use it.
- One Linux launcher stopped before browser execution because `status` is a
  read-only zsh variable. The corrected launcher uses `media_test_exit`.
- Mac WebKit's final report retains four screenshot-time stylesheet CSP warnings
  from the existing capture mechanism. The successful suites have no application
  console errors or external/upload requests.

## Evidence, environment and reproduction

The [summary and receipt hashes](evidence/media-restart/summary.json) identify
all retained runs, last media events, expected/observed echo frames and WAV
hashes. Raw playable outputs remain under `renders/`, including:

- [Mac Chromium](../renders/dj-chromium-TKj8Fk/report.json),
  [Mac WebKit](../renders/dj-webkit-4ydodp/report.json),
  [Linux Chromium](../renders/media-restart-20261019/dj-chromium-on9fyA/report.json),
  [Linux WebKit failure](../renders/media-restart-20261019/dj-webkit-0kEDOb/failure.json).
- [Desktop failure UI](../renders/dj-chromium-TKj8Fk/playback-start-failure.png),
  [mobile failure UI](../renders/dj-chromium-TKj8Fk/playback-start-failure-mobile.png),
  [WebKit desktop](../renders/dj-webkit-4ydodp/playback-start-failure.png).
- [Playable piano dry](../renders/dj-chromium-TKj8Fk/piano-dry.wav) and
  [echo](../renders/dj-chromium-TKj8Fk/piano-echo.wav); these are regression outputs,
  not new musical-quality comparisons.

[Mac environment](evidence/media-restart/mac-environment.txt): Apple M5,
16 GiB, macOS 26.7.1 (25G241), Node 22.23.1, Playwright 1.61.1,
Chromium 149.0.7827.55 and WebKit 26.5.
[Linux environment](evidence/media-restart/linux-environment.txt): Ubuntu
24.04.4 ARM64 in Colima, kernel 6.8.0-117, Node 24.17.0, Playwright 1.61.1,
Chromium 149.0.7827.0, WebKit 26.5, PulseAudio 16.1 null sink at 48 kHz.
This is actual Linux browser execution in a VM, not physical Linux hardware
or installed Safari qualification. Native toolchain and sanitizer checks were
**NOT RUN** this turn because C++/WASM are unchanged; prior results remain in
[the engine report](interpolation-table.md).

The in-app browser/Node REPL tools were unavailable after tool discovery, so
testing used the repository's existing isolated Playwright runner. No new
dependency or tool installation was needed; `~/mlx-env` was untouched.

From the repository root with the existing dependencies/bundle:

```sh
node --test apps/web/tests/*.test.js
DJAYVO_BROWSER=chromium node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/media-restart.mjs
sh docs/evidence/media-restart/linux-run.sh
python3 docs/evidence/media-restart/measure.py
```

The Linux wrapper uses only the existing VM/image, disables networking, mounts
web assets/test support and a fresh output directory, then removes its container
and restores the initial VM state. Its equivalent commands were executed;
the wrapper itself was syntax-checked, not rerun end-to-end. The measurement
script asserts the retained run results, unchanged protected hashes and exact
PCM; it does not re-execute browsers. Rejected probe variants are reproducible
with [variants.py](evidence/media-restart/variants.py) and the retained
[metadata-wait patch](evidence/media-restart/fresh-ready.patch).

Both diagnostic containers were removed, the initially stopped `djayvo` VM
was stopped again and default Docker context `desktop-linux` preserved:
[cleanup receipt](evidence/media-restart/cleanup.log). The
[master, fixture and owner recording hashes](evidence/media-restart/protected.json)
are unchanged. Both localhost copies serve the checked JS and unchanged
engines: [HTTP hashes](evidence/media-restart/served.json).
