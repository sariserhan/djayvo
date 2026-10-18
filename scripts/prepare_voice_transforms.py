#!/usr/bin/env python3
"""Prepare private voice-transform controls from an existing consented score."""
import argparse
import copy
import hashlib
import html
import json
from pathlib import Path
import subprocess
import time
from verify_export import verify_export


def prepare(renderer, source, plan_path, output):
    plan = json.loads(plan_path.read_text())
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if (plan['source']['sha256'] != source_hash or plan['source']['kind'] != 'recorded'
            or plan['source']['consent_confirmed'] is not True):
        raise ValueError('source and existing consented recording plan must match')
    if any(e.get('pitch_semitones', 0) != 0 or e.get('time_stretch', 1) != 1 for e in plan['voice_events']):
        raise ValueError('start from an untransformed control plan')
    if not any(not e['clean'] for e in plan['voice_events']):
        raise ValueError('plan has no optional fragments to compare')
    output.mkdir(parents=True, exist_ok=False)
    pending = output / '.partial'
    pending.write_text('Incomplete voice comparison; retain earlier exports on failure.\n')
    cases = [('control', 0, 1), ('pitch-up', 2, 1), ('longer', 0, 1.12), ('lower-shorter', -2, 0.9)]
    report = {'source_sha256': source_hash, 'source_plan_sha256': hashlib.sha256(plan_path.read_bytes()).hexdigest(),
              'listening': 'NOT RUN', 'level_matching': 'identical plan gains; no loudness normalization', 'cases': {}}
    sections = []
    for name, pitch, stretch in cases:
        candidate = copy.deepcopy(plan)
        if pitch or stretch != 1:
            candidate['schema_version'] = '1.1-remix'
            for event in candidate['voice_events']:
                if not event['clean']:
                    event.update(pitch_semitones=pitch, time_stretch=stretch)
        path = output / f'{name}.json'
        path.write_text(json.dumps(candidate, indent=2) + '\n')
        started = time.monotonic()
        subprocess.run([str(renderer.resolve()), '--input', str(source.resolve()), '--consent',
                        '--output', str(output / name), '--style', plan['strategy'], '--seed', str(plan['seed']),
                        '--sample-rate', str(plan['sample_rate']), '--plan', str(path), '--stems'], check=True)
        record = verify_export(output / name)
        prefix = f'{name}.{plan["strategy"]}'
        exported = json.loads((output / f'{prefix}.score.json').read_text())
        assert exported == candidate, 'export lost requested transformation'
        assert [e for e in exported['voice_events'] if e['clean']] == [e for e in plan['voice_events'] if e['clean']]
        report['cases'][name] = {'pitch_semitones': pitch, 'time_stretch': stretch,
                               'render_with_stems_seconds': time.monotonic() - started,
                               'artifacts': record['artifacts']}
        sections.append(f'<section><h2>{html.escape(name)}: {pitch:+g} semitones, {stretch:g}× duration</h2>'
                        f'<p>Mix</p><audio controls preload="metadata" src="{prefix}.wav"></audio>'
                        f'<p>Voice alone</p><audio controls preload="metadata" src="{prefix}.vocals.wav"></audio></section>')
    (output / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Djayvo voice comparisons</title>'
        '<style>body{max-width:760px;margin:40px auto;padding:0 20px;font:18px system-ui;background:#151515;color:#eee}'
        'audio{width:100%}section{margin:32px 0}</style><h1>Djayvo voice comparisons</h1>'
        '<p>Private local research. Compare the opening and later responses. Full clean hooks stay unchanged. '
        'All mixes use the same arrangement and gains; loudness is not normalized. Listen for consonants, '
        'voice character, timing and rough joins. No quality rating has been recorded.</p>' + ''.join(sections) +
        '<script>document.addEventListener("play",e=>{document.querySelectorAll("audio").forEach(a=>{'
        'if(a!==e.target)a.pause()})},true)</script></html>')
    (output / 'comparison.json').write_text(json.dumps(report, indent=2) + '\n')
    pending.unlink()
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--renderer', type=Path, required=True)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--consent', action='store_true', required=True, help='permission for local processing and owner review')
    args = parser.parse_args()
    prepare(args.renderer, args.input, args.plan, args.output)
