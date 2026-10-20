#!/usr/bin/env python3
"""Decode and measure the authored-score study using the existing analysis environment."""
import argparse
import json
from pathlib import Path
import shutil
import numpy as np

from q0_audit import ROOT, digest, write
from q0_authored_score import authored
from q0_measure_comparisons import pcm


def collect(trial, output):
    if output.exists() or (trial/'INCOMPLETE').exists():
        raise ValueError('Expected complete trial and fresh evidence directory')
    report = json.loads((trial/'report.json').read_text())
    if report['version'] != '1.0-q0-authored-study':
        raise ValueError('Unexpected experiment')
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    measurements, differences = [], []
    for row in report['records']:
        ident, style = row['id'], row['style_metadata']
        baseline = ROOT/'renders/q0-baseline-v2-20261020'/ident
        original = json.loads((baseline/f'A.{style}.score.json').read_text())
        folder = trial/ident
        voices = set()
        for arm in row['conditions']:
            plan, trace = authored(original, baseline/'source.wav',
                hybrid=arm.startswith('hybrid'), expressive=arm.endswith('phrased'))
            if plan != json.loads((folder/f'{arm}.{style}.score.json').read_text()):
                raise ValueError('Plan no longer reproducible')
            voices.add(digest(folder/f'{arm}.{style}.vocals.wav'))
            for path in folder.glob(f'{arm}.{style}*.wav'):
                rate, samples = pcm(path)
                audio = np.asarray(samples, dtype=np.float64)
                clipped = int(np.count_nonzero((audio >= 32767) | (audio <= -32768)))
                peak = float(np.max(np.abs(audio)))
                if rate != 48000 or clipped or not peak:
                    raise ValueError('Unexpected audio format, clipping or silence: '+str(path))
                measurements.append({'file': str(path.relative_to(trial)), 'sha256': digest(path),
                    'frames': len(audio)//2, 'sample_rate': rate,
                    'peak_dbfs': float(20*np.log10(peak/32768)),
                    'rms_dbfs': float(10*np.log10(np.mean((audio/32768)**2))),
                    'full_scale_samples': clipped})
            if arm == 'acoustic-phrased':
                (output/ident).mkdir()
                write(output/ident/'score.json', plan); write(output/ident/'trace.json', trace)
        if len(voices) != 1:
            raise ValueError('Vocal stem changed between study conditions')
        for a, b in [('acoustic-grid', 'acoustic-phrased'), ('hybrid-grid', 'hybrid-phrased'),
                     ('acoustic-grid', 'hybrid-grid'), ('acoustic-phrased', 'hybrid-phrased')]:
            ar, av = pcm(folder/f'{a}.{style}.wav'); br, bv = pcm(folder/f'{b}.{style}.wav')
            if ar != br or len(av) != len(bv):
                raise ValueError('Comparison rate/duration differs')
            delta = np.asarray(av, dtype=np.float64)-np.asarray(bv, dtype=np.float64)
            if not np.any(delta):
                raise ValueError('Comparison unexpectedly identical')
            differences.append({'id': ident, 'pair': [a, b],
                'max_pcm16_difference': float(np.max(np.abs(delta))),
                'rms_pcm16_difference': float(np.sqrt(np.mean(delta**2)))})
    inventory = {str(p.relative_to(trial)): digest(p) for p in sorted(trial.rglob('*')) if p.is_file()}
    write(output/'measurements.json', {'technical': 'PASS', 'human_quality': 'NOT RUN',
        'decoded_audio': measurements, 'waveform_differences': differences,
        'identical_vocal_stems_all_conditions': 'PASS', 'plan_reproduction': 'PASS: 20 plans',
        'trial_file_sha256': inventory})
    shutil.copyfile(trial/'report.json', output/'report.json')
    shutil.copyfile(trial/'listener/packet.json', output/'packet.json')
    write(output/'preservation.json', {str(p): digest(ROOT/p) for p in [
        Path('ai_improvisational_musician_master_spec_v1.md'),
        Path('jamloom_improvisation_learning_addendum_v1.md'),
        Path('build-mac/jamloom_remix'), Path('build-mac/libjamloom_core.a')]})
    (output/'INCOMPLETE').unlink()
    print(f'PASS: {len(measurements)} decoded masters/stems, 20 reproduced plans, identical vocals and waveform comparisons')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--trial', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    collect(a.trial.resolve(), a.output.resolve())
