#!/bin/bash
# Run only inside the temporary research GPU container. No owner audio or credentials.
set -euo pipefail
cd /workspace
test ! -e ace-step
export DEBIAN_FRONTEND=noninteractive
timeout 300 apt-get update
timeout 300 apt-get install -y python3-venv ffmpeg
python -m venv /workspace/bootstrap
/workspace/bootstrap/bin/pip install --no-cache-dir uv==0.13.1
export PATH="/workspace/bootstrap/bin:$PATH"
curl --fail --location --max-time 180 https://github.com/ace-step/ACE-Step-1.5/archive/ca1e85fe9430179831e6bc6be790c332190a3866.tar.gz -o ace-step.tar.gz
mkdir ace-step
tar -xzf ace-step.tar.gz -C ace-step --strip-components=1
cd ace-step
timeout 1200 uv sync --frozen --no-dev --python 3.12
timeout 1200 .venv/bin/python - <<'PY'
from huggingface_hub import snapshot_download
snapshot_download('ACE-Step/Ace-Step1.5', revision='19671f406d603126926c1b7e2adc169acbcade22',
    local_dir='checkpoints', allow_patterns=['config.json', 'Qwen3-Embedding-0.6B/*',
    'acestep-v15-turbo/*', 'vae/*', 'acestep-5Hz-lm-1.7B/*'])
PY
mkdir -p /workspace/results
nvidia-smi -q > /workspace/results/nvidia-smi.txt
.venv/bin/python -m pip freeze > /workspace/results/packages.txt 2>/dev/null || uv pip freeze > /workspace/results/packages.txt
sha256sum uv.lock > /workspace/results/lock-sha256.txt
printf 'SETUP_COMPLETE\n'
