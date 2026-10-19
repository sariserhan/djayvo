#!/bin/bash
# Execute only on the one approved, temporary GPU instance after pinned setup.
set -euo pipefail
cd /workspace
python - <<'PY'
import hashlib
from pathlib import Path
import tarfile
archive = Path('blood-training-input.tar.gz')
assert hashlib.sha256(archive.read_bytes()).hexdigest() == 'cab2f143b307dbccf0095c48f3e909f176d42c5dbcb087ead8b638afea0199d9'
expected = {f'blood-{n:02d}.wav' for n in range(1, 17)} | {'dataset.json', 'manifest.json'}
with tarfile.open(archive) as tar:
    members = tar.getmembers()
    assert len(members) == 18 and {m.name for m in members} == expected
    assert all(m.isfile() and m.size < 6000000 for m in members)
    Path('blood-input').mkdir()
    tar.extractall('blood-input', filter='data')
PY
cd /workspace/ace-step
export PYTHONPATH=/workspace/ace-step OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=4 HF_HUB_OFFLINE=1
mkdir blood-results
cp /workspace/results/* blood-results/
.venv/bin/python - <<'PY'
import hashlib, json, platform
from pathlib import Path
import torch
paths = [Path('/workspace/ace-step.tar.gz'), Path('uv.lock'), Path('acestep/training_v2/trainer_fixed.py')]
paths += [p for p in Path('checkpoints').rglob('*') if p.is_file() and '.cache' not in p.parts]
hashes = {}
for p in paths:
    with p.open('rb') as stream:
        hashes[str(p)] = hashlib.file_digest(stream, 'sha256').hexdigest()
Path('blood-results/provenance.json').write_text(json.dumps({
    'python': platform.python_version(), 'platform': platform.platform(),
    'torch': torch.__version__, 'cuda': torch.version.cuda, 'gpu': torch.cuda.get_device_name(),
    'code_revision': 'ca1e85fe9430179831e6bc6be790c332190a3866',
    'weight_revision': '19671f406d603126926c1b7e2adc169acbcade22', 'sha256': hashes}, indent=2) + '\n')
PY
timeout 900 .venv/bin/python -u /workspace/cloud_blood_trial.py preprocess > blood-results/preprocess.log 2>&1
timeout 1200 .venv/bin/python -u /workspace/train-measured.py --plain --yes fixed \
  --checkpoint-dir ./checkpoints --model-variant turbo \
  --dataset-dir /workspace/ace-step/blood-tensors --output-dir /workspace/ace-step/blood-results/adapter \
  --device cuda --precision bf16 --batch-size 1 --gradient-accumulation 1 \
  --rank 16 --alpha 32 --dropout .1 --lr .00005 \
  --scheduler-type constant_with_warmup --warmup-steps 10 \
  --epochs 10 --save-every 5 --num-workers 0 --seed 51019 --log-every 1 > blood-results/train.log 2>&1
timeout 60 .venv/bin/python -u /workspace/cloud_blood_trial.py verify > blood-results/verify.log 2>&1
for phase in base step80 step160; do
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
