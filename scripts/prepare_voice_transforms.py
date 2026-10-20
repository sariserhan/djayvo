#!/usr/bin/env python3
"""Prepare private voice-transform controls from an existing consented score."""
import argparse
import copy
import hashlib
import html
import json
import math
from pathlib import Path
import subprocess
import time
from verify_export import verify_export


def frame_at(plan, tick):
    rate=plan['sample_rate'];tempo=plan['tempo_milli_bpm']
    if not plan.get('tempo_changes'):
        return (tick*rate*60000+960*tempo//2)//(960*tempo)
    whole=fraction=start=0
    for change in [*plan['tempo_changes'], {'start_tick':tick,'tempo_milli_bpm':tempo}]:
        end=min(tick,change['start_tick']);denominator=960*tempo
        frames,remainder=divmod((end-start)*rate*60000,denominator)
        whole+=frames;fraction+=((remainder<<32)+denominator-1)//denominator
        if end==tick:break
        start=end;tempo=change['tempo_milli_bpm']
    return whole+((fraction+(1<<31))>>32)


def add_echoes(plan, interval):
    rate=plan['sample_rate']
    frame=lambda tick:frame_at(plan,tick)
    def duration(event):
        clip=plan['voice_clips'][event['clip_id']]
        return math.ceil((clip['end_frame']-clip['start_frame'])*event.get('time_stretch',1)/event['rate'])
    hooks=[(frame(e['start_tick']),frame(e['start_tick'])+duration(e)) for e in plan['voice_events'] if e['clean']]
    total=frame(plan['target_bars']*960*4*plan['time_signature'][0]//plan['time_signature'][1])+plan['tail_ms']*rate//1000
    selected=[];last=-6*rate
    for event in sorted(plan['voice_events'],key=lambda e:e['start_tick']):
        start=frame(event['start_tick'])
        if event['clean'] or start<4*rate or start<last+6*rate:
            continue
        repeats=[(frame(event['start_tick']+i*interval),frame(event['start_tick']+i*interval)+duration(event)) for i in (1,2,3)]
        if repeats[-1][1]+rate//10>total or any(end+rate*.08>lo and begin<hi+rate*.08 for begin,end in repeats for lo,hi in hooks):
            continue
        event.update(echo_ticks=interval,echo_gain_db=-12)
        selected.append(event['start_tick']);last=start
        if len(selected)==3:break
    if not selected:raise ValueError('no fragment has room for this echo treatment')
    if plan['schema_version'] in ('1.0-remix','1.1-remix'):plan['schema_version']='1.2-remix'
    return selected


def prepare(renderer, source, plan_path, output, echo=False):
    plan = json.loads(plan_path.read_text())
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if (plan['source']['sha256'] != source_hash or plan['source']['kind'] != 'recorded'
            or plan['source']['consent_confirmed'] is not True):
        raise ValueError('source and existing consented recording plan must match')
    if any(e.get('pitch_semitones', 0) != 0 or e.get('time_stretch', 1) != 1 or e.get('echo_ticks',0)!=0 for e in plan['voice_events']):
        raise ValueError('start from an untransformed control plan')
    if not any(not e['clean'] for e in plan['voice_events']):
        raise ValueError('plan has no optional fragments to compare')
    output.mkdir(parents=True, exist_ok=False)
    pending = output / '.partial'
    pending.write_text('Incomplete voice comparison; retain earlier exports on failure.\n')
    cases = [('control',0,1,0),('eighth-echo',0,1,480),('dotted-echo',0,1,720),('pitched-echo',2,1,480)] if echo else [
        ('control',0,1,0),('pitch-up',2,1,0),('longer',0,1.12,0),('lower-shorter',-2,0.9,0)]
    report = {'source_sha256': source_hash, 'source_plan_sha256': hashlib.sha256(plan_path.read_bytes()).hexdigest(),
              'listening': 'NOT RUN', 'level_matching': 'identical plan gains; no loudness normalization', 'cases': {}}
    sections = []
    for name, pitch, stretch, interval in cases:
        candidate = copy.deepcopy(plan)
        if pitch or stretch != 1:
            if candidate['schema_version']=='1.0-remix':candidate['schema_version'] = '1.1-remix'
            for event in candidate['voice_events']:
                if not event['clean']:
                    event.update(pitch_semitones=pitch, time_stretch=stretch)
        selected=add_echoes(candidate,interval) if interval else []
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
                               'echo_ticks':interval,'echo_source_start_ticks':selected,
                               'render_with_stems_seconds': time.monotonic() - started,
                               'artifacts': record['artifacts']}
        treatment=f'{pitch:+g} semitones, {stretch:g}× duration'+(', three echoes' if interval else '')
        sections.append(f'<section><h2>{html.escape(name)}: {treatment}</h2>'
                        f'<p>Mix</p><audio controls preload="metadata" src="{prefix}.wav"></audio>'
                        f'<p>Voice alone</p><audio controls preload="metadata" src="{prefix}.vocals.wav"></audio></section>')
    (output / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom voice comparisons</title>'
        '<style>body{max-width:760px;margin:40px auto;padding:0 20px;font:18px system-ui;background:#151515;color:#eee}'
        'audio{width:100%}section{margin:32px 0}</style><h1>Jamloom voice comparisons</h1>'
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
    parser.add_argument('--echo', action='store_true', help='compare sparse tempo echoes instead of pitch/time alone')
    args = parser.parse_args()
    prepare(args.renderer, args.input, args.plan, args.output, args.echo)
