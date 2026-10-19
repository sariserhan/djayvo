# Talk bass and additional percussion

The owner requested drums and a deep, tube-like sound, supplied
`~/Downloads/pipe.mp3`, and authorized continuing the local studio. This increment
implements a playable original formant bass and four percussion voices. It does
not introduce artist samples, training, live microphone processing or AI Deck C.
The master specification and existing recordings are preserved.

## What the tube does

The description is consistent with a **talk box**. A keyboard or guitar drives a
speaker and tube into the mouth; the performer's mouth shapes the sound, and a
microphone picks it up. Keyboard notes determine pitch. Mouth position changes
vowel-like resonances; the tube is not inherently an octave-down piano effect.
This mechanism is described in the manufacturer's
[MXR manual](https://www.jimdunlop.com/content/manuals/M222.pdf) and
[Heil product description](https://www.jimdunlop.com/heil-talk-box/).

Mr. Wobbles' public [setup-video listing](https://app.fanfix.io/%40mrwobbles)
exists, but the detailed rig videos are restricted. His exact hardware, synth
patch and processing chain were **not verified**. No paid access was purchased.
Direct listening to the supplied MP3 is **NOT RUN**: the available tool path
provided numerical audio analysis, not auditory perception. The file alone
cannot establish which hardware was used.

## Reference measurements

Reused the existing local full-file analyzer:

```sh
.venv-analysis/bin/python docs/evidence/reference-analysis/analyze.py \
  --input ~/Downloads/pipe.mp3 --output renders/pipe-reference-NEW
```

The output directory must be new. Original file SHA-256:
`e57756d665c676e876bc7b25abf6d97bd88d137c889eebd633ade0d353919bc8`.
The 79.657-second stereo MP3 measures −12.1 integrated LUFS, 5.8 LU loudness
range, +0.2 dBFS true peak and 0.965 stereo correlation. Approximately 89.9% of
measured mono spectral energy is in 20–150 Hz. The analyzed bands span 20 Hz to
10 kHz at a 22.05 kHz analysis rate. This supports the low-frequency emphasis,
not identification of a talk box or separation of bass from kick/other sounds.
Pulse estimates disagree; no definite tempo/key is claimed.
[Full measurement record](evidence/talk-bass/pipe-analysis.json).
The MP3 is not bundled, copied into an instrument, uploaded or used for training.

## Play it

Open http://localhost:3000/studio/dj.html, click **Enable instruments**, then
choose **Talk bass**. The computer-keyboard register opens at C2. Hold A or a
piano key and move **Mouth shape** from OO through AH to EE. Octave controls
change the register; Tone and Echo continue to work. No microphone is activated.
Other patches keep their sound and do not respond to Mouth shape.

The twelve pads include the existing acoustic/electronic kicks, snares and hats,
plus new **Clap**, **Rimshot**, **Low tom** and **Shaker**. Mouse, touch and focused
Space/Enter all trigger actual audio. Existing sustain, release, All notes off,
level/master and interruption behavior are retained.

Playable original demonstrations, all local 48 kHz stereo PCM16:

- [Talk bass vowels](../renders/talk-performance-20261018/talk-bass-vowels.wav):
  C2 held while OO, AH and EE change; 6 seconds including release.
- [New percussion](../renders/talk-performance-20261018/new-percussion.wav):
  clap, rimshot, low tom, shaker; 5 seconds.
- [Studio jam](../renders/talk-performance-20261018/studio-jam.wav):
  a 12-second original technical demonstration combining bass, electric piano
  and drums; fixed authored notes, not an AI composition or reference imitation.

## Engineering and evidence

`core/instruments/performance_voices.h` implements an original corrected saw
carrier, three smooth resonant formant bands and deterministic percussion.
The [W3C EQ cookbook](https://www.w3.org/TR/audio-eq-cookbook/) was consulted for
standard band-pass equations; no third-party DSP source or runtime was added.
Formants are hand-selected synthesis settings, not extracted performer identity.
The C ABI validates notes, program, velocity and finite mouth values. Existing
32-voice admission is shared across old and new sounds; buffers and voice pools
are fixed. No allocation, network or model work occurs in the render path.

A validated `mouth` worklet message controls only this musical parameter.
Low register supplies the deep pitch. Measurements confirm approximately
65.395 Hz for C2 through all three shapes (expected 65.406 Hz); spectral
centroids change about 390 → 703 → 436 Hz. The vowel control changes timbre,
not note pitch. Demos contain zero clipped PCM16 samples. These checks do not
establish realism, artistic quality or equivalence to the reference.

| Gate | Status | Evidence |
| --- | --- | --- |
| Local reference signal analysis | PASS | Full MP3 measurements, source hash preserved |
| Exact reference instrument/rig identification | PARTIAL | Talk-box mechanism verified; artist hardware and direct listening unverified |
| Mac and Linux C++ execution | PASS | 15/15 suites each; final targeted tests include block-size invariance |
| Memory safety and real-time allocation check | PASS | Mac Address/Undefined sanitizers; zero note/render/mouth allocations in instrument tests |
| Native/WASM frame and PCM comparison | PASS | 13 patch programs, explicit note-on 0 / mouth 12800 / note-off 23936; old 11-patch PCM unchanged |
| Browser and integrated website | PASS | 24 DJ checks per browser, live vowel spectrum, all pads, actual signal, offline reload, failure behavior and layout |
| Existing web regressions | PASS | 19 unit checks; 21 Chromium + 19 WebKit voice checks |
| Playable output | PASS | Palette, three demos and measurements retained locally |
| Human quality/reference similarity | NOT RUN | Requires audition; automatic spectral checks are insufficient |
| Physical latency, actual Linux browser, venue endurance | NOT RUN | Compute timing is not device/scheduling latency |
| Full AI DJ studio | PARTIAL | Shared deck clock, synchronized Deck C and remaining product gates remain open |

[Summary](evidence/talk-bass/summary.json),
[PCM and timing](evidence/talk-bass/pcm.json),
[demo measurements](evidence/talk-bass/demo-measurements.json),
[desktop](evidence/talk-bass/desktop.png),
[mobile](evidence/talk-bass/mobile.png).

Reproduction (preserve old outputs; supply a new destination):

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
./build-mac/djayvo_live_tests /tmp/djayvo-talk-native.f32
sh scripts/web_build.sh
# Run the same native test on Linux and retrieve its emitted float PCM, then:
node scripts/verify_live_instruments.mjs build-web/djayvo_live.wasm \
  /tmp/djayvo-talk-native.f32 renders/arrangement-linux/talk-linux.f32 renders/talk-NEW
npm --prefix apps/web test
node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
npm --prefix apps/web run test:browser
DJAYVO_BROWSER=webkit npm --prefix apps/web run test:browser
node apps/site/scripts/prepare-studio.mjs
node docs/evidence/talk-bass/site.mjs
.venv-analysis/bin/python docs/evidence/talk-bass/measure.py
```

The measurement script uses the recorded `renders/talk-performance-20261018`
destination. Browser runners create fresh ignored artifact directories. Linux
used the existing isolated `colima-djayvo` container and build; it was stopped
again after checking. `~/mlx-env`, other environments and paid services were
not changed. In-app Browser execution tools and Context7 were unavailable;
existing Playwright and primary web sources were used.

## Limits and validation notes

This is a manually shaped formant synthesizer, not a physical talk box, a
speech-controlled vocoder or a copy of Mr. Wobbles' rig. Consonant articulation,
continuous pitch bends, microphone-controlled vowels and learned musical
responses are not implemented. New percussion is procedural; realism needs
listening. Deck playback still has the previously documented pitch/repeat gaps.

The first browser assertion incorrectly expected EE to have a higher overall
spectral centroid than AH/OO. The measured first formant makes AH brightest in
this implementation. The corrected check measures all three states with analyzer
smoothing disabled, checks their actual contrast, and retains independent pitch
and waveform measurements. No listening judgment was substituted for this test.
