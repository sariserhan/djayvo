# Performance console and live instruments

2026-10-18. The owner requested spinning, controllable DJ decks, all piano notes,
and a larger sound palette. This local increment extends the previous
[manual mixer](dj-mixer.md). The master specification and M0a criteria are unchanged.
**Professional studio / complete improvised DJ workflow: PARTIAL.**

Open http://localhost:4173/dj.html or http://localhost:3000/studio/dj.html.
Confirm permission to load personal tracks. Click **Enable instruments** to play
the cleared bank; instruments can also play without loading any tracks.

## Controls that operate audio

- Deck A/B: play/pause, position, rotating platter with pointer/arrow-key jogging,
  ±16% playback rate and reset, supported browser pitch preservation, set/return
  cue, four editable hot cues, full-track loop, manual/tapped BPM, rate matching
  to the other deck, low/mid/high EQ and channel level.
- Mixer: crossfader, master, stereo sample-peak indication, actual live waveform
  scopes and pause both decks. Reduced motion suppresses platter animation.
- Instrument channel: piano A0–C8 (88 playable keys), electric piano, electric
  and synth bass, electric and muted guitar, organ, pad and lead. Guitar uses
  the bank's E2–G5 range; unavailable keys are disabled. Acoustic/electronic
  kick, snare, closed/open hat pads provide eight additional triggers.
- Mouse/touch and computer-key chords, octave selection, velocity, sustain,
  separate instrument level and All notes off. Computer keys A W S E D F T G Y
  H U J K cover a chromatic octave. Window blur/page hiding releases held
  instruments without intentionally pausing the decks. Release tails are retained.

Jogging seeks; audible scratching is not implemented. Tempo matching changes
rate only, without beat/phase synchronization. Full-track looping is not a
beat-sized loop or a gapless/sample-synchronized transport. Hot cues are not quantized. Active pitch changes briefly pause/resume the deck
to avoid a reproduced WebKit pipeline stall. This increment does not add MIDI
hardware mapping, headphone cue routing, AI Deck C or simultaneous microphone
capture/source generation over a deck. Those remain visible in the tracker.

## Shared engine and failure behavior

`core/audio/live.cpp` reuses the existing instrument `Voice` implementation and
licensed samples. Fixed storage provides 32 voices, a bounded stereo buffer and
validated note/patch/velocity/sample-rate limits. Full voice pools reject new
notes rather than stealing active voices. Tests observe no C++ allocations in
note/render operations. Native Linux/macOS and standalone WASM use this same core.

The browser compiles the bank before constructing its AudioWorklet. The module
has no WASM imports, fixed 32 MiB memory and no filesystem. The worklet renders
bounded blocks without allocation, network access or inference in `process()`.
Instrument messages take effect between worklet blocks; this is not a shared
sample-frame transport for the media-element decks. Browser queue timing is not
hardware latency evidence. The AI director is not involved in sample processing.

Deck sources pass through three native biquad filters and channel gains. An
output waveshaper leaves signals below 0.8 unchanged and bounds hot summed
samples; it is not a true-peak/loudness mastering guarantee. Instrument notes
have their own bounded output and gain, affected by the master. Strong EQ or
many simultaneous voices can still produce audible limiting. No arbitrary
signal is claimed to be musically mastered.

Invalid instrument-bank loading leaves deck playback available. A processor
failure disables the keyboard with a visible error; it does not stop the decks.
Panic, key release, patch change, blur and context interruption prevent stuck
notes. Interrupted audio still needs an explicit user gesture to resume.

Tracks stay local and transient; no upload or new recording is introduced.
Revoking track permission unloads both decks while the cleared instrument bank
remains usable. Bundled CC0 sample notices remain available in Session notes.
No owner-provided reference MP3, trained adapter or performer identity ships
in the public bundle. The reference direction is not a claim of equivalent sound.

Offline preparation now includes both WASM engines and the worklet. The audited
bundle is approximately 27 MiB; its bound rises from 24 to 32 MiB while retaining
16 MiB per-file bounds, explicit allowlisting and SHA-256 verification. Both
browser tests disconnect the actual server before loading and playing instruments.
Storage eviction, device interruptions and venue endurance remain separate gates.

## Reproduction and playable output

```sh
cmake -S . -B build-mac -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=ON
cmake --build build-mac -j 4
ctest --test-dir build-mac --output-on-failure
./build-mac/djayvo_live_tests /tmp/djayvo-live-native.f32
sh scripts/web_build.sh
npm --prefix apps/web test
node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
```

The existing isolated `colima-djayvo` context and `djayvo-portability` container
built `/src` into `/work/console-20261018`; its read-only source mount preserved
host files. Native Linux emitted `/out/console-live-linux.f32`, available on the
host at `renders/arrangement-linux/console-live-linux.f32`. Reproduce the
cross-platform comparison into a **new** output directory:

```sh
node scripts/verify_live_instruments.mjs build-web/djayvo_live.wasm \
  /tmp/djayvo-live-native.f32 renders/arrangement-linux/console-live-linux.f32 \
  renders/live-console-new-review
```

The script refuses an existing directory. The completed comparison and playable
22-second stereo palette are at `renders/live-console-20261018/`. Each of the
11 patches plays for two seconds; note-on is frame 0, note-off frame 23936,
and each patch emits exactly 96000 frames at 48 kHz. **PASS:** Mac, Linux and WASM
float PCM is bit-identical in this program (maximum and RMS differences zero).
This is a reproducible instrument demonstration, not a quality evaluation.

At 32 simultaneous organ voices, Node WASM compute over 3900 measured 128-frame
blocks: p50 0.348 ms, p95 0.403 ms, p99 0.539 ms, maximum 1.299 ms, versus a
2.667 ms block budget. Largest measured note-on call: 0.047 ms. These numbers
exclude browser scheduling, worklet messaging, device buffering and physical
input/output latency. Hardware/live latency gate remains PARTIAL/NOT RUN below.

Hardware/toolchain: Apple M5, 16 GiB, macOS 26.7.1 (25G241), Apple Clang 21.0.0,
CMake 4.4.2, Emscripten 6.0.1, Node 22.23.1, Playwright 1.61.1. Actual Linux arm64
container: Debian 12, GCC 12.2.0, CMake 3.25.1, Linux kernel 6.8.0-117-generic.
No build tools were installed in or changed under `~/mlx-env`.

## Gates

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Native Mac and Linux core regression | PASS | 15/15 CTest suites on each, including the new live-instrument suite |
| Live DSP bounds, 88 keys, 11 patches, release, pool limits, allocation check | PASS | Native tests, WASM comparisons and Mac address/undefined sanitizer run |
| Identical scheduled frame program / native-WASM PCM | PASS | [PCM report](evidence/dj-console/pcm-comparison.json); differences zero |
| Local controls and playable browser audio | PASS | 21 checks in Chromium 149 and 21 in WebKit 26.5, on macOS; [Chromium](evidence/dj-console/chromium.json), [WebKit](evidence/dj-console/webkit.json) |
| JavaScript and existing voice workflow | PASS | 18 unit checks; 21 Chromium and 19 WebKit voice regressions |
| Integrated site route | PASS | Actual instrument PCM at `/studio/dj.html` in both browsers |
| Prepared offline instrument playback | PASS | Actual server disconnected, cached bank/worklet produce measured audio |
| Privacy, licensing and protected originals | PASS | Audited public files and protected SHA-256 comparisons |
| Short compute budget | PASS | 32-voice Node WASM block measurements above; not real-time scheduling proof |
| Low-latency venue performance | PARTIAL | Compute measured; physical latency, long-session glitch counts and device recovery NOT RUN |
| Human listening / artist-reference quality | NOT RUN | No new owner listening verdict; automated signal tests do not establish quality |
| Full DJ/AI performance workflow | PARTIAL | Decks and live instruments work; context analysis, synchronized Deck C and manual/AI transitions remain |
| Actual Linux browser / iOS / MIDI hardware | NOT RUN | Linux native execution passes; those browser/device sessions were not performed |
| Deployment / production release | NOT RUN | Local preview only; no rental or cloud spend |

[Desktop screenshot](evidence/dj-console/desktop.png) · [Mobile screenshot](evidence/dj-console/mobile.png).

[Evidence directory](evidence/dj-console/) retains tests, signal comparisons,
protected hashes, bundle audit and browser/version details. Failed intermediate
checks are described in the summary rather than counted as passes.

## Issues found and fixed during validation

- A compressor introduced makeup gain into the existing master path. Replaced
  it with a bounded waveshaper; ordinary-level PCM retains the expected gain.
- Very quick WebKit key taps could finish before an unnecessary `resume()` wait.
  Notes now dispatch immediately when the audio context is already running;
  suspended-context cancellation still prevents a late/stuck note.
- Four drum columns overflowed at 320 pixels. Narrow screens now use two columns.
- WebKit could stall at approximately 0.066 seconds after a loop/rate change,
  despite reporting `paused=false`. Reaffirming `play()` recovered one run,
  but repetition exposed the native-loop stall again. Full-track repeat now
  uses an explicit ended-event restart guarded by playback intent; a user pause
  cancels repeat. Active pitch changes pause, set rate and resume the deck to
  avoid the native pipeline lock. Pitch changes and full-track repeats can
  have brief gaps. Tests require real signal after
  looping and after EQ, not merely an advancing control or a cached UI meter.
- A delayed completion from an older play request could pause newer playback.
  Completion now honors the current playback intent, with a deterministic
  delayed-promise regression test. Eight repeated WebKit loop/pitch/reset cycles
  and explicit pause are recorded in [the transport stress check](evidence/dj-console/transport-repeat.json).
- Explicit processor-error listeners allow actual runtime failures and injected
  error events to disable instruments without interrupting the deck transport.

The in-app browser skill's required Node REPL tool was unavailable; validation
used the repository's Playwright workflow. Context7 resolve/query tools were
also unavailable; official MDN [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode),
[BiquadFilter](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode) and
[pitch preservation](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preservesPitch) documentation provided the API reference.

## Subsequent local increment

[Instrument tone and echo](instrument-effects.md) adds effects to keys and pads.
The results above remain historical evidence for this console revision. See the
new report for current browser checks, WAVs and remaining gates.
