#!/usr/bin/env python3
"""Approved Blood Club research only; execute in the pinned GPU checkout."""
import argparse
import json
import os
from pathlib import Path
import time
import wave

import cloud_style_trial as shared

INPUT = Path('/workspace/blood-input')
OUT = Path('/workspace/ace-step/blood-results')
SOURCE_SHA = '12cad3d3b5d66383d69207630d09d66d5203d963ab48d0f0ade7d1ee32672188'


def checked_inputs():
    rows = json.loads((INPUT / 'manifest.json').read_text())
    expected = {f'blood-{n:02d}.wav' for n in range(1, 17)}
    if len(rows) != 16 or {r['file'] for r in rows} != expected:
        raise ValueError('Expected exactly the sixteen approved training clips')
    if {p.name for p in INPUT.iterdir()} != expected | {'manifest.json', 'dataset.json'}:
        raise ValueError('Unexpected training input files')
    for row in rows:
        if row['split'] != 'train' or row['source_id'] != 'blood_club' or row['source_sha256'] != SOURCE_SHA:
            raise ValueError('Unapproved source or holdout in training input')
        path = INPUT / row['file']
        if path.is_symlink() or shared.digest(path) != row['sha256']:
            raise ValueError('Training input hash mismatch')
        with wave.open(str(path)) as wav:
            if (wav.getframerate(), wav.getnchannels(), wav.getsampwidth(), wav.getnframes()) != (48000, 2, 2, 1440000):
                raise ValueError('Invalid training WAV')
    samples = json.loads((INPUT / 'dataset.json').read_text())['samples']
    if len(samples) != 16 or {s['filename'] for s in samples} != expected:
        raise ValueError('Dataset does not match training manifest')
    for sample in samples:
        if sample['audio_path'] != str(INPUT / sample['filename']) or sample['caption'] != 'Music with rhythmic bass and drum patterns.':
            raise ValueError('Unapproved conditioning path or caption')
    return rows


def preprocess():
    rows = checked_inputs()
    from acestep.training_v2.preprocess import preprocess_audio_files
    tensors = Path.cwd() / 'blood-tensors'
    if tensors.exists():
        raise ValueError('Refusing to mix an existing tensor dataset')
    started = time.monotonic()
    result = preprocess_audio_files(audio_dir=None, output_dir=str(tensors),
        checkpoint_dir=str(Path.cwd() / 'checkpoints'), variant='turbo', max_duration=30,
        dataset_json=str(INPUT / 'dataset.json'), device='cuda', precision='bf16')
    result['seconds'] = time.monotonic() - started
    shared.save('preprocess.json', result)
    if result['failed'] or result['processed'] != len(rows):
        raise RuntimeError('Incomplete preprocessing')


def verify():
    import torch
    from safetensors.torch import load_file
    report = []
    for epoch, step in ((5, 80), (10, 160)):
        paths = list((OUT / 'adapter/checkpoints').glob(f'epoch_{epoch}_loss_*'))
        if len(paths) != 1:
            raise ValueError('Missing or ambiguous checkpoint')
        path = paths[0]
        state = load_file(str(path / 'training_state.safetensors'))
        if int(state['epoch'].item()) != epoch or int(state['global_step'].item()) != step:
            raise ValueError('Checkpoint training progress mismatch')
        weights = load_file(str(path / 'adapter_model.safetensors'))
        b = [v for k, v in weights.items() if 'lora_B' in k]
        if not b or not all(torch.isfinite(v).all() for v in weights.values()) or not all(torch.count_nonzero(v) for v in b):
            raise ValueError('Nonfinite or untrained adapter')
        report.append({'epoch': epoch, 'step': step, 'path': str(path),
            'sha256': shared.digest(path / 'adapter_model.safetensors'), 'tensors': len(weights),
            'parameters': sum(v.numel() for v in weights.values()), 'nonzero_lora_b_tensors': len(b)})
    if len({row['sha256'] for row in report}) != 2:
        raise ValueError('Training checkpoints are identical')
    shared.save('checkpoints.json', report)
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['preprocess', 'verify', 'base', 'step80', 'step160'])
    args = parser.parse_args()
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['ACESTEP_DISABLE_TQDM'] = '1'
    OUT.mkdir(exist_ok=True)
    shared.OUT = OUT
    if args.phase == 'preprocess':
        preprocess()
    elif args.phase == 'verify':
        verify()
    elif args.phase == 'base':
        shared.compare(None, modes=('base', 'base-repeat'), report_name='base.json')
    else:
        step = int(args.phase.removeprefix('step'))
        row = next(r for r in json.loads((OUT / 'checkpoints.json').read_text()) if r['step'] == step)
        shared.compare(row['path'], modes=(args.phase,), adapter_mode=args.phase, report_name=args.phase + '.json')
