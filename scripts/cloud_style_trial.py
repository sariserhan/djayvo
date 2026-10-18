#!/usr/bin/env python3
"""Approved isolated adapter research. Run from the pinned ACE-Step checkout."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import time

OUT = Path('/workspace/ace-step/style-results')
INPUT = Path('/workspace/style-input')


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def checked_inputs():
    rows = json.loads((INPUT / 'manifest.json').read_text())
    if len(rows) != 12 or len({r['file'] for r in rows}) != 12:
        raise ValueError('Expected exactly twelve distinct x/y candidates')
    for row in rows:
        if row['source_id'] not in ('x', 'y') or row['split'] != 'train_candidate':
            raise ValueError('Holdout or unknown source in training input')
        if row['file'] != row['id'] + '.wav' or row['id'] not in {
            f'{source}-{n:02d}' for source in 'xy' for n in range(1, 7)
        }:
            raise ValueError('Unexpected input filename')
        if digest(INPUT / row['file']) != row['sha256']:
            raise ValueError('Input hash mismatch')
    return rows


def save(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def label():
    import numpy as np
    import soundfile as sf
    import torch
    from acestep.handler import AceStepHandler
    from acestep.llm_inference import LLMHandler
    rows = checked_inputs()
    dit, lm = AceStepHandler(), LLMHandler()
    status, ok = dit.initialize_service(project_root=str(Path.cwd()), config_path='acestep-v15-turbo',
                                       device='cuda', compile_model=False, use_mlx_dit=False)
    if not ok:
        raise RuntimeError(status)
    status, ok = lm.initialize(checkpoint_dir=str(Path.cwd() / 'checkpoints'),
                              lm_model_path='acestep-5Hz-lm-1.7B', backend='pt', device='cuda')
    if not ok:
        raise RuntimeError(status)
    report = {'label_source': 'ACE-Step 1.7B audio understanding; unverified machine predictions',
              'human_listening': 'NOT RUN', 'samples': []}
    for row in rows:
        path = INPUT / row['file']
        audio, rate = sf.read(path, dtype='float32', always_2d=True)
        if rate != 48000 or audio.shape != (1440000, 2) or not np.isfinite(audio).all():
            raise ValueError('Invalid candidate audio')
        if np.any(audio <= -1) or np.any(audio >= 32767 / 32768):
            raise ValueError('Full-scale candidate; correct decode headroom before labeling')
        torch.manual_seed(51018)
        started = time.monotonic()
        codes = dit.convert_src_audio_to_codes(str(path))
        if not codes or codes.startswith('❌'):
            raise RuntimeError('Audio code extraction failed')
        metadata, status = lm.understand_audio_from_codes(codes, temperature=0.1, use_constrained_decoding=True)
        if not metadata or not metadata.get('caption'):
            raise RuntimeError('Audio understanding failed')
        report['samples'].append({**row, 'machine_metadata': metadata, 'seconds': time.monotonic() - started,
                                  'rms': float(np.sqrt(np.mean(audio ** 2))),
                                  'peak': float(np.max(np.abs(audio)))})
        save('labels-private.json', report)
        print('LABELED', row['id'], flush=True)


def preprocess():
    from acestep.training_v2.preprocess import preprocess_audio_files
    rows = {r['file']: r for r in checked_inputs()}
    dataset = json.loads((INPUT / 'accepted.json').read_text())
    samples = dataset['samples']
    if len(samples) < 4 or len({s['filename'] for s in samples}) != len(samples):
        raise ValueError('At least four distinct reviewed candidates required')
    for sample in samples:
        if sample['filename'] not in rows or sample['audio_path'] != str(INPUT / sample['filename']):
            raise ValueError('Unapproved training path')
        if sample.get('review_status') != 'provisional_machine_review' or not sample.get('caption'):
            raise ValueError('Missing provisional review')
    tensors = Path.cwd() / 'style-tensors'
    if tensors.exists():
        raise ValueError('Refusing to mix an existing tensor dataset')
    started = time.monotonic()
    result = preprocess_audio_files(audio_dir=None, output_dir=str(tensors),
        checkpoint_dir=str(Path.cwd() / 'checkpoints'), variant='turbo', max_duration=30,
        dataset_json=str(INPUT / 'accepted.json'), device='cuda', precision='bf16')
    result['seconds'] = time.monotonic() - started
    save('preprocess.json', result)
    if result['failed'] or result['processed'] != len(samples):
        raise RuntimeError('Incomplete preprocessing')


def compare(adapter):
    import random
    import numpy as np
    import soundfile as sf
    import torch
    from acestep.handler import AceStepHandler
    from acestep.llm_inference import LLMHandler
    from acestep.inference import GenerationParams, GenerationConfig, generate_music
    cases = [
        ('bass-a', 140, 7441, 'Instrumental bass music, 140 BPM, half-time drums, syncopated modulated bass phrases with rests, percussive vocal-like synth textures, call and response between bass and melodic lead. Sparse opening, a developing rhythmic motif, contrasting break, varied return and deliberate ending. No vocals.'),
        ('bass-b', 140, 7442, 'Instrumental bass music, 140 BPM, half-time drums, syncopated modulated bass phrases with rests, percussive vocal-like synth textures, call and response between bass and melodic lead. Sparse opening, a developing rhythmic motif, contrasting break, varied return and deliberate ending. No vocals.'),
        ('funk', 112, 8123, 'Instrumental funk, 112 BPM, syncopated electric bass, expressive electric piano, muted guitar replies, dry drums with ghost notes. A memorable motif develops across sections, space between phrases, stripped-down break and resolved ending. No vocals.'),
        ('hiphop', 92, 9123, 'Instrumental hip hop, 92 BPM, warm electric bass, swung drums, expressive Rhodes and short guitar answers. A short recurring motif, varied drum fills, contrasting middle section and musical ending. No vocals.'),
    ]
    dit, lm = AceStepHandler(), LLMHandler()
    status, ok = dit.initialize_service(project_root=str(Path.cwd()), config_path='acestep-v15-turbo',
                                       device='cuda', compile_model=False, use_mlx_dit=False)
    if not ok:
        raise RuntimeError(status)
    report = {'quality': 'NOT RUN', 'gpu': torch.cuda.get_device_name(), 'torch': torch.__version__,
              'cuda': torch.version.cuda, 'adapter': adapter, 'cases': []}
    for mode in ('base', 'base-repeat', 'adapter'):
        if mode == 'adapter':
            status = dit.load_lora(adapter)
            if '✅' not in status:
                raise RuntimeError('Adapter load did not confirm success: ' + status)
            scale_status = dit.set_lora_scale(0.7)
            if '✅' not in scale_status or 'disabled' in scale_status.lower():
                raise RuntimeError('Adapter scale was not applied: ' + scale_status)
            report['adapter_load_status'] = status
            report['adapter_scale_status'] = scale_status
        for name, bpm, seed, caption in (cases[:1] if mode == 'base-repeat' else cases):
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            torch.cuda.manual_seed_all(seed)
            params = GenerationParams(caption=caption, bpm=bpm, duration=30, seed=seed,
                instrumental=True, lyrics='[Instrumental]', inference_steps=8,
                thinking=False, use_cot_metas=False, use_cot_caption=False,
                use_cot_language=False, use_cot_lyrics=False)
            config = GenerationConfig(batch_size=1, audio_format='wav', use_random_seed=False, seeds=[seed])
            torch.cuda.reset_peak_memory_stats()
            torch.cuda.synchronize()
            started = time.monotonic()
            result = generate_music(dit, lm, params, config, save_dir=str(OUT / 'raw' / mode / name))
            torch.cuda.synchronize()
            if not result.success or len(result.audios) != 1:
                raise RuntimeError('Comparison generation failed')
            audio, rate = sf.read(result.audios[0]['path'], always_2d=True, dtype='float32')
            if audio.shape != (1440000, 2) or rate != 48000 or not np.isfinite(audio).all():
                raise ValueError('Unexpected comparison audio')
            peak = float(np.max(np.abs(audio)))
            if not 0.001 < peak < 1:
                raise ValueError('Silent or full-scale output')
            path = OUT / f'{mode}-{name}.wav'
            sf.write(path, audio, rate, subtype='PCM_16')
            receipt = {'mode': mode, 'name': name, 'seed': seed, 'bpm': bpm,
                'caption': caption, 'file': path.name, 'sha256': digest(path), 'peak': peak,
                'rms': float(np.sqrt(np.mean(audio ** 2))), 'seconds': time.monotonic() - started,
                'peak_allocated_gib': torch.cuda.max_memory_allocated() / 2 ** 30}
            if mode == 'base-repeat':
                original, _ = sf.read(OUT / 'base-bass-a.wav', dtype='int16')
                repeated, _ = sf.read(path, dtype='int16')
                receipt['pcm_exact'] = bool(np.array_equal(original, repeated))
                report['repeat_control'] = receipt
                if not receipt['pcm_exact']:
                    raise ValueError('Base repeat differs; adapter attribution needs investigation')
            else:
                report['cases'].append(receipt)
            save('comparison.json', report)
            print('RENDERED', mode, name, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['label', 'preprocess', 'compare'])
    parser.add_argument('--adapter')
    args = parser.parse_args()
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['ACESTEP_DISABLE_TQDM'] = '1'
    OUT.mkdir(exist_ok=True)
    if args.phase == 'label':
        label()
    elif args.phase == 'preprocess':
        preprocess()
    elif not args.adapter:
        parser.error('--adapter required for comparison')
    else:
        compare(args.adapter)
