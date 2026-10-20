# Manual deck metadata readiness

The manual Play path now waits for the **actual deck element's metadata** before
calling native `play()`. The existing separate file probe still validates uploads
before replacing a track. It does not establish that the subsequently attached
deck element has finished loading.

The control stays at “Starting…” during that wait. The existing ten-second start
deadline covers both metadata and playback progress; cancellation prevents a late
metadata arrival from starting an unloaded or superseded track. Native errors
retain their message. The existing 50 ms progress poll is reused, without a new
listener, decoder, dependency or transport abstraction. Already-ready playback
starts immediately. Initial metadata readiness can add up to one polling interval;
this is not a physical latency measurement.

Only `playMedia` and its tests change. Local file and saved-mix playback use the
same helper. Prepared A/C scheduling, the shared C++ core, WASM, synthesis,
recordings and immutable master are unchanged. R2 and Resend remain deferred.

## Gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Actual metadata ordering, cancellation and deadline | PASS | Three negative controls fail on the old helper; all 44 web unit tests pass on Mac and Linux |
| Final Mac Chromium/WebKit, Linux ARM64 Chromium/WebKit studio | PASS | 47 checks each; final Linux container has 3 GiB RAM and zero memory-limit/OOM events |
| Final website build and site unit checks | PASS | `npm run build` completes; 7 site tests pass; audited public bundle excludes private audio and tests |
| Page/render/interaction checks | PASS | Correct identity, meaningful content, no app errors/overlay, desktop/tablet/mobile overflow checks and actual audio controls; retained WebKit screenshot CSP warnings |
| Offline waveform and echo-frame agreement | PASS | 24 piano WAVs byte-identical, maximum absolute/RMS PCM differences zero; echo peak frames equal baseline and expected frames exactly |
| Current localhost copy and protected sources | PASS | Served HTML/JS/WASM match the delivered files; master, supplied fixture, owner recording and core/engine hashes unchanged |
| Intermediate cue check | FAIL | Paused A at 9.152 s instead of 8 s; preserved receipt, unchanged sequence passes later |
| Full suite within a 2 GiB container | FAIL | Two retained OOM failures across repeats; final larger-memory run is not a capacity pass |
| Broader Linux WebKit transport / venue reliability | PARTIAL | Narrow start-ordering repair passes; cue repeatability, sustained playback and memory qualification remain open |
| Prepared-session event-frame rerun, native C++/sanitizer rerun | NOT RUN | This change only affects manual native-media starts; shared scheduler and engine hashes are unchanged |
| Physical microphone/MIDI/output, round-trip latency, new listening / musical quality | NOT RUN | Virtual sink and browser assertions do not qualify these |
| R2, Resend, remote CI and deployment | NOT RUN | Deferred; no hosted write or publication |
| Full specification / production release | PARTIAL | Human, device, endurance and release gates remain required |

The [machine-readable summary](evidence/media-readiness/summary.json) includes
receipt hashes, all 24 WAV hashes, exact frame comparisons and protected source
hashes. The [environment record](evidence/media-readiness/environment.json)
captures hardware, toolchain versions, runner limitations and both memory setups.
The final Linux WebKit container peaked at 2,939,146,240 bytes (about 2.74 GiB),
including browser, test runner and cache; this is not a measurement of the app's
own steady-state memory usage.

## Evidence boundaries

The unmodified baseline reproduced a rejected valid reload after rapid pitch
changes: `readyState=0`, “The operation is not supported,” while B kept playing.
Its container recorded **zero memory-limit events and zero OOM kills**. Thus
memory pressure is not a sufficient explanation for that rejection.

A second baseline with decoder diagnostics reached 38 checks, then the page became
unavailable while clicking Play on the stereo replacement. The 2 GiB container
recorded **one OOM kill** in this run. This is a separate failed test condition,
not proof that the earlier rejection was caused by memory pressure. Both failure
receipts and counters are retained in `docs/evidence/media-readiness/`.

The first fixed Linux WebKit run completed all 46 existing checks, including the
valid reload, stereo replacement and disconnected playback. The next run passed
the added readiness regression, but failed a cue assertion: after rapid seeking,
the paused deck was at 9.152 s instead of the expected 8 s. There was no new OOM
kill. That failure is retained as `linux-cue-failure.json`; the broader manual
transport reliability gate remains open even if later runs pass. A later 2 GiB repeat passed that cue sequence but hit another OOM kill while
loading the stereo replacement. The final functional run therefore uses a 4 GiB
VM / 3 GiB container. This does not pass a 2 GiB capacity or endurance gate.
No assertion, audio threshold, timeout or seek sequence was relaxed.

The first Linux unit run was **FAIL (42/44)** because the diagnostic container
omitted `scripts/build_offline.py` and `scripts/service-worker.js`. The two offline
tests could not access their fixtures. The missing mounts were added to the
reproducer and the complete unit suite was rerun in an isolated container; the
initial failure remains in `unit-linux-missing-mounts.log`.

The three new focused tests fail against the old helper and pass against the fix.
They cover waiting/one start, cancellation before readiness, and absent/rejected
metadata within the existing deadline. The browser regression temporarily holds
metadata readiness unavailable, verifies no native Play call, then releases it
and verifies exactly one call and actual timeline progress.

Upstream WebKit's
[`prepareToPlay` implementation](https://github.com/WebKit/WebKit/blob/3a7a2fc7cfa015de245a11892a1f059ddc29e7e1/Source/WebCore/platform/graphics/gstreamer/MediaPlayerPrivateGStreamer.cpp)
promotes the native preload mode to eager loading. This supports the loading-order
hypothesis; it does not identify the installed binary's exact native defect or
prove that every WebKit playback failure has this cause. Context7 was unavailable;
primary upstream source was consulted. The fix's metadata ordering is tested
directly, independently of that inference.

## Reproduction

```sh
sh scripts/web_build.sh
node --test apps/web/tests/*.test.js
DJAYVO_BROWSER=chromium node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
npm --prefix apps/site run build
python3 scripts/verify_web_bundle.py
python3 docs/evidence/media-readiness/measure.py
```

Use the recorded Node versions in `evidence/media-readiness/environment.json`.
Linux uses the existing `djayvo-browser-audio:1.61.1` image, a network-disabled
container and PulseAudio null sink. Run
`sh docs/evidence/media-readiness/linux-run.sh` with the isolated `djayvo` VM
stopped to repeat the unit checks and both manual-studio browser suites. The runner temporarily uses
a 4 GiB VM / 3 GiB container, then restores the VM to 3 GiB and stops it. It
rejects an already-running VM before changing anything; that guard was checked.
Prepared-session checks were not rerun for this manual-start change.
Browser's execution tool was unavailable after discovery; the already-authorized
Playwright fallback was used. No new build tools were installed and `~/mlx-env`
was untouched. A source snapshot built Next.js without disturbing the running
localhost app; the served studio copy was refreshed separately.

## Final run artifacts

- mac-chromium: [47-check receipt](../renders/dj-chromium-bxC464/report.json), [desktop](../renders/dj-chromium-bxC464/desktop.png), [mobile](../renders/dj-chromium-bxC464/mobile.png).
- mac-webkit: [47-check receipt](../renders/dj-webkit-zwfkXh/report.json), [desktop](../renders/dj-webkit-zwfkXh/desktop.png), [mobile](../renders/dj-webkit-zwfkXh/mobile.png).
- linux-chromium: [47-check receipt](../renders/media-ready-linux-KnyNUA/dj-chromium-n7kP1w/report.json), [desktop](../renders/media-ready-linux-KnyNUA/dj-chromium-n7kP1w/desktop.png), [mobile](../renders/media-ready-linux-KnyNUA/dj-chromium-n7kP1w/mobile.png).
- linux-webkit: [47-check receipt](../renders/media-ready-linux-KnyNUA/dj-webkit-W7c5Yb/report.json), [desktop](../renders/media-ready-linux-KnyNUA/dj-webkit-W7c5Yb/desktop.png), [mobile](../renders/media-ready-linux-KnyNUA/dj-webkit-W7c5Yb/mobile.png).

The Mac Chromium desktop capture was visually inspected: the deck controls,
local library, performance channel and instrument rack render without an overlay
or clipped panels. Automated viewport checks cover the other captures.

The site remains available at http://localhost:3000/studio/dj.html. The served
copy is checked in [served.json](evidence/media-readiness/served.json). No local
recording was used by the Linux manual-deck tests; only generated regression
tones and the existing cleared instrument bank were mounted. The diagnostic
containers were removed, the VM was restored to 3 GiB and stopped, and Docker's
`desktop-linux` context was retained; see [cleanup](evidence/media-readiness/cleanup.log).

Committed text logs normalize trailing whitespace. Raw copies remain under
`renders/media-replace-linux-CUpfqp/raw-evidence-logs/`. JSON receipts are unchanged.
