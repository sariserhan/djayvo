# Q0 — keep the performed motif complete

**Final review — 2026-10-20:** [Q0 final report](q0-final-report.md)
supersedes this checkpoint's pending owner-listening status. The latest 4211
owner-speech pair was rejected: “Both still bad.” Musical recovery is **FAIL**;
independent scored evaluation remains **NOT RUN**. Historical technical evidence
below is preserved, not promoted as a quality pass.

2026-10-20. **Technical correction PASS; musical acceptance NOT RUN; overall
Q0 PARTIAL.** The latest received owner rejection remains FAIL. “Continue”
authorizes work and supplies no new listening result.

## Diagnosis and correction

An audit of the final scores found an overstatement in the previous report:
all five *pre-expression traces* contained six developed notes, but only four
final scores did. In `ls-2277-149896-0026`, the final rest pass removed MIDI
note 82 at tick 32760. The deliberate pause begins at tick 32640. The original
166-row event export correctly reflected the five remaining notes; this was
a planner/verification error, not a sample scheduler error.

The new regression fails against the old code with `Dropped motif event`.
`scripts/q0_development.py` now fits the developed rhythm into the actual space
before the pause, reserving its final release. It preserves the existing
six-note contour and relative rhythmic spacing with bounded compression on a
15-tick grid. Only the affected reggae plan changes in this five-source cohort.
This is an explicit compositional constraint, not added random timing.

The trace is now `1.1-q0-source-development`. Each statement also records
`performed_events` from the final score after groove and rest processing.
Missing or ambiguous motif events fail explicitly. The engine performance-plan
schema is unchanged. Tests exercise a six-beat motif across all three existing
groove profiles and all three seeded timing depths, and simulate a later pass
removing melody events to verify rejection. Existing callers use the same API.

No production engine, instrument library, dashboard, specification or pending
listening packet was modified. The private comparison at
[4211](http://127.0.0.1:4211/) still contains exactly the previous audio and order;
the owner's voice arrangement there is unchanged by this fix.

## Actual audio and evidence

Only the affected source was rendered again, with stems and a block-size replay:

`renders/q0-motif-completion-v2-20261020/ls-2277-149896-0026/`

- `candidate.reggae.wav`: corrected master, 32 seconds, 48 kHz stereo.
- `candidate.reggae.{organ,bass,drums,piano,vocals}.wav`: separate stems.
- `candidate.plan.json`, `candidate.reggae.score.json`, `candidate.reggae.events.tsv`.
- `development.json`: intended and final performed motif notes.
- `replay.reggae.*` and `wasm.reggae.*`: actual replay and WASM output.

This WAV is a technical correction, not a new loudness-matched listening pair.
The other four final plans are identical to their frozen scores; their retained
exports were checked rather than regenerated. All previous packet files and
master/core hashes were verified unchanged.

| Gate | Status | Evidence |
|---|---|---|
| Reproduce lost final note | PASS | [Failing regression](evidence/q0-motif-completion/before.log) and old final score |
| Preserve full performed motifs | PASS | Six statement, return and developed notes in all five final scores, mapped after expression/rest processing |
| Regression suite | PASS | 18 tests; [log](evidence/q0-motif-completion/tests.log) |
| Corrected native rendering | PASS | Complete master/stem exports, six decoded WAVs, zero full-scale PCM, nonfinite samples or limiter interventions |
| Exact block replay | PASS | Blocks 512 and 113; byte-identical score/event/WAV output |
| Instrument event scheduling | PASS | Corrected 168 on/off rows, zero frame error |
| Actual WASM execution | PASS | Existing hash-verified Emscripten 6.0.1 binary, Node 22.23.1; identical WAV and event bytes, maximum/RMS PCM error zero |
| Actual Linux ARM64 execution | PASS | One corrected plan, byte-identical WAV and 168 exact event rows; fresh GCC build and three native test groups pass |
| Prior comparison preservation | PASS | Full v2 packet inventory unchanged, including the owner's voice pair |
| Musical improvement | NOT RUN | No new listening judgment; a restored note cannot establish creativity |
| Latest received owner acceptance | FAIL | Previously rejected full packet; no invented numerical ratings |
| Overall Q0 | PARTIAL | Substantial musical recovery still unestablished |

The corrected raw master measures **−25.69 LUFS, −8.94 dBTP**. Its difference
from the prior reggae candidate is maximum **6165 PCM16 units**, RMS
**301.236**. These are descriptive differences, not quality scores.

[Linux execution](evidence/q0-motif-completion/linux-execution.log) used the
existing Debian 12 ARM64 Colima VM, GCC 12.2.0 and CMake 3.25.1. The report
contains **one** comparison, not five. The harness's old hard-coded console
message incorrectly said five; that raw log is retained and the message now
uses the actual result count. This run does not repeat the four unchanged
plans. The local VM/container were stopped after validation. Mac/WASM use the
same frozen Clang/Emscripten renderer builds as the preceding experiment.
The whitespace check flags one trailing space in raw CMake stdout at
`linux-execution.log:38`; source/document whitespace checks pass.

### Additional isolation finding

The first render check expected bass/drum stems to stay identical because their
notes, velocities and gains were unchanged. That check failed; its original
[log](evidence/q0-motif-completion/render.log) and output remain preserved.
Source inspection found that `core/audio/renderer.cpp` derives sample seeds
from global note IDs. Adding the organ note changes the IDs of later tracks;
`core/instruments/voice.cpp` uses those seeds for take selection and a small
gain variation. Thus an unchanged bass/drum score does not ensure unchanged PCM
when another track gains notes. This is relevant to interpreting composition
ablations; it is not established as the cause of the owner's quality rejection.

| Stem | Maximum PCM16 difference | RMS difference |
|---|---:|---:|
| Organ | 6163 | 287.147 |
| Bass | 234 | 10.823 |
| Drums | 4239 | 90.121 |
| Piano | 0 | 0 |
| Vocals | 0 | 0 |

The revised verification keeps exact-score assertions for bass/drums, records
all waveform differences and keeps exact PCM assertions for piano/vocals.
It does **not** claim an organ-only waveform intervention. The existing engine
and its deterministic seed policy remain unchanged; changing that policy would
invalidate historical renderer identity and needs a separate isolated test.

## Reproduce and boundaries

```sh
.venv-q0/bin/python tests/integration/verify_q0.py
.venv-analysis/bin/python docs/evidence/q0-motif-completion/run.py \
  --output renders/q0-motif-completion-NEW
colima start --profile djayvo --activate=false --ssh-config=false
docker --context colima-djayvo start djayvo-portability
.venv-q0/bin/python scripts/q0_linux_trial.py \
  --trial renders/q0-motif-completion-NEW \
  --output renders/arrangement-linux/q0-motif-completion-NEW
docker --context colima-djayvo stop djayvo-portability
colima stop --profile djayvo
```

The runner refuses existing output, revalidates source permissions and frozen
controls, generates all five plans, renders only the changed one and uses the
existing hash-verified WASM CLI. It requires the locally retained source and
prior experiment artifacts. No inference, new package, training or paid compute
is involved. [`report.json`](evidence/q0-motif-completion/report.json) records
plan/event inspection, waveform measurements, tool versions and output hashes.
The original v2 verifier remains pinned to its old source hashes; reproduce it
from commit `408b0a3`, not by overwriting its frozen evidence with current code.

Remaining: actual listening on 4211, independent listener evidence, uncertain
word/pitch estimates, limited authored composition vocabulary and physical
Intel/iPhone/AudioWorklet checks. No new device, browser or acoustic listening
run is claimed for this offline planner correction. Stay within Q0; no quality
promotion or training. Implementation parent: `408b0a3`.
