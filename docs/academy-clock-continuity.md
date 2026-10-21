# Academy recording clock continuity — 2026-10-21

**PASS, technical:** All 101 unit tests, both-browser short recovery and all ten
full-duration cases pass. Corrected Chromium thirty-minute manual stop and hour
automatic stop both download and save their assessments. All ten files decode
cleanly. Physical listening remains NOT RUN and deferred.

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

Corrected Chromium hour: automatic cap, download and account assessment save PASS,
3,600.002667 measured seconds, zero gaps and zero clock stalls. Both hour files
decode cleanly: no clipping, longest quiet interval below four milliseconds.
[Hour browser result](evidence/academy-endurance-silent/hour-browser.json),
[hour PCM measurements](evidence/academy-endurance-silent/hour-decoded.json).
The short recovery regression, rather than this hour capture, exercises the
three classified clock stalls.

Corrected Chromium thirty-minute capture also passes: 1,802.184 measured seconds,
zero gaps and clock stalls, manual finish/download/account save and decoded PCM.
[Final ten-case summary](evidence/academy-endurance-silent/browser.json),
[all PCM measurements](evidence/academy-endurance-silent/decoded-audio.json).
