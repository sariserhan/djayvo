# Q0 — composition recovery after owner rejection

2026-10-20. **Overall Q0: PARTIAL. Previous full-packet creativity/quality:
FAIL. New composition acceptance: NOT RUN.**

**Follow-up correction:** The six-note count below originally checked intended
traces, not final performed notes. One reggae note was removed by the rest pass.
[Final-score audit and correction](q0-motif-completion.md) fixes that conflict
and verifies actual performed events. The existing 4211 audio remains frozen.

The owner reviewed the unchanged 4207/4209 audio and said:
“they are all still bad, the worst is candidate 1, intsruments are okay on the
other ones but the creativity is bad for all the songs not only quality”.
[Exact feedback and packet identity](evidence/q0-development/owner-feedback.json).
This is one qualitative listener, not numeric scores or an independent panel.
The question concerned the owner-speech section; broader source coverage is
not inferred from that answer.

This changes the next intervention: hold instruments fixed and test musical
development. The prior implementation reduced source rhythm to at most four
onsets and mapped those onto an existing chord-tone pattern while retaining
much of the backing. That is a concrete compositional limitation, consistent
with the owner's criticism. It is not a proven explanation of every audible
defect, nor evidence that an automated agent heard the recordings.

## What changed

`scripts/q0_development.py` generates a copied, native-valid performance plan:

- Six energy-selected source attacks form a motif at the existing tempo.
  The established `q0_authored_score.motif` helper now accepts a tempo;
  its historical 112 BPM default remains unchanged.
- Short-window normalized autocorrelation estimates speech pitch near those
  attacks. A bounded minor-pentatonic contour follows sufficiently confident
  relative pitch estimates. Four speech sources pass the three-voiced-point
  criterion; laughter falls back to a declared rhythmic motif with an authored
  contour. These are uncertain DSP estimates, not musical transcription.
- A short instrumental foreshadow precedes one complete, unpitched source call.
  The answer begins on a bar after the actual call duration, rather than an
  unnecessarily long fixed vocal section.
- Existing, hash-matched offline word-time estimates supply a padded
  adjacent-word hook only when confidence and duration bounds pass. The four
  speech clips have eligible hooks; laughter has none. No new inference,
  transcript storage, speech model download or training took place.
- A recurring six-note statement returns with its recognizable rhythm/pitches.
  Related minor-key harmonies reframe it. A later answer compresses its rhythm
  and moves it up an octave; longer forms also get a bounded answer variation.
  Voice hooks get reserved space before that developed answer.
- Bass/kick relationships, ghost-note accents and shared timing reuse the V2
  expression layer. Intentional rests suppress conflicting transition pickups.
  A tonic cadence provides resolution. No new random timing noise was added.

The first development render revealed that voice hooks suppressed all but
one to three developed notes in the speech cases. This was an event-data
finding, not a listening judgment. The corrected v2 schedules the melody after
the hook and omits the second short hook where the remaining form is too
short. All five intended traces retain six notes; the later final-score audit
found that the reggae rest pass still removed one, as corrected above.
The first render/log remains preserved; it is not the listening candidate.

`scripts/q0_development_trial.py` renders five pairs, with stems and exact
block-size replays. The control is the frozen E condition of the rejected full
packet; the candidate changes composition. Both use the **same existing
renderer, instrument patches, track gains/pans, tempo, duration and mix
settings**. Each pair is level-matched using the unchanged 0.15 LU tolerance
and −1.9 dBTP ceiling. No production engine or dashboard changed.

The existing Linux and WASM harnesses now also accept this trial's candidate
plan filenames while checking the same native build identity. The listening
summary calls its generic coverage field `complete_all_condition_codes`, so a
two-condition comparison cannot be mislabeled as five completed conditions.
There were no code consumers of the old field; frozen reports remain intact.

## Playable outputs and controls

Open [the new private blind comparison](http://127.0.0.1:4211/).
This contains genuinely new compositions, unlike the previous form-only update.
Five original recordings and ten matched mixes are available.
The organizer mapping stays outside the served folder.

- Original/control audio and stems:
  `renders/q0-performance-20261020/<source>/E.<style>.*`
- Candidate masters, individual stems, plans, traces and event TSVs:
  `renders/q0-development-v2-20261020/<source>/candidate.<style>.*`
- Private review:
  `renders/q0-development-v2-20261020/listener/`
- Actual WASM renders: `renders/q0-development-wasm-20261020/`
- Actual Linux renders: `renders/arrangement-linux/q0-development-20261020/`

This comparison isolates composition as a category, not each individual
composition rule. It does not replace or relabel the original five-condition
experiment. No new word boundary, voice recognition or quality result is
considered verified simply because the render completes.

## Results

| Gate | Status | Evidence |
|---|---|---|
| Incorporate real owner rejection | PASS | Exact feedback bound to prior packet; creativity identified as the next priority |
| Five source/plan controls preserved | PASS | Source permission/hash checks; original E WAV/score/events match frozen inventory |
| Actual candidate renders and stems | PASS | Five new masters; 28 masters/stems independently decoded |
| Plan validation and timing | PASS | 3,034 control/candidate instrument on/off rows; zero frame errors |
| Determinism | PASS | Five byte-identical WAV/score/event replays at blocks 512 and 113 |
| Headroom | PASS | No full-scale PCM, nonfinite samples or native limiter interventions |
| Loudness matching | PASS | Ten mixes −23.05 to −23.00 LUFS; highest true peak −5.03 dBTP |
| Rule/source-response regressions | PASS | 17 tests, including reproducibility, preserved palette/settings, varied source rhythms, repeated motif, full developed answer, planned rests and invalid word metadata |
| Actual Linux ARM64 execution | PASS | Fresh GCC build; three native test groups; five WAVs byte-identical to Mac, 1,602 exact event rows |
| Actual Node/WASM execution | PASS | Five byte-identical WAVs; 1,602 exact event rows; maximum/RMS PCM errors zero |
| Browser controls | PASS | Chromium/WebKit responsive forms, decode, automatic pause, local downloads and missing-rating checks |
| Physical browser playback | PARTIAL | Muted Chromium clock advances; known headless WebKit clock limitation remains; acoustic playback not measured |
| Latest received musical acceptance | FAIL | Owner rejected all prior full-packet compositions, Candidate 1 worst |
| New composition listening result | NOT RUN | Question is pending; synthetic browser data was deleted and is not a judgment |
| Independent panel | NOT RUN | No recruitment, messaging or inferred independence |
| Physical Intel/iPhone/AudioWorklet run | NOT RUN | Local ARM64 VM and Node/WASM do not establish these targets |
| Q0 substantial musical recovery | PARTIAL | Actual improvement is still unestablished; do not promote or proceed to training |

Raw control/candidate waveform changes, PCM16 units:

| Source | Maximum difference | RMS difference |
|---|---:|---:|
| Owner speech | 14,789 | 1,637.157 |
| ls-2277-149896-0026 | 14,500 | 1,594.206 |
| ls-2035-147960-0013 | 12,662 | 1,728.508 |
| ls-2086-149220-0047 | 14,142 | 1,569.496 |
| Commons laughter | 13,586 | 1,708.038 |

These confirm changed audio, not improvement. Exported timing measures event
scheduling, not perceived acoustic attacks. The native/WASM/Linux tolerance
remains maximum 0.001 / RMS 0.0001 normalized PCM; exact equality is this run's
result, not a universal guarantee.

Exact outputs: [render](evidence/q0-development/render-v2.log),
[17 tests](evidence/q0-development/tests.log),
[independent inspection](evidence/q0-development/verification.log),
[measurements and inventory](evidence/q0-development/measurements.json),
[Linux](evidence/q0-development/linux-report.json),
[WASM](evidence/q0-development/wasm-report.json),
[browser](evidence/q0-development/browser/report.json).

Mac: Apple M5, existing Clang 21/native renderer, Node 22.23.1.
WASM: Emscripten 6.0.1. Linux: existing local Debian 12 ARM64 VM, GCC 12.2.0,
CMake 3.25.1. Chromium 149.0.7827.55; WebKit 26.5. Full environment/build
commands are retained in the linked reports. The container/VM were stopped
again, and Docker's active context remains `desktop-linux`.
The staged whitespace check flags one trailing space in captured CMake stdout
(`linux-execution.log:38`); that raw evidence is retained unchanged.

## Rights, constraints and remaining weaknesses

The same private, consented owner recording and licensed LibriSpeech/CC0
laughter sources were used. Sample libraries, source permissions and immutable
spec/core hashes pass the existing audit. Original audio is retained. No
private audio, new sample bank or model weights are committed to Git.

Before the owner's clarification, preliminary research downloaded 130 pinned
instrument samples (101,338,744 bytes) from
[Virtuosity Drums](https://github.com/sfzinstruments/virtuosity_drums) and
[Fashionbass](https://github.com/sfzinstruments/karoryfer.fashionbass), whose
repositories carry CC0 licenses. The
[publisher's free-library page](https://shop.karoryfer.com/pages/free-samples)
also states CC0 terms. Git blob hashes and SHA-256 identities were checked.
That experiment was stopped **before build or integration** when the owner
identified composition as the priority. The unused cache and research
manifest remain under ignored `renders/q0-palette-research-20261020/`.
None of these samples is used in the comparisons above.

The new planner still has an authored grammar, a limited harmonic vocabulary,
uncertain speech pitch, unverified word boundaries and no semantic hook
understanding. Its fallback contour is authored, not extracted from laughter.
No evidence establishes expert creativity or professional sound. Existing
ducking and instrument-articulation limitations remain unchanged.

The next Q0 decision depends on the new listening result. If it fails, do not
promote it or count more deterministic renders as recovery. Keep the original
five-condition benchmark and rejection history; do not lower the success
criterion or start training.

## Reproduce

Choose fresh directories; source audio and frozen Q0 artifacts must be present.
The Python planner never runs in the audio callback.

```sh
.venv-q0/bin/python tests/integration/verify_q0.py
.venv-q0/bin/python scripts/q0_development_trial.py --output renders/q0-development-NEW
.venv-analysis/bin/python docs/evidence/q0-development/verify.py
.venv-q0/bin/python scripts/q0_wasm_trial.py \
  --trial renders/q0-development-v2-20261020 --output renders/q0-development-wasm-NEW
colima start --profile djayvo --activate=false --ssh-config=false
docker --context colima-djayvo start djayvo-portability
.venv-q0/bin/python scripts/q0_linux_trial.py \
  --trial renders/q0-development-v2-20261020 \
  --output renders/arrangement-linux/q0-development-NEW
docker --context colima-djayvo stop djayvo-portability
colima stop --profile djayvo
```

The verifier checks the retained v2 run. Restart the private page with
`.venv-q0/bin/python -m http.server 4211 --bind 127.0.0.1 --directory renders/q0-development-v2-20261020/listener`.
Then run `Q0_REVIEW_URL=http://127.0.0.1:4211/ Q0_CANDIDATES=2 node tests/q0_review_browser.mjs`.
Use `scripts/q0_listening_results.py --trial renders/q0-development-v2-20261020
--response PATH_TO_REAL_RESPONSE --output FRESH_RESULTS_PATH` for actual
downloaded feedback. A spoken qualitative response is retained separately,
never converted into invented six-dimension scores.

Implementation parent: `208594a`. This report and its sources belong to the
subsequent Q0 composition-development commit; no push or deployment is implied.
