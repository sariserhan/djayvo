"""Measure the pinned upstream CLI; its exit status alone is not training proof."""
import atexit
import json
from pathlib import Path
import runpy
import sys
import time
import torch

started = time.monotonic()
torch.cuda.reset_peak_memory_stats()

def record():
    result = {'seconds': time.monotonic() - started,
              'peak_allocated_gib': torch.cuda.max_memory_allocated() / 2 ** 30,
              'peak_reserved_gib': torch.cuda.max_memory_reserved() / 2 ** 30,
              'training_status': 'Requires separate checkpoint and step verification'}
    with Path('blood-results/train-resources.json').open('x') as stream:
        json.dump(result, stream, indent=2)
        stream.write('\n')

atexit.register(record)
sys.argv[0] = 'train.py'
runpy.run_path('train.py', run_name='__main__')
