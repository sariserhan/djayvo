# Bounded active vocal processing

2026-10-19. **Technical optimization PASS; musical quality unchanged/unassessed.**
The shared renderer now visits only active vocal triggers instead of scanning
every earlier trigger on every output frame. Dense accepted plans could
previously keep rechecking up to 1,024 finished/active triggers throughout the
remaining music and silent tail.

The existing validator already caps simultaneous vocal triggers at 16, including
echoes. The renderer now keeps 16 fixed pointer slots, expires finished clips
before admitting same-frame starts, and consumes the sorted trigger list once.
The next ending is tracked, so compaction runs only when a clip expires. Stable
compaction retains the previous summation order. An unexpected overflow
is counted and rejects export through the existing failure path; active voices
are never silently stolen. No allocation, locking or I/O is added to processing.

Scope: `RemixRenderer` private state/process loop, one native regression group,
and evidence. Input analysis, musical planning, DSP equations, sample assets,
schema and C entry points are unchanged. The C++ class layout changes, so native
consumers must rebuild together; this is not a drop-in replacement for an old
compiled C++ client. Current native/WASM builds were rebuilt. Phone work remains
paused.

## Correctness and portability gates

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Apple M5 release | PASS | [Final 15/15 suites](evidence/active-vocals/mac-tests.log), 37.81 s |
| Linux arm64 release | PASS | [15/15 suites](evidence/active-vocals/linux-build-tests-render.log), 36.50 s; local VM, not physical Intel Linux |
| ASan/UBSan | PASS | [Affected suite](evidence/active-vocals/sanitize-tests.log), 130.99 s |
| Active scheduling regression | PASS | 129 events, variable lengths/rates/reversal/pans, one-frame clips, 16-slot reuse at the exact preceding end frame, rejection of 17 overlapping voices, sample oracle, 113/512-frame block identity and zero processing allocations |
| Existing music and stress renders | PASS | **75 byte-identical old/new/Mac/Linux WAVs** across 14 plans: 65 existing owner/fixture master/stems plus ten dense/echo master/stems; identical musical decisions and event frames |
| Dense import | PASS | 1,024-event plan and 256-event echo plan (1,021 compiled triggers) pass native validation and retain the exact previous output |
| WASM engine | PASS | Eleven native/WASM comparisons: seven fixture styles and four owner seeds; exact plans/event frames/PCM, no observed analysis differences |
| Local web delivery | PASS | Rebuilt/audited bundle and site copy; [ports 3000/4173](evidence/active-vocals/http-engine.json) serve the matching engine hash |
| Offline timing measurement | PASS | 24 verified interleaved runs per OS; sparse results disclosed separately from dense improvements |
| Live/device/venue latency | NOT RUN | Offline CLI timings do not measure callback deadline reliability or hardware latency |
| Rendered-browser interaction | NOT RUN | Node WASM and HTTP verification only for this change |
| New musical quality | NOT RUN | Audio is intentionally unchanged; these tests do not establish musical preference |
| Full specification / production | PARTIAL | M1 and existing device/live/release gates remain open |

[Measurements](evidence/active-vocals/measurements.json) retain the 75 hashes,
zero maximum/RMS PCM differences, plans and event-frame comparisons. Existing
echo/independent-transform/timeline/clean-hook ducking/stem tests also pass.
Source recordings, the supplied fixture, frozen evaluation, previous listening
comparisons and master specification are preserved.

## Timing evidence

Timings use the old and new Release CLI binaries with identical saved plans,
inputs and settings. Each case has three trials per binary, alternating execution
order; no warmup trial is discarded. They include input reading, plan import,
rendering, WAV writing and completion hashing. Every result is hash-verified, and
both dense block sizes must produce identical audio. CPU and peak child-process
RSS are retained alongside wall time. Heavy builds/tests finish before timing;
Mac and Linux benchmarks run sequentially.

| Case / block size | M5 before → after | Linux before → after |
| --- | --- | --- |
| sparse / 512 | 0.272 → 0.280 s (0.97×) | 0.366 → 0.370 s (0.99×) |
| dense / 512 | 0.656 → 0.275 s (2.39×) | 0.753 → 0.361 s (2.09×) |
| echo / 512 | 0.592 → 0.274 s (2.16×) | 0.673 → 0.355 s (1.90×) |
| dense / 113 | 0.657 → 0.276 s (2.38×) | 0.767 → 0.358 s (2.14×) |

These are three-trial medians, not a general latency guarantee. Dense/echo cases
improve by 2.16–2.39× on M5 and 1.90–2.14× on Linux. Sparse is slightly slower
in this final run (about 2.9% M5, 1.0% Linux); no ordinary-arrangement speedup is
claimed. [Mac trials](evidence/active-vocals/benchmark-mac.json) and
[Linux trials](evidence/active-vocals/benchmark-linux.json) retain all 48 timings,
CPU/RSS measurements and audio hashes. Every timing output also matches its
corresponding retained master WAV, across platforms and block sizes.

The dense plan exercises the 1,024-event bound with mixed crop lengths, playback
rates, reversals and pans. The echo plan compiles 1,021 triggers from 256 events.
These are technical stress arrangements using the already supplied synthetic
speech fixture, not additional training data or representative musical quality.
Sparse uses its ordinary saved hip-hop plan. This is a measured optimization,
not a live-latency certification or a guaranteed speedup for every arrangement.

The initial implementation compacted active slots on every frame. Its three-trial
Linux sparse median was 0.378 s versus 0.347 s before, while dense cases improved.
The final implementation tracks the earliest clip ending and only compacts when
needed. Initial logs, timings and unchanged-audio receipts remain in
`evidence/active-vocals/initial-active-scan/`; initial renderer source and audio
remain under the render folder. Those receipts are not final-build validation.

## Reproduce

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
cmake --build build-mac-sanitize --parallel 4
ctest --test-dir build-mac-sanitize -R '^remix_core$' --output-on-failure
sh scripts/web_build.sh
node apps/web/tests/wasm.mjs
node docs/evidence/active-vocals/wasm-check.mjs
```

`prepare.py` writes three diagnostic plans only to a fresh folder; the source
fixture is never regenerated. `render-stress.py` uses native validated imports
and the existing no-overwrite exporter. `benchmark.py --before OLD --after NEW
--output FRESH_DIRECTORY` records 24 verified runs. `measure.py` checks the
retained output folders and refuses to replace its report. Use fresh paths for
another run. The old CLI/library, plans and playable WAVs remain under
`renders/active-vocals-20261019/`; Linux output is under
`renders/arrangement-linux/active-vocals-20261019/`.

Actual tools: Apple M5 / 16 GiB, macOS 26.7.1, Xcode 27.1, Apple Clang 21.0.0,
CMake 4.4.2, Python 3.15.0, Node 22.23.1, Emscripten 6.0.1; Linux arm64 GCC
12.2.0, CMake 3.25.1, Python 3.11.2. Detailed [Mac](evidence/active-vocals/mac-environment.json)
and [Linux](evidence/active-vocals/linux-environment.log) receipts are retained.
The project Linux container/VM are stopped afterward. `~/mlx-env` is unchanged;
no new model training, paid compute, upload or publication occurred.
