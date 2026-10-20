# Q0 — Guitar velocity-layer discontinuity and vocal integrity

2026-10-20. **Diagnostic execution PASS. Isolated calibration PARTIAL.
Musical acceptance NOT RUN. Overall Q0 remains PARTIAL; earlier owner rejection FAIL.**

## Findings

Increasing guitar velocity from 84 to 85 switches from the recorded medium
layer to the forte layer. The existing preparation peak-normalizes each sample
independently. Equal peaks do not imply equal body energy: the prepared forte
recordings can have much less energy after their attack than the medium
recordings. This interacts with a hard layer switch in `Voice::start()`.

The unchanged native core was measured with fixed pitch and take, using the
first 500 ms of each sustained note. At 48 kHz, all 80 guitar pitch/take pairs
became quieter across that one-step velocity increase, by **2.56–17.46 dB**.
Seventy-one pairs dropped by more than 3 dB. The separate 16 kHz run reproduced
the issue. Piano's 196 pairs at 48 kHz had smaller half-second changes:
none exceeded 3 dB in magnitude. These are energy measurements, not perceived
loudness or listener judgments.

This identifies a concrete instrument-response defect. It is **not** evidence
that this defect caused all rejected arrangements: the latest original-score
and phrase-form studies use guitar velocities below 85 and never cross the
boundary. Their general realism, composition and entertainment gaps remain open.

The independent owner-vocal audit also completed. All **1,560,000 frames** of
the current phrase-form vocal stem match the expected source mono fold-down,
clip positions, normalization/pan gain, 3 ms boundary fades and PCM16
quantization, with **zero differing samples**. The oracle does not call the
renderer. It rejects an added spurious sample, changed source hash, missing
consent and output overwrite. This rules out unexplained waveform processing
in that particular isolated stem. It does not prove intelligibility, natural
placement, recognizability or absence of masking in the mix. Other input sample
rates and transformed voices are outside this oracle's scope.

## Isolated change

`scripts/q0_guitar_layer_trial.py` creates an experimental copy of `voice.cpp`
in ignored renders storage. It adds 26 static gains: one for each of the
13 sampled guitar roots and two takes. Gains are calibrated from the **48 kHz,
500 ms boundary measurements** to align the layers while retaining the
existing velocity power curve. They attenuate the medium layer by
2.71–17.45 dB. Forte samples, muted guitar, piano, sample PCM, note gates,
filters and timing remain unchanged.

Only that copied translation unit is compiled and linked ahead of the frozen
core archive. No production source, library, renderer, browser engine or
schema is replaced. This avoids copying the complete source/sample banks or
rebuilding unrelated components. The patch and binary/source hashes are retained.
It remains an experimental calibration, not a selected production fix.

The calibration uses 26 root/take observations. Its other 134 guitar conditions
(54 transposed notes at 48 kHz and all 80 at 16 kHz) are checks outside the fitted
root/rate points. They are correlated samples from the same instrument bank,
**not** a held-out musician or musical-quality evaluation.

| Measurement, velocity 84 → 85 | Existing | Calibrated candidate |
|---|---:|---:|
| 500 ms RMS change, 48 kHz | −17.455 to −2.556 dB | −0.010 to +0.307 dB |
| 500 ms RMS change, 16 kHz | −17.207 to −2.554 dB | +0.082 to +0.538 dB |
| First 100 ms RMS change, 48 kHz | −15.267 to −1.675 dB | +0.261 to +3.959 dB |
| First 1 s RMS change, 48 kHz | −18.440 to −2.826 dB | −0.995 to +0.328 dB |

Every tested guitar half-second discontinuity shrank. The sample-root results
match the mathematical calibration target within 0.00001 dB. However, attack
and decay differences remain: the first 100 ms can jump by 4.12 dB at 16 kHz.
Static energy calibration does not supply missing articulations, sustain loops,
amp/cabinet modeling, layer crossfades or musical phrasing.

## Playable evidence

[Local instrument diagnostic](http://127.0.0.1:4203/) contains six blind pairs:
MIDI pitches 49, 61 and 73, each with two fixed takes. Each sequence plays
velocities **70, 80, 83, 84, 85, 86, 95, 110**, one note every 1.25 seconds,
with a 650 ms note gate. Compare the fourth/fifth notes at 3.75/5.00 seconds.
These are isolated instrument probes, not new full musical arrangements.

Each whole before/after sequence receives one constant matching gain; individual
notes are not normalized. Pair targets vary from −28.03 to −23 LUFS to retain
peak headroom. All twelve listening files are within 0.05 LU of their pair
target; maximum measured true peak is −1.99 dBTP. Do not compare absolute
loudness between different pitch/take pairs as though they shared one target.
The organizer key is outside the served folder; no ratings are collected.

Raw files: `renders/q0-guitar-layer-v2-20261020/{baseline,candidate,replay}/`.
Eight probes per condition include the six guitar sequences plus unchanged
muted-guitar and piano controls. The two controls are not preference candidates.
All candidate WAVs replay exactly. Raw notes at velocity 85 and above are
sample-identical to their controls; all eight difference traces are recorded.

[Evidence](evidence/q0-guitar-layer/) includes the 552-row baseline/candidate
CSVs, calibration patch, levels, PCM differences, source/binary identities,
native regression output, vocal oracle, browser capture and reproducible verifier.
The first exploratory run is retained under `renders/q0-guitar-layer-20261020`;
the v2 run adds strict root-calibration/shrinking-step checks and excludes the
temporary completion marker from its hash inventory. Both completed, but only
v2 is the review packet.

## Gates

| Gate | Result | Evidence / boundary |
|---|---|---|
| Instrument discontinuity reproduction | PASS | 552 pairs per run: 392 piano and 160 guitar across two rates |
| Isolated calibration execution | PASS | All 160 guitar half-second steps shrink; fitted roots meet expected target |
| Unaffected samples/articulations | PASS | Forte measurements, muted-guitar and piano WAVs identical |
| Actual audio and PCM integrity | PASS | 16 decoded before/after probes, non-silent, no full-scale PCM; eight exact replays |
| Native regressions | PASS | Existing core, remix and live executables against candidate object; 47 PASS lines |
| Existing Q0 regressions | PASS | 12 tests |
| Asset provenance | PASS | 78 pinned guitar samples and CC0 evidence reverified; no new assets or training |
| Owner vocal integrity | PASS | Independent full-stem reconstruction, zero PCM error and four negative cases |
| Local listening page | PASS | Chromium: all 12 files decode, 10 s duration, muted clock, auto-pause, 390 px width, no external requests, key isolation |
| Actual M5 execution | PASS | Compiled and executed experimental C++17 sampler and native regression programs |
| Physical audio, Safari and fresh Linux/iPhone/WASM execution | NOT RUN | Browser decode and 16 kHz tests are not these gates |
| Broader instrument realism | PARTIAL | Level discontinuity reduced; attack/decay/timbre differences remain unreviewed |
| Complete-mix calibration evaluation | NOT RUN | Soft guitar attenuation changes mix balance; no new mixed arrangements generated |
| New human musical quality | NOT RUN | Neither this diagnostic nor the earlier new score/phrase packets have listener acceptance |
| Earlier owner acceptance | FAIL | Prior rejections retained |
| Overall Q0 | PARTIAL | Substantially less robotic, more coherent music remains unproven |

Current M5/macOS/Xcode environment remains as recorded in the preceding
[phrase-form study](q0-phrase-form-study.md); the verifier captures current
Clang, Python and NumPy versions. Candidate compilation uses C++17, `-O3`,
`-DNDEBUG`, `-fno-fast-math` and existing local includes/archive; no new dependency.
All new sampler state is static, with no added callback allocation.

## Reproduce and next decision

Use a fresh experiment directory for reruns. The verifier below intentionally
checks the frozen v2 packet.

```sh
.venv-q0/bin/python scripts/q0_guitar_layer_trial.py \
  --output renders/q0-guitar-layer-v2-20261020
.venv-analysis/bin/python docs/evidence/q0-guitar-layer/verify.py
.venv-q0/bin/python tests/integration/verify_q0.py
.venv-q0/bin/python scripts/verify_guitar_assets.py
.venv-q0/bin/python -m http.server 4203 --bind 127.0.0.1 \
  --directory renders/q0-guitar-layer-v2-20261020/listener
```

In another terminal: `node tests/q0_layer_browser.mjs`.
The vocal oracle also accepts explicit `--plan`, `--source`, `--stem` and
`--output` paths; see `scripts/q0_voice_integrity.py`.

The next Q0 decision is whether this dynamic response is preferable when heard,
followed by a controlled full-mix balance test if justified. Attenuating the
medium layer will change existing arrangements' guitar levels, so this patch
must not be silently promoted. Instrument quality cannot be inferred from the
reduced RMS discontinuity. Production, specifications and prior audio remain
untouched; no training, spending, publishing or later milestone began.
