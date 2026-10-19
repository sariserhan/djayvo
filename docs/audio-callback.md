# Actual macOS output-callback validation

Subsequent [browser worklet validation](worklet-load.md) adds actual Mac/Linux
Chromium/WebKit instrument execution. The NOT RUN entries below describe this
earlier native-only increment; browser timing screens still fail and physical
latency/venue gates remain open.

2026-10-19. **PASS for this 60-second native output-callback run; live studio
readiness PARTIAL.** The unchanged shared C++ engine ran in the real macOS
default-output audio callback on the Apple M5. Speaker output was explicitly
zeroed; generated instrument samples were captured in preallocated memory before
that output. No microphone was opened and no system audio setting was written.

The active route was **LG Ultra HD over DisplayPort, 48 kHz, 512-frame device
buffers**. This is not a built-in-speaker, headphone or browser AudioWorklet test.
The default device ID was the same before and after the run; route changes were
not deliberately exercised. [Environment and binary/source hashes](evidence/audio-callback/environment.json)
record the actual route, Apple M5 / 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1
(27A9275) and Apple Clang 21.0.0.

## What ran

The existing [live load program](live-deadline.md) supplies the unchanged 320
command frames and offline Float32 reference. Its ten-second program repeats
six times without reinitializing the engine: five bursts of 32 voices, including
piano, sustained synths, all thirteen patches and talk bass/percussion. Note-offs
and silent release intervals are retained. All **1,920 commands** are handled
inside the audio callback, with each engine call bounded to 128 frames and split
at command boundaries even when a host callback spans several engine blocks.

The probe measures its callback body, including note commands, engine rendering,
buffer clearing and copying into the preallocated capture. It records timestamps
and counters in fixed storage. File writes, sample comparisons and report
generation happen after the audio unit stops. The final telemetry write/function
return are outside the measured interval. C++ `new` counting is scoped to the
callback thread; it does not intercept C allocation or claim that Apple framework
internals never allocate.

| Gate | Status | Actual evidence |
| --- | --- | --- |
| Probe build / existing live suite | PASS | [Build](evidence/audio-callback/build.log), [focused CTest](evidence/audio-callback/live-tests.log); shared library unchanged |
| Diagnostic self-tests | PASS | [Self-test](evidence/audio-callback/self-test.log): uneven 113/512-frame calls, exact offline PCM, mute flag/zero buffers, no counted allocations; injected timestamp gap, missing flags and over-budget duration detected |
| ASan / UBSan self-tests | PASS | [Sanitizer log](evidence/audio-callback/sanitize-self-test.log); simulated callback path, not a sanitized timing run |
| Real default-output execution | PASS | [Run](evidence/audio-callback/run.json): 60.052 s wall time, exactly 60 s of sample timestamps, 5,625 callbacks and 2,880,000 captured stereo frames |
| PCM and command-frame agreement | PASS | All six captured Float32 programs byte-identical to the prior Mac/Linux/WASM reference; maximum/RMS waveform difference **zero**; independent per-callback event counts match expected frame ranges |
| Callback continuity | PASS | No sample-timestamp gaps, missing sample/host timestamp flags, rejected notes or leftover active voices |
| Measured callback budget, this route/run | PASS | No callback body exceeds **10.667 ms** (512/48k); maximum **4.262 ms**, p99 **3.325 ms**, p95 **1.920 ms**, median **0.590 ms** |
| Callback C++ allocations | PASS | Zero counted `new` allocations throughout all callbacks |
| Signal bounds | PASS | Finite samples, peak 0.7247590423, exact prior output; device buffers explicitly silent |
| Cause of prior offline timing outliers | PARTIAL | This is a different execution context and block budget. It does not establish why the previous Node/Linux/Mac outliers happened |
| Prior strict 128-frame offline gate | FAIL | Earlier failed measurements remain in [live-deadline.md](live-deadline.md); no threshold or receipt was replaced |
| Browser AudioWorklet / physical loopback / microphone round-trip | NOT RUN | Samples were captured before the muted output; no observation of acoustic output or input-to-output latency |
| Full suite / new Linux execution | NOT RUN | This increment changes only Mac diagnostic code and evidence; previous native/Linux/WASM results remain historical |
| Musical quality / venue endurance / production | PARTIAL | No new listening evidence, learned behavior or full live-session qualification; formal musical evaluation remains NOT RUN |

The **10.667 ms host budget is not the prior 2.667 ms budget**. A 4.262 ms
callback contains four 128-frame engine blocks. This result cannot pass the
browser's smaller quantum by assumption, establish zero physical dropouts, or
certify an hour-long session with decks, microphone, MIDI and competing work.
No production DSP change was justified or made.

## Retained artifacts

- [Measurements](evidence/audio-callback/measurements.json) contain gate results,
  waveform/trace hashes, callback-size distribution and source preservation checks.
- [Captured instrument excerpt](../renders/audio-callback-20261019/captured-instruments.wav)
  is the first ten seconds of the callback capture converted to stereo PCM16 with
  `round(sample × 32767)`. It matches the prior stress WAV exactly and is a
  diagnostic, not a new musical performance or a perceptual improvement.
- `renders/audio-callback-20261019/mac.f32` retains all 60 seconds before muting;
  `mac.tsv` retains every callback's capture frame, requested frames, sample/host
  timestamps, begin/end clock ticks, command count and C++ allocation count.
- Initial measurement files are retained. The final measurement adds an
  independent per-callback event-frame/count check; both WAV conversions are
  byte-identical. No audio run was discarded or replaced.

The master, supplied synthetic speech fixture, owner recording and existing
engine library match their protected hashes. Training candidates, prior listening
pages and frozen evaluation outputs are unchanged. No new paid compute, upload,
infrastructure changes, browser changes or phone work occurred.

## Reproduce

The probe uses only the existing portable core plus Apple frameworks in this
standalone diagnostic. Platform APIs have not entered `core/`. Apple documents
the [render callback](https://developer.apple.com/documentation/audiotoolbox/aurendercallback?language=objc)
and [timestamp fields](https://developer.apple.com/documentation/coreaudiotypes/audiotimestamp).
The installed Xcode SDK headers also define the default-output subtype and
input-scope render-callback property used here.

From the repository root, with a fresh output prefix:

```sh
c++ -std=c++17 -O2 -Wall -Wextra -Wpedantic -I core/include \
  docs/evidence/audio-callback/probe.cpp build-mac/libdjayvo_core.a \
  -framework AudioToolbox -framework CoreAudio -framework CoreFoundation \
  -o /tmp/djayvo-audio-callback
/tmp/djayvo-audio-callback renders/live-deadline-20261019/mac-detailed \
  unused --self-test
/tmp/djayvo-audio-callback renders/live-deadline-20261019/mac-detailed \
  /tmp/djayvo-callback-new
```

If the reference is absent, generate a fresh reference prefix using the prior
[offline probe](live-deadline.md#reproduce), then pass that prefix instead. The
real run is bounded to 60 seconds of capture and a 75-second wall timeout. It
never changes the selected device or hardware buffer size and refuses existing
output paths. The audio unit is stopped, uninitialized and disposed on exit.
Exit success confirms the signal checks; inspect deadline/gap/allocation fields
separately. [measure.py](evidence/audio-callback/measure.py) independently checks
the retained PCM and telemetry and exports the excerpt; use fresh paths for
another evidence set because it refuses to overwrite its output.
