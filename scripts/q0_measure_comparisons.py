#!/usr/bin/env python3
"""Check frozen A/C events independently and describe waveform differences, not quality."""
import argparse
from array import array
import collections
import csv
import json
import math
from pathlib import Path
import sys
import wave

from q0_audit import digest, write


def timing(plan, path):
    notes = [(t['instrument'], n) for t in plan['tracks'] for n in t['events']]
    with path.open() as stream:
        rows = list(csv.DictReader(stream, delimiter='\t'))
    expected = {}
    denominator = plan['ticks_per_quarter'] * plan['tempo_milli_bpm']
    for i, (instrument, n) in enumerate(notes):
        for kind, tick in [('on', n['start_tick']), ('off', n['start_tick']+n['duration_ticks'])]:
            expected[(i, kind)] = (tick*plan['sample_rate']*60000 + denominator//2)//denominator
    seen, errors = set(), []
    for row in rows:
        key = (int(row['id']), row['kind'])
        if key in seen or key not in expected:
            raise ValueError('Duplicate or unknown event')
        seen.add(key)
        instrument, note = notes[key[0]]
        if (row['instrument'] != instrument or int(row['pitch']) != note['note'] or
                int(row['velocity']) != (note['velocity'] if key[1] == 'on' else 0)):
            raise ValueError('Event metadata differs')
        errors.append(abs(int(row['frame'])-expected[key]))
    if seen != set(expected) or max(errors, default=0):
        raise ValueError('Missing events or frame mismatch')
    return {'events': len(rows), 'maximum_frame_error': max(errors, default=0)}


def pcm(path):
    with wave.open(str(path)) as wav:
        if wav.getsampwidth() != 2 or wav.getnchannels() != 2:
            raise ValueError('Expected PCM16 stereo')
        values = array('h', wav.readframes(wav.getnframes()))
        rate = wav.getframerate()
    if sys.byteorder != 'little': values.byteswap()
    return rate, values


def measure(baseline, trial, output):
    if output.exists(): raise ValueError('Choose a fresh report')
    audit = json.loads((baseline/'audit.json').read_text())
    rows, patterns, components = [], collections.defaultdict(list), collections.defaultdict(list)
    for record in audit['records']:
        identifier, style = record['id'], record['style']
        a = baseline/identifier/f'A.{style}'
        c = trial/identifier/f'C.{style}'
        pa, pc = [json.loads(Path(str(p)+'.score.json').read_text()) for p in (a,c)]
        if digest(Path(str(a)+'.score.json')) != record['plan_sha256']:
            raise ValueError('Frozen plan changed')
        ta, tc = [timing(plan, Path(str(p)+'.events.tsv')) for plan,p in [(pa,a),(pc,c)]]
        ra, xa = pcm(Path(str(a)+'.wav')); rc, xc = pcm(Path(str(c)+'.wav'))
        if ra != rc or len(xa) != len(xc): raise ValueError('Audio timelines differ')
        maximum, square = 0, 0
        for x,y in zip(xa,xc):
            d = x-y; maximum = max(maximum,abs(d)); square += d*d
        offsets = [b['start_tick']-a['start_tick'] for old,new in zip(pa['tracks'],pc['tracks'])
                   for a,b in zip(old['events'],new['events'])]
        clips = {v['id']: v for v in pa['voice_clips']}
        chops = [(clips[v['clip_id']]['end_frame']-clips[v['clip_id']]['start_frame']) /
                 pa['sample_rate'] for v in pa['voice_events'] if not v['clean']]
        patterns[json.dumps(pa['tracks'],sort_keys=True)].append(identifier)
        for track in pa['tracks']:
            components[(track['instrument'],json.dumps(track['events'],sort_keys=True))].append(identifier)
        rows.append({'id': identifier, 'A_timing':ta, 'C_timing':tc,
            'raw_A_C_max_pcm16_difference':maximum, 'raw_A_C_rms_pcm16_difference':math.sqrt(square/len(xa)),
            'max_instrument_start_shift_ms':max(offsets,default=0)*60000/(960*(pa['tempo_milli_bpm']/1000)),
            'nonclean_voice_durations_seconds':chops,
            'vocal_rate_pitch_stretch_reverse_changes': sum(v['rate'] != 1 or v.get('pitch_semitones',0) != 0 or
                v.get('time_stretch',1) != 1 or v['reverse'] for v in pa['voice_events']),
            'human_quality':'NOT RUN'})
    write(output, {'status':'PASS','records':rows,
        'identical_instrument_track_groups': [ids for ids in patterns.values() if len(ids)>1],
        'identical_component_events': [{'instrument': instrument, 'inputs': ids}
            for (instrument, _), ids in components.items() if len(ids)>1],
        'interpretation':'Event-frame agreement checks scheduling data, not acoustic attack latency. '
            'Waveform differences do not establish improvement. Shared component events show repeated templates '
            'within these fixed-seed/style pairs, not wholly input-independent arrangements or identical output across seeds.'})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('baseline',type=Path); parser.add_argument('trial',type=Path)
    parser.add_argument('output',type=Path)
    args=parser.parse_args(); measure(args.baseline,args.trial,args.output)
