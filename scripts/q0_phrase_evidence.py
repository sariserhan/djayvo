#!/usr/bin/env python3
"""Decode phrase-form or guitar-mix trials and verify their isolated changes."""
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
    if report['version'] not in ('1.0-q0-phrase-trial', '1.0-q0-guitar-mix'):
        raise ValueError('Unexpected trial')
    guitar_layer = report['version'] == '1.0-q0-guitar-mix'
    prior = ROOT/('renders/q0-phrase-form-20261020' if guitar_layer else 'renders/q0-authored-v2-20261020')
    evidence = 'q0-phrase-form' if guitar_layer else 'q0-authored'
    inventory = json.loads((ROOT/f'docs/evidence/{evidence}/measurements.json').read_text())['trial_file_sha256']
    for name, expected in inventory.items():
        if digest(prior/name) != expected:
            raise ValueError('Prior study changed: '+name)
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    decoded, differences, events = [], [], []
    for row in report['records']:
        ident, style = row['id'], row['style']
        source = ROOT/'renders/q0-baseline-v2-20261020'/ident/'source.wav'
        prefix = 'candidate' if guitar_layer else 'hybrid-phrased'
        old = json.loads((prior/ident/f'{prefix}.{style}.score.json').read_text())
        plan, trace = (old, row['changes']) if guitar_layer else adapt(old, source)
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
        ar, a = pcm(prior/ident/f'{prefix}.{style}.wav')
        br, b = pcm(folder/f'candidate.{style}.wav')
        if ar != br:
            raise ValueError('Comparison rates differ')
        length = min(len(a), len(b))
        delta = np.asarray(a[:length], dtype=np.float64)-np.asarray(b[:length], dtype=np.float64)
        intro_samples = (2*3840*48000*60000//(960*112000))*2
        if not np.any(delta) or (not guitar_layer and np.any(delta[:intro_samples])):
            raise ValueError('Expected unchanged introduction and changed performance')
        difference = {'id': ident, 'control_frames': len(a)//2,
            'candidate_frames': len(b)//2,
            'common_prefix_max_pcm16_difference': float(np.max(np.abs(delta))),
            'common_prefix_rms_pcm16_difference': float(np.sqrt(np.mean(delta**2))),
            'interpretation': 'Same timeline; waveform differences do not establish quality.' if guitar_layer else
                             'Unequal duration/shifted form; common-prefix deltas prove change, not quality.'}
        if guitar_layer:
            if len(a) != len(b):
                raise ValueError('Unchanged score produced a different duration')
            for stem in ('piano','bass','drums','vocals'):
                if digest(prior/ident/f'{prefix}.{style}.{stem}.wav') != digest(folder/f'candidate.{style}.{stem}.wav'):
                    raise ValueError('Non-guitar stem changed')
            _, ga = pcm(prior/ident/f'{prefix}.{style}.guitar.wav')
            _, gb = pcm(folder/f'candidate.{style}.guitar.wav')
            ga, gb = np.asarray(ga,dtype=np.float64), np.asarray(gb,dtype=np.float64)
            difference['guitar_rms_change_db'] = float(10*np.log10(np.sum(gb**2)/np.sum(ga**2)))
            difference['unchanged_stems'] = ['piano','bass','drums','vocals']
        else:
            difference['identical_intro_frames'] = intro_samples//2
        differences.append(difference)
    write(output/'measurements.json', {'technical': 'PASS', 'human_quality': 'NOT RUN',
        'decoded_audio': decoded, 'waveform_differences': differences, 'event_metrics': events,
        'prior_study_files_unchanged': len(inventory), 'reproduced_plans': len(report['records']),
        'trial_file_sha256': {str(p.relative_to(trial)): digest(p)
                             for p in sorted(trial.rglob('*')) if p.is_file()}})
    for name in ('report.json', 'listener/packet.json'):
        shutil.copyfile(trial/name, output/Path(name).name)
    if guitar_layer:
        shutil.copyfile(trial/'build.json', output/'build.json')
    write(output/'preservation.json', {str(p): digest(ROOT/p) for p in [
        Path('ai_improvisational_musician_master_spec_v1.md'),
        Path('jamloom_improvisation_learning_addendum_v1.md'),
        Path('build-mac/jamloom_remix'), Path('build-mac/libjamloom_core.a')]})
    (output/'INCOMPLETE').unlink()
    print(f'PASS: {len(decoded)} decoded masters/stems, five reproduced plans; '
          f'{"non-guitar stems" if guitar_layer else "introductions"} identical; prior study unchanged')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--trial', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    collect(args.trial.resolve(), args.output.resolve())
