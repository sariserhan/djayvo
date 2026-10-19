# Instrument tone and echo

Owner continuation after the console increment is interpreted as the next local
instrument-control improvement. This increment adds tone and echo to the existing
keys/pads channel. M0a and the master specification are unchanged. It does not
start synchronized transport, AI Deck C, paid compute or deployment.

Open http://localhost:3000/studio/dj.html (standalone:
http://localhost:4173/dj.html), click **Enable instruments**, and use **Shape your
sound**. Tone opens or softens the high frequencies. Echo mix blends in three
fading repeats; spacing ranges from 100–800 ms. Reset effects returns to the
unfiltered, dry sound. Instruments work independently of track permission.

Effects are local Web Audio routing around the existing C++/WASM instrument
channel. No instrument assets, renderer, arrangement plans or model changed.
Each repeat has a fixed normalized weight; the dry/wet gains sum to unity for a
sustained signal. The existing instrument/master gain and output ceiling remain
after effects, so muting also silences tails. Tone changes use a 30 ms ramp;
echo spacing changes use a 30 ms time constant and intentionally bend pitch.
No allocation, inference or network operation was added to the audio callback.

## Validation

Reproduce from the root:

```sh
sh scripts/web_build.sh
npm --prefix apps/web test
node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
npm --prefix apps/web run test:browser
DJAYVO_BROWSER=webkit npm --prefix apps/web run test:browser
node apps/site/scripts/prepare-studio.mjs
python3 scripts/verify_web_bundle.py
```

Each DJ test run creates a fresh ignored `renders/dj-<browser>-*` directory
containing screenshots, a machine report and six-second stereo 48 kHz
`piano-dry.wav` / `piano-echo.wav`. These use the real shared piano and identical
note events, not owner speech or reference recordings. The test runner mutes
physical output downstream of its measured signal; automated tests did not
listen to these WAVs. Audition them in a local audio player.

[Evidence summary](evidence/instrument-effects/summary.json) identifies exact
artifact paths, waveform differences, event frames, protected hashes, hardware
and versions. Browser reports retain individual checks and signal measurements. In both
browsers, all nine measured echo peaks landed on the requested frame (0 frame
error). Dry piano PCM16 was identical; echo piano differed by at most one PCM16
step (0.0000305176), RMS 0.0000019082. This is numerical agreement, not evidence
that the versions sound equally good. The stereo sweep regression residual was
5.96e-8 in each browser.

The integrated-site check can be repeated with
`node docs/evidence/instrument-effects/site.mjs` while the local site is running.
It writes its receipt and screenshots under `/tmp`. Captured
[desktop](evidence/instrument-effects/desktop.png) and
[mobile](evidence/instrument-effects/mobile.png) evidence is retained here.

| Gate | Status | Evidence |
| --- | --- | --- |
| Local build, public bundle and controls | PASS | Audited bundle; same integrated studio route, no external assets or uploads |
| Unit checks | PASS | 19 checks, including invalid effect parameters before any audio mutation |
| Chromium and WebKit DJ checks | PASS | 23 checks each; actual live/offline PCM, effects, deck regressions, failure handling, cache reload with server disconnected |
| Voice studio regressions | PASS | 21 Chromium and 19 WebKit checks; original voice-renderer WASM unchanged |
| Rendered UI | PASS | Desktop/mobile screenshots inspected; 320, 390, 768 and 1440 px fit; labelled controls and keyboard access retained |
| Playable output | PASS | Dry/echo piano WAVs in each fresh browser artifact directory |
| Mac browser timing and waveform comparison | PASS | Impulse tests at minimum, default and maximum spacing; note/echo frames and waveform differences in summary |
| Native Mac/Linux and Linux browser execution this increment | NOT RUN | Browser-only change; earlier native comparison remains historical, not new evidence for effects |
| Musical quality, physical latency, venue endurance | NOT RUN | Require actual listening/hardware observations |
| Full DJ/AI workflow and production readiness | PARTIAL | Manual local controls only; outstanding gates stay open |

## Failures investigated

- A feedback-loop echo added 128 frames after each repeat on the installed
  Chromium runtime. Replaced it with three independent delay taps. Timing tests
  require each observed peak within one frame of the requested position.
- WebKit's low-pass `setTargetAtTime` sweep produced a 0.13014 maximum discrepancy
  between opposite-polarity channels. A direct isolated reproduction confirmed
  it. A finite exponential ramp removes the discrepancy; the sustained stereo
  sweep is now a regression check.
- Echo impulses in WebKit can split over adjacent samples because of fractional
  delay interpolation. Tests measure both peak-frame position and local impulse
  sum, with a 1e-6 amplitude tolerance; they do not require cross-browser bit
  identity. The report retains waveform differences rather than calling them
  identical.
- The early impulse test ended its source before the longest echo. It now keeps
  a zero-filled source alive for the full render, matching the continuously
  running instrument worklet. Tone attenuation is measured after its control
  transition; the separate sweep check measures finite output and stereo agreement.

Context7 and the required in-app Browser execution tool were unavailable in this
session. Used the existing project Playwright workflow and primary API references:
[DelayNode](https://developer.mozilla.org/en-US/docs/Web/API/DelayNode),
[AudioParam automation](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime).

## Limits

These effects affect keys and pads together; they do not process Deck A/B or
change the underlying instrument realism. Spacing is manual, not beat-synced.
All notes off releases voices; their releases and echo tails can continue.
Reset effects removes echoes, while instrument/master zero silences the channel.
Settings and tracks remain tab-local. Existing media-deck pitch/repeat gaps,
MIDI hardware, headphone cue routing, audible scratching, Deck C and venue
reliability remain open. Musical quality is not inferred from passing checks.
