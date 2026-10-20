# Q0 continuation — controlled decay and composition trial

2026-10-20. **Overall Q0: PARTIAL. Previous owner acceptance: FAIL.
New listening outcome: NOT RUN.**

The owner rejected all prior packets. This continuation supplies the missing
full-mix conditions without promoting an unaccepted candidate. It tests two
measured mechanisms: prematurely gated drum decay and short vocal fragments
interspersed with competing instrumental material. Neither is established as
the primary perceptual cause of robotic output.

## Changes and experimental boundaries

The production core, master specification, learning addendum, existing plans,
recordings and web dashboard remain unchanged.

- `scripts/q0_decay_build.py` copies only native build inputs to a fresh ignored
  build directory. Its sole C++ change increases drum release from 180 ms to
  1 second. All sample choices, other instruments, scheduler, vocal processing,
  room, ducking and limiter code remain identical. The manifest records every
  source hash and the exact patch. This is a decay candidate, not a new
  sample library or demonstrated instrument-realism improvement.
- `scripts/q0_composition.py` transforms a copy of the plan. It preserves intact
  vocal calls, removes short vocal chops, leaves space in pitched instruments
  for the calls, and uses quantized source-onset rhythm for a repeated
  piano/organ answer with a second contour where space permits. Existing
  harmony, section boundaries, tempo, seed and mixing settings are retained.
  Competing lead/pad/guitar lines are removed. Transient detections are not
  claimed to be corrected syllable or word boundaries.
- `scripts/q0_expression_trial.py` reuses the existing expression transform,
  native import, rendering, replay checks, loudness matcher and blind review
  page. A–D preserve source, notes and tempo; only C/D expression changes note
  timing, velocity and duration. E intentionally changes composition before
  applying that same expression transform.
- `scripts/q0_recovery_evidence.py` independently checks waveform differences,
  stem isolation, clipping, probe behavior and shared source hashes.

| Condition | Renderer | Plan |
|---|---|---|
| A | Frozen production build | Frozen baseline |
| B | Isolated drum-decay build | Exactly A |
| C | Frozen production build | Existing expression transform of A |
| D | Isolated drum-decay build | Exactly C |
| E | Isolated drum-decay build | Call/response composition, then expression |

This tests the requested five conditions with a deliberately narrow instrument
intervention. It does **not** establish that extending drum decay addresses
piano, bass, guitar or synthesizer realism. The previous SFZ comparison was
rejected; it is not rebranded as a successful intervention here.

## Playable output

Open [the private five-condition review](http://127.0.0.1:4200/).
There are five candidates per source, randomized independently with six blank
rating dimensions and a local JSON download. No candidate is labeled better.
The organizer key is outside the served folder.

- Frozen originals, A plans/events/masters/stems:
  `renders/q0-baseline-v2-20261020/<input>/`.
- B/C/D/E plans, event TSVs, masters and instrument/vocal stems:
  `renders/q0-five-arm-20261020/<input>/`.
- Example master: `owner-speech/E.hiphop.wav`; corresponding stems:
  `E.hiphop.piano.wav`, `E.hiphop.bass.wav`, `E.hiphop.drums.wav`,
  `E.hiphop.vocals.wav`.
- Blind level-matched WAVs:
  `renders/q0-five-arm-20261020/listener/<input>-<candidate>.wav`.
- Isolated decay probes: `renders/q0-decay-probes-20261020/`.

Private owner speech remains local. The existing LibriSpeech CC-BY-4.0,
Commons laughter CC0 and compiled-in instrument permissions/attribution are
retained. No new samples, dependencies, services or training data were acquired.
No audio is committed, uploaded or authorized for training by this trial.

## Validation gates

| Gate | Result | Evidence |
|---|---|---|
| Frozen baseline and production preservation | PASS | Source/plan/renderer hashes; isolated copied build |
| Five sources, five actual master conditions plus stems | PASS | 25 full-mix conditions, 20 new renders and 20 replays; all native exports validated |
| Instrument-only isolation | PASS | A/B and C/D score and event files byte-identical; non-drum stems unchanged |
| Expression control retained | PASS | All five C master WAVs byte-identical to the earlier rejected C packet |
| Timing | PASS | 8,216 instrument event rows independently agree with integer frame conversion; zero frame errors |
| Deterministic replay | PASS | All 20 new master WAVs, scores and event files identical at block sizes 512 and 113 |
| Loudness comparison | PASS | All 25 listening mixes within 0.04 LU of −23 LUFS; maximum true peak −5.08 dBTP; fixed gain only |
| Decoded masters and stems | PASS | 112 new files independently decoded; zero full-scale PCM samples; 46 stem-isolation comparisons pass |
| Isolated instrument mechanism | PASS | Only short-gate drums change among 14 probes; late energy fraction rises from 0 to 0.118392 |
| Python invariants | PASS | 10 tests, including composition copy/consent metadata, intact calls, response space and invalid context |
| Isolated native regression | PASS | core, remix_core and live_instruments: 3/3 |
| Browser review | PARTIAL | Chromium/WebKit form/decode, mobile width and local downloads pass; WebKit headless clock limitation retained |
| Mac execution | PASS | Actual local M5 build, native renders and tests |
| Fresh Linux/iPhone/WebAssembly execution | NOT RUN | No cross-target claim from Mac execution |
| Composition and expression quality | PARTIAL | Candidates implemented/rendered; musical coherence and enjoyment not established |
| Instrument realism recovery | PARTIAL | A narrow drum-decay experiment; broader articulation/layer limitations remain |
| Prior owner acceptance | FAIL | “still bad” / “All of them”; preserved separately |
| New owner comparison and independent study | NOT RUN | No inferred scores, preferences or improvement |

Exact measurements, hashes, build/render/test logs and browser evidence:
[`docs/evidence/q0-recovery/`](evidence/q0-recovery/).
Native render reports retain their historical M0 labels; the Q0 trial report
and manifest identify the actual experiment and execution.

The short open-hat probe's first 100 ms is unchanged at −28.712 dBFS RMS.
Its 320–600 ms window changes from silence to −37.985 dBFS RMS.
This establishes restored decay, not an audible quality preference.
Long-gate drums and all non-drum probes are byte-identical controls.
Raw waveform differences are descriptive and are not a musicality metric.

| Input | A/B max / RMS PCM16 difference | C/D max / RMS | D/E max / RMS |
|---|---|---|---|
| owner-speech | 1167 / 45.417 | 1109 / 44.934 | 7917 / 560.417 |
| ls-2277-149896-0026 | 2056 / 77.508 | 2146 / 75.311 | 14456 / 588.962 |
| ls-2035-147960-0013 | 1289 / 70.581 | 1288 / 70.126 | 10056 / 543.208 |
| ls-2086-149220-0047 | 1167 / 46.326 | 1110 / 45.799 | 9736 / 505.667 |
| commons-laughter | 1289 / 70.581 | 1288 / 70.126 | 9697 / 529.036 |

## Reproduce locally

Use fresh directory names; scripts refuse to replace experiment output.
Run from the repository root with the already isolated `.venv-q0`.

```sh
.venv-q0/bin/python scripts/q0_decay_build.py --output build-q0-decay-20261020
ctest --test-dir build-q0-decay-20261020/build --output-on-failure -R '^(core|remix_core|live_instruments)$'
.venv-q0/bin/python tests/integration/verify_q0.py
.venv-q0/bin/python scripts/q0_expression_trial.py \
  --baseline renders/q0-baseline-v2-20261020 \
  --output renders/q0-five-arm-20261020 \
  --instrument-renderer build-q0-decay-20261020/build/jamloom_remix
c++ -std=c++17 -O2 -I core/include experiments/q0/instrument_probe.cpp \
  build-q0-decay-20261020/build/libjamloom_core.a \
  -o build-q0-decay-20261020/instrument-probe
build-q0-decay-20261020/instrument-probe renders/q0-decay-probes-20261020
.venv-q0/bin/python scripts/q0_recovery_evidence.py \
  --baseline renders/q0-baseline-v2-20261020 \
  --trial renders/q0-five-arm-20261020 \
  --probes renders/q0-decay-probes-20261020 \
  --output docs/evidence/q0-recovery
.venv-q0/bin/python -m http.server 4200 --bind 127.0.0.1 \
  --directory renders/q0-five-arm-20261020/listener
```

In another terminal, using the project's Node 22:

```sh
Q0_REVIEW_URL=http://127.0.0.1:4200/ Q0_CANDIDATES=5 node tests/q0_review_browser.mjs
```

Hardware/toolchain: Apple M5, 16 GiB, macOS 26.7.1 (25G241),
Apple Clang 21.0.0, CMake 4.4.2, FFmpeg 9.0.2, isolated Python 3.14.6,
Node 22.23.1; browser versions are recorded in `browser.json`.

## Remaining limits and next decision

Do not promote this patch into the production engine without a positive
controlled listening result. Drum choking and richer recorded articulations
remain absent; the other instrument timbres are unchanged. E simplifies
composition but does not infer lyrical meaning or corrected word boundaries.
The existing strong clean-voice ducking remains fixed for experimental control.
Fullscale PCM checks cannot prove an absence of all audible artifacts.

The immediate next step remains the Q0 listening decision: measure whether any
condition improves realism, groove, coherence and enjoyment. Rejection should
narrow the next controlled hypothesis, not trigger random parameter changes.
Professional quality, successful Q0 acceptance, training and later milestones
are not claimed or authorized by these technical results.
