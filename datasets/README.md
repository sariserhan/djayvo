# R0 evaluation records

`manifest.schema.json` describes a deliberately narrow, fail-closed synthetic
pilot. `examples/r0-manifest.json` contains five original/non-person records.
Raw signals stay in ignored `renders/`; the preserved speech fixture must already
exist and must not be regenerated. See the [architecture](../docs/improvisation_architecture.md)
for rights scope, deletion, leakage checks and future human-source requirements.

From the repository root, choose fresh output directories:

```sh
.venv-analysis/bin/python scripts/r0.py fixtures --output renders/r0-final-fixtures
.venv-analysis/bin/python scripts/r0.py dataset renders/r0-final-fixtures/manifest.json
.venv-analysis/bin/python scripts/r0.py evaluate \
  --manifest renders/r0-final-fixtures/manifest.json \
  --renderer build-jamloom/jamloom_remix --output renders/r0-final-evaluation
.venv-analysis/bin/python tests/integration/verify_r0.py
```

The adapter refuses to overwrite output directories. If rerunning, choose fresh
paths and pass them to `verify_r0.py --manifest ... --examples ... --renderer ...`.
The example plans pin the exact renderer binary and policy; a rebuild or policy
change requires new examples, not silently changing old provenance. The taxonomy's
retained audio links use the first run's paths. All five records are evaluation
only; `--use training` and `--use distribution` fail even if metadata is edited.
Recorded or downloaded sources are intentionally unsupported by R0 ingestion.

## R1 demonstration records

The additive `demonstration-ledger.schema.json` supports reviewed first-party
declarations and the pinned synthetic test. `examples/r1-ledger.json` contains
only that nonperson, evaluation-only test. R0's ingestion policy is unchanged.
See the [R1 guide](../docs/r1-demonstrations.md) for edit capture, current-consent
revalidation, state/action/next-state JSONL, split guards and remaining human
review requirements. All current exports deny training authorization.


Current R1 mixed-split ingestion/export also checks suspected near-duplicate
waveforms using the existing local comparator; see [scope and limits](../docs/r1-capture-completion.md).
Use the isolated `datasets/requirements-r1.txt` environment and FFmpeg. There is
no training admission path. New policy hashes intentionally invalidate old traces
for current-policy export; preserve historical artifacts and capture fresh traces.
