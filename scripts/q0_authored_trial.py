#!/usr/bin/env python3
"""Render a fixed-score 2x2 palette/expression study through the frozen C++ core."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import random
import shutil
import subprocess

from q0_audit import ROOT, digest, event_metrics, inputs, level_match, loudness, write
from q0_authored_score import authored
from q0_measure_comparisons import timing
from verify_export import verify_export


def run(output):
    baseline = ROOT/'renders/q0-baseline-v2-20261020'
    renderer = ROOT/'build-mac/jamloom_remix'
    prior = ROOT/'renders/q0-five-arm-20261020/listener'
    freeze = json.loads((baseline/'freeze.json').read_text())
    if digest(renderer) != freeze['renderer_sha256']:
        raise ValueError('Frozen renderer changed')
    authorized = {r['id']: r['sha256'] for r in inputs()}
    if output.exists():
        raise ValueError('Choose a fresh experiment directory')
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    listener = output/'listener'; listener.mkdir()
    rows, keys, sections = [], {}, []
    for row in json.loads((baseline/'audit.json').read_text())['records']:
        ident, style = row['id'], row['style']
        source = baseline/ident/'source.wav'
        original = baseline/ident/f'A.{style}.score.json'
        if (digest(source) != authorized[ident] or digest(original) != row['plan_sha256']):
            raise ValueError('Source or frozen plan changed')
        p = json.loads(original.read_text())
        folder = output/ident; folder.mkdir()
        plans, versions = {}, {}
        for hybrid in (False, True):
            for expressive in (False, True):
                arm = ('hybrid' if hybrid else 'acoustic')+('-phrased' if expressive else '-grid')
                plan, trace = authored(p, source, hybrid=hybrid, expressive=expressive)
                plans[arm] = plan
                write(folder/f'{arm}.plan.json', plan); write(folder/f'{arm}.trace.json', trace)
                command = [str(renderer), '--input', str(source), '--consent', '--plan',
                    str(folder/f'{arm}.plan.json'), '--style', style, '--seed', str(p['seed'])]
                subprocess.run([*command, '--stems', '--output', str(folder/arm)], check=True, timeout=120)
                subprocess.run([*command, '--block-size', '113', '--output', str(folder/('replay-'+arm))],
                               check=True, timeout=120)
                verify_export(folder/arm, (style,))
                verify_export(folder/('replay-'+arm), (style,))
                for suffix in ('wav', 'events.tsv', 'score.json'):
                    if (folder/f'{arm}.{style}.{suffix}').read_bytes() != (
                            folder/f'replay-{arm}.{style}.{suffix}').read_bytes():
                        raise ValueError('Block-size replay mismatch')
                exported = json.loads((folder/f'{arm}.{style}.score.json').read_text())
                if exported != plan:
                    raise ValueError('Native importer changed authored plan')
                versions[arm] = {'timing': timing(plan, folder/f'{arm}.{style}.events.tsv'),
                    'plan_metrics': event_metrics(plan), 'replay_512_113': 'PASS',
                    'loudness': loudness(folder/f'{arm}.{style}.wav'),
                    'native': json.loads((folder/f'{arm}.{style}.report.json').read_text())}
        for expression in ('grid', 'phrased'):
            a, b = ('acoustic-'+expression, 'hybrid-'+expression)
            if (folder/f'{a}.{style}.events.tsv').read_bytes() != (folder/f'{b}.{style}.events.tsv').read_bytes():
                raise ValueError('Palette comparison changed event schedule')
            for instrument in ('piano', 'guitar', 'vocals'):
                if digest(folder/f'{a}.{style}.{instrument}.wav') != digest(folder/f'{b}.{style}.{instrument}.wav'):
                    raise ValueError('Palette comparison changed unaffected stem')
        target = min(-23., *(float(v['loudness']['input_i'])-2-float(v['loudness']['input_tp'])
                            for v in versions.values()))
        order = list(versions); random.Random('q0-score-'+ident).shuffle(order)
        shutil.copyfile(source, listener/f'{ident}-source.wav')
        players = []
        for i, arm in enumerate(order, 1):
            code = f'{ident}-{i}'
            gain, measurement = level_match(folder/f'{arm}.{style}.wav', listener/f'{code}.wav',
                                            target, versions[arm]['loudness'])
            versions[arm]['matched'] = measurement
            keys[code] = {'arm': arm, 'gain_db': gain}
            fields = ''.join(f'<label>{label}<select name="{code}/{key}">'
                '<option value="">Not rated</option>'+''.join(f'<option>{n}</option>' for n in range(1, 6))+
                '</select></label>' for key, label in [('musicality', 'Musicality'), ('realism', 'Instrument realism'),
                    ('groove', 'Groove'), ('creativity', 'Creativity'), ('recognizability', 'Source recognizability'),
                    ('enjoyment', 'Enjoyment')])
            players.append(f'<fieldset><legend>Candidate {i}</legend><audio controls preload="none" src="{code}.wav"></audio>'
                f'<div class="fields">{fields}</div><label>Notes and timestamps<textarea name="{code}/notes" maxlength="2000"></textarea></label></fieldset>')
        sections.append(f'<section><h2>{html.escape(ident)}</h2><p>Original source</p>'
                        f'<audio controls preload="none" src="{ident}-source.wav"></audio>'+''.join(players)+'</section>')
        rows.append({'id': ident, 'style_metadata': style, 'target_lufs': target, 'conditions': versions})
    # Reuse the already tested local-only review controls, with pinned bytes.
    inventory = json.loads((ROOT/'docs/evidence/q0-recovery/measurements.json').read_text())['trial_file_sha256']
    for name in ('review.js', 'review.css'):
        if digest(prior/name) != inventory['listener/'+name]:
            raise ValueError('Review controls changed; audit before reuse')
        shutil.copyfile(prior/name, listener/name)
    shutil.copyfile(baseline/'ATTRIBUTION.txt', listener/'ATTRIBUTION.txt')
    audio = {p.name: digest(p) for p in sorted(listener.glob('*.wav'))}
    packet = hashlib.sha256(json.dumps(audio, sort_keys=True).encode()).hexdigest()
    write(listener/'packet.json', {'packet_id': packet, 'audio_sha256': audio})
    (listener/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Q0 blind expression diagnostic</title>'
        '<link rel="stylesheet" href="review.css"><script defer src="review.js"></script><main>'
        '<h1>Q0 original performance study</h1><p>One original score, two instrument palettes, two expression settings. '
        'All candidates use the same notes, voice placements and 112 BPM. No version is assumed better. '
        'This is a developer-authored experiment, not a trained model or musician-approved performance.</p>'
        '<p>Start with your voice. You can leave other sources and dimensions unrated. '
        'Rate 1 (poor) to 5 (excellent). Blank means missing, never zero. Private owner-only use; nothing is uploaded.</p>'
        '<p><a href="ATTRIBUTION.txt">Credits</a></p><form><label>Reviewer code'
        '<input name="reviewer" required pattern="(?:[A-Za-z0-9_]|-){1,64}" maxlength="64"></label>'+
        ''.join(sections)+'<label><input type="checkbox" required>I listened and entered these judgments myself.</label>'
        '<button disabled>Download my ratings</button><p id="status" role="status">Loading packet identity…</p></form></main></html>')
    write(output/'organizer-key.json', keys)
    write(output/'report.json', {'version': '1.0-q0-authored-study', 'technical': 'PASS',
        'human_quality': 'NOT RUN', 'packet_id': packet, 'records': rows,
        'renderer_sha256': digest(renderer), 'production_changed': False,
        'comparison': 'Fixed score 2x2: acoustic/hybrid palette by grid/authored expression.',
        'previous_baseline': 'Preserved, not a tempo-matched causal arm in this study.'})
    (output/'INCOMPLETE').unlink()
    print('PASS: 20 renders/replays, palette isolation, native validation and loudness matching; quality NOT RUN')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    run(parser.parse_args().output.resolve())
