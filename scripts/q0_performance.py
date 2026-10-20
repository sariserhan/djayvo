#!/usr/bin/env python3
"""Q0 expression v2: intentional phrase shapes and bounded transition pickups."""
import copy
import math

from q0_expression import express


def perform(original, seed):
    # Validate the supported clock/profile before planning any ornament.
    express(original, seed)
    plan = copy.deepcopy(original)
    q, bar = 960, 3840
    end = plan['target_bars']*bar
    clips = {c['id']: c for c in plan['voice_clips']}
    calls = []
    for voice in plan['voice_events']:
        if (voice.get('rate', 1) != 1 or voice.get('time_stretch', 1) != 1 or
                voice.get('reverse') or voice.get('pitch_semitones', 0) or voice.get('echo_ticks', 0)):
            raise ValueError('Performance trial requires untransformed vocal timing')
        clip = clips[voice['clip_id']]
        length = math.ceil((clip['end_frame']-clip['start_frame']) *
                          q*plan['tempo_milli_bpm']/(60000*plan['sample_rate']))
        calls.append((voice['start_tick'], voice['start_tick']+length))
    drums = [t for t in plan['tracks'] if t['instrument'] == 'drums']
    if len(drums) != 1:
        raise ValueError('Performance trial requires one drum track')
    kicks = {n['start_tick'] for n in drums[0]['events'] if n['note'] == 36}
    changes, fills = [], []
    for ti, track in enumerate(plan['tracks']):
        notes = track['events']
        if track['instrument'] == 'bass':
            for ni, note in enumerate(notes):
                before = copy.deepcopy(note)
                note['velocity'] = max(1, min(127, note['velocity'] +
                    (5 if note['start_tick'] in kicks else -3)))
                changes.append({'track': ti, 'note': ni, 'reason': 'bass/kick accent relationship',
                                'before': before, 'after': copy.deepcopy(note)})
        if track['instrument'] not in ('piano', 'guitar', 'organ', 'lead'):
            continue
        # Group rolled chords as one attack; phrase breaks follow rests or sections.
        boundaries = {s['start_bar']*bar for s in plan['sections']}
        groups = []
        for ni in sorted(range(len(notes)), key=lambda i: notes[i]['start_tick']):
            if not groups or notes[ni]['start_tick']-notes[groups[-1][0]]['start_tick'] > q//16:
                groups.append([])
            groups[-1].append(ni)
        phrases = []
        for group in groups:
            start = notes[group[0]]['start_tick']
            previous = notes[phrases[-1][-1][0]]['start_tick'] if phrases else None
            if previous is None or start-previous > q or any(previous < b <= start for b in boundaries):
                phrases.append([])
            phrases[-1].append(group)
        for phrase in phrases:
            if len(phrase) < 2:
                continue
            for position, group in enumerate(phrase):
                # An intentional arrival and release, not independent random velocities.
                accent = -7 if position == len(phrase)-1 else (4 if position == len(phrase)//2 else 0)
                for ni in group:
                    note = notes[ni]; before = copy.deepcopy(note)
                    note['velocity'] = max(1, min(127, note['velocity']+accent))
                    if position == len(phrase)-1:
                        note['duration_ticks'] = max(1, round(note['duration_ticks']*.8))
                    changes.append({'track': ti, 'note': ni, 'reason': 'melodic arrival/release',
                                    'before': before, 'after': copy.deepcopy(note)})
    patterns = {'hiphop': [(240, 38), (720, 66)],
                'reggae': [(480, 58)],
                'experimental': [(240, 40), (480, 52), (720, 70)]}
    for section in plan['sections'][1:]:
        boundary = section['start_bar']*bar
        start = boundary-q
        if start < 0 or boundary >= end or any(start < stop and boundary > begin for begin, stop in calls):
            continue
        # A pickup needs an established groove; do not fill an otherwise empty bar.
        if not any(start-3*q <= tick < boundary for tick in kicks):
            continue
        added = []
        for offset, velocity in patterns[plan['strategy']]:
            tick = start+offset
            if any(n['note'] == 38 and abs(n['start_tick']-tick) < 120 for n in drums[0]['events']):
                continue
            note = {'start_tick': tick, 'duration_ticks': 120, 'note': 38, 'velocity': velocity}
            drums[0]['events'].append(note)
            added.append(copy.deepcopy(note))
        if added:
            fills.append({'section': section['name'], 'boundary_tick': boundary, 'notes': added})
    drums[0]['events'].sort(key=lambda n: (n['start_tick'], n['note']))
    candidate, groove = express(plan, seed)
    return candidate, {'version': '2.0-q0-performance', 'expression_seed': seed,
        'phrase_changes': changes, 'transition_fills': fills, 'vocal_windows': calls,
        'groove': groove, 'quality_status': 'NOT RUN', 'engine_changed': False,
        'limits': 'Hand-authored expression; existing recorded articulations only. No learned timing or realism claim.'}
