set -euo pipefail
cd /workspace/ace-step
export PYTHONPATH=/workspace/ace-step OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=4 HF_HUB_OFFLINE=1
time timeout 900 .venv/bin/python -u /workspace/train-measured.py --plain --yes fixed \
  --checkpoint-dir ./checkpoints --model-variant turbo \
  --dataset-dir /workspace/ace-step/style-tensors --output-dir /workspace/ace-step/style-results/adapter \
  --device cuda --precision bf16 --batch-size 1 --gradient-accumulation 1 \
  --rank 16 --alpha 32 --dropout 0.1 --lr 0.0001 \
  --scheduler-type constant_with_warmup --warmup-steps 10 \
  --epochs 50 --save-every 10 --resume-from /workspace/ace-step/style-results/probe-v2/checkpoints/epoch_2_loss_1.9968 --num-workers 0 --seed 51018 --log-every 1
