# Style-adapter waveform diagnostics

2026-10-18. **Technical execution PASS; copying/variety assessment PARTIAL;
human musical-quality and production acceptance NOT RUN.** The owner's
“continue” response authorized continued work; it did not select A/B or supply a
listening judgment. The four concealed comparisons remain unchanged at
http://127.0.0.1:4193/review/ . No new rental, upload, training or model promotion
occurred in this follow-up.

The [completed training pilot](style-training-retry.md) generated eight distinct
outputs. This local diagnostic compares those outputs against the **five actual
training excerpts**, checks later nonoverlapping passages inside each output,
and compares the two bass seeds with the same brief. It does not use z, the
owner's microphone recording, private label descriptions or the blind key.

## Method and controls

SHA-256 verification precedes decoding. FFmpeg decodes each 30-second file to
4 kHz mono float audio. Every two-second query window, at one-second intervals,
is compared against every valid target sample offset. The score is absolute,
mean-centered normalized waveform correlation: constant gain, polarity and DC
offset do not affect a match. Centered RMS below −80 dBFS is excluded. Internal
repetition searches start after the query window ends, preventing self-matches.

The **0.8 flag threshold** and synthetic controls were fixed before examining
real outputs. It is a diagnostic threshold, not a calibrated probability of
copying. Controls ran first:

- **PASS:** a known shifted, quieter, polarity-inverted copy with a DC offset
  scored effectively 1.0 and recovered the exact offset, 3.03075 seconds.
- **PASS:** that copy with added noise scored 0.986917.
- **PASS:** unrelated noise scored 0.045276, below the threshold.
- **PASS:** FFT results agreed with direct sliding Pearson correlation to
  1e−12; silence, nonfinite data and unavailable nonoverlapping windows were handled.
- **PASS:** three unit tests also exercised real WAV/FFmpeg decoding and exact
  recovery of an injected inverted copy at 8.25 seconds, checksum rejection,
  corrupt-audio rejection and refusal to replace existing evidence.

## Results

| Check | Status | Result |
| --- | --- | --- |
| Training-excerpt waveform scan | PASS | 40 output/excerpt pairs, 1,160 eligible query windows; zero flags; maximum correlation 0.336994 |
| Within-output repetition measurement | PASS | Eight outputs, 216 eligible windows; 16 flags concentrated in the second bass seed |
| Same-brief cross-seed measurement | PASS | Two pairs, 58 eligible windows; zero flags; base maximum 0.742872, adapter maximum 0.681579 |
| Perceived variety / musical value of repetition | NOT RUN | Waveform scores do not assess arrangement, enjoyment or originality |
| Copying / memorization assessment | PARTIAL | Fixed-rate mono waveform scan completed; transformed/semantic reuse remains unassessed |
| Independent holdout evaluation | NOT RUN | z excluded; source-session independence remains unknown |
| Protected-file and retrieved-artifact preservation | PASS | Master, fixture, owner source, x/y/z originals, all 36 candidate files and all 27 retrieved artifacts retain recorded hashes |
| Engine event-frame agreement | NOT RUN | No event trace from the model; no shared-engine change |
| Human quality / production acceptance | NOT RUN | No preference supplied; no gate advanced |

Internal repetition details (two-second windows; query and match start times):

| Output | Flagged windows / eligible | Strongest correlation | Query → later match |
| --- | --- | --- | --- |
| base-bass-a | 0 / 27 | 0.771189 | 4.000 → 10.89175 s |
| base-bass-b | 13 / 27 | 0.933124 | 3.000 → 23.57150 s |
| base-funk | 0 / 27 | 0.784355 | 7.000 → 15.57150 s |
| base-hiphop | 0 / 27 | 0.538980 | 0.000 → 7.49750 s |
| adapter-bass-a | 0 / 27 | 0.736990 | 9.000 → 22.70850 s |
| adapter-bass-b | 3 / 27 | 0.875225 | 10.000 → 16.85725 s |
| adapter-funk | 0 / 27 | 0.685189 | 1.000 → 9.57150 s |
| adapter-hiphop | 0 / 27 | 0.567525 | 5.000 → 15.49200 s |

Flags are overlapping query windows, **not counts of independent copied phrases**.
The second bass seed reuses similar waveform patterns in both models. Fewer
flags after adaptation do not establish more creative music. Musical loops can
be intentional; these timestamps identify review targets, not automatic defects.
The cross-seed maxima both occurred at the 28-second ending. Two seeds cannot
establish diversity across a catalogue or across repeated user requests.

This detector cannot rule out melodic/harmonic reuse, voice identity, shorter
copies, copies crossing the query grid, pitch shifts, time stretching, stereo-side
content or other transformations. Its sample-rate reduction drops high-frequency
content. No flags therefore means **no detected high-correlation windows under
this method**, not “copy-free,” novel, licensed for distribution or release-ready.
Only the actual five training excerpts were searched, not the base model's
unknown training corpus or every part of x/y.

## Reproduction and evidence

Run from the repository root in the existing analysis environment:

```sh
.venv-analysis/bin/python -m unittest discover -s tests -p test_style_overlap.py -v
.venv-analysis/bin/python scripts/check_style_overlap.py --output /tmp/djayvo-waveform-overlap-new.json
```

The output path must not exist. The script reads audio and writes a JSON report;
it never replaces audio, adapter weights, review files or earlier evidence.
No dependencies were installed and `~/mlx-env` was untouched.

Actual run: Apple M5 MacBook Air (Mac17,3), 10 CPU cores, 16 GB memory,
macOS 26.7.1 (25G241), Python 3.15.0, NumPy 2.5.4, SciPy 1.18.1, FFmpeg 9.0.2.
Decode, controls, scans and final input hash checks took 4.342 seconds.

- [Full scores, timestamps, controls, hashes and toolchain](evidence/style-training/waveform-overlap.json)
- [Three test results](evidence/style-training/overlap-tests.txt)
- [Protected-file and artifact preservation](evidence/style-training/overlap-preservation.json)

C09 remains **PARTIAL**. Verified content curation, independent sessions,
perceptual copying assessment and blinded preferences remain necessary before
claiming this adapter improves the product. Source-conditioned improvisation
still requires paired source/response work; this diagnostic does not implement it.
