# Live instrument load and deadline measurements

2026-10-19. **Signal integrity PASS; strict offline deadline check FAIL;
real-time readiness PARTIAL.** This increment adds a reproducible stress probe
and retained measurements. It makes no production engine, arrangement, training,
browser UI or master-specification change.

The shared live engine processes a ten-second program sixty times continuously,
without reinitializing between repetitions: **600 seconds of virtual audio,
225,000 blocks at 48 kHz / 128 frames**. This is accelerated offline processing,
not a ten-minute real-time playback or venue endurance test. Each program has
five 32-note bursts: sampled piano, sustained synths, all thirteen patches,
talk bass/percussion, and another mixed group. Each burst releases after one
second; the next starts at two seconds. There are 320 note-on/off commands per
program and 19,200 per run. This deliberately dense diagnostic is not a musical
composition or a claim of improved improvisation.

## Results and boundaries

| Gate | Status | Evidence |
| --- | --- | --- |
| Native probe builds | PASS | Apple Clang 21 and Linux GCC 12.2, existing unchanged engine libraries |
| Existing live-instrument tests | PASS | [M5](evidence/live-deadline/mac-tests.log) and [Linux](evidence/live-deadline/linux.log), one focused CTest suite each; full suites not rerun for this evidence-only increment |
| Repeated PCM and event timing | PASS | Each run checks every output sample of all sixty programs against its first; Mac/Linux first-program Float32 bytes and all 320 event frames match; Node WASM matches native bytes exactly |
| Signal safety / release | PASS | All samples finite, peak 0.7247590423, RMS 0.1245789616; exactly 32 active voices reached; all notes retire; 11,100 late-tail blocks per run below 1e-7 |
| Engine allocation / WASM memory | PASS | Zero counted C++ `new` allocations during each native loop; fixed 32 MiB WASM memory does not grow. This does not claim the Node test harness is allocation-free or intercept C `malloc` |
| No block over 2.667 ms in these offline runs | FAIL | Initial Mac, first Linux and Node WASM runs have overruns; passing reruns do not erase them |
| Cause of timing outliers | PARTIAL | All Node overruns have process CPU below budget; Linux's one overrun also exceeds the CPU budget. No deterministic engine defect established |
| Browser AudioWorklet / hardware latency / venue endurance | NOT RUN | Node main-thread WASM and accelerated native rendering do not test an audio device, browser scheduling, input/output latency, thermal endurance or competing live decks |
| Musical benefit / formal listening | NOT RUN | No new listener observations, quality rating, preference or training evidence |
| Production / full specification | PARTIAL | Existing M1, live, hardware and release gates remain open |

Every detailed timed block includes due note commands, the render call and two
process-CPU clock reads. Output assertions, PCM comparisons, statistics collection
and file writes sit outside that interval. Wall timings still include scheduler
delays and runtime effects. There is no warmup exclusion, and no outlier is
discarded. Process CPU is diagnostic: it is not an isolated audio-thread metric,
especially for a VM or multithreaded Node runtime.

| Run | Wall time for 600 virtual seconds | Block p99 | Maximum block | Over 2.667 ms |
| --- | ---: | ---: | ---: | ---: |
| M5 initial, wall-only timer | 9.981 s | 0.158 ms | 3.295 ms | 1 |
| M5 detailed | 10.159 s | 0.161 ms | 2.186 ms | 0 |
| M5 unchanged rerun | 10.337 s | 0.168 ms | 1.879 ms | 0 |
| Linux ARM64 VM detailed | 15.415 s | 0.280 ms | 2.724 ms | 1 |
| Linux unchanged rerun | 15.158 s | 0.274 ms | 0.692 ms | 0 |
| Node WASM, M5 | 23.340 s | 0.400 ms | 99.781 ms | 48 |

The initial Mac probe recorded wall times only; its
[original report](evidence/live-deadline/mac-initial.json) is retained. CPU timing
and repeat/frame coordinates were then added before the detailed runs. The
[detailed Mac](evidence/live-deadline/mac-detailed.json),
[Mac rerun](evidence/live-deadline/mac-repeat.json),
[Linux](evidence/live-deadline/linux-detailed.json),
[Linux rerun](evidence/live-deadline/linux-repeat.json) and
[WASM report](evidence/live-deadline/wasm.json) contain the distributions.

The worst Node delay used only 0.256 ms of recorded process CPU during 99.781 ms
of wall time. This is consistent with descheduling or host/runtime delays; it
does not prove their exact cause, or a browser audio dropout. None of its 48
overruns occurred on a note-on burst. Linux's 2.724 ms outlier used 2.722 ms of
process CPU, during a sustained-synth block, and did not repeat in a second
identical workload. No speculative DSP change is justified by these measurements.
The next timing gate needs an actual AudioWorklet/device run with continuous PCM
capture and scheduling diagnostics; DJ14's separate media restart failure remains
unresolved by this probe.

## Playable output and preservation

[Ten-second live stress program](../renders/live-deadline-20261019/live-stress.wav)
is newly generated from the existing original/cleared instrument bank. It is a
diagnostic at fixed velocity patterns, not a new speech remix. Conversion is
stereo PCM16, `round(Float32 × 32767)`, at 48 kHz.

[Measurements](evidence/live-deadline/measurements.json) record exact native/WASM
Float32 agreement: **maximum and RMS waveform difference zero**, unchanged event
frames and WAV/PCM/trace hashes. They also verify the unchanged master,
transferred synthetic speech fixture, owner recording and existing Mac library.
The owner listening comparisons and frozen evaluation cohort remain untouched.
There was no training, rental, upload, hosted mutation or phone work.

Actual environment: Apple M5, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1,
Apple Clang 21.0.0, Node 22.23.1; Linux aarch64 Debian 12 on the local Colima VM,
GCC 12.2.0 and CMake 3.25.1. The unchanged standalone WASM was built with the
previously recorded Emscripten 6.0.1 toolchain. The
[environment receipt](evidence/live-deadline/environment.json) pins source,
native-library, WASM and probe hashes. Linux here is not the owner's physical
Intel system. The temporary VM/container are stopped afterward; the default
Docker context and `~/mlx-env` are unchanged.

## Reproduce

Build against the existing local engine and use a fresh output prefix:

```sh
c++ -std=c++17 -O2 -Wall -Wextra -Wpedantic -I core/include \
  docs/evidence/live-deadline/probe.cpp build-mac/libdjayvo_core.a \
  -o /tmp/djayvo-live-deadline
/tmp/djayvo-live-deadline /tmp/djayvo-live-new
node docs/evidence/live-deadline/wasm.mjs dist/web/engine/djayvo_live.wasm \
  /tmp/djayvo-live-new /tmp/djayvo-live-wasm-new.json
ctest --test-dir build-mac -R '^live_instruments$' --output-on-failure
```

Compile the same probe against the Linux library and compare `.f32` and `.tsv`
bytes. Run timing probes sequentially without other benchmark/build jobs. The
native program exits on signal/repeat/allocation failure but records deadline
misses without discarding the audio evidence. A successful process exit therefore
does **not** pass the deadline gate: inspect `blocks_over_deadline`.
[measure.py](evidence/live-deadline/measure.py) validates the recorded artifact
paths and exports the WAV, refusing to overwrite the prior WAV/measurement report.
Use fresh paths for another measurement set.
