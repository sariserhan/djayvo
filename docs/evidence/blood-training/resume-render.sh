#!/bin/bash
set -euo pipefail
cd /workspace/ace-step
export PYTHONPATH=/workspace/ace-step OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=4 HF_HUB_OFFLINE=1
mv blood-results/step80.log blood-results/step80-initial-failure.log
for phase in step80 step160; do
  timeout 900 .venv/bin/python -u /workspace/cloud_blood_trial.py "$phase" > "blood-results/$phase.log" 2>&1
done
.venv/bin/python - <<'PY'
import hashlib, json
from pathlib import Path
root = Path('blood-results')
reports = [json.loads((root / (mode + '.json')).read_text()) for mode in ('base', 'step80', 'step160')]
cases = [case for report in reports for case in report['cases']]
assert len(cases) == 12 and len(list(root.glob('*.wav'))) == 13
assert reports[0]['repeat_control']['pcm_exact']
(root / 'comparison.json').write_text(json.dumps({'cases': cases, 'repeat_control': reports[0]['repeat_control'], 'human_listening': 'NOT RUN'}, indent=2) + '\n')
files = [p for p in root.rglob('*') if p.is_file() and 'raw' not in p.parts]
manifest = {str(p.relative_to(root)): hashlib.file_digest(p.open('rb'), 'sha256').hexdigest() for p in files}
(root / 'artifact-sha256.json').write_text(json.dumps(manifest, indent=2) + '\n')
PY
tar --exclude=blood-results/raw -czf /workspace/blood-results.tar.gz blood-results
sha256sum /workspace/blood-results.tar.gz
printf 'BLOOD_TRIAL_COMPLETE\n'
