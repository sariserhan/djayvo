# Cancellable prepared playback — 2026-10-19

Prepared A and C preview now show a Starting state while the browser resumes
its audio context. The matching Stop control works during that wait. Duplicate
starts and conflicting phrase/context edits are disabled until the request ends;
delete, consent withdrawal, Return A to manual and Pause all still cancel it.
Late completion cannot schedule cancelled audio. A failed older request cannot
replace a newer playback status with an error. A current failure leaves Start
available, and a successful retry clears that error.

This changes browser control state only. The shared C++ engine, musical planner,
transport frame schedule and mixer DSP are unchanged. The master specification,
existing recordings and reference MP3s are preserved.

## Reproduction and scope

The new browser regression holds the promise returned by the actual context's
resume operation. Before the fix, Start remained enabled and Stop disabled.
[Failing evidence](evidence/start-cancellation/before-fix.json) is retained.
The fixed flow is: prepare and confirm A → Start → pending → Stop → resolve the
old request → no source scheduled. The same sequence covers C preview. A second
sequence rejects an old request after a successful retry; actual mixed PCM and
scheduled sources establish that the newer playback survives. A current injected
failure is shown and can be retried. Withdrawing recording consent during a
pending C preview clears the phrase/download and prevents late playback.

The first new helper sampled the visible meter after 150 ms and failed with a
zero readout despite a running context and active prepared A. That was an
uncalibrated new helper wait, not evidence of a known startup deadline. The helper
now waits up to five seconds for real analyser PCM because its purpose is to
verify cancellation/retry. The existing separate **300 ms / peak > 0.01** startup
assertion is unchanged. The [initial helper failure](evidence/start-cancellation/initial-meter-failure.json)
is retained. Neither that failure nor the previous 300 ms failure is assigned
a confirmed underlying cause.

**PARTIAL:** DJ17 startup repeatability and DJ14 intermittent WebKit manual-loop
startup remain open. The reproducible pending-request defect is separate from
those earlier failures. No gain threshold, scheduling offset or playback retry
loop was added to the product to hide either failure.

## Verification

**PASS (technical):** 26 unit checks, 56 final session-browser checks (28 each),
integrated Next flows in both browsers and 15 further WebKit manual-loop sequences.
The loop sequences passed without reproducing DJ14, so its cause remains unknown.

| Gate | Status | Evidence |
| --- | --- | --- |
| Pending A/C stop, retry and stale rejection | PASS | Actual browser contexts with controlled resume promises; zero cancelled sources scheduled; newer playback survives old failure |
| Pending C consent withdrawal | PASS | No late source starts; deleted download and disabled playback; accurate cancelled status |
| Final 300 ms startup check | PASS | Chromium peak 0.04028439521789551; WebKit 0.040283203125; prior intermittent failure remains open |
| Main-session PCM continuity | PASS | Chromium 1,653,248 / WebKit 1,614,848 consecutive counter samples; zero silent blocks, counter gaps or timestamp gaps |
| Transport event frames | PASS | Same A start 4800 / first nonzero 4801 and C start 100800 / first nonzero 100801 at 48 kHz; zero A gaps during C entry; 12 grid cases unchanged |
| Waveform regression | PASS | Ten six-second dry/manual/rhythmic C piano WAVs byte-identical within each browser to the preceding increment; max/RMS difference zero |
| Integrated UI | PASS | Correct page title/content, no error overlay or page errors, actual playback, Stop/retry; desktop 1440×1000 and mobile 390×844, no overflow |
| Offline | PASS | Real server shutdown, reload, local analysis/generation/playback and consent cleanup in both browsers |
| Public bundle and preservation | PASS | 35 audited assets; three engine binaries and seven protected source hashes unchanged |
| Manual-loop probe | PASS | 15 further WebKit cue/jog/rate/loop sequences; no page errors |
| Original startup/loop repeatability | PARTIAL | Earlier failures retain unknown causes; these passing runs do not certify venue reliability |
| New native/Linux, physical timing, venue, listening | NOT RUN | Shared C++ unchanged; no production musical-quality claim |

The initial integrated pending-preview test held a temporary decoder context's
resume promise, so real C playback started. Keeping the first playback context
corrected the test hook. Its [failed log](evidence/start-cancellation/site-probe-initial-failure.log)
is retained. Final integrated and main-session app error lists are empty. Four
WebKit stylesheet warnings occur only during screenshot capture and remain
separate from application errors.

The flow tested is `/studio/dj.html` → prepare/confirm A → Start or Preview C →
visible Starting state → Stop → cancelled request stays stopped → retry plays.
[Desktop A](evidence/start-cancellation/chromium-pending-a-desktop.png) and
[mobile C](evidence/start-cancellation/webkit-pending-c-mobile.png) show the
matching Stop control available and conflicting starts disabled. Additional
browser screenshots and machine-readable reports are in the evidence directory.

Playable comparison files: `renders/session-chromium-RoEJcn/deck-c-piano-*.wav`
and `renders/session-webkit-8s6EQa/deck-c-piano-*.wav`. Each folder also contains a
locally generated consented performance; audio stays outside Git. The comparison
script checks existing reference files and preserves them.

Environment: Apple M5, 16 GiB, macOS 26.7.1 (25G241), Darwin 25.6.0 arm64;
Node 22.23.1, Playwright 1.61.1, Chromium 149.0.7827.55, WebKit 26.5.
Existing build tools: Emscripten 6.0.1, CMake 4.4.2, Apple Clang 21.0.0,
Xcode 27.1. [Exact environment](evidence/start-cancellation/environment.json),
[summary](evidence/start-cancellation/summary.json) and
[waveform/frame comparison](evidence/start-cancellation/waveforms.json).

Run from the repository root, with browser runs sequential:

```sh
sh scripts/web_build.sh
npm --prefix apps/web test
node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/session.mjs
node apps/site/scripts/prepare-studio.mjs
# Existing Next server at localhost:3000:
node apps/web/tests/session-site.mjs
node docs/evidence/performance-effects/loop-phase-probe.mjs
python3 scripts/verify_web_bundle.py
python3 docs/evidence/start-cancellation/compare.py \
  renders/session-chromium-RoEJcn renders/session-webkit-8s6EQa
```

The repository Playwright workflow is used because the Browser plugin's required
execution tool is unavailable. No dependencies were installed, no cloud or phone
work was performed, and no test audio is shipped in the public bundle.
