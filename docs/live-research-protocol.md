# Live Improviser: device research gate

**PARTIAL — protocol defined; live implementation and measurements NOT RUN.**
Instant Remix is offline. A working callback renderer and allocation tests do not
establish microphone latency, feedback safety or uninterrupted device playback.
Do not present a live mode until the following experiment is feasible on hardware.

## Proposed acceptance limits, not measured results

| Measurement | Initial target | How to measure |
| --- | --- | --- |
| Render callback execution | p99 <25% of actual device buffer duration; no callback overrun | Instrument callback entry/exit into preallocated counters, aggregate off callback |
| Allocations/locks/I/O/model calls in callback | Zero | Allocation instrumentation, code review and sustained device stress |
| Audio continuity | Zero buffer underruns and audible critical glitches in a 20-minute run | Hardware loopback recording + underrun counters + listener review |
| Phrase endpoint | Candidate available within 300 ms after eligible sound ends | Timestamp input samples/endpoint decision; labeled consented test cases |
| Musical response | Insert at first safe bar after preparation, provisional p95 <=4 seconds after endpoint at 120 BPM | Record input/output loopback and bar/frame trace; report endpoint/preparation/bar-wait contributions separately |
| Memory | Initial working-set target <=256 MiB, no sustained growth | Repeated capture/replace cycles on the oldest supported test phone |
| Background/interruptions | Capture stops; no automatic restart | Lock, background, calls/alarms, route removal, media-services reset |
| Feedback | No escalating recapture/volume loop | Start with wired headphones; speaker mode remains unavailable until separately validated |

A 4/4 bar at 120 BPM lasts two seconds. Offline generation that misses the next
bar cannot be described as immediate. If the renderer/planner cannot meet the
response budget on the measured phone, revise the product target or keep live
mode unavailable; do not hide delay with fabricated progress or dropouts.

## Implementation boundary after device feasibility

Use a bounded preallocated single-producer/single-consumer capture buffer. Audio
callbacks only copy/consume frames and update counters. A worker detects phrase
endpoints, validates 2–5-second snippets, prepares the deterministic plan and all
voices/effects, and hands immutable ready state to the audio thread. Swap at an
integer-frame bar boundary; retire old state on the worker after its tail.
Continue the prior accompaniment when a candidate is not ready; never block the
callback. Do not free buffers, allocate, log, call models or run file export in
that callback. Bound retained phrases and explicitly drop/record overloads.

Capture requires a separate user action, permission, a persistent indicator,
immediate Stop, and foreground ownership. Do not reuse Instant Remix consent as
permission for unattended continual capture. No live capture was started during
this work. This protocol keeps L01 PARTIAL and L02/L03 NOT RUN until hardware
feasibility, implementation and real listening evidence exist.
