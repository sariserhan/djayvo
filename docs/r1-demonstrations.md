# R1 — offline demonstration capture, 2026-10-20

Subsequent continuation: [private live instrument takes](r1-instrument-capture.md)
now provide browser keyboard/drum capture. This report retains the original
offline increment's scope and evidence.

**Overall R1: PARTIAL.** Jamloom can now capture and replay a sequence of musical
edits and export input/state → action → next-state examples. This is data tooling,
not a newly trained or musically improved model. There are **zero reviewed expert
demonstrations and zero new listening evaluations**.

The owner's “continue on the model development now” follows the completed R0
review stop. This increment advances local R1 tooling under that continuation;
it does not authorize R2/R3 experiments, third-party ingestion, paid compute or
production training. Both supplied specifications and the existing C++ engine
remain unchanged. No existing recording or web/iPhone functionality was changed.

## Gates

| Gate | Status | Evidence and boundary |
| --- | --- | --- |
| Offline edit capture | PASS | Six typed operations: choose a candidate/genre, edit MIDI note, edit instrument track/automation, edit source slice, edit vocal event, edit mix. Each accepted edit passes schema checks and a real native render before its trace is published. |
| Provenance and use checks | PASS | Frozen source, ledger, renderer, validation bundle and instrument manifests; explicit processing/evaluation permissions, per-speaker declarations, training opt-in, expiry, withdrawal and local rights-evidence hashes. These verify declarations and integrity, not legal ownership. |
| Actual playable performance | PASS | One retained 32-second 48 kHz PCM16 stereo WAV; −7.899 dBFS sample peak, zero full-scale samples; native report records zero nonfinite samples. |
| Deterministic replay/timing | PASS | Blocks 512/113: identical WAV and instrument-event TSV; maximum/RMS PCM error zero. All 304 instrument on/off events agree with independent rational frame calculation. |
| Dataset export/revalidation | PASS | Six evaluation-only state/action/next-state rows from one automated session. Rechecking re-renders the final plan and reads current consent; a withdrawal invalidates an earlier export. No training export path. |
| Split leakage guards | PASS | Reject source hash, source/session/phrase/speaker/performer groups and identical arrangement content crossing splits, including across separate ledgers. Reject duplicate revisions of one session. |
| New regression suite | PASS | 14 unittest methods, including all six real native edit renders, malformed input, invalid native timing, rights, stale evidence, withdrawal, corruption, JSONL types/duplicate keys and exclusive private writes. [Log](evidence/r1/tests.log). |
| R0 regression | PASS | Existing 11-test suite passes; R0 policy, source fixture and native binary remain pinned and unchanged. [Log](evidence/r1/r0-regression.log). |
| Actual M5 execution | PASS | macOS 26.7.1 arm64, Apple M5, project Python 3.15.0, existing native renderer. No new compiler/toolchain build or dependency installation. |
| First-party expert corpus and stratification | PARTIAL | Contract and rejection checks implemented; only a synthetic test session exists. No diverse train/dev/test corpus or verified human expert examples. |
| Live microphone/MIDI demonstration UI | NOT RUN | The interface is an offline CLI plan editor. It records explicit MIDI-note edits, not physical keyboard presses or audio-callback acknowledgements. Existing browser performance controls are unchanged. |
| Current Linux/WASM/iPhone parity | NOT RUN | No new execution on these targets; shared C++ unchanged. R0's historical-reference smoke FAIL remains open, not superseded by this replay check. |
| Human musicality/recognizability/originality | NOT RUN | n=0; changed PCM is not evidence of improvement. |
| Training/reference ingestion/paid infrastructure | NOT RUN | No weights trained/downloaded, third-party files ingested, API calls, cloud rental or spend. |

## What changed

- [Capture tool](../scripts/demonstrations.py): `start`, `edit`, `audit`, `render`,
  `export`, `check-export`. Uses the existing strict native score importer,
  `r0.patches`, WAV inspector and completion-manifest verifier.
- [Action schema](../schemas/demonstration-action.schema.json) and
  [trace schema](../schemas/demonstration-trace.schema.json): versioned edit
  contract referencing the existing native score schema. No alternate DSP or
  duplicate MIDI scheduler. Note lengths and musical placements remain native
  integer ticks; source boundaries remain processed PCM frames.
- [Rights ledger](../datasets/demonstration-ledger.schema.json) and
  [synthetic example](../datasets/examples/r1-ledger.json): additive first-party
  workflow. R0's deliberately synthetic-only schema/validator is unchanged.
- [Smoke generator](../scripts/r1_smoke.py) and
  [tests](../tests/integration/verify_demonstrations.py).

`candidate` replaces the musical arrangement while preserving the source and
original analyzer observations. `note`, `track`, `slice`, and `vocal` use a
zero-based index: replace an existing item, append at the collection's length,
or remove with `value: null`. `track` includes the engine's gain/pan automation
and instrument choice. `mix` replaces the existing native mix object. A short
reason accompanies every action. Unsupported operations and no-op edits fail.

The native engine checks playable ranges, source identity, key compatibility,
slice bounds, duration, event budgets and scheduling. An invalid edit leaves
the previous trace usable and creates no new accepted revision. Rejected render
scratch files are automatically deleted; no silent fallback can masquerade as
the musician's selected action.

Each immutable revision contains the initial plan and a hash-linked list of
accepted decisions, UTC acceptance timestamps, final-plan hashes and audio/event
receipts. Acceptance timestamps include offline validation time: they are **not
live note-on measurements**. New files use exclusive atomic publication and
owner-only permissions; native exports inherit a private umask. Existing files
are never overwritten. Hash links detect accidental alteration, not malicious
rewriting by someone who controls every local file; they are not signatures.

Limits: 4 MiB trace/JSON inputs, 128 edits/session, 10,000 native note/vocal events,
32 MiB source file, 2–5-second PCM16 input, 120-second native-render deadline,
128 sessions and 64 MiB per exported batch. Intermediate WAVs are temporary.
Only one new final WAV is retained (about 5.86 MiB); the original fixture was not
regenerated, and previously retired versions were not restored.

## Playable output and exact evidence

- [Final WAV](../renders/r1-final-demonstration/performance.reggae.wav)
- [Original R0 reggae comparison](../renders/r0-final-evaluation/rules.reggae.wav)
- [Six-action trace](evidence/r1/trace.json)
- [Final native plan](evidence/r1/final.score.json)
- [Audio, timing, hashes and environment](evidence/r1/evidence.json)

The demonstration selects reggae from the hip-hop starting plan, softens an
organ note, adds gain/pan automation, adjusts a chop boundary, pans a vocal chop,
and reduces instrument room. These are scripted test edits, not musician
judgments. Versus the existing R0 reggae, the maximum PCM16 difference is 3,378
and RMS difference 313.331 sample units. Musical benefit is **NOT RUN**.

The 304-event independent check covers instrument note on/off positions. The
legacy TSV does not expose all vocal/automation events independently; complete
WAV equality covers their deterministic rendered result. Sample peak/RMS are
not oversampled true-peak or integrated LUFS certification.

## Reproduce and author an edit

From the repository root, using the existing project environment:

```sh
.venv-analysis/bin/python tests/integration/verify_demonstrations.py -v
.venv-analysis/bin/python tests/integration/verify_r0.py

# Choose a fresh directory on reruns. Only one final WAV is retained.
.venv-analysis/bin/python scripts/r1_smoke.py --output renders/r1-another-demo

.venv-analysis/bin/python scripts/demonstrations.py audit \
  renders/r1-final-demonstration/trace-6.json
.venv-analysis/bin/python scripts/demonstrations.py check-export \
  renders/r1-final-demonstration/examples.jsonl
```

Start a new test session with the approved fixture and an existing native score:

```sh
.venv-analysis/bin/python scripts/demonstrations.py start \
  --plan renders/r0-final-evaluation/rules.hiphop.score.json \
  --ledger datasets/examples/r1-ledger.json --record r1_synthetic_test \
  --renderer build-jamloom/jamloom_remix --actor automated_test \
  --output renders/my-demo-0.json
```

Save an action to `renders/my-action.json`, for example:

```json
{
  "kind": "note", "track": 0, "index": 0,
  "reason": "Soften the opening piano answer",
  "value": {"start_tick": 0, "duration_ticks": 2880, "note": 54, "velocity": 45}
}
```

```sh
.venv-analysis/bin/python scripts/demonstrations.py edit \
  --trace renders/my-demo-0.json --action renders/my-action.json \
  --output renders/my-demo-1.json
.venv-analysis/bin/python scripts/demonstrations.py render \
  renders/my-demo-1.json --output renders/my-demo-playback
.venv-analysis/bin/python scripts/demonstrations.py export \
  renders/my-demo-1.json --output renders/my-demo-examples.jsonl
```

Changed renderer, schemas, policy helpers, evidence or source hashes require
explicit migration/review or a fresh capture; do not patch frozen receipts to
make old traces pass. The example requires the retained synthetic handoff input
and existing native build, not a newly downloaded recording or model.

## Human data, rights and withdrawal

For future first-party sessions, create a **private** schema-valid ledger under
ignored `renders/`, with the source WAV hash, rights owner, reviewed permission
document hash, pseudonymous reviewer/performer/session/phrase groups, expiry,
downstream restrictions and consent for **every** identifiable speaker. Each
speaker must permit local processing and evaluation. Training permission is a
separate opt-in and must also be present for every speaker; it never follows
from microphone consent or selecting `--actor human`.

Only `first_party_recording` and the pinned preserved synthetic fixture are
accepted. Downloaded reference recordings are not admitted. A human must verify
the evidence's scope, ownership, restrictions and speaker coverage; software
cannot prove these from a checked box or file hash. No such human rights review
or expert session has been collected in this increment. The test suite's
fabricated first-party declarations exercise rejection boundaries only and are
deleted with test scratch directories; they are not dataset assets.

The synthetic fixture is permanently `test`, nonperson, automated and nontraining.
Dataset JSONL carries `purpose: evaluation_only`, `training_authorized: false`,
`human_review: NOT RUN`, actor provenance, source/trace/ledger hashes, assigned
split and language/environment/content strata, native pre-action state, typed
action, native next state and rendered outcome. There is no model-facing training
loader that bypasses these gates. Intermediate synthetic targets are useful for
format and replay testing only; they cannot establish expert supervision.

Run `check-export` before every reuse. It checks frozen trace hashes, current
ledgers, expiry/withdrawal, all rights evidence, cross-session leakage and final
native replay, then compares every row to a newly derived canonical export.
Marking a record withdrawn immediately makes revalidation fail. A frozen ledger
change also invalidates its old traces conservatively. This does not remotely
erase prior copies: remove the source and descendants, discard/rebuild affected
datasets and, if future training has occurred, follow the trained-artifact removal
policy. No trained artifact exists from this increment.

Declared groups and exact arrangement hashes catch exact leakage; near-duplicate
audio detection, independent rights review and statistically balanced split
sampling remain unfinished. Strata currently describe one English synthetic test,
not held-out generalization. Private human traces/evidence should never be copied
into committed docs; this report contains only the nonperson automated example.

## Next work and stop boundary

Complete R1 with an ergonomic in-studio live action capture path, genuinely
permissioned musician demonstrations, corrected/reviewed targets and diverse,
disjoint data splits. The offline CLI does not complete that live interface or
corpus. Then request authorization for R2 blinded baseline/model comparison;
R3 supervised planner training remains gated on cleared data and quality evidence.
No neural training or professional-quality claim is justified by this increment.

Local implementation/evidence commit: the commit containing this report
(`git log -1 --format=%H -- docs/r1-demonstrations.md`). No push or deployment.
