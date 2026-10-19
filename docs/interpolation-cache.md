# Reuse unchanged instrument interpolation coefficients

2026-10-19. Sampled voices now retain their last interpolation cutoff and reuse
the existing 65×16 coefficient table when that cutoff is exactly unchanged.
Previously every sampled note rebuilt the table with trigonometric operations.
This removes redundant work from repeated note starts without approximating
coefficients or changing the sound. The first use and every changed cutoff still
execute the original calculation. This is not a cold-start solution.

The change is one per-voice `double` and an exact-equality guard in shared C++17.
Sample selection, rate, take, velocity, filter, envelope, note ID, routing and
automation state reset before the guard. Synthesized notes leave the dormant
sample table intact; a subsequent sampled note validates its cutoff before reuse.
There is no shared mutable cache, additional allocation, lock, platform API,
dependency or change to the C ABI. C++ clients must rebuild with the new internal
`Voice` layout; the old/new probes each use their corresponding header/library.

The investigation began with [instrument worklet timing observations](worklet-load.md).
This identifies avoidable engine work, not the cause of every browser timing
outlier. A production cold start still builds coefficients, and sustained
rendering/runtime/scheduling costs remain. Musical quality is **NOT RUN**; the
intended result is identical audio with less repeated setup work.

## Validation

| Gate | Status | Actual evidence |
| --- | --- | --- |
| Native build and full suites | PASS | 15/15 suites on M5 and Linux ARM64; final strengthened routing regression rerun on Mac |
| ASan / UBSan | PASS | Core and live suites; final core regression rerun after adding changing-gain assertions |
| Exact note-start behavior | PASS | 756 permanent cases; 6,000 before/after probe notes per run, 1,536,000 Float32 samples, identical on Mac/Linux |
| Saved compositions / stems | PASS | 14 scores, all 75 WAVs per platform and exact event frames; maximum/RMS waveform difference zero |
| Remix WASM | PASS | Seven fixture styles and four owner seeds match native output; consent/corrupt-input checks pass |
| Real-time instrument worklets | PASS | Mac/Linux Chromium/WebKit: 60 seconds each, 1,920 command frames, exact reference PCM, zero captured sample/timestamp gaps |
| Native allocations / fixed WASM memory | PASS | Native load counts zero C++ `new`; worklet instances retain 32 MiB memory; JS/host allocations not measured |
| Native deadline observation, this run | PASS | 225,000 blocks, none over 2.667 ms; earlier failures remain retained |
| Browser coarse timing screens | FAIL | All four runs retain above-budget readings; does not establish precise CPU time or physical glitches |
| Full live readiness / outlier causes | PARTIAL | Cache misses/cold starts and runtime scheduling remain; DJ14/DJ17 remain open |
| Web units / bundle / served engines | PASS | 30 unit checks, four Linux probe checks, audited static/site bundles and matching engine hashes from both localhost servers |
| Hardware round-trip / venue / new listening / phone | NOT RUN | Browser processing and exact PCM do not establish these gates; phone work remains paused |
| Master / supplied fixtures / source recordings | PASS | Protected hashes unchanged; no regeneration or overwrite |

The [machine-readable measurements](evidence/interpolation-cache/measurements.json)
and [browser measurements](evidence/interpolation-cache/worklet-measurements.json)
contain the comparisons, timing distributions and hashes. The current M5
[environment](evidence/interpolation-cache/environment.json) is macOS 26.7.1,
16 GiB, Xcode 27.1, Apple Clang 21, CMake 4.4.2, Node 22.23.1 and Emscripten 6.0.1.
The [Linux native log](evidence/interpolation-cache/linux-native.log) records
GCC 12.2 / CMake 3.25.1 on the existing ARM64 Debian 12 container, kernel 6.8.0-117.
The browser container uses [Ubuntu 24.04.4, Node 24.17 and PulseAudio 16.1](evidence/interpolation-cache/linux-browser-environment.txt).
Playwright is 1.61.1; Chromium is 149.0.7827.55 on Mac / 149.0.7827.0 on Linux,
and WebKit is 26.5. These are VM/browser checks, not physical Intel Linux evidence.

The permanent regression compares reused and fresh voices across **756 cases**:
six sample rates from 8–192 kHz, seven instruments, low/high pitches, repeated
notes, three velocity/take choices, electronic/muted variants, routing and
automation changes, attack and release samples. This covers both cache reuse
and invalidation, including switching through synth voices. Existing tests keep
the live voice cap, release behavior, all thirteen patches, all 88 piano keys
and zero counted render/note allocations.

The independent [probe](evidence/interpolation-cache/probe.cpp) measures 2,000
starts in each of three sequences: fixed pitch, changing pitches, and changing
rate/instrument. Each start is compared with a fresh voice; all 256 attack/release
samples are retained. Baseline and candidate are separate executables linked to
the original and new libraries. Three paired runs per platform retain all
results, with no outlier or first-call exclusion. One initial Mac baseline run
is also retained. These are isolated note-start microbenchmarks, not complete
song-generation or input-to-speaker latency measurements.

Fourteen saved scores are replayed through the normal validated CLI, covering
the supplied fixture, dense/echo plans and the already-consented owner recording.
All 75 master/stem WAVs per platform are compared byte-for-byte with the retained
pre-change exports; plans and event traces must also agree. No source recording
or supplied synthetic speech fixture is regenerated. The frozen evaluation
cohort and listening comparisons are unchanged.

The rebuilt WASM is exercised through the seven-style fixture suite, four owner
call-response seeds and the existing real-time instrument worklet capture. The
public studio bundle and its integrated-site copy are refreshed and audited.
Test probes, private audio and reference music remain outside public assets.

## Timing interpretation

Median of three per-run medians, in microseconds, for the isolated `Voice::start`
call (the first call remains in each run):

| Platform / sequence | Before | After |
| --- | ---: | ---: |
| M5, fixed pitch | 5.041 | 0.042 |
| M5, changing pitches | 5.042 | 0.042 |
| M5, alternating rate/instrument | 5.042 | 0.083 |
| Linux ARM64 VM, fixed pitch | 8.250 | 0.208 |
| Linux ARM64 VM, changing pitches | 8.208 | 0.167 |
| Linux ARM64 VM, alternating rate/instrument | 8.251 | 0.208 |

The alternating sequence's slower tail is still present: Linux p95 is about
10.8 µs after versus 10.5–10.9 µs before. Cache misses do not gain the same
benefit. See [all trials](evidence/interpolation-cache/measurements.json).

Repeated starts can skip the expensive coefficient loop, but samples still use
the same filter. Median cached note-start times approach the timer's resolution;
large ratios at that scale must not be presented as whole-engine speedups.
Changing cutoffs still incurs the original work. The first candidate Mac probe's
first call took 29.709 µs; that observation is retained, not hidden as warmup.

The native 600-virtual-second stress run has unchanged PCM/events and zero counted
allocations. It records no block beyond 2.667 ms in this run, with a maximum of
0.817 ms. Its 10.195-second total is similar to the earlier 10.159/10.337-second
runs; no overall throughput improvement is claimed. Attack-block median falls
from the earlier 173.5/176.7 µs observations to 67.9 µs, while overall p99 remains
about 162 µs. Historical timing comparisons are not a controlled hardware
isolation experiment.

Browser captures remain instrument-only, muted, sixty-second real-time runs.
The coarse `Date.now` timing screen can still fail even when captured PCM matches
and Chromium reports no underruns. WebKit's underrun API remains unavailable.
Neither a clean native run nor a browser counter certifies physical output,
microphone/MIDI latency, full-session continuity or venue endurance. DJ14's media
restart failure and DJ17's startup issue are separate and remain open.

| Updated engine run | Largest coarse reading | Readings over 2.667 ms | Captured PCM / command frames |
| --- | ---: | ---: | --- |
| Mac Chromium | 3 ms | 3 | PASS / PASS |
| Mac WebKit | 5 ms | 6 | PASS / PASS |
| Linux Chromium | 8 ms | 11 | PASS / PASS |
| Linux WebKit | 5 ms | 14 | PASS / PASS |

Chromium snapshots report zero underruns, covering 59.097 s on Mac and 59.718 s
on Linux. These asynchronous counters lag completion. WebKit's corresponding
gate is **NOT RUN**. Changed outlier counts versus the previous runs do not prove
a scheduling improvement. All four ten-second playable excerpts are identical
to the earlier stress WAV; for example, the [updated Mac capture](../renders/worklet-load-chromium-ezK83D/captured-instruments.wav).

## Reproduce and retained evidence

The initial build attempt used a stale `.venv-build/bin/cmake` path and failed
before compilation. The installed `/opt/homebrew/bin/cmake` was then used; no
tools were installed and `~/mlx-env` was untouched. Both the setup failure and
successful build/test logs remain in [evidence/interpolation-cache](evidence/interpolation-cache).

From the existing checkout:

```sh
cmake --build build-mac -j 4
ctest --test-dir build-mac --output-on-failure
cmake --build build-mac-sanitize -j 4
ctest --test-dir build-mac-sanitize -R '^(core|live_instruments)$' --output-on-failure
c++ -std=c++17 -O2 -I core/include docs/evidence/interpolation-cache/probe.cpp \
  build-mac/libdjayvo_core.a -o /tmp/djayvo-interpolation-probe
/tmp/djayvo-interpolation-probe /tmp/djayvo-interpolation-new
python3 docs/evidence/interpolation-cache/replay.py build-mac/djayvo_remix \
  /tmp/djayvo-interpolation-replay-new
sh scripts/web_build.sh
node apps/web/tests/wasm.mjs
node docs/evidence/active-vocals/wasm-check.mjs
node apps/web/tests/worklet-load.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/worklet-load.mjs
```

For a fresh baseline, build commit `321afbb` in an isolated worktree and compile
the same probe using that revision's headers and static library. Do not link the
old library against the changed C++ header. The original local library, CLI,
WASM and header are retained under `renders/interpolation-cache-20261019/`.

[linux-native.sh](evidence/interpolation-cache/linux-native.sh) uses the existing
isolated Linux ARM64 VM/container, its previous library for the baseline and a
new `/work/interpolation-cache-20261019` build for the candidate. Run the existing
[Linux browser helper](evidence/worklet-load/linux-run.sh) afterward, then stop
`djayvo-portability` and the `djayvo` profile. This is not the owner's physical
Intel Linux machine. No paid compute, deployment, model training or phone work
occurs. Use fresh prefixes/directories for reruns; probes and exports refuse
existing outputs.
The [browser cleanup receipt](evidence/interpolation-cache/linux-browser-cleanup.log)
records removal of its temporary container; the [final cleanup](evidence/interpolation-cache/cleanup.log)
stops the native container and VM. Docker's default context stays `desktop-linux`.
Existing localhost servers remain running with the new binaries, verified by
[HTTP hashes](evidence/interpolation-cache/http-engine.json). A new physical-device
or full manual browser session was not run.

[measure.py](evidence/interpolation-cache/measure.py) verifies retained before/
after and cross-platform PCM, all saved replays, event traces, native/WASM cases,
browser captures and protected source hashes. It delegates browser telemetry
verification and playable WAV export to the existing worklet measurement script.
Its fixed study paths identify this run; use fresh paths and reports for another
study rather than overwriting evidence.
