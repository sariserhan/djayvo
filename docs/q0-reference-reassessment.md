# Q0 reference reassessment after the second rejection

2026-10-20. **Owner acceptance: FAIL. Diagnostic interpretation: PARTIAL.
Direct agent listening: NOT RUN.**

The owner rejected the latest five-condition trial as “very robotic and bad
quality” and requested reference listening to `f.mp3`, `x.mp3`, `y.mp3`,
`z.mp3`, `down.mp3`, `question.mp3` and `blood_club.mp3` in Downloads.
[Exact reply and packet identity](evidence/q0-recovery/owner-feedback.json)
are retained. This establishes failed acceptance, not a numeric score or a
per-condition ranking. The development target remains an original musical
improviser, not replication of a performer's identity or compositions.

## What was actually inspected

All seven files exist. Six match the previously analyzed source hashes exactly.
Their prior full-file measurements were reused, not presented as new listening.
The new `f.mp3` was decoded and measured in full, alongside the current owner's
A and E masters using the same existing analyzer. Source integrity,
finite decoded samples, numerical analyzer checks and JSON output pass.
No audio was uploaded, sampled into a new remix or used for training.
The direct request authorizes local analysis of f; it is not a training license.

This session has no audio-perception tool. Tool discovery did not expose one;
playing a file through the Mac would not give the agent hearing. Instrument
identification, melodic transcription, word boundaries and aesthetic judgments
about the references therefore remain unverified. Spectral plots do not replace
listening, and the owner's own negative quality judgment is preserved.

| File | Duration (s) | LUFS | Mono 20–150 Hz share | Side/mid energy (dB) |
|---|---:|---:|---:|---:|
| f | 114.411 | −11.1 | 45.5% | −12.76 |
| x | 764.651 | −8.9 | 65.7% | −10.76 |
| y | 667.179 | −7.9 | 53.9% | −11.44 |
| z | 625.408 | −9.4 | 65.4% | −12.05 |
| down | 143.799 | −5.3 | 53.5% | −12.23 |
| question | 155.317 | −5.7 | 68.9% | −13.13 |
| blood_club | 634.067 | −11.6 | 75.7% | −8.03 |
| Owner A | 32 | −23.3 | 56.7% | −18.77 |
| Owner E | 32 | −23.9 | 57.1% | −20.02 |

These full-file statistics have different durations and potentially different
content types. They do not rank musical quality or establish the correct mix.
The A/E LUFS here use the reference analyzer's EBU R128 summary; the earlier
trial reports use loudnorm's measurement output. Keep each method labeled;
do not silently substitute loudness-range values between reports.

In f, the low-band share changes from 55.4% at 0:10–0:20 to 0.3% at
0:20–0:30, then 62.5% at 0:40–0:50. The later 1:10–end is much quieter
and nearly mono. These are signal changes, not identified drops, vocals or
commentary. They reinforce the need for passage-level listening annotations;
whole-file averages can mix very different material.

Owner E has slightly more low-band energy than A and less relative stereo-side
energy. These values supply no evidence of an improvement. Simply increasing
bass, width or loudness would not establish realism, coherent musical ideas
or reference-level entertainment quality.

## Why the last experiment was insufficient

This conclusion follows from the implementation and owner rejection, without
pretending to hear individual defects:

1. **Sound palette barely changed.** B/D alter drum release alone; piano,
   bass, organ and lead synthesis/samples are unchanged. E uses that same
   palette. It cannot establish a recovery of all instrument timbres.
2. **Planning remains a small grammar.** The tested hip-hop, reggae and
   experimental paths retain style-fixed tempi, section templates and finite
   harmony/groove patterns. Some source rhythm affects responses; this is not
   contextual evaluation of which musical idea to develop.
3. **E is a simplifying rule.** It removes chops and competing notes and maps
   a few source onsets to existing chord tones. It does not understand word
   timing or expressive vocal delivery and has no model of musical tension,
   articulation or phrase-level intent.
4. **Mix behavior stayed fixed.** Clean speech still causes the existing
   approximately 16.5 dB accompaniment duck. Holding this constant helps isolate
   an experiment but leaves a substantial performance behavior untested.
5. **Technical checks cannot choose a good performance.** Valid notes,
   deterministic output and matched loudness establish reproducibility.
   They did not predict the owner's acceptance.

Sources: `core/arrangement/remix.cpp`, `core/instruments/voice.cpp`,
`core/instruments/synth.h`, `core/audio/remix_renderer.cpp`,
`scripts/q0_composition.py`, and the committed five-arm plans/measurements.
The perceptual contribution of each limitation remains unranked.

## Revised next experiment, within Q0

Do not promote the rejected patch or issue another batch based only on timing,
decay or global spectral targets.

The next useful control is an **original, musically reviewed short performance
plan** with an approved instrument palette and specific articulations. Render
that exact plan through the engine before allowing the automatic planner to
vary it. This separates “the engine cannot perform a good score convincingly”
from “the planner is selecting an unconvincing score.” A developer-authored
score would itself remain an unaccepted candidate until heard.

For reference analysis, a valid next input is passage-level musical annotation
from an audio-capable reviewer: source phrase, rhythmic motif, instrument role,
articulation, voice treatment, transition and resolution, with timestamps and
uncertainty. Do not infer those labels from low-frequency energy or pretend that
existing source-separated estimates are ground truth. This does not authorize
training or introduce a later milestone.

**Unresolved:** direct reference audition, corrected musical annotations and a
listening-approved original control. No further engine modification is justified
by the present measurements alone. Production and existing audio remain intact.

## Reproduce and verify

The existing analyzer refuses existing output directories. Use new paths for
reruns; archived evidence stays untouched.

```sh
.venv-analysis/bin/python docs/evidence/reference-analysis/analyze.py \
  --input ~/Downloads/f.mp3 --output renders/q0-reference-reassessment/f
.venv-analysis/bin/python docs/evidence/reference-analysis/analyze.py \
  --input renders/q0-baseline-v2-20261020/owner-speech/A.hiphop.wav \
  --output renders/q0-reference-reassessment/owner-A
.venv-analysis/bin/python docs/evidence/reference-analysis/analyze.py \
  --input renders/q0-five-arm-20261020/owner-speech/E.hiphop.wav \
  --output renders/q0-reference-reassessment/owner-E
.venv-q0/bin/python docs/evidence/q0-reference-reassessment/verify.py
```

[Measured f structure](evidence/q0-reference-reassessment/f-structure.png),
[f measurements](evidence/q0-reference-reassessment/f.json),
[A](evidence/q0-reference-reassessment/owner-A.json),
[E](evidence/q0-reference-reassessment/owner-E.json),
[verification](evidence/q0-reference-reassessment/verification.json).

| Gate | Result |
|---|---|
| Seven reference identities; preserved source/master | PASS |
| New f/A/E signal analysis | PASS |
| Previous six reference measurements | PASS — reused after hash verification |
| New five-condition owner acceptance | FAIL |
| Code-grounded gap analysis | PARTIAL |
| Direct agent listening and reference musical annotation | NOT RUN |
| Independent study and musical quality recovery | NOT RUN |
| Training, paid services, publication, new engine changes | NOT RUN |
