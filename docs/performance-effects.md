# Performance C tone and echo — 2026-10-19

**PASS (technical):** Generated performances now have independent tone, echo mix,
100–800 ms echo spacing and reset controls in Deck C. Preview and bar-armed C use
the same effect path, before C level and Master. MIDI Learn includes these three
controls, bringing its bounded target list to 26. Stopping a solo preview now
correctly says “C stopped” instead of saying that A continues.

**PARTIAL:** full professional/live studio and DJ14 manual whole-track loop
reliability. **NOT RUN:** musical-quality acceptance, physical MIDI/microphone,
physical latency, Linux browser and venue endurance. No production release.

## Behavior

Prepare A, confirm its context, import or record a consented phrase, and make C.
Use **Performance C effects** to shape the ready performance before preview or
entry, or while it plays. The existing low-pass and three-tap echo implementation
is reused. A/B, instrument routing and the shared C++ engine remain unchanged.

Stop C, Stop A + C, Pause all, interruptions, leaving/hiding the page, C finishing,
and starting A after a preview clear C's buffered echoes. Reset effects clears
buffers and restores open tone/dry mix/300 ms spacing. Deleting/replacing C,
changing confirmed context, unloading A or withdrawing consent also resets its
effects. A failed generation or rejected source replacement keeps the previous
ready C and its settings. Controls are unavailable without a ready, permitted C.

Downloads contain the original generated WAV; live mixer effects are not baked
into the download. The subsequent [beat-echo increment](beat-echo.md) adds tempo
subdivisions to C; the original manual-spacing path remains available. Changing spacing
bends echo pitch; clearing tails is immediate rather than a click-free effect
transition. MIDI remains immediate browser dispatch, not sample-frame scheduling.

## Verification

| Gate | Result | Evidence |
| --- | --- | --- |
| Web unit suite | PASS | 24/24 |
| Manual DJ/rack regressions | PASS | 40 checks each in Chromium and WebKit, including 26 MIDI targets and disconnected-server playback |
| Prepared session/effects | PASS | 23 checks each; generation, preview, synchronized entry, cancellation, master mute, Stop C cleanup and consent withdrawal |
| Integrated Next site | PASS | Both browsers: real generated C preview, tone/echo controls, accurate stop status, inspected desktop/mobile screenshots and no horizontal overflow |
| Offline session | PASS | Stop server, reload cached studio, prepare A, generate minor C, arm with echo, withdraw phrase permission while A continues |
| PCM/event-frame checks | PASS | 18 C echo peaks exactly at requested frames, 100/300/800 ms spacing; dry identity, stereo/tone/clear/mute checks |
| Protected source files | PASS | Master, supplied speech fixture, consented source and x/y/z/pipe hashes unchanged |
| New native Mac/Linux runs | NOT RUN | Shared core/engine unchanged; this increment tests browser routing |
| Listening and physical/venue gates | NOT RUN | Automated audio measurements do not establish musical quality |

The Stop C test observes real output below 0.0001 peak throughout three seconds
after 200 ms settling, with 800 ms spacing. Offline PCM checks also verify that
the existing 5 ms transport stop fade cannot refill cleared echo buffers.
The existing prepared bar-clock checks still pass; this does not measure physical
round-trip latency or prove sample-accurate live MIDI/effect changes.

C dry and echo piano renders are byte-identical to their corresponding existing
instrument-path renders in each browser. All 12 previous A/B/instrument piano
WAVs remain byte-identical. Cross-browser C dry output is exact; C echo differs
by at most one PCM16 step (0.000030517578125), RMS 0.0000019081961550195384.
Echo versus dry max difference is 0.064910888671875; RMS approximately 0.0063718.
These differences describe signal processing, not preference or quality.

Playable six-second comparisons:
[Chromium dry](../renders/session-chromium-ZZFvaW/deck-c-piano-dry.wav),
[Chromium echo](../renders/session-chromium-ZZFvaW/deck-c-piano-echo.wav),
[WebKit dry](../renders/session-webkit-M7m09O/deck-c-piano-dry.wav),
[WebKit echo](../renders/session-webkit-M7m09O/deck-c-piano-echo.wav).
Personal generated recordings remain local in the corresponding render folders.

## Manual-loop investigation

**PARTIAL:** The previous WebKit timeout was not reproduced in 15 sequences of
cue, hot-cue, keyboard/pointer jog, pitch changes, key lock and near-end looping.
All 15 reported A paused before the Play click. The full WebKit DJ suite passed
before and after this increment. This does not explain the earlier failure;
no speculative transport change or reliability claim was made. The previous
[failed receipt](evidence/midi-learn/webkit-loop-initial-failure.json) remains.
The new [sequence probe](evidence/performance-effects/loop-phase-probe.mjs) and
[results](evidence/performance-effects/loop-phase.json) retain the additional evidence.

## Reproduction and environment

From the repository root:

```sh
sh scripts/web_build.sh
npm --prefix apps/web test
node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/session.mjs
node apps/site/scripts/prepare-studio.mjs
# With the existing Next site running at localhost:3000:
node apps/web/tests/session-site.mjs
node docs/evidence/performance-effects/loop-phase-probe.mjs
python3 scripts/verify_web_bundle.py
python3 docs/evidence/performance-effects/compare.py \
  renders/session-chromium-ZZFvaW renders/session-webkit-M7m09O \
  renders/dj-chromium-SyPawG renders/dj-webkit-qnfHsL
```

Replace render paths with those printed by a fresh run. Full suites passed before
the final one-line preview stop-message correction; subsequent integrated tests
verified that correction in both browsers. Existing Playwright automation was
used because the in-app Browser execution tool was unavailable. Screenshot-only
WebKit stylesheet warnings are retained separately from application errors.

Apple M5, 16 GiB; macOS 26.7.1 (25G241), Darwin 25.6.0 arm64; Node 22.23.1,
Next 16.4.2, Playwright 1.61.1, Chromium 149.0.7827.55, WebKit 26.5.
Installed toolchain: Emscripten 6.0.1, CMake 4.4.2, Apple Clang 21.0.0
(clang-2100.3.34.2), Xcode 27.1 (27A9275). No dependencies or paid services added.

[Machine-readable summary](evidence/performance-effects/summary.json),
[waveform measurements](evidence/performance-effects/waveforms.json), and
[integrated-site results](evidence/performance-effects/integrated-site.json).
