#!/usr/bin/env python3
"""Execute the bounded, authorized musician-reference trial in the pinned checkout."""
import argparse
import atexit
import json
import os
from pathlib import Path
import runpy
import sys
import time
import wave

import cloud_style_trial as shared

INPUT = Path('/workspace/musician-input')
OUT = Path('/workspace/ace-step/musician-results')
MANIFEST_SHA = '38a68b3e05aa4b409d28d9326162929bf67c4c88c5e38e3acb94123e52e1fb7f'
EXPECTED = {f'{name}-{i:02}.wav' for name, count in (('f', 3), ('down', 4), ('question', 4), ('pipe', 2)) for i in range(1, count + 1)}


def checked_inputs():
    manifest = INPUT / 'manifest.json'
    if manifest.is_symlink() or shared.digest(manifest) != MANIFEST_SHA:
        raise ValueError('Unapproved candidate manifest')
    rows = json.loads(manifest.read_text())['clips']
    if len(rows) != 13 or {r['file'] for r in rows} != EXPECTED:
        raise ValueError('Expected exactly the thirteen authorized candidates')
    if {p.name for p in INPUT.iterdir()} not in (EXPECTED | {'manifest.json'}, EXPECTED | {'manifest.json', 'accepted.json'}):
        raise ValueError('Unexpected input files')
    for row in rows:
        path = INPUT / row['file']
        if path.is_symlink() or shared.digest(path) != row['sha256']:
            raise ValueError('Candidate hash mismatch')
        with wave.open(str(path)) as wav:
            if (wav.getframerate(), wav.getnchannels(), wav.getsampwidth(), wav.getnframes()) != (48000, 2, 2, 1440000):
                raise ValueError('Invalid candidate WAV')
        row['id'] = path.stem
    return rows


def accepted():
    rows = {row['file']: row for row in checked_inputs()}
    dataset = json.loads((INPUT / 'accepted.json').read_text())
    samples = dataset['samples']
    if not 4 <= len(samples) <= 13 or len({s['filename'] for s in samples}) != len(samples):
        raise ValueError('Expected four to thirteen distinct screened candidates')
    for sample in samples:
        if sample['filename'] not in rows or sample['audio_path'] != str(INPUT / sample['filename']):
            raise ValueError('Unapproved training path')
        if (sample.get('review_status') != 'provisional_machine_review' or
            sample.get('caption') != 'Music with rhythmic bass and drum patterns.' or
            sample.get('lyrics') != '' or sample.get('bpm') is not None or
            sample.get('is_instrumental') is not None or sample.get('keyscale') != ''):
            raise ValueError('Unapproved or unverified conditioning')
    if len({rows[s['filename']]['source'] for s in samples}) < 2:
        raise ValueError('At least two source files must qualify')
    return samples


def preprocess():
    samples = accepted()
    from acestep.training_v2.preprocess import preprocess_audio_files
    tensors = Path.cwd() / 'musician-tensors'
    if tensors.exists():
        raise ValueError('Refusing to reuse a tensor dataset')
    started = time.monotonic()
    result = preprocess_audio_files(audio_dir=None, output_dir=str(tensors),
        checkpoint_dir=str(Path.cwd() / 'checkpoints'), variant='turbo', max_duration=30,
        dataset_json=str(INPUT / 'accepted.json'), device='cuda', precision='bf16')
    result['seconds'] = time.monotonic() - started
    shared.save('preprocess.json', result)
    if result['failed'] or result['processed'] != len(samples):
        raise RuntimeError('Incomplete preprocessing')


def train():
    accepted()
    if (OUT / 'adapter').exists():
        raise ValueError('Refusing to overwrite adapters or repeat fitting')
    import torch
    started = time.monotonic()
    torch.cuda.reset_peak_memory_stats()
    def record():
        shared.save('train-resources.json', {'seconds': time.monotonic() - started,
            'peak_allocated_gib': torch.cuda.max_memory_allocated() / 2 ** 30,
            'peak_reserved_gib': torch.cuda.max_memory_reserved() / 2 ** 30,
            'status': 'Requires independent checkpoint verification'})
    atexit.register(record)
    sys.argv = ['train.py', '--plain', '--yes', 'fixed', '--checkpoint-dir', './checkpoints',
        '--model-variant', 'turbo', '--dataset-dir', str(Path.cwd() / 'musician-tensors'),
        '--output-dir', str(OUT / 'adapter'), '--device', 'cuda', '--precision', 'bf16',
        '--batch-size', '1', '--gradient-accumulation', '1', '--rank', '16', '--alpha', '32',
        '--dropout', '.1', '--lr', '.00005', '--scheduler-type', 'constant_with_warmup',
        '--warmup-steps', '10', '--epochs', '10', '--save-every', '5', '--num-workers', '0',
        '--seed', '51021', '--log-every', '1']
    runpy.run_path('train.py', run_name='__main__')


def verify():
    count = len(accepted())
    import torch
    from safetensors.torch import load_file
    report = []
    for epoch in (5, 10):
        paths = list((OUT / 'adapter/checkpoints').glob(f'epoch_{epoch}_loss_*'))
        if len(paths) != 1:
            raise ValueError('Missing or ambiguous checkpoint')
        path = paths[0]
        state = load_file(str(path / 'training_state.safetensors'))
        if int(state['epoch'].item()) != epoch or int(state['global_step'].item()) != epoch * count:
            raise ValueError('Unexpected training progress')
        weights = load_file(str(path / 'adapter_model.safetensors'))
        b = [v for k, v in weights.items() if 'lora_B' in k]
        if not b or not all(torch.isfinite(v).all() for v in weights.values()) or not all(torch.count_nonzero(v) for v in b):
            raise ValueError('Nonfinite or untrained weights')
        report.append({'epoch': epoch, 'step': epoch * count, 'path': str(path),
            'sha256': shared.digest(path / 'adapter_model.safetensors'), 'tensors': len(weights),
            'parameters': sum(v.numel() for v in weights.values()), 'nonzero_lora_b_tensors': len(b)})
    if len({r['sha256'] for r in report}) != 2:
        raise ValueError('Identical checkpoints')
    shared.save('checkpoints.json', report)
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['label', 'preprocess', 'train', 'verify', 'base', 'epoch5', 'epoch10'])
    args = parser.parse_args()
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['ACESTEP_DISABLE_TQDM'] = '1'
    OUT.mkdir(exist_ok=True)
    shared.OUT, shared.INPUT, shared.checked_inputs = OUT, INPUT, checked_inputs
    if args.phase == 'label':
        shared.label()
    elif args.phase in ('preprocess', 'train', 'verify'):
        globals()[args.phase]()
    elif args.phase == 'base':
        shared.compare(None, modes=('base', 'base-repeat'), report_name='base.json')
    else:
        epoch = int(args.phase.removeprefix('epoch'))
        row = next(r for r in json.loads((OUT / 'checkpoints.json').read_text()) if r['epoch'] == epoch)
        shared.compare(row['path'], modes=(args.phase,), adapter_mode=args.phase, report_name=args.phase + '.json')
