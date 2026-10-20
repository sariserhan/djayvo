# Q0 — Original score and instrument-palette study

2026-10-20. **Technical execution: PASS. Overall Q0: PARTIAL.
New listening acceptance: NOT RUN. Previous candidates remain FAIL.**

Following the owner's request to continue, this experiment tests an original
short performance rather than another modification of the rejected plan.
It is developer-authored and has not been approved by a musician or listener.
It is not a trained improvisation model or a claim of professional quality.

## What changed

`scripts/q0_authored_score.py` creates a 16-bar, 112 BPM performance from each
of the five previously authorized inputs. Duration including decay is
36.785708 seconds. The form establishes guitar harmony before the first intact
voice call, develops a recurring piano answer over bass and drums, subtracts
instruments for a second intact call, returns with the motif and resolves once.
The two vocal calls have dedicated three-bar spaces; no phoneme chopping,
pitch shifting, voice cloning or guessed word boundaries are introduced.

The original harmonic cycle uses minor seventh, flat-six major seventh,
minor-four seventh and minor-five seventh chords. Guitar uses compact recorded
voicings, muted offbeats and short ordered strums. Bass and kick share attacks.
The written drum part includes accents, restrained ghost strokes and two-note
transition pickups. Piano phrases reuse a six-note contour with a reversed
answer and a tonic resolution; rests and note lengths shape the phrase.

Source onsets select chronological rhythmic anchors. Local 40 ms energy windows
determine accents. Only source rhythms longer than six beats are compressed.
These are measured transients, not verified syllables or musical understanding.
The same broad form/harmony remains a limitation across inputs.

Expression uses one shared timing map: selected offbeats move by 24 ticks
(13.39 ms); bass/kick coincidences stay aligned. Guitar strums use ordered
7-tick spacing, with no independent random note offsets. The unshaped control
uses fixed velocities per instrument and capped pitched-note gates.

## Controlled comparison

All four conditions have the same source, pitch sequence, event counts, tempo,
voice placements and mixing settings. Palette pairs have identical event files.
Expression pairs intentionally vary timing, velocity and duration.

| Condition | Bass and drums | Performance |
|---|---|---|
| Acoustic grid | Existing recorded acoustic bank | Fixed velocities and grid |
| Acoustic phrased | Same bank | Authored accents, gates, timing and guitar strums |
| Hybrid grid | Existing original electronic bank v2 | Same unshaped score |
| Hybrid phrased | Same electronic bank | Same authored expression |

Recorded piano and guitar are shared across palettes. All vocal stems are
byte-identical across the four conditions for each source. Palette pairs also
preserve piano and guitar stems exactly. Thus the palette comparison changes
bass/drum rendering, while the expression comparison changes performance.

The previous 96/80/124 BPM baselines remain preserved. They are **not** relabeled
as tempo-matched controls for this new 112 BPM study. This experiment complements
the rejected five-condition Q0 trial; it does not reset its failed acceptance
or alter the original quality thresholds.

## Playable outputs and evidence

[Private listening page](http://127.0.0.1:4201/) — four blind candidates per
source, same loudness target. Start with `owner-speech`. Unrated fields remain
missing; one does not have to rate all five sources. Downloads are local only.
The organizer key is outside the served folder.

- Actual masters, stems, scores, event TSVs and replays:
  `renders/q0-authored-v2-20261020/<source>/`.
- Example master:
  `owner-speech/hybrid-phrased.hiphop.wav`.
- Matching example stems:
  `hybrid-phrased.hiphop.{piano,guitar,bass,drums,vocals}.wav`.
- `hiphop/reggae/experimental` suffixes preserve native import strategy metadata
  from the source control; this study uses its explicitly documented original score.
- [Machine-readable evidence](evidence/q0-authored/): native report, five
  reproducible example scores/traces, all file hashes, decoded PCM measurements,
  waveform differences, tests, asset verification and browser results.

| Gate | Result | Evidence |
|---|---|---|
| Actual audio and stems | PASS | 20 masters, 100 stems, 20 replay masters |
| Validated native plan import | PASS | All 20 exported plans match submitted plans |
| Determinism | PASS | All 20 master WAVs, scores and TSVs identical at blocks 512/113 |
| Independent event timing | PASS | 8,680 instrument rows, zero frame errors |
| Plan reproducibility | PASS | All 20 plans reproduced from current generator |
| Palette isolation | PASS | Exact event schedules and unaffected stems |
| PCM and headroom | PASS | 120 decoded masters/stems; no silence or full-scale PCM samples; zero master limiter interventions |
| Loudness matching | PASS | All 20 mixes within 0.02 LU of −23 LUFS; max true peak −4.13 dBTP |
| Regression/invariant tests | PASS | 11 Q0 tests, including consent/hash rejection and 16/48 kHz coordinate handling |
| Asset integrity/licensing | PASS | 53 pinned CC0 acoustic samples, 78 CC0 guitar samples, 14 original electronic samples verified |
| Browser controls | PARTIAL | Chromium/WebKit decode, mobile layout, partial ratings and local download pass; known headless WebKit clock limitation |
| Mac native execution | PASS | Actual M5 renders through frozen shared core |
| Fresh Linux/iPhone/WASM execution | NOT RUN | No cross-target result inferred |
| Prior listening acceptance | FAIL | Both prior study rejections retained |
| New musical quality / recognizability | NOT RUN | No listening scores or improvement inferred |
| Independent musician approval | NOT RUN | Developer-authored candidate only |

The first batch stopped when the analyzer assumed that every source WAV was
48 kHz. Four retained inputs are 16 kHz, with engine analysis at 48 kHz.
The correction maps analysis frame positions into original-source coordinates
for energy measurement, leaving source recordings and engine-resampled clips
unchanged. A regression test covers this case. The partial first batch remains
marked `INCOMPLETE`, excluded from the listening packet and retained in
`initial-incomplete-run.log`. No failed run is counted as a successful render.

## Reproduce

From the repository root, choose new output/evidence directories for a rerun.

```sh
.venv-q0/bin/python tests/integration/verify_q0.py
.venv-q0/bin/python scripts/q0_authored_trial.py \
  --output renders/q0-authored-v2-20261020
.venv-analysis/bin/python scripts/q0_authored_evidence.py \
  --trial renders/q0-authored-v2-20261020 --output docs/evidence/q0-authored
.venv-q0/bin/python -m http.server 4201 --bind 127.0.0.1 \
  --directory renders/q0-authored-v2-20261020/listener
```

In a second terminal using the existing Node 22 environment:

```sh
Q0_REVIEW_URL=http://127.0.0.1:4201/ Q0_CANDIDATES=4 node tests/q0_review_browser.mjs
```

Native build/compiler provenance remains the frozen Q0 M5 build
(`bd20df4c419cacc20603d48c7e96caa7db34f78385333bb77966bd3a03e22309`).
No C++ rebuild or source change was needed. Existing isolated Python environments,
FFmpeg and NumPy were reused; no dependencies were installed.

## Limits and review boundary

The production planner/engine, immutable specifications, historical synthetic
fixture, original recordings and prior rejected packets remain unchanged.
References were not sampled or used for training. No cloud services, spending,
publication or dashboard changes occurred.

This still uses finite authored musical rules and the existing sound libraries.
It does not prove human-like creativity, reference-level timbre or entertainment.
Direct agent audition remains unavailable. The next decision is whether a
listener prefers any new condition, with instrument realism, groove, coherent
development and voice recognizability assessed separately. Keep all production
promotion and later milestones on hold until that evidence supports them.
