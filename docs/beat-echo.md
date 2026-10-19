# Beat-synchronized C echoes — 2026-10-19

Deck C now offers eighth-note, dotted-eighth and eighth-note-triplet echoes based
on the tempo stored with its generated performance. The selected rhythm applies
to preview and bar-armed playback. Manual spacing remains available, with its
previous value retained when switching back. The separate readouts show the
effective rhythmic delay and the saved manual setting.

The three rhythms stay within the existing 100–800 ms effect limits throughout
the validated 60–180 BPM range. They do not round to the manual slider's 10 ms
step. At 120 BPM they produce 250 ms, 375 ms and 166.666… ms respectively. The
UI rounds only the display to two decimals. The actual delay uses the full value.

MIDI spacing controls are disabled while sync is active; the existing pickup
logic rearms when ignored messages arrive. Tone and echo-mix controls still work.
Reset or replacing/deleting C restores manual mode. Context changes invalidate C
and its effects as before. Failed generation preserves the previous C and mode.
No model inference, new assets or dependency is involved.

This is tempo-relative delay, not transient quantization or a new beat tracker.
A/B and instrument echoes keep their manual spacing. Changing a delay while audio
is playing can bend echo pitch during the existing smoothing interval. A correct
confirmed tempo is necessary. The generated WAV download remains unprocessed by
live mixer effects.

## Reproduced timing bug and fix

Clearing an echo while its delay-time ramp was still moving previously retained
the intermediate `delayTime.value` and discarded the remaining ramp. With an
800 ms target and a clear requested 10 ms into the transition, a later impulse's first echo
peaked at frame 73509 instead of 86400 (48 kHz, impulse at frame 48000).
The selected time and the audible delay could then disagree indefinitely.

The shared effect now remembers the validated requested spacing and initializes
replacement delay buffers to that target. The fix applies to A, B, C and the
instrument channel. The original [failing regression](evidence/beat-echo/transition-before-fix.log)
is retained; the test checks all three tap frames and amplitudes after the reset.

## Reliability investigation

**PASS (diagnostic correction):** The original probe treated every
`AudioWorkletGlobalScope.currentFrame` discontinuity as a missing audio block.
The first Chromium run failed with two such discontinuities; a later isolated
failure captured a -128/+128-frame pair while the mix was non-silent.

A focused 15-second Chromium test repeatedly connected/disconnected nodes while
feeding the probe both a tone and an independent, monotonically numbered PCM
counter. It recorded **686 timestamp discontinuities, zero silent blocks and
zero missing/repeated counter samples across 718,336 samples**. This demonstrates
that this timestamp pattern alone cannot establish an audio dropout. It does
not retroactively prove that every earlier failed run had clean samples.

**PASS (bounded graph stress):** The final reproducible script reuses 50 node
pairs. It recorded 876 timestamp anomalies with 720,384 consecutive PCM samples,
zero counter gaps and zero silent blocks.

**FAIL (allocation stress rerun):** An earlier diagnostic rerun that repeatedly
created new delay nodes crashed Chromium; its cause is unconfirmed. A preceding
adapted run hung and was terminated. The final script bounds allocations and
starts its context from a user gesture. This does not establish that arbitrary
node allocation or sustained venue operation is safe. The [crash log](evidence/beat-echo/clock-stress-allocation-failure.log)
and [bounded result](evidence/beat-echo/clock-stress-bounded.json) are retained.

The tested Chromium version updates the worklet's global frame only when a
nonblocking graph lock succeeds; a skipped update is consistent with the observed
stale timestamp followed by a catch-up. This is an inference supported by the
[version-pinned Chromium implementation](https://github.com/chromium/chromium/blob/149.0.7827.55/third_party/blink/renderer/modules/webaudio/base_audio_context.cc#L906)
and the local reproduction. Context7 was unavailable; primary implementation
source was used for this investigation.

The revised check requires a continuous independent PCM counter, enough measured
frames and no silent mix blocks. It retains raw timestamp discontinuities and up
to 16 detailed events separately. Unit tests inject repeated/missing counter
samples, stale timestamps and reset events. The diagnostic signal enters only a
muted test probe; it is absent from product files and recordings. Continuity JSON
is saved before assertions, and failures save context/state/error details.
This measures browser processing, not physical-output underruns or venue readiness.

**PARTIAL:** startup repeatability. A separate Chromium run failed its prepared-A
signal assertion after a fixed 300 ms wait. A fresh run passed that unchanged
assertion. The original check did not print the measured peak; it now does.
The cause remains unconfirmed, and no audio-start threshold was relaxed.
DJ14's earlier WebKit manual whole-track loop timeout also remains **PARTIAL**.

Retained evidence: [initial timestamp failure](evidence/beat-echo/initial-chromium-failure.json),
[isolated timestamp trace](evidence/beat-echo/isolated-chromium-continuity.json),
[focused stress result](evidence/beat-echo/clock-stress-initial.json),
[startup failure](evidence/beat-echo/initial-chromium-startup-failure.json), and
[reproducible stress script](evidence/beat-echo/clock-probe.mjs).

## Final verification

**PASS (technical):** 26 unit checks, 80 manual DJ checks and 50 prepared-session
checks. Chromium 149.0.7827.55 and WebKit 26.5 passed the final runs separately.
Integrated Next desktop/mobile controls and disconnected-server session flows
also pass. The shared C++ source, master specification, protected recordings and engine
binaries are unchanged.

| Gate | Status | Evidence |
| --- | --- | --- |
| Tempo/choice boundaries and diagnostic calibration | PASS | 26 unit checks; invalid inputs, fractional BPM, repeated/missing counter samples and stale clock timestamps |
| Rhythmic delay timing | PASS | 54 peaks across 60/127.19/180 BPM; maximum error 0.47362214010354364 sample frame relative to the ideal fractional frame |
| Interrupted-ramp reset | PASS | All 24 tap peaks across A/B/C/instrument channels and both browsers at the exact requested frames |
| Session PCM continuity | PASS | Chromium 1,660,672 and WebKit 1,615,872 counter samples consecutive; zero silent blocks; final sessions also recorded zero timestamp anomalies |
| UI/MIDI/offline | PASS | Selected tempo, manual restoration/pickup, ready-state/reset/consent, failure preservation, real C preview and disconnected generation/playback |
| Bundle and source preservation | PASS | 35 audited public assets; private audio/test probe absent, unchanged engine hashes and protected inputs |
| Startup and manual-loop repeatability | PARTIAL | Earlier failed receipts retained; startup cause unconfirmed and DJ14 remains open |
| New native/Linux browser checks | NOT RUN | Shared core unchanged; this increment validates browser effects |
| Physical input/output, venue and listening | NOT RUN | No musical-quality or physical-latency claim |

Six new six-second piano renders demonstrate the three rhythms at 127.19 BPM.
All 16 previous A/B/C/instrument dry and manual-echo WAVs are byte-identical.
New fractional-delay output is not bit-identical between browsers:

| Rhythm | Cross-browser max absolute difference | RMS difference |
| --- | ---: | ---: |
| Eighth | 0.002960205078125 | 0.00007833848203685911 |
| Dotted eighth | 0.000030517578125 | 0.0000032007105962223864 |
| Eighth triplet | 0.003021240234375 | 0.0001183039521997093 |

These are signal differences, not listening scores. Timing probes measure the
settled delays; changing rhythm during playback still uses the existing smoothing
transition. Reference-counter continuity does not certify physical device output.

Audition the Chromium [dry](../renders/session-chromium-jvWl96/deck-c-piano-dry.wav),
[eighth](../renders/session-chromium-jvWl96/deck-c-piano-eighth.wav),
[dotted eighth](../renders/session-chromium-jvWl96/deck-c-piano-dotted.wav), and
[triplet](../renders/session-chromium-jvWl96/deck-c-piano-triplet.wav).
Matching WebKit files are in `renders/session-webkit-ZMVLWG/`.

## Reproduction

Run from the repository root; run browser suites separately when investigating
startup or scheduling behavior. Each suite prints a new ignored artifact folder.

```sh
sh scripts/web_build.sh
npm --prefix apps/web test
node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/session.mjs
node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
node apps/site/scripts/prepare-studio.mjs
# Existing local Next server at localhost:3000:
node apps/web/tests/session-site.mjs
node docs/evidence/beat-echo/clock-probe.mjs
python3 scripts/verify_web_bundle.py
python3 docs/evidence/beat-echo/compare.py \
  renders/session-chromium-jvWl96 renders/session-webkit-ZMVLWG \
  renders/dj-chromium-rXzvBo renders/dj-webkit-wXU65G
```

Apple M5, 16 GiB; macOS 26.7.1 (25G241), Darwin 25.6.0 arm64. Node 22.23.1,
Next 16.4.2, Playwright 1.61.1. Existing isolated Emscripten 6.0.1, CMake 4.4.2,
Apple Clang 21.0.0 (clang-2100.3.34.2), Xcode 27.1 (27A9275). No new dependency,
paid service or environment change. Existing Playwright workflow used because
the in-app Browser execution tool was unavailable. Screenshot-only WebKit style
warnings are retained separately from application errors.

[Summary](evidence/beat-echo/summary.json), [waveform measurements](evidence/beat-echo/waveforms.json),
[integrated-site evidence](evidence/beat-echo/integrated-site.json).
