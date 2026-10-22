#!/bin/bash
set -euo pipefail
cd /workspace
python - <<'PY'
import hashlib, tarfile
from pathlib import Path
p = Path('musician-review-candidates.tar.gz')
assert hashlib.sha256(p.read_bytes()).hexdigest() == '5e8f48a2491bc489e29a04ba881ac6ff9dc0e2db24d8798aa2c2a59c8801865c'
expected = {f'{name}-{i:02}.wav' for name,count in [('f',3),('down',4),('question',4),('pipe',2)] for i in range(1,count+1)} | {'manifest.json'}
with tarfile.open(p) as tar:
    members = tar.getmembers()
    assert len(members) == 14 and {m.name for m in members} == expected
    assert all(m.isfile() and m.size < 6000000 for m in members)
    Path('musician-input').mkdir()
    tar.extractall('musician-input', filter='data')
PY
cd /workspace/ace-step
mkdir musician-results
cp /workspace/results/* musician-results/
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
Path('musician-results/provenance.json').write_text(json.dumps({
    'python': platform.python_version(), 'platform': platform.platform(),
    'torch': torch.__version__, 'cuda': torch.version.cuda, 'gpu': torch.cuda.get_device_name(),
    'code_revision': 'ca1e85fe9430179831e6bc6be790c332190a3866',
    'weight_revision': '19671f406d603126926c1b7e2adc169acbcade22', 'sha256': hashes}, indent=2) + '\n')
PY
export PYTHONPATH=/workspace/ace-step OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=4 HF_HUB_OFFLINE=1
timeout 1200 .venv/bin/python -u /workspace/cloud_musician_trial.py label > musician-results/label.log 2>&1
