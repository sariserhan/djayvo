#!/usr/bin/env python3
"""Q0 copied-plan study: padded source boundaries and phrase-length call sections."""
from array import array
import copy
import math
import sys
import wave

from q0_audit import digest

BAR = 3840


def adapt(plan, source):
    meta = plan['source']
    if (meta['kind'] != 'recorded' or meta['consent_confirmed'] is not True or
            digest(source) != meta['sha256'] or plan['sample_rate'] != 48000):
        raise ValueError('Expected hash-matched consented source')
    if (plan['tempo_milli_bpm'] != 112000 or plan['target_bars'] != 16 or
            plan.get('tempo_changes') or plan['time_signature'] != [4, 4] or
            plan['ticks_per_quarter'] != 960 or
            [(s['name'], s['start_bar'], s['bars']) for s in plan['sections']] !=
            [('invitation', 0, 2), ('voice_call', 2, 3), ('answer', 5, 4),
             ('contrast', 9, 3), ('developed_return', 12, 3), ('resolve', 15, 1)]):
        raise ValueError('Expected the frozen authored-study form')
    if [(v['start_tick'], v['clip_id']) for v in plan['voice_events']] != [(2*BAR, 0), (9*BAR, 0)]:
        raise ValueError('Expected the two intact authored calls')
    if any(v['rate'] != 1 or v['reverse'] or v.get('pitch_semitones', 0) or
           v.get('time_stretch', 1) != 1 or v.get('echo_ticks', 0) for v in plan['voice_events']):
        raise ValueError('Transformed calls are outside this experiment')
    if plan['voice_clips'] != [{'id': 0, 'start_frame': 0,
            'end_frame': meta['processed_frames'], 'confidence': 1}]:
        raise ValueError('Expected one preserved complete-source clip')
    with wave.open(str(source)) as wav:
        channels, width, rate, frames, compression, _ = wav.getparams()
        if (channels not in (1, 2) or width != 2 or compression != 'NONE' or
                rate != meta['original_rate'] or frames != meta['original_frames'] or
                not 2*rate <= frames <= 5*rate or
                round(frames*48000/rate) != meta['processed_frames']):
            raise ValueError('Source format/length mismatch')
        pcm = array('h', wav.readframes(frames))
    if sys.byteorder != 'little':
        pcm.byteswap()
    if len(pcm) != frames*channels:
        raise ValueError('Truncated source')
    energy = [sum(pcm[f*channels+c]**2 for c in range(channels))/channels for f in range(frames)]
    total = sum(energy)
    if total <= 0:
        raise ValueError('Silent source')
    hop = max(1, rate//100)
    rms = [math.sqrt(sum(energy[i:i+hop])/len(energy[i:i+hop]))/32768
           for i in range(0, frames, hop)]
    threshold = max(.002, max(rms)*.08)
    active = [i for i, value in enumerate(rms) if value >= threshold]
    if not active:
        raise ValueError('No reliable activity')
    phrases = plan['analysis']['phrases']
    if not phrases or any(not 0 <= p['start_frame'] < p['end_frame'] <= meta['processed_frames']
                          for p in phrases):
        raise ValueError('Invalid phrase bounds')
    first = min(active[0]*hop, min(math.floor(p['start_frame']*rate/48000) for p in phrases))
    last = max(min(frames, (active[-1]+1)*hop),
               max(math.ceil(p['end_frame']*rate/48000) for p in phrases))
    begin, end = max(0, first-round(.12*rate)), min(frames, last+round(.12*rate))
    proposed_retention = sum(energy[begin:end])/total
    fallback = proposed_retention < .995 or end-begin < rate//2
    if fallback:
        begin, end = 0, frames
    lo, hi = round(begin*48000/rate), min(meta['processed_frames'], round(end*48000/rate))
    seconds = (hi-lo)/48000
    bars = min(3, max(1, math.ceil((seconds+.08)/(240000/112000))))
    candidate = copy.deepcopy(plan)
    candidate['voice_clips'].append({'id': 1, 'start_frame': lo, 'end_frame': hi,
                                     'confidence': min(p['confidence'] for p in phrases)})
    mappings, new_sections, cursor = [], [], 0
    for section in plan['sections']:
        old_start = section['start_bar']*BAR
        count = bars if section['name'] in ('voice_call', 'contrast') else section['bars']
        new_sections.append({**section, 'start_bar': cursor, 'bars': count})
        mappings.append((old_start, old_start+section['bars']*BAR, cursor*BAR, count*BAR))
        cursor += count

    def mapped(tick):
        for start, stop, target, length in mappings:
            if start <= tick < stop:
                return target+tick-start if tick-start < length else None
        raise ValueError('Event outside form')

    dropped = []
    for track in candidate['tracks']:
        events = []
        for note in track['events']:
            start = mapped(note['start_tick'])
            if start is None:
                if track['instrument'] != 'drums' or note['note'] != 42 or note['velocity'] > 44:
                    raise ValueError('Shortening would remove a musical phrase')
                dropped.append(copy.deepcopy(note))
                continue
            off = mapped(note['start_tick']+note['duration_ticks']-1)
            if off != start+note['duration_ticks']-1:
                raise ValueError('Shortening would cut a sustained note')
            note['start_tick'] = start
            events.append(note)
        track['events'] = events
    for voice in candidate['voice_events']:
        voice['start_tick'] = mapped(voice['start_tick'])
        voice['clip_id'] = 1
    candidate['sections'] = new_sections
    candidate['target_bars'] = cursor
    return candidate, {
        'version': '1.0-q0-phrase-form', 'padding_ms': 120,
        'original_rate': rate, 'original_frames': frames,
        'activity_seconds': [first/rate, last/rate],
        'trim_original_frames': [begin, end], 'trim_engine_frames': [lo, hi],
        'proposed_energy_retained_fraction': proposed_retention,
        'energy_retained_fraction': sum(energy[begin:end])/total,
        'fallback_to_complete_source': fallback, 'call_bars_before': 3, 'call_bars_after': bars,
        'first_response_seconds_before': 5*240000/112000,
        'first_response_seconds_after': (2+bars)*240000/112000,
        'scheduled_gap_after_clip_before_seconds': 3*240000/112000-frames/rate,
        'scheduled_gap_after_clip_after_seconds': bars*240000/112000-seconds,
        'removed_quiet_hat_events': dropped,
        'limits': 'Energy and detected phrases cannot prove preservation of every quiet word. Listening required.',
        'human_quality': 'NOT RUN'}
