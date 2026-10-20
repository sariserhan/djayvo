#!/usr/bin/env python3
"""Independently audit five-arm renders and retain metadata, never private audio."""
import argparse
import json
import math
from pathlib import Path
import shutil

from q0_audit import ROOT, digest, inspect, loudness, write
from q0_measure_comparisons import pcm
from q0_probe_review import decay


def collect(baseline, trial, probes, output):
    if output.exists():
        raise ValueError('Choose a fresh evidence directory')
    if (trial/'INCOMPLETE').exists():
        raise ValueError('Trial is incomplete')
    output.mkdir(parents=True)
    (output/'INCOMPLETE').touch()
    report = json.loads((trial/'report.json').read_text())
    if report['scope'] != 'A/B/C/D/E decay-expression-composition trial':
        raise ValueError('Expected a five-arm trial')
    manifest = report['instrument_build']
    for name, sha in manifest['source_sha256'].items():
        if name != 'core/instruments/voice.cpp' and digest(ROOT/name) != sha:
            raise ValueError('Shared source changed: '+name)
    rows = []
    for record in report['records']:
        identifier, style = record['id'], record['style']
        paths = {'A': baseline/identifier/f'A.{style}.wav', **{
            arm: trial/identifier/f'{arm}.{style}.wav' for arm in 'BCDE'}}
        differences = {}
        for left, right in [('A', 'B'), ('C', 'D'), ('D', 'E')]:
            lr, lpcm = pcm(paths[left]); rr, rpcm = pcm(paths[right])
            if lr != rr or len(lpcm) != len(rpcm):
                raise ValueError('Comparison duration/rate differs')
            maximum = max(abs(a-b) for a, b in zip(lpcm, rpcm))
            rms = math.sqrt(sum((a-b)**2 for a, b in zip(lpcm, rpcm))/len(lpcm))
            if maximum == 0:
                raise ValueError('Candidate unexpectedly identical')
            differences[left+'/'+right] = {'max_pcm16_difference': maximum, 'rms_pcm16_difference': rms}
        stem_checks, stem_metrics = [], []
        for left, right in [('A', 'B'), ('C', 'D')]:
            before_dir = baseline/identifier if left == 'A' else trial/identifier
            for before in sorted(before_dir.glob(f'{left}.{style}.*.wav')):
                instrument = before.name.split('.')[-2]
                after = trial/identifier/f'{right}.{style}.{instrument}.wav'
                identical = digest(before) == digest(after)
                if identical != (instrument != 'drums'):
                    raise ValueError('Unexpected stem change: '+str(after))
                stem_checks.append({'pair': left+'/'+right, 'instrument': instrument, 'identical': identical})
        for path in sorted((trial/identifier).glob('*.wav')):
            if path.name.startswith('replay'):
                continue
            measurement = inspect(path)
            if measurement['full_scale_samples']:
                raise ValueError('Clipped PCM: '+str(path))
            stem_metrics.append({'file': path.name, 'pcm': measurement, 'loudness': loudness(path)})
        for name in ('composition.json', 'E.expression.json', 'E.plan.json'):
            destination = output/identifier
            destination.mkdir(exist_ok=True)
            shutil.copyfile(trial/identifier/name, destination/name)
        rows.append({'id': identifier, 'waveform_differences': differences,
                     'instrument_only_stem_checks': stem_checks, 'rendered_audio': stem_metrics})
    probe_rows = []
    for path in sorted(probes.glob('*.wav')):
        before = ROOT/'renders/q0-instrument-probes-20261020'/path.name
        identical = digest(before) == digest(path)
        if identical != (path.name != 'drums-short.wav'):
            raise ValueError('Unexpected isolated probe change')
        probe_rows.append({'file': path.name, 'sha256': digest(path), 'identical': identical,
                           'before': decay(before), 'after': decay(path)})
    if len(probe_rows) != 14:
        raise ValueError('Expected all fourteen instrument probes')
    inventory = {str(p.relative_to(trial)): digest(p) for p in sorted(trial.rglob('*')) if p.is_file()}
    write(output/'measurements.json', {'technical': 'PASS', 'human_quality': 'NOT RUN',
        'records': rows, 'instrument_probes': probe_rows, 'trial_file_sha256': inventory})
    shutil.copyfile(trial/'report.json', output/'trial-report.json')
    shutil.copyfile(trial/'listener/packet.json', output/'packet.json')
    (output/'INCOMPLETE').unlink()
    print('PASS: waveform differences, stem isolation, no PCM clipping, 14 probes, source hashes')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('baseline', 'trial', 'probes', 'output'):
        p.add_argument('--'+name, type=Path, required=True)
    a = p.parse_args()
    collect(a.baseline.resolve(), a.trial.resolve(), a.probes.resolve(), a.output.resolve())
