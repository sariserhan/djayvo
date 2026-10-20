# Q0 — Guitar dynamics without reducing existing mix levels

2026-10-20. **Technical execution PASS; new musical acceptance NOT RUN;
overall Q0 PARTIAL. Earlier rejected packets remain FAIL.**

The [previous calibration](q0-guitar-mix-study.md) reduced a measured guitar
velocity discontinuity but lowered guitar energy in existing mixes by
4.26–9.30 dB. This isolated alternative preserves the ordinary recorded layer
at higher velocities. It retains velocity-dependent gain and filtering,
alternate recorded takes, envelopes and the separate muted articulation.
It sacrifices the separate recorded forte timbre. Smooth level response alone
does not establish realistic articulation or solve the broader robotic sound.

## Implementation and controls

`scripts/q0_guitar_layer_trial.py --single-layer` changes one sample-selection
expression in a copied `voice.cpp`: `(muted?127:velocity<=84?84:127)` becomes
`(muted?127:84)`. The production source, library and renderer remain unchanged.
The prior attenuation experiment remains available with the default invocation.
`scripts/q0_phrase_trial.py` reuses its pinned experimental-renderer builder.
No new runtime dependency, fitted gain table or random variation is introduced.

`scripts/q0_guitar_accent_trial.py` first re-renders all five frozen phrase-form
plans. Their **WAVs, scores and event TSVs are byte-identical** to the originals.
These plans do not cross the ordinary guitar layer boundary, so this is
preservation evidence, not five improved musical outcomes. Temporary check
exports are removed by the harness; original playable controls remain.

The script then copies the owner's plan and changes exactly twelve guitar
velocities in three existing four-note strums:

| Strum | Velocities |
|---|---|
| Introduction, tick 0 | 86, 82, 78, 74 |
| Tick 5760 | 94, 86, 82, 78 |
| Final bar | 98, 92, 86, 80 |

Six notes cross the 84/85 boundary. Both the original sampler and experimental
sampler render **this same accent plan**, at 112 BPM for fourteen bars.
Pitches, timing, note lengths, muted notes, vocal processing and mix settings
stay fixed. The original plan is preserved. This one-source comparison tests
accent response; it is not a new five-input composition study.

## Measurements

Across 160 guitar boundary conditions (40 pitches, two takes, 16/48 kHz),
velocity 84 → 85 now increases RMS by:

| Measurement window | Minimum / maximum |
|---|---|
| First 100 ms | +0.1492 / +0.1516 dB |
| First 500 ms | +0.1491 / +0.1509 dB |
| First second | +0.1491 / +0.1508 dB |

The former half-second drop was 2.56–17.46 dB at 48 kHz. The 392 piano boundary
pairs are unchanged. All eight candidate instrument probes replay exactly;
soft-note prefixes, muted guitar and piano preserve their PCM exactly.

The accent pair produces two 32.5-second masters and ten stems. All four
non-guitar stems are identical. Guitar RMS rises **2.336 dB**; the difference
between the two masters is explained by guitar alone within **one PCM16 unit**
(allowed quantization/summation tolerance: three). Control and candidate have
426 instrument event rows each, with zero frame errors. A candidate replay at
block size 113 versus 512 preserves WAV, score and events exactly, also with
426 zero-error event rows.

Both listening mixes measure **−23.00 LUFS**. True peaks are −7.62 and
−7.70 dBTP. The 28 decoded raw probes/masters/stems have no full-scale samples;
both native masters and the replay report zero limiter interventions and
nonfinite samples. Matching overall loudness does not remove the intended
change to guitar accent balance.

## Listening and artifacts

Start with the [private full-mix accent pair](http://127.0.0.1:4206/).
The [isolated guitar sequences](http://127.0.0.1:4205/) provide a second check.
The first five seconds of each probe contain unchanged soft notes; the higher
velocities follow. No new listener response has been collected. “Continue” is
not a vote, and automated muted playback is not hearing.

- Accent masters/stems: `renders/q0-guitar-accents-20261020/{control,candidate}.hiphop*.wav`
- Exact replay: `renders/q0-guitar-accents-20261020/replay.hiphop.wav`
- Plan/events: `accent.plan.json` and matching `.score.json` / `.events.tsv`
- Raw probes: `renders/q0-guitar-single-20261020/{baseline,candidate}/`
- [Tracked measurements, patch, plans, logs and verification](evidence/q0-guitar-single/)
- [Independent waveform verifier](evidence/q0-guitar-single/verify.py)

Accent packet:
`660796b7622e172b82d81d1e4fd4a95f2caac4b7d281d5f21d2c0c1aa517e635`.
WAVs remain local and ignored by Git. Organizer keys are outside served
directories; neither page uploads audio or collects ratings.

## Gates

| Gate | Result | Evidence / limit |
|---|---|---|
| Source consent and integrity | PASS | Five existing source hashes/permission records revalidated |
| Asset provenance | PASS | Existing pinned CC0 guitar assets; no new samples or training |
| Isolated native execution | PASS | Apple M5, Apple Clang 21.0.0; three native regression programs pass |
| Boundary response | PASS | 160 guitar and 392 unchanged piano pairs |
| Existing mix preservation | PASS | Five exact WAV/score/TSV re-renders; 107 original inventory hashes checked |
| Actual accent audio | PASS | Two masters, ten stems and exact candidate replay |
| Event timing and determinism | PASS | 852 control/candidate plus 426 replay rows; zero frame errors |
| Waveform isolation | PASS | Non-guitar stems identical; master delta explained within one PCM16 unit |
| Headroom and loudness matching | PASS | 28 decoded raw files; matched −23.00 LUFS; zero native limiting/nonfinite samples |
| Regression tooling | PASS | 14 Q0 tests; velocity-only edit and rejection cases included |
| Private browser controls | PASS | Chromium decode, playback clock, automatic pause, 390px layout, no external requests, organizer key 404 |
| Other browsers and physical audio output | NOT RUN | No listening inference from muted automation |
| Fresh Linux/iPhone/WASM execution | NOT RUN | Native Mac evidence does not establish cross-platform execution |
| New musical realism and enjoyment | NOT RUN | No listening acceptance collected |
| Earlier owner acceptance | FAIL | Previous rejected packets remain rejected |
| Q0 success criterion | PARTIAL | Substantially less robotic and more coherent music remains unproven |

Current compilation identity is recorded in `accent-build.json`. Environment:
Apple M5, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1, Clang 21.0.0;
FFmpeg 9.0.2, project Python 3.14.6, analysis Python 3.15, Node 22.23.1.
This is not a fresh all-platform smoke test. Frozen master/addendum/core hashes
are verified by the independent checker.

## Reproduce

The scripts reject existing output directories. These names identify the
retained run; use a separate checkout for a complete recreation without
overwriting its artifacts. The accent builder deliberately pins the first
experiment's paths and tracked evidence.

```sh
.venv-q0/bin/python scripts/q0_guitar_layer_trial.py --single-layer \
  --output renders/q0-guitar-single-20261020
# After inspecting the successful report, retain it for the pinned builder:
cp renders/q0-guitar-single-20261020/report.json docs/evidence/q0-guitar-single/report.json
.venv-q0/bin/python scripts/q0_guitar_accent_trial.py \
  --output renders/q0-guitar-accents-20261020
.venv-analysis/bin/python docs/evidence/q0-guitar-single/verify.py
.venv-q0/bin/python tests/integration/verify_q0.py
```

Observed verification output:

```text
PASS: 28 decoded masters/stems/probes; five old mixes preserved; accent change isolated to guitar
Ran 14 tests in 0.633s
OK
```

Serve the two `listener/` directories locally on ports 4205 and 4206. Run
`tests/q0_layer_browser.mjs` with `Q0_REVIEW_URL` and `Q0_EVIDENCE_DIR` set to
the corresponding URL and evidence directory; add `Q0_ACCENT_REVIEW=1` for
4206. Both runs passed; screenshots and JSON results are tracked.

Keep the owner-containing packet private. Existing consent covers local
processing and audition, not training or publication. No paid service,
dashboard change, new dependency, specification edit or production promotion
occurred. The next Q0 decision is listening review of accent balance and
timbre before choosing whether this reduced-articulation fallback is useful.
It does not address all remaining weaknesses in composition, vocals or instruments.
