# Original electronic club direction

Recorded 2026-10-17. The owner requested production-level improvement and music
in the direction of Blood Club. Three new **36.286-second original club sketches**
use the already-consented voice. Open the private
[listening page](../renders/voice-club-v7/review/index.html). It has three opening
variants, the previous experimental mix, the Blood Club 3:20–4:10 reference
excerpt and isolated bass/drums/chord texture. Playback is gain-matched to
−22 LUFS; downloads retain original mix levels. Earlier recordings are preserved.

**Implementation and measured portability: PASS. Production quality: PARTIAL.
Listening to these new versions and reference similarity: NOT RUN.**
The owner's earlier acceptance of v4 piano/drums does not accept this new sound.

## Musical direction and reference boundaries

The creator identifies [BLOOD CLUB — LIVE PERFORMANCE by Mr. Wobbles](https://soundcloud.com/misterwobbles/bloodclub)
as Dance & EDM. The supplied local reference hash matches the earlier
[signal analysis](reference-analysis.md). That analysis found a candidate pulse
near 140/71 BPM and strong changes in bass energy between sections; these are
measurements, not verified transcription. The session cannot hear the reference.
The half-time groove, harmony, voicings and instrument designs below are original
design choices, not claims to reproduce the recording's notes, key or exact sound.
No reference audio was used in the instrument bank, rendering or training.

The new `club` strategy uses 140 BPM, 20 bars and a two-second release tail:

| Start | Section | Treatment |
| --- | --- | --- |
| 0:00 | Intro | Seed selects a voice fragment, full voice or instrumental opening |
| 0:03.43 | Build | Full phrase where needed; restrained chords, later hats/snare lift |
| 0:10.29 | Drop | Electronic kick/snare, syncopated bass replies and bounded voice calls |
| 0:17.14 | Break | Bass/kick withdraw; complete unpitched phrase returns |
| 0:24.00 | Return | More hats, occasional bass fifths and offbeat chord replies |
| 0:32.57 | Ending | Root arrival and finite release; export ends at 0:36.29 |

The bass response uses the input's onset rhythm. Chords move every two bars;
the club strategy omits the earlier piano melody runs. Fourteen original,
procedurally prepared one-shots provide filtered harmonic bass, detuned chord
textures, pitch-swept kick, noise/body snare and hats. They are compiled PCM,
not a new synthesis dependency. Source equations, generator hash, PCM hashes and
selector coverage are in [the manifest](../assets/manifests/electronic-v1.json).
The acoustic bank and the original three arrangements remain available.

Kick-triggered gain reduction affects bass/keys with a 2 ms attack, 20 ms hold,
100 ms recovery and −7 dB target. Isolated stems retain the original kick clock;
drums and speech are unaffected. Existing clean-hook ducking still protects the
full phrase. The room remains an instrumental early-reflection effect.

## Measured results

[Machine-readable evidence](evidence/club-direction/report.json),
[audition levels](evidence/club-direction/audition-measurements.json) and
[muted browser playback](evidence/club-direction/browser-playback.json) retain
exact hashes, measurements and boundaries.

| Gate | Status | Evidence |
| --- | --- | --- |
| Native M5 release / smoke | PASS | 9/9 suites; actual `sh scripts/mac_smoke.sh`; 10 foundation + 13 remix groups |
| Native M5 ASan/UBSan | PASS | 9/9 suites, plus final C ABI/export regression after report metadata fix |
| Actual Linux arm64 release | PASS | 9/9 suites, final export regression and actual renders in isolated local VM/container |
| New electronic assets | PASS | 14 samples; compiled PCM, generator and bank hashes; finite fades and complete selectors |
| New club portability | PASS | Four masters plus eight owner/fixture stems are byte-identical; plans and event frames exactly agree; maximum/RMS PCM differences 0 |
| Native block determinism | PASS | Owner master and four stems identical at 512/113 frames per block |
| Original-style regression | PASS | All 15 default-seed v4 owner WAVs identical; legacy fixture masters match fresh Linux and retained Linux references |
| Export contracts / source preservation | PASS | 11 export sets verify; schema validation; master spec, supplied fixture, owner input and reference hashes unchanged |
| Vocal preservation | PASS | Both full owner phrases match source downmix × gain, excluding edge fades; maximum PCM error 0.0000242, below 2/32768 |
| Audio bounds | PASS | Decoded new masters/stems have no full-scale samples, silent final 100 ms; four engine reports have zero limited/nonfinite samples |
| Optional local import | PASS | Actual M4A encode/decode/render test, original three-style and new club workflow; consent and existing-folder protection |
| Audition playback | PASS | Eight media files decode, seek and play muted, one at a time; desktop/mobile layout inspected |
| CI preparation | PASS | Club render/comparison added to existing workflow; hosted execution NOT RUN |
| New music listening / reference similarity | NOT RUN | No auditory judgment from this session; owner has not rated these files |
| Production quality | PARTIAL | A concrete new direction exists; perceptual, diverse-source and device/release evidence remains absent |
| Formal M1 / AI / iPhone / live / release | NOT RUN | Existing prerequisite gates still apply |
| Physical Intel Linux | NOT RUN | Current Linux execution is aarch64 on the M5 host |

Native hardware: Apple M5 arm64, 10 cores, 16 GiB; macOS 26.7.1 (25G241),
Xcode 27.1 (27A9275), SDK 27.0, Apple Clang 21.0.0, CMake 4.4.2 and project
Python 3.14.6. Linux: Debian 12 aarch64, GCC 12.2, CMake 3.25.1, Python 3.11.2.
The full environment is in the report and
[Linux log](evidence/club-direction/linux-alternates-environment.log).
`~/mlx-env` was not changed. No new package was installed.

The three master levels are −15.9, −15.9 and −15.8 LUFS, with true peaks
−4.5, −5.4 and −5.2 dBFS. The main build/drop RMS changes from −27.36 to
−15.45 dBFS; the break/return changes from −28.43 to −15.27 dBFS.
Drop 20–150 Hz energy is approximately 91% of measured mono energy. This is
strong bass emphasis to audition on speakers/headphones, not a quality target
or proof of tonal balance. No loudness maximization was applied.

The first tests caught kick velocity humanization exceeding 127; the shared
helper now clamps valid MIDI velocity. The [initial failing log](evidence/club-direction/initial-velocity-failure.log)
is retained; subsequent release/sanitizer/Linux tests pass. Inspection also
caught the report's acoustic-bank label being hardcoded; reports now identify
acoustic, electronic or mixed palettes, with an export regression test.
Browser autoplay policy initially blocked scripted play before interaction;
playback passed after a user-gesture click. No autoplay bypass was added.

## Reproduce and continue

```sh
./build-mac/djayvo_remix --input /path/to/consented.wav --consent \
  --style club --seed 4123 --stems --output renders/new-club/remix
python3 scripts/verify_export.py renders/new-club/remix

# Optional installed FFmpeg workflow for a new local M4A/WAV:
python3 scripts/remix_recording.py --input /path/to/consented.m4a --consent \
  --style club --output-directory renders/new-club-session
```

Use fresh destinations. `--style all` and C ABI strategy 0 retain the original
three styles for compatibility; `club` is explicit, C ABI strategy 5. Optional
score fields `tracks[].sound` and `mix.kick_duck_db` describe the new behavior.
The `piano` stem name remains the keys role; for club it contains synth chords.
Update schema consumers before reading new club plans. No JSON import is added.

[Native render recipe](evidence/club-direction/render-native.py),
[verification](evidence/club-direction/verify.py) and
[audition preparation](evidence/club-direction/prepare-audition.py) retain the
commands. The latest smoke can use
`DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/club-v7/legacy` with a fresh
`DJAYVO_OUTPUT_DIR`. Club comparisons use `scripts/compare_portability.py --styles club`.

Known limits: this is a short rule-based sketch, with a small mono 24 kHz
one-shot bank and sample playback, not a performance-scale generative system.
Pitch changes also alter sample envelopes; speech chops have no semantic word
labels. No perceptual bass/texture/transition rating or full-song quality is
claimed. The one-source frozen v4 pilot remains historical and does not evaluate
club. Owner confirmed no further consented clips are available; no ratings,
extra speakers or permissions were invented. Track subsequent musical feedback
and production prerequisites in [TODO.md](../TODO.md).
