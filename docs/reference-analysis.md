# Owner-supplied reference analysis

2026-10-17. The owner selected all parts of the linked tracks and supplied
`~/Downloads/down.mp3` and `~/Downloads/question.mp3`. Both were analyzed locally
in full. Blood Club was not supplied locally or analyzed here. Original audio is
unchanged and remains outside Git.

**Overall: PARTIAL. Signal measurements: PASS. Direct listening: NOT RUN.** This
session cannot hear audio. Instrument identification, lyrics, key/chord
transcription, vocal-edit assessment and musical quality are not established.
Timestamps below describe measured changes, not heard song sections.

| Supplied file | Duration | Approximate pulse candidates | Integrated loudness | Loudness range |
| --- | --- | --- | --- | --- |
| down.mp3 | 2:23.80 | 131 or 65.5 BPM | -5.3 LUFS | 4.7 LU |
| question.mp3 | 2:35.32 | 157 or 79 BPM | -5.7 LUFS | 6.1 LU |
| Current Djayvo acoustic masters | 32–32.97 s | Score tempi remain authoritative | -24.8 to -23.9 LUFS | 5.5–9.4 LU |

Onset autocorrelation has half/double-time and other metrical ambiguities; these
are not verified beat grids. Results describe the supplied MP3 encodings, not
necessarily the original releases. Different durations and silence profiles
also prevent loudness range from ranking the arrangements or their quality.

## Measured structure and comparison

**Down:** level rises near 0:24, retreats near 0:55, returns near 1:37 and retreats
again near 2:08. In 0:30–0:40, 68% of measured mono spectral energy is in 20–150 Hz,
versus 13% at 1:10–1:20 and 69% at 1:50–2:00. The middle passage changes the
balance substantially before the low-frequency energy returns.

**Question:** a prominent lift occurs near 0:58, followed by a brief reduction
near 1:22 and recovery. Low-frequency energy is 39% at 0:40–0:50, 76% at 1:00–1:10
and 81% at 2:00–2:10. Side/mid energy is -7 dB at 0:40–0:50 versus -15 dB at
1:00–1:10: more relative side energy in the earlier passage. Width changes with
the arrangement; continuously widening every part would not reproduce this.

**Djayvo:** current hip-hop bass fractions are 54%, 58%, 55% across its active
ten-second windows; reggae has 50%, 49%, 50%; experimental has 62%, 74%, 58%.
Substantial low-frequency energy already exists. A blanket bass boost is not
supported by this comparison. Overall side/mid energy is -19 to -20 dB in Djayvo
versus -12 to -13 dB in the references; these are not perceptual quality scores.

## Implications for the next revision

These are design hypotheses informed by measurements and owner feedback:

1. Develop the arrangement through a restrained opening, clear arrival,
   subtraction and changed return. Scale this to 20–40 seconds without copying
   reference timestamps or melodies.
2. Change bass/drum roles between sections rather than adding notes everywhere.
3. Evaluate sound character and articulation separately. Acoustic samples alone
   do not resolve the reported game-like quality. Compare acoustic and designed
   electronic sounds in context before choosing a direction.
4. Use space selectively, with controlled central low end and changing space
   around other parts. More stereo energy alone is not an improvement criterion.
5. Retain varied openings and two protected complete speech phrases. Place short
   responses in deliberate gaps; these measurements cannot assess intelligibility.

No engine changes, training or reference-audio incorporation occurred here.

## Audition package

Local folder: `renders/reference-analysis/listening/`.

- `down-018-062.wav`: 0:18–1:02, covering the first strong arrival and retreat.
- `question-046-090.wav`: 0:46–1:30, covering the lift, reduction and recovery.
- `djayvo-{hiphop,reggae,experimental}.wav`: complete current acoustic renders.

All five measure -25.0 LUFS after constant gain changes, without compression or
limiting; internal contrast is preserved. True peaks range from -15.8 to -8.1 dBFS.
This is an informal reference comparison, not a blinded quality trial. Playback
and listener scores are not claimed.

The supplied MP3s decode above full scale (true peaks +4.6/+4.3 dBFS), so their
loudness is not a mastering target. Attenuation precedes PCM output. An initial
excerpt check failed by 0.6 LU because measurement preceded output-side trimming.
Trimming now occurs inside the filter chain before measurement and gain; all five
final outputs pass fresh loudness/peak checks.

## Reproduction and evidence

Use isolated `.venv-analysis`, [pinned packages](evidence/reference-analysis/requirements.txt)
and installed FFmpeg 9.0.2, from the repo root. `~/mlx-env` and the build environment
are unchanged. The scripts expect the Downloads files and existing acoustic-v1
renders. The audition script refuses to overwrite existing WAVs; move the prior
package before reproducing it.

```sh
.venv-analysis/bin/python docs/evidence/reference-analysis/analyze.py
.venv-analysis/bin/python docs/evidence/reference-analysis/prepare-audition.py
```

[Measurements and hashes](evidence/reference-analysis/measurements.json) and
[audition checks](evidence/reference-analysis/audition-measurements.json) retain
the evidence. The chart is local at `renders/reference-analysis/reference-structure.png`.

Method: floating-point stereo decoded at 22.05 kHz; mono STFT with 2048-sample
window and 220-sample hop. Band fractions are relative to 20 Hz–10 kHz energy,
not isolated instruments or perceived loudness. Stereo ratios use left/right
channels. Quarter-second RMS and adjacent two-second spectral contrast identify
approximate changes. FFmpeg EBU R128 measures loudness/peak at source rate.
Silent/undefined ratios are JSON null. Assertions check finite decoded samples,
silence handling, known energy ratios and an 80 Hz test tone; audition files are
independently remeasured.

| Gate | Status | Evidence / limitation |
| --- | --- | --- |
| Both supplied files analyzed in full | PASS | Hashes, durations, measurements |
| Reproducible signal metrics | PASS | Snapshot, versions, numerical self-checks |
| Level-matched audition preparation | PASS | Five files at -25.0 LUFS, peaks below -1 dBFS |
| Reference interpretation | PARTIAL | Measured structure and design hypotheses |
| Direct listening / timbre / harmony / vocal edits | NOT RUN | Audio perception unavailable here |
| Blood Club | NOT RUN | No local audio supplied |
| Revised Djayvo human quality gate | NOT RUN | No new listener ratings |
| Current engine Linux/Mac comparison | NOT RUN | No new engine or cross-OS run here |

Historical M5 build/sanitizer results remain in [acoustic-review.md](acoustic-review.md).
They were not rerun for this analysis-only change. The master spec is unchanged.
