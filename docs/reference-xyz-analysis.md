# X, Y and Z: reference measurements and improvisation direction

2026-10-18. The owner supplied `~/Downloads/x.mp3`, `y.mp3` and `z.mp3` and clarified
that Djayvo should create an original performance from the input. **Overall:
PARTIAL.** Full-file signal measurements are available; direct listening is
**NOT RUN** because this session has no audio-perception tool. No instrument,
lyric, melody, source-to-music transformation or perceived quality is identified
from these measurements. No file was uploaded, sampled into a remix or
used for training. The original files remain outside Git and unchanged.

The owner subsequently confirmed these three recordings as the style/quality
target. The [first source-phrase implementation](source-motif.md) addresses
chronological rhythm and energy accents in Call & Response; it does not establish
perceived similarity or reference-level quality. The gap analysis below records
the earlier `ec2f968` baseline; remaining work is tracked as C06.

## What the files establish

All three are 48 kHz stereo MP3s. Measurements cover the entire decoded files.

| Measurement | x.mp3 | y.mp3 | z.mp3 |
| --- | --- | --- | --- |
| Duration | 12:44.651 | 11:07.179 | 10:25.408 |
| Integrated loudness | -8.9 LUFS | -7.9 LUFS | -9.4 LUFS |
| Loudness range | 13.8 LU | 12.1 LU | 14.5 LU |
| Decoded true peak | +4.2 dBFS | +3.1 dBFS | +3.5 dBFS |
| Overall mono 20–150 Hz energy share | 65.7% | 53.9% | 65.4% |

These are long recordings with repeated changes in level, frequency balance and
stereo width. They may include separate demonstrations, speech or edits; signal
analysis cannot establish which. Whole-file loudness range therefore cannot be
treated as the dynamic range of one musical performance. The decoded overshoots
are measurements, not recommended mastering targets. The global pulse candidates
are ambiguous (x: approximately 86/169 BPM; y: 76/149 BPM; z: 60/125/173 BPM,
with competing peaks); none has a verified tempo or beat grid.

Selected windows are useful locations for a future listening pass:

| File / window | RMS level | Low-frequency share | Side/mid energy |
| --- | --- | --- | --- |
| x, 0:30–0:40 | -8.99 dBFS | 79.8% | -9.90 dB |
| x, 1:00–1:10 | -13.70 dBFS | 2.1% | -8.64 dB |
| x, 6:30–6:40 | -24.03 dBFS | 7.5% | -16.04 dB |
| x, 7:00–7:10 | -5.02 dBFS | 85.6% | -10.32 dB |
| y, 1:00–1:10 | -20.07 dBFS | 0.2% | -44.74 dB |
| y, 2:00–2:10 | -7.79 dBFS | 54.8% | -10.19 dB |
| y, 7:30–7:40 | -18.35 dBFS | 3.4% | -19.28 dB |
| y, 8:00–8:10 | -7.90 dBFS | 62.0% | -10.32 dB |
| z, 5:00–5:10 | -23.26 dBFS | 2.5% | -24.17 dB |
| z, 5:30–5:40 | -8.93 dBFS | 81.1% | -12.41 dB |
| z, 6:00–6:10 | -22.11 dBFS | 0.6% | -45.13 dB |

The first x pair changes low-frequency contribution substantially without a
similar change in stereo width. The last y pair rises about 10.5 dB in RMS while
the low-frequency share and width increase. These demonstrate changes in the
recordings, not proof of intentional builds, drops, instrument entrances or
musical development. Automatic boundary candidates include x 4:06.71 and 5:57.55,
and y 3:07.26 and 7:44.90. In z, the 5:00 to 5:30 windows show a 14.33 dB
level increase and a large low-frequency change, followed by a much quieter,
narrower window at 6:00. Its boundary candidates include 3:23.02 and 6:00.59.
Their smoothed detector timestamps are approximate. These are useful audition
locations, not evidence of the musical mechanism that created the changes.

Full measurements: [x](evidence/reference-x/analysis.json),
[y](evidence/reference-y/analysis.json), [z](evidence/reference-z/analysis.json). Structure plots:
[x](evidence/reference-x/reference-structure.png),
[y](evidence/reference-y/reference-structure.png),
[z](evidence/reference-z/reference-structure.png).
Low-frequency shares use mono STFT power between 20 Hz and 10 kHz; stereo phase
cancellation and analysis downsampling can affect them. Side/mid energy is a
width proxy, not a perceptual spaciousness score. Boundary level values in the
JSON average quarter-second dB values; the ten-second table uses pooled energy.

## What Djayvo should do with the user's sound

The owner's direction is **source-led musical development**. A short phrase can
provide a rhythmic identity, an accent pattern and, where reliable, a pitch
contour. Instruments should develop that identity while the voice can enter,
leave and return. This is an interpretation of the owner's request, not a claim
that the specific reference performers use these techniques.

For example, a phrase with two short syllables followed by a long one could
become a bass motif. A keyboard could answer with a complementary rhythm; the
next section could stretch that motif, change its harmony and withhold the
voice. A later return could reveal the clean phrase over the developed idea.
The opening need not play the whole recording. Repeating recognizable material
is useful when it develops; unrelated randomness is not the creativity target.

The current [planner](../core/arrangement/remix.cpp) already quantizes source
onsets into a motif, chooses a tonic from a sufficiently confident pitch estimate,
provides instrumental answers and varies openings. However:

- Tempo and section form are mostly selected by style and seed.
- Harmony/groove choices mostly come from finite preset combinations.
- Motif extraction takes up to eight quantized onsets modulo one bar; this loses
  longer phrase order and does not represent a melodic contour or expressive accents.
- Two complete untransformed source hooks are scheduled in each rule plan;
  their placement is rule-driven, not a contextual musical judgment.
- Some club/experimental vocal placements replace the source motif with fixed
  offsets. Responses are not a general system for developing a source idea.

This explains a structural limitation; it is not a newly heard defect in the
outputs. The next focused engine work should reach source analysis, planner,
plan validation, native/WASM comparisons and listening evidence together:

1. Preserve phrase-relative rhythm, rests and accent strength, with confidence
   and conservative fallback. Use pitch contours only when reliable.
2. Carry one source motif into bass, melody or percussion, and develop it through
   answer phrases, augmentation, displacement and harmonic changes. Keep a
   traceable relationship to the source across sections.
3. Select voice roles and entrances deliberately. Keep at least one recognizable
   clean/intelligible hook as the master requires; a full-source opening and a
   second full replay need not be universal musical requirements.
4. Compare three distinct developments from one source, with different musical
   roles/forms as well as different seeds. Existing saved scores must replay.
5. Test source influence: hold style/seed constant and change source rhythm;
   inspect instrumental responses. Then use blinded listening against the fixed
   beat baseline for recognizability, coherence, development and enjoyment.

Items above are design work, **NOT RUN** as a new implementation or quality
evaluation. Preserve the frozen evaluation cohort; new engine revisions need
separate comparisons. More presets or a new model alone do not establish success.
Existing M1/M2 quality holds remain. The master specification is unchanged.

## Reproduction and gates

Use fresh output directories; the single-file mode rejects existing outputs:

```sh
.venv-analysis/bin/python docs/evidence/reference-analysis/analyze.py \
  --input "$HOME/Downloads/x.mp3" --output renders/NEW-x-analysis
.venv-analysis/bin/python docs/evidence/reference-analysis/analyze.py \
  --input "$HOME/Downloads/y.mp3" --output renders/NEW-y-analysis
.venv-analysis/bin/python docs/evidence/reference-analysis/analyze.py \
  --input "$HOME/Downloads/z.mp3" --output renders/NEW-z-analysis
.venv-analysis/bin/python docs/evidence/reference-analysis/verify-xyz.py
```

The existing analyzer is reused; its original no-argument reference set remains.
No new dependencies or audio assets. Verification rejects missing paired flags,
missing input and replacement of existing evidence, repeats all three entire-file
analyses in temporary directories and compares every JSON measurement exactly.
It also checks original input hashes and the protected master hash.

| Gate | Status | Boundary |
| --- | --- | --- |
| Full-file signal analysis | PASS | x, y and z decoded; finite samples, plots and JSON retained |
| CLI safeguards / repeatability | PASS | Four rejected invocations and three exact measurement reruns; [receipt](evidence/reference-analysis/xyz-verification.json) |
| Source/master preservation | PASS | Exact hashes unchanged; private/reference audio outside Git |
| Direct listening / musical annotation | NOT RUN | No audio-perception tool available |
| Improvisation gap analysis | PARTIAL | Code-grounded limitations and proposed development; perceptual validation missing |
| New engine implementation / render / event-frame comparison | NOT RUN | No engine or generated audio changed in this analysis |
| Musical quality / production acceptance | NOT RUN | No new human ratings; specification remains PARTIAL |

Measured on Apple M5, 16 GiB, macOS 26.7.1 (25G241), FFmpeg 9.0.2,
Python 3.15.0 in `.venv-analysis`, NumPy 2.5.4, SciPy 1.18.1 and
Matplotlib 3.11.2. `~/mlx-env` was not used. Full source hashes and all
ten-second windows are in the measurement JSONs. No waveform difference or
event-frame agreement is claimed for unchanged/unrendered engine output.
