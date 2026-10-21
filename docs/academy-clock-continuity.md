# Academy recording clock continuity — 2026-10-21

**PARTIAL:** Corrected unit and both-browser recovery checks pass; corrected
full-duration Chromium captures are pending. Physical listening remains deferred.

Earlier Chromium thirty-minute captures reported two timestamp discontinuities,
including an isolated run; an hour capture reported four. WebKit completed thirty
and sixty minutes with zero gaps. Concurrent load alone did not explain the issue.
Direct instrumentation captured consecutive observations:

| Expected frame | Reported frame | Processed recording frames |
|---:|---:|---:|
| 13,489,152 | 13,489,024 | 13,468,800 |
| 13,489,152 | 13,489,280 | 13,468,928 |

The worklet processed each 128-frame block. Its reported timestamp repeated once,
then caught up. The exact tested [Chromium 149 implementation](https://github.com/chromium/chromium/blob/149.0.7827.55/third_party/blink/renderer/modules/webaudio/base_audio_context.cc#L906)
updates the worklet timestamp only when a nonblocking graph lock succeeds.
This implementation explains the observed pattern; runtime lock acquisition was
not instrumented. Short repeated resume/cue probes did not establish resume as
the cause, so the shared resume helper was not changed.

The detector now tentatively holds one repeated timestamp and requires the very
next block to catch up exactly. It retains every input block in frame, peak and
RMS measurements, and reports the pair separately as `clockStalls`. Forward gaps,
other backward jumps, repeated stale timestamps and an unresolved final repeat
still increment `gaps` and fail assessment. No encoded audio is edited or repaired.
The recording receipt exposes both counts. PCM decoding, duration, hash, clipping
and sustained-silence checks remain required; timestamps do not prove musical or
physical-output quality.

All 101 web tests pass, including the observed pair, actual skipped frames,
backward jumps and finalization during a pending repeat. [Unit log](evidence/academy-clock-continuity/web-tests.log).
Both-browser short recovery captures pass and decode cleanly; Chromium reports
three clock stalls, WebKit zero. [Recovery decoding](evidence/academy-endurance-silent/recovery-decoded.json).
Original failed captures and the direct diagnostic remain under
`evidence/academy-endurance-silent/failures/`; their results are not rewritten.

The initial Playwright interception diagnostic did not observe the worklet
messages. A temporary isolated public-asset copy provided the confirmed direct
logging; its patch and exact frame observations are retained in
`failures/chromium-resume-diagnostic/`. That logging is absent from product code.
