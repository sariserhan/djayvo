#!/usr/bin/env python3
"""Research-only piano articulation over an existing consented Call & Response score."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import subprocess

from arrange_voice_research import read_crops, read_pcm
from prepare_voice_transforms import frame_at
from verify_export import verify_export


def articulate(plan):
    if (plan.get('strategy') != 'call_response' or plan.get('time_signature') != [4, 4]
            or plan.get('ticks_per_quarter') != 960 or plan.get('target_bars') != 16
            or plan.get('sample_rate') != 48000 or plan.get('tempo_changes')
            or type(plan.get('tempo_milli_bpm')) is not int
            or not 60000 <= plan['tempo_milli_bpm'] <= 180000):
        raise ValueError('Expected a constant-tempo, 16-bar Call & Response control')
    candidate = copy.deepcopy(plan)
    tracks = [t for t in candidate['tracks'] if t['instrument'] == 'piano']
    if len(tracks) != 1:
        raise ValueError('Expected exactly one piano track')
    changes = []
    for first_bar in (5, 13):
        begin, end = first_bar*3840, (first_bar+2)*3840
        notes = sorted((n for n in tracks[0]['events'] if begin <= n['start_tick'] < end),
                       key=lambda n: n['start_tick'])
        if not 1 <= len(notes) <= 8 or any(n['duration_ticks'] != 320 for n in notes):
            raise ValueError('Expected the original uniform-duration response notes')
        for index, note in enumerate(notes):
            start = note['start_tick']
            next_start = notes[index+1]['start_tick'] if index+1 < len(notes) else end
            gap = min(next_start, (start//3840+1)*3840)-start
            if type(start) is not int or start % 240 or gap < 240:
                raise ValueError('Expected distinct sixteenth-grid response attacks')
            # shortcut: infer sustain from attack gaps; replace only with validated phrase timing.
            duration = max(120, min(1440, (gap*3//4)//120*120))
            lo, hi = frame_at(plan, start), frame_at(plan, start+duration)
            for voice in plan['voice_events']:
                clip = plan['voice_clips'][voice['clip_id']]
                if (voice['rate'] != 1 or voice.get('time_stretch', 1) != 1
                        or voice.get('echo_ticks', 0)):
                    raise ValueError('Expected untransformed, echo-free voice controls')
                call = frame_at(plan, voice['start_tick'])
                stop = call + clip['end_frame']-clip['start_frame']
                if lo < stop+3840 and hi+3840 > call:
                    raise ValueError('Proposed piano note enters a voice interval or its 80 ms margin')
            note['duration_ticks'] = duration
            changes.append({'start_tick': start, 'before_ticks': 320, 'after_ticks': duration,
                            'start_frame': lo, 'end_frame': hi})
    return candidate, changes


def prepare(renderer, source, score_path, output, consent=False):
    if not consent:
        raise ValueError('Explicit consent is required')
    if output.exists():
        raise ValueError('Output must be a fresh directory')
    pcm = read_pcm(source, (2, 5))
    read_crops(score_path, source, len(pcm))
    plan = json.loads(score_path.read_text())
    candidate, changes = articulate(plan)
    output.mkdir(parents=True)
    pending = output/'.partial'
    pending.write_text('Incomplete private research export; do not treat as a finished comparison.\n')
    for name, score in [('control', plan), ('candidate', candidate)]:
        path = output/f'{name}.json'
        path.write_text(json.dumps(score, indent=2)+'\n')
        subprocess.run([str(renderer.resolve()), '--input', str(source.resolve()), '--consent',
                        '--plan', str(path.resolve()), '--style', 'call_response', '--seed', str(plan['seed']),
                        '--sample-rate', '48000', '--stems', '--output', str(output/name)],
                       check=True, timeout=120)
        verify_export(output/name)
        exported = json.loads((output/f'{name}.call_response.score.json').read_text())
        if exported != score:
            raise ValueError('Native renderer changed the requested score')
    report = {'technical': 'PASS', 'human_listening': 'NOT RUN', 'default_engine_changed': False,
              'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'control_plan_sha256': hashlib.sha256(score_path.read_bytes()).hexdigest(),
              'changes': changes}
    (output/'articulation.json').write_text(json.dumps(report, indent=2)+'\n')
    pending.unlink()
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('renderer', 'input', 'plan', 'output'):
        parser.add_argument('--'+name, type=Path, required=True)
    parser.add_argument('--consent', action='store_true', required=True)
    args = parser.parse_args()
    result = prepare(args.renderer, args.input, args.plan, args.output, args.consent)
    print('PASS:', len(result['changes']), 'response note durations; listening NOT RUN')
