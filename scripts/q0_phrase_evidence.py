#!/usr/bin/env python3
"""Decode the phrase-form trial and verify copied-plan and control preservation."""
import argparse
import json
from pathlib import Path
import shutil
import numpy as np

from q0_audit import ROOT, digest, event_metrics, write
from q0_measure_comparisons import pcm
from q0_phrase_form import adapt


def collect(trial, output):
    if output.exists() or (trial/'INCOMPLETE').exists():
        raise ValueError('Expected complete trial and fresh evidence directory')
    report = json.loads((trial/'report.json').read_text())
    if report['version'] != '1.0-q0-phrase-trial':
        raise ValueError('Unexpected trial')
    prior = ROOT/'renders/q0-authored-v2-20261020'
    inventory = json.loads((ROOT/'docs/evidence/q0-authored/measurements.json').read_text())['trial_file_sha256']
    for name, expected in inventory.items():
        if digest(prior/name) != expected:
            raise ValueError('Prior study changed: '+name)
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    decoded, differences, events = [], [], []
    for row in report['records']:
        ident, style = row['id'], row['style']
        source = ROOT/'renders/q0-baseline-v2-20261020'/ident/'source.wav'
        old = json.loads((prior/ident/f'hybrid-phrased.{style}.score.json').read_text())
        plan, trace = adapt(old, source)
        folder = trial/ident
        if (plan != json.loads((folder/f'candidate.{style}.score.json').read_text()) or
                trace != row['changes']):
            raise ValueError('Plan or trace no longer reproducible')
        (output/ident).mkdir()
        write(output/ident/'score.json', plan); write(output/ident/'trace.json', trace)
        events.append({'id': ident, 'before': event_metrics(old), 'after': event_metrics(plan)})
        paths = sorted(folder.glob(f'candidate.{style}*.wav'))
        if len(paths) != 6:
            raise ValueError('Missing master or stems')
        for path in paths:
            rate, samples = pcm(path)
            audio = np.asarray(samples, dtype=np.float64)
            peak = float(np.max(np.abs(audio)))
            clipped = int(np.count_nonzero((audio >= 32767) | (audio <= -32768)))
            if rate != 48000 or clipped or not peak:
                raise ValueError('Unexpected rate, clipping or silence: '+str(path))
            decoded.append({'file': str(path.relative_to(trial)), 'sha256': digest(path),
                'frames': len(audio)//2, 'sample_rate': rate, 'full_scale_samples': clipped,
                'peak_dbfs': float(20*np.log10(peak/32768)),
                'rms_dbfs': float(10*np.log10(np.mean((audio/32768)**2)))})
        ar, a = pcm(prior/ident/f'hybrid-phrased.{style}.wav')
        br, b = pcm(folder/f'candidate.{style}.wav')
        if ar != br:
            raise ValueError('Comparison rates differ')
        length = min(len(a), len(b))
        delta = np.asarray(a[:length], dtype=np.float64)-np.asarray(b[:length], dtype=np.float64)
        intro_samples = (2*3840*48000*60000//(960*112000))*2
        if np.any(delta[:intro_samples]) or not np.any(delta):
            raise ValueError('Expected unchanged introduction and changed performance')
        differences.append({'id': ident, 'control_frames': len(a)//2,
            'candidate_frames': len(b)//2, 'identical_intro_frames': intro_samples//2,
            'common_prefix_max_pcm16_difference': float(np.max(np.abs(delta))),
            'common_prefix_rms_pcm16_difference': float(np.sqrt(np.mean(delta**2))),
            'interpretation': 'Unequal duration/shifted form; common-prefix deltas prove change, not quality.'})
    write(output/'measurements.json', {'technical': 'PASS', 'human_quality': 'NOT RUN',
        'decoded_audio': decoded, 'waveform_differences': differences, 'event_metrics': events,
        'prior_study_files_unchanged': len(inventory), 'reproduced_plans': len(report['records']),
        'trial_file_sha256': {str(p.relative_to(trial)): digest(p)
                             for p in sorted(trial.rglob('*')) if p.is_file()}})
    for name in ('report.json', 'listener/packet.json'):
        shutil.copyfile(trial/name, output/Path(name).name)
    write(output/'preservation.json', {str(p): digest(ROOT/p) for p in [
        Path('ai_improvisational_musician_master_spec_v1.md'),
        Path('jamloom_improvisation_learning_addendum_v1.md'),
        Path('build-mac/jamloom_remix'), Path('build-mac/libjamloom_core.a')]})
    (output/'INCOMPLETE').unlink()
    print(f'PASS: {len(decoded)} decoded masters/stems, five reproduced plans, identical introductions; prior study unchanged')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--trial', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    collect(args.trial.resolve(), args.output.resolve())
