#!/usr/bin/env python3
"""Render an A/C diagnostic without pretending missing B/D/E experiments exist."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import random
import shutil
import subprocess

from q0_audit import ROOT, digest, event_metrics, inspect, loudness, level_match, write
from q0_expression import express, PROFILE
from q0_performance import perform
from q0_composition import compose
from q0_measure_comparisons import timing
from verify_export import verify_export


def trial(baseline, output, renderer, instrument_renderer=None, performance=False):
    frozen = json.loads((baseline/'freeze.json').read_text())
    audit = json.loads((baseline/'audit.json').read_text())
    if (baseline/'INCOMPLETE').exists() or frozen['renderer_sha256'] != digest(renderer):
        raise ValueError('Baseline incomplete or renderer changed')
    instrument_manifest = None
    if instrument_renderer:
        instrument_manifest = json.loads((instrument_renderer.parent.parent/'build-manifest.json').read_text())
        if (instrument_manifest['renderer_sha256'] != digest(instrument_renderer) or
                instrument_manifest['changed_sources'] != ['core/instruments/voice.cpp']):
            raise ValueError('Unexpected instrument experiment build')
    if output.exists():
        raise ValueError('Choose a fresh trial directory')
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    listener = output/'listener'; listener.mkdir()
    reports, keys, sections = [], {}, []
    for record in audit['records']:
        identifier, style = record['id'], record['style']
        original = baseline/identifier/f'A.{style}.score.json'
        source = baseline/identifier/'source.wav'
        if digest(original) != record['plan_sha256'] or digest(source) != record['source_sha256']:
            raise ValueError('Frozen baseline changed')
        plan = json.loads(original.read_text())
        transform = perform if performance else express
        candidate, trace = transform(plan, 4123)
        folder = output/identifier; folder.mkdir()
        write(folder/'expression.json', trace)
        plans = {'C': candidate}
        if instrument_renderer:
            composition, composition_trace = compose(plan)
            developed, expression_trace = transform(composition, 4123)
            plans = {'B': plan, 'C': candidate, 'D': candidate, 'E': developed}
            write(folder/'composition.json', composition_trace)
            write(folder/'E.expression.json', expression_trace)
        paths = {'A': baseline/identifier/f'A.{style}.wav'}
        events = {'A': timing(plan, baseline/identifier/f'A.{style}.events.tsv')}
        for arm, arm_plan in plans.items():
            write(folder/f'{arm}.plan.json', arm_plan)
            executable = renderer if arm == 'C' else instrument_renderer
            command = [str(executable.resolve()), '--input', str(source), '--consent', '--plan',
                str(folder/f'{arm}.plan.json'), '--style', style, '--seed', str(plan['seed']),
                '--sample-rate', str(plan['sample_rate'])]
            subprocess.run([*command, '--stems', '--output', str(folder/arm)], check=True, timeout=120)
            verify_export(folder/arm, (style,))
            replay = 'replay' if arm == 'C' else 'replay-'+arm
            subprocess.run([*command, '--block-size', '113', '--output', str(folder/replay)],
                           check=True, timeout=120)
            verify_export(folder/replay, (style,))
            for suffix in ('wav', 'events.tsv', 'score.json'):
                if (folder/f'{arm}.{style}.{suffix}').read_bytes() != (folder/f'{replay}.{style}.{suffix}').read_bytes():
                    raise ValueError('Replay differs: '+arm+' '+suffix)
            if json.loads((folder/f'{arm}.{style}.score.json').read_text()) != arm_plan:
                raise ValueError('Native importer changed candidate plan')
            paths[arm] = folder/f'{arm}.{style}.wav'
            events[arm] = timing(arm_plan, folder/f'{arm}.{style}.events.tsv')
        if instrument_renderer:
            for left, right in [('A', 'B'), ('C', 'D')]:
                ldir = baseline/identifier if left == 'A' else folder
                for suffix in ('score.json', 'events.tsv'):
                    if (ldir/f'{left}.{style}.{suffix}').read_bytes() != (folder/f'{right}.{style}.{suffix}').read_bytes():
                        raise ValueError('Instrument-only intervention changed plans/events')
                if digest(paths[left]) == digest(paths[right]):
                    raise ValueError('Instrument arm did not change audio')
        levels = {arm: loudness(path) for arm, path in paths.items()}
        target = min(-23., *(float(v['input_i']) - 2. - float(v['input_tp']) for v in levels.values()))
        order = list(paths); random.Random('q0-ac-'+identifier).shuffle(order)
        row, players = {}, []
        shutil.copyfile(source, listener/(identifier+'-source.wav'))
        for index, arm in enumerate(order):
            code = identifier+'-'+str(index+1); path = listener/(code+'.wav')
            gain, matched = level_match(paths[arm],path,target,levels[arm])
            keys[code] = {'arm': arm, 'gain_db': gain, 'sha256': digest(path)}
            row[arm] = {'raw': inspect(paths[arm]), 'raw_loudness': levels[arm], 'matched_loudness': matched}
            fields = ''.join(f'<label>{label} <select name="{code}/{key}">'
                '<option value="">Choose</option>'+''.join(f'<option>{i}</option>' for i in range(1,6))+
                '</select></label>' for key,label in [
                    ('musicality','Musicality'),('realism','Instrument realism'),('groove','Groove'),
                    ('creativity','Creativity'),('recognizability','Source recognizability'),('enjoyment','Enjoyment')])
            players.append(f'<fieldset><legend>Candidate {index+1}</legend><audio controls preload="none" src="{code}.wav"></audio>'
                f'<div class="fields">{fields}</div><label>Notes and timestamps<textarea name="{code}/notes" maxlength="2000"></textarea></label></fieldset>')
        reports.append({'id': identifier, 'style': style, 'target_lufs': target, 'arms': row,
            'candidate_metrics': event_metrics(candidate), 'replay_512_113': 'PASS',
            'event_frame_checks': events,
            'plan_metrics': {arm: event_metrics(p) for arm, p in {'A': plan, **plans}.items()},
            'human_preference': 'NOT RUN'})
        sections.append(f'<section><h2>{html.escape(identifier)}</h2><p>Original source</p>'
            f'<audio controls preload="none" src="{identifier}-source.wav"></audio>'+''.join(players)+'</section>')
    shutil.copyfile(baseline/'ATTRIBUTION.txt', listener/'ATTRIBUTION.txt')
    public_manifest = {path.name: digest(path) for path in sorted(listener.glob('*.wav'))}
    packet_id = hashlib.sha256(json.dumps(public_manifest, sort_keys=True).encode()).hexdigest()
    write(listener/'packet.json', {'packet_id': packet_id, 'audio_sha256': public_manifest})
    (listener/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Q0 blind expression diagnostic</title>'
        '<link rel="stylesheet" href="review.css"><script defer src="review.js"></script><main>'
        '<h1>Q0 controlled listening diagnostic</h1><p>'+
        ('Five conditions: existing rendering, instrument decay, expression, their combination, and composition plus both. '
         'Same source and tempo throughout; the composition condition changes notes and vocal arrangement. '
         if instrument_renderer else
         'Same source, tempo, notes and instruments; only performance expression differs. '
         'This is a two-condition diagnostic, not the complete five-condition Q0 study. ')+
        'No candidate is assumed better. '
        'Private owner-only use; do not share this packet. Nothing is uploaded.</p><p><a href="ATTRIBUTION.txt">Credits</a></p>'
        '<p>Rate 1 (poor) to 5 (excellent). Pause one recording before playing the next. '
        'Recognizability means identifying the source, including laughter. Ratings start blank. '
        'Rate all six dimensions for each candidate you hear; leave unheard candidates blank. '
        'Compare the whole performance, including transitions, coherence and robotic sound.</p>'
        '<form><label>Reviewer code<input name="reviewer" required pattern="(?:[A-Za-z0-9_]|-){1,64}" maxlength="64"></label>'+
        ''.join(sections)+'<label><input type="checkbox" name="listened" value="yes" required>I listened and entered these judgments myself.</label>'
        '<button disabled>Download my ratings</button><p id="status" role="status">Loading packet identity…</p></form></main></html>')
    (listener/'review.css').write_text('body{background:#10171b;color:#eee;font:18px/1.5 system-ui;margin:auto;max-width:900px;padding:24px}'
        'audio{width:100%}fieldset{margin:24px 0;border:1px solid #667;padding:20px}label{display:block;margin:12px 0}'
        '.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px}select,input,button,textarea{font:inherit;max-width:100%;box-sizing:border-box}'
        'textarea{width:100%}a{color:#8de4e6}')
    shutil.copyfile(ROOT/'scripts/q0-review.js', listener/'review.js')
    write(output/'organizer-key.json', keys)
    write(output/'report.json', {'technical': 'PASS', 'scope':
        'A/B/C/D/E decay-expression-composition trial' if instrument_renderer else 'A/C expression-only diagnostic',
        'packet_id': packet_id,
        'B_D_E': 'PASS: rendered, not quality acceptance' if instrument_renderer else
                 'NOT RUN: instrument/causal diagnosis pending; no substitute identical arms',
        'instrument_build': instrument_manifest,
        'performance_version': '2.0-q0-performance' if performance else '1.0-q0-expression',
        'performance_source_sha256': digest(ROOT/'scripts/q0_performance.py') if performance else None,
        'expression_profile_sha256': digest(PROFILE), 'records': reports, 'human_quality': 'NOT RUN'})
    (output/'INCOMPLETE').unlink()
    print('PASS: isolated renders, replay, event frames and LUFS matching; human quality NOT RUN:', output)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--baseline', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--renderer', type=Path, default=ROOT/'build-mac/jamloom_remix')
    p.add_argument('--instrument-renderer', type=Path)
    p.add_argument('--performance', action='store_true', help='Q0 v2 phrase expression and transition pickups')
    a = p.parse_args()
    trial(a.baseline.resolve(), a.output.resolve(), a.renderer, a.instrument_renderer, a.performance)
