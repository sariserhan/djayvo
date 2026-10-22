#!/bin/bash
# Pinned public-model downloads only; no recordings leave this Mac.
set -euo pipefail
cd "$(dirname "$0")/.."
test -f build-style-training/upstream/uv.lock || {
  echo 'Restore the pinned ACE-Step checkout described in docs/singing-response.md first.' >&2
  exit 1
}
UV_PROJECT_ENVIRONMENT="$PWD/.venv-singer" uv sync --frozen --no-dev --python 3.12 --project build-style-training/upstream
HF_HUB_DISABLE_TELEMETRY=1 .venv-singer/bin/python - <<'PY'
from huggingface_hub import snapshot_download
import json
from pathlib import Path
snapshot_download('ACE-Step/Ace-Step1.5', revision='19671f406d603126926c1b7e2adc169acbcade22',
    local_dir='build-style-training/upstream/checkpoints', max_workers=3,
    allow_patterns=['README.md', 'config.json', 'Qwen3-Embedding-0.6B/*',
                    'acestep-v15-turbo/*', 'vae/*', 'acestep-5Hz-lm-1.7B/*'])
planner = json.loads(Path('assets/manifests/lyric-planner.json').read_text())
snapshot_download(planner['repo'], revision=planner['revision'], local_dir='build-style-training/lyric-planner',
                  allow_patterns=list(planner['files_sha256']), max_workers=3)
import sys
sys.path.insert(0, 'scripts')
from singing_response import runtime, digest
runtime('build-style-training/upstream')
assert all(digest(Path('build-style-training/lyric-planner') / p) == h for p, h in planner['files_sha256'].items())
print('PASS: pinned runtime and model checksums verified')
PY
