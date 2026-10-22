#!/bin/bash
set -euo pipefail
cd /workspace/ace-step
export PYTHONPATH=/workspace/ace-step OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=4 HF_HUB_OFFLINE=1
timeout 900 .venv/bin/python -u /workspace/cloud_musician_trial.py preprocess > musician-results/preprocess.log 2>&1
timeout 1200 .venv/bin/python -u /workspace/cloud_musician_trial.py train > musician-results/train.log 2>&1
timeout 120 .venv/bin/python -u /workspace/cloud_musician_trial.py verify > musician-results/verify.log 2>&1
for phase in base epoch5 epoch10; do
  timeout 900 .venv/bin/python -u /workspace/cloud_musician_trial.py "$phase" > "musician-results/$phase.log" 2>&1
done
.venv/bin/python - <<'PY'
import hashlib, json
from pathlib import Path
root = Path('musician-results')
reports = [json.loads((root / (mode + '.json')).read_text()) for mode in ('base', 'epoch5', 'epoch10')]
cases = [case for report in reports for case in report['cases']]
assert len(cases) == 12 and len(list(root.glob('*.wav'))) == 13
assert reports[0]['repeat_control']['pcm_exact']
(root / 'comparison.json').write_text(json.dumps({'cases': cases, 'repeat_control': reports[0]['repeat_control'], 'human_listening': 'NOT RUN'}, indent=2) + '\n')
files = [p for p in root.rglob('*') if p.is_file() and 'raw' not in p.parts]
manifest = {}
for p in files:
    with p.open('rb') as stream:
        manifest[str(p.relative_to(root))] = hashlib.file_digest(stream, 'sha256').hexdigest()
(root / 'artifact-sha256.json').write_text(json.dumps(manifest, indent=2) + '\n')
PY
tar --exclude=musician-results/raw -czf /workspace/musician-results.tar.gz musician-results
sha256sum /workspace/musician-results.tar.gz
printf 'MUSICIAN_TRIAL_COMPLETE\n'
