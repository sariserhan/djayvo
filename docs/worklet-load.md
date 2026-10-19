# Real-time instrument AudioWorklet validation

Follow-up: [reusing unchanged interpolation coefficients](interpolation-cache.md)
reduces repeated note-start work and validates four new browser runs with exact
audio/events. Timing screens still fail. The results below retain the earlier,
unchanged-engine baseline.

2026-10-19. This increment tests the production instrument worklet and shared
WASM engine in actual browser audio processing. It adds diagnostics and evidence;
production DSP, browser controls, recordings and the master specification are
unchanged. Full live/venue readiness remains **PARTIAL**.

**PASS:** all four final browser/platform runs produce byte-identical native
reference PCM and exact command frames. **FAIL:** coarse wall-time threshold
screens exceed one quantum. **PARTIAL:** precise deadline and venue qualification.
**NOT RUN:** physical latency, microphone/MIDI latency and new listening.

## Scope

The existing [live load program](live-deadline.md) repeats six times: sixty
seconds at 48 kHz, 22,500 blocks of 128 frames, 1,920 on/off commands, bursts of
32 voices across all thirteen patches and release intervals. A test-only subclass
calls the unchanged production note handler and `process` method. It records
the actual command frames. This proves deterministic execution inside the
processor; commands are not sent from a user gesture or through a timed main
thread message queue, so input/MIDI latency is **NOT RUN**.

A second worklet captures the actual stereo output. A separate native
`AudioBufferSourceNode` supplies an exactly representable sample counter, allowing
timestamp anomalies to be distinguished from missing samples. Both the PCM and
counter are checked; the counter alone could miss corruption in the instrument
path. The graph remains connected to a real-time `AudioContext` destination,
with explicit downstream muting. Chromium's default test-runner mute flag is
removed. No microphone or external network request is used.

The harness preallocates captures, clocks the production command/render portion,
and writes files only after capture. It adds processing overhead and does not
measure every part of the browser graph. The production processor is concatenated
unchanged with the probe by a private loopback server; no test code enters the
shipping bundle. This is a headless browser test, not a manual Safari/Chrome or
physical speaker observation.

## Evidence and limits

| Run | Wall seconds | Largest coarse reading / readings >2.667 ms | PCM / independent counter | Explicit command frames |
| --- | ---: | ---: | --- | --- |
| Mac Chromium initial | 60.191 | 3 ms / 13 | PASS / PASS | NOT RUN |
| Mac WebKit initial | 60.015 | 4 ms / 5 | PASS / PASS | NOT RUN |
| Mac Chromium final | 60.079 | 3 ms / 6 | PASS / PASS | PASS |
| Mac WebKit final | 60.225 | 7 ms / 7 | PASS / PASS | PASS |
| Linux Chromium | 60.333 | 13 ms / 16 | PASS / PASS | PASS |
| Linux WebKit | 59.995 | 5 ms / 14 | PASS / PASS | PASS |

All six captures have **zero maximum/RMS waveform difference**, no timestamp or
independent counter gaps, 1,920 accepted commands and zero active voices at the
end. Every ten-second repeat is checked, including startup; no warmup is removed.
The largest WebKit readings are at frame zero with 32 note commands. Linux
Chromium's 13 ms reading is at frame 13,184 without commands. These positions
help locate observations but do not establish whether JIT compilation, engine
work, clock behavior or descheduling caused them.

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Actual browser worklet execution | PASS | Four final Mac/Linux runs plus two retained initial Mac runs; each processes sixty seconds of stereo samples |
| PCM portability and signal bounds | PASS | Every repeat matches the native reference exactly; finite peak 0.7247590423, no clipping |
| Final command-frame agreement | PASS | All 1,920 applied relative frames match the trace in each of four final runs |
| Captured sample continuity | PASS | Zero counter gaps and timestamp anomalies across all six captures; not physical speaker observation |
| Chromium reported underruns | PASS | Zero events/duration in three snapshots; covered durations 59.972 / 59.071 / 59.988 seconds |
| WebKit reported underruns | NOT RUN | API absent; PCM continuity is checked separately |
| Coarse wall-time threshold screen | FAIL | Every run has readings above 2.667 ms; none discarded |
| Precise deadline / outlier cause | PARTIAL | Only coarse wall clocks available in the tested worklets; not a CPU-time measurement |
| Web unit / probe calibration tests | PASS | 30/30 Mac web tests and 4/4 Linux probe tests; injected counter, audio and timestamp defects detected |
| Browser/worklet allocations | NOT RUN | Fixed WASM memory 32 MiB; no JS/host allocation profiler used |
| Protected files / cleanup | PASS | Master, supplied fixture, owner inputs, native library and live WASM unchanged; isolated Linux container removed, VM stopped, default context preserved |
| Full decks / physical Linux / microphone / venue / new listening | NOT RUN | This diagnostic exercises instruments only; full production readiness stays PARTIAL |

Mac: Apple M5, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1 (27A9275),
Apple Clang 21.0.0, Node 22.23.1, Playwright 1.61.1, Chromium 149.0.7827.55,
WebKit 26.5; existing live WASM built with Emscripten 6.0.1. The host default
output remains LG Ultra HD / DisplayPort / 48 kHz. See
[environment and hashes](evidence/worklet-load/environment.json) and
[default output](evidence/worklet-load/mac-default-output.json).

Linux: existing 2-CPU/3-GiB ARM64 VM, Linux 6.8.0-117-generic,
Ubuntu 24.04.4 container, Node 24.17.0, Chromium 149.0.7827.0, WebKit 26.5,
Playwright 1.61.1, PulseAudio 16.1 null sink at 48 kHz.
[Container environment](evidence/worklet-load/linux-environment.txt),
[cached image ID](evidence/worklet-load/linux-image-id.txt) and
[cleanup](evidence/worklet-load/linux-cleanup.log) are retained. Peak cgroup
memory is 1,850,830,848 bytes; zero cap/OOM events. Browser user-agent strings
do not describe the actual CPU; Node/uname establish ARM64 here.
The [PulseAudio log](evidence/worklet-load/linux-pulse.log) retains missing
D-Bus/cookie and root-user warnings from the minimal container. The explicit
local socket/null sink completed both runs; this is not a clean physical-device
or system audio-service qualification.

[Measurements](evidence/worklet-load/measurements.json) retain all runs, including
initial Mac captures before explicit command-frame telemetry was added. Each
full capture contains 2,880,000 stereo frames. The initial runs retain their
original receipts and timing values; subsequent runs do not replace them.
The full PCM, frame clocks, coarse timing arrays and final command traces stay
in ignored `renders/`. Ten-second PCM16 excerpts are exported alongside them.
The [Mac Chromium excerpt](../renders/worklet-load-chromium-BGzroX/captured-instruments.wav)
and [Linux WebKit excerpt](../renders/worklet-linux-pMNC9i/worklet-load-webkit-lVbqiK/captured-instruments.wav)
are playable diagnostics. All six excerpts share SHA-256
`bb5e9d5e13494191303173f9a1bbccee1a9de3cb8f7a36810fb4e3df11346602`.

The browser worklet exposes `Date.now`, not `performance.now`, in these runs.
The observed measurements use integer milliseconds and a non-monotonic wall
clock. Some readings exceed the **2.667 ms** quantum: the coarse timing screen
is **FAIL**. Exact deadline qualification remains **PARTIAL**; neither those
readings nor intact captured PCM establishes what reached physical speakers.
The earlier native/Node offline deadline failures remain **FAIL**.

Chromium exposes experimental [AudioPlaybackStats](https://developer.mozilla.org/en-US/docs/Web/API/AudioPlaybackStats).
Its asynchronous counters are retained with their reported `totalDuration`;
that snapshot can lag the end of the sixty-second capture. WebKit does not expose
this API here: its browser-reported underrun gate is **NOT RUN**, not zero.
[Output latency](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency)
and [output timestamps](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp)
are browser estimates, not a microphone/physical loopback measurement. WebKit's
reported output latency of zero is not a claim of zero physical latency.

Calibration tests deliberately insert stale timestamps, missing counter samples
and altered stereo PCM. Another check verifies on/off dispatch at both ends of
two consecutive programs. [Unit results](evidence/worklet-load/web-unit-tests-final.log)
record all 30 web unit tests passing. No new native build, sanitizer or full
manual-deck suite was required for these test-only changes.

These instrument checks do not close [DJ14's Linux WebKit media restart failure](linux-browser.md)
or [DJ17's intermittent startup issue](beat-echo.md). They do not exercise the
full A/C session, microphone, physical MIDI, route changes, feedback, battery,
competing applications or hour-long venue playback. Musical quality and new
human listening remain **NOT RUN**. No model training or musical improvement is
claimed from this stress program.

## Reproduce

Use the existing project Playwright installation and built live WASM. The
ten-second native reference and event trace come from the existing
[offline probe](live-deadline.md#reproduce), at
`renders/live-deadline-20261019/mac-detailed.{f32,tsv}`. Do not regenerate or
replace the supplied speech fixture. Run browsers sequentially:

```sh
node --test apps/web/tests/*.test.js
node apps/web/tests/worklet-load.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/worklet-load.mjs
sh docs/evidence/worklet-load/linux-run.sh
```

Every browser invocation creates a fresh artifact directory, refuses overwrite
of uploads and retains an error receipt if browser execution/assertions fail.
Exit success covers PCM, command frames and independent counter checks; inspect
timing/underrun gates separately. Each capture runs for sixty seconds after the
Start gesture, with a ninety-second completion timeout.

The Linux script reuses the cached project browser/PulseAudio image, starts the
existing `djayvo` VM only if needed and restores its prior stopped state. It uses
container-only loopback, no network, a software null sink, a 2 GiB memory cap and
1 GiB shared memory. Only browser source/dependencies, the static bundle, two
generated reference files and a fresh output directory are mounted; no home,
credentials, reference music or speech recordings are passed in. It removes its
own container without changing Docker's default context. Linux ARM64 VM results
are not evidence for the owner's physical Intel Linux machine or sound device.

Independently verify fresh captures and export WAVs, passing their printed paths
(map Linux `/work/renders/` to the printed host output directory):

```sh
python3 docs/evidence/worklet-load/measure.py /tmp/worklet-measurements-new.json \
  renders/worklet-load-chromium-... renders/worklet-load-webkit-... \
  renders/worklet-linux-.../worklet-load-chromium-... \
  renders/worklet-linux-.../worklet-load-webkit-...
```

The verifier refuses an existing report or excerpt WAV. Use new captures to
repeat the export; existing recordings/evidence are never overwritten.
