#!/usr/bin/env python3
"""Compare frozen Q0 mixes with a phrase-form or isolated guitar-layer candidate."""
import argparse
import hashlib
import json
from pathlib import Path
import random
import shutil
import subprocess

from q0_audit import ROOT, digest, inputs, level_match, loudness, write
from q0_measure_comparisons import timing
from q0_phrase_form import adapt
from verify_export import verify_export


def guitar_renderer(output, single_layer=False):
    experiment = ROOT/('renders/q0-guitar-single-20261020' if single_layer else 'renders/q0-guitar-layer-v2-20261020')
    evidence_name = 'q0-guitar-single' if single_layer else 'q0-guitar-layer'
    evidence = json.loads((ROOT/f'docs/evidence/{evidence_name}/report.json').read_text())
    for name in ('voice.o', 'voice.cpp', 'candidate.patch'):
        if digest(experiment/name) != evidence['files_sha256'][name]:
            raise ValueError('Calibrated sampler artifact changed')
    for name, expected in evidence['preserved_sha256'].items():
        if digest(ROOT/name) != expected:
            raise ValueError('Frozen production artifact changed')
    if digest(ROOT/'core/instruments/voice.cpp') != evidence['voice_source_sha256']:
        raise ValueError('Production sampler source changed')
    binary = output/'jamloom_remix'
    command = ['clang++', '-std=c++17', '-O3', '-DNDEBUG', '-fno-fast-math',
        '-Wall', '-Wextra', '-Wpedantic', '-I'+str(ROOT/'core/include'),
        str(ROOT/'tools/cli/remix_main.cpp'), str(ROOT/'tools/cli/plan_import.cpp'),
        str(experiment/'voice.o'), str(ROOT/'build-mac/libjamloom_core.a'), '-o', str(binary)]
    subprocess.run(command, check=True)
    write(output/'build.json', {'command': command,
        'compiler': subprocess.check_output(['clang++','--version'], text=True).strip(),
        'renderer_sha256': digest(binary),
        'inputs_sha256': {name:digest(Path(name)) for name in command
                         if name.endswith(('.cpp','.o','.a'))},
        'production_changed': False})
    return binary


def run(output, guitar_layer=False):
    prior = ROOT/('renders/q0-phrase-form-20261020' if guitar_layer else 'renders/q0-authored-v2-20261020')
    evidence = 'q0-phrase-form' if guitar_layer else 'q0-authored'
    inventory = json.loads((ROOT/f'docs/evidence/{evidence}/measurements.json').read_text())['trial_file_sha256']
    report = json.loads((prior/'report.json').read_text())
    renderer = ROOT/'build-mac/jamloom_remix'
    if digest(renderer) != report['renderer_sha256'] or output.exists():
        raise ValueError('Expected frozen renderer and fresh output directory')
    rights = {r['id']: r['sha256'] for r in inputs()}
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    if guitar_layer:
        renderer = guitar_renderer(output)
    listener = output/'listener'; listener.mkdir()
    rows, sections, keys = [], [], {}
    for row in report['records']:
        ident, style = row['id'], row['style' if guitar_layer else 'style_metadata']
        source = ROOT/'renders/q0-baseline-v2-20261020'/ident/'source.wav'
        if digest(source) != rights[ident]:
            raise ValueError('Source or authorization changed')
        control = prior/ident/f'{"candidate" if guitar_layer else "hybrid-phrased"}.{style}'
        for suffix in ('wav', 'score.json', 'events.tsv'):
            path = Path(str(control)+'.'+suffix)
            if digest(path) != inventory[str(path.relative_to(prior))]:
                raise ValueError('Frozen authored control changed')
        old = json.loads(Path(str(control)+'.score.json').read_text())
        if guitar_layer:
            plan, trace = old, {'version':'1.0-q0-guitar-mix', 'plan_changed':False,
                'change':'Previously calibrated soft guitar layer only; no mix-gain compensation'}
        else:
            plan, trace = adapt(old, source)
        folder = output/ident; folder.mkdir()
        write(folder/'candidate.plan.json', plan)
        write(folder/('change.json' if guitar_layer else 'phrase-form.json'), trace)
        cmd = [str(renderer), '--input', str(source), '--consent', '--plan',
               str(folder/'candidate.plan.json'), '--style', style, '--seed', str(plan['seed'])]
        subprocess.run([*cmd, '--stems', '--output', str(folder/'candidate')], check=True, timeout=120)
        subprocess.run([*cmd, '--block-size', '113', '--output', str(folder/'replay')], check=True, timeout=120)
        for name in ('candidate', 'replay'):
            verify_export(folder/name, (style,))
        for suffix in ('wav', 'score.json', 'events.tsv'):
            if (folder/f'candidate.{style}.{suffix}').read_bytes() != (folder/f'replay.{style}.{suffix}').read_bytes():
                raise ValueError('Replay differs')
        if json.loads((folder/f'candidate.{style}.score.json').read_text()) != plan:
            raise ValueError('Native importer changed plan')
        if guitar_layer:
            for suffix in ('events.tsv', 'piano.wav', 'bass.wav', 'drums.wav', 'vocals.wav'):
                control_file = Path(str(control)+'.'+suffix)
                if (digest(control_file) != inventory[str(control_file.relative_to(prior))] or
                        control_file.read_bytes() != (folder/f'candidate.{style}.{suffix}').read_bytes()):
                    raise ValueError('Non-guitar component changed: '+suffix)
        paths = {'control': Path(str(control)+'.wav'), 'candidate': folder/f'candidate.{style}.wav'}
        levels = {arm: loudness(p) for arm, p in paths.items()}
        target = min(-23., *(float(m['input_i'])-2-float(m['input_tp']) for m in levels.values()))
        order = list(paths); random.Random(('guitar-mix-' if guitar_layer else 'phrase-form-')+ident).shuffle(order)
        players, matched = [], {}
        shutil.copyfile(source, listener/f'{ident}-source.wav')
        for i, arm in enumerate(order, 1):
            code = f'{ident}-{i}'
            gain, matched[arm] = level_match(paths[arm], listener/f'{code}.wav', target, levels[arm])
            keys[code] = {'arm': arm, 'gain_db': gain}
            fields = ''.join(f'<label>{label}<select name="{code}/{key}"><option value="">Not rated</option>'+
                ''.join(f'<option>{v}</option>' for v in range(1, 6))+'</select></label>'
                for key, label in [('musicality', 'Musicality'), ('realism', 'Instrument realism'), ('groove', 'Groove'),
                    ('creativity', 'Creativity'), ('recognizability', 'Source recognizability'), ('enjoyment', 'Enjoyment')])
            players.append(f'<fieldset><legend>Candidate {i}</legend><audio controls preload="none" src="{code}.wav"></audio>'
                f'<div class="fields">{fields}</div><label>Notes and timestamps<textarea name="{code}/notes" maxlength="2000"></textarea></label></fieldset>')
        sections.append(f'<section><h2>{ident}</h2><p>Original source</p><audio controls preload="none" src="{ident}-source.wav"></audio>'+
                        ''.join(players)+'</section>')
        rows.append({'id': ident, 'style': style, 'changes': trace, 'matched': matched,
            'target_lufs': target, 'raw_loudness': levels,
            'control_timing': timing(old, Path(str(control)+'.events.tsv')),
            'candidate_timing': timing(plan, folder/f'candidate.{style}.events.tsv'),
            'native': json.loads((folder/f'candidate.{style}.report.json').read_text()),
            'replay_512_113': 'PASS', 'control_sha256': digest(paths['control'])})
    for name in ('review.css', 'review.js', 'ATTRIBUTION.txt'):
        if digest(prior/'listener'/name) != inventory['listener/'+name]:
            raise ValueError('Review assets changed')
        shutil.copyfile(prior/'listener'/name, listener/name)
    audio = {p.name: digest(p) for p in sorted(listener.glob('*.wav'))}
    packet = hashlib.sha256(json.dumps(audio, sort_keys=True).encode()).hexdigest()
    write(listener/'packet.json', {'packet_id': packet, 'audio_sha256': audio})
    heading = 'Guitar calibration in the full mix' if guitar_layer else 'Q0 phrase-transition comparison'
    description = ('Same score, instruments, tempo, voice and mix settings. One condition applies the isolated guitar calibration. '
        'Judge the guitar level, natural dynamics and how well it fits the arrangement. ' if guitar_layer else
        'Same instruments, harmony and tempo. One condition uses padded activity boundaries and shorter vocal sections. '
        'Judge natural transitions and whether any quiet speech or laughter was lost. ')
    (listener/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Q0 blind expression diagnostic</title><link rel="stylesheet" href="review.css"><script defer src="review.js"></script><main>'
        '<h1>'+heading+'</h1><p>'+description+'No version is assumed better. '
        'Private owner-only use. Nothing is uploaded. Rate 1 (poor) to 5 (excellent); leave anything unheard blank.</p>'
        '<a href="ATTRIBUTION.txt">Credits</a><form><label>Reviewer code<input name="reviewer" required pattern="(?:[A-Za-z0-9_]|-){1,64}" maxlength="64"></label>'+
        ''.join(sections)+'<label><input type="checkbox" required>I listened and entered these judgments myself.</label>'
        '<button disabled>Download my ratings</button><p id="status" role="status">Loading packet identity…</p></form></main></html>')
    write(output/'organizer-key.json', keys)
    write(output/'report.json', {'version': '1.0-q0-guitar-mix' if guitar_layer else '1.0-q0-phrase-trial', 'technical': 'PASS',
        'human_quality': 'NOT RUN', 'packet_id': packet, 'records': rows,
        'renderer_sha256': digest(renderer), 'production_changed': False})
    (output/'INCOMPLETE').unlink()
    print('PASS: five candidate renders/replays, source-preserving controls, timing and matched levels; listening NOT RUN')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--guitar-layer', action='store_true', help='Keep frozen phrase plans; use the isolated guitar calibration')
    args = p.parse_args()
    run(args.output.resolve(), args.guitar_layer)
