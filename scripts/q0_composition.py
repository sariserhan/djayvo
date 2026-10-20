#!/usr/bin/env python3
"""Q0 copied-plan hypothesis: intact calls, a recurring source-rhythm answer, space."""
import copy
import math


def compose(original):
    if (original.get('time_signature') != [4, 4] or original.get('ticks_per_quarter') != 960
            or original.get('tempo_changes') or original.get('target_bars', 0) < 8
            or not 60000 <= original.get('tempo_milli_bpm', 0) <= 180000):
        raise ValueError('Composition trial requires a supported constant-tempo 4/4 score')
    plan = copy.deepcopy(original)
    q, bar = 960, 3840
    end = plan['target_bars']*bar
    ticks_per_frame = plan['tempo_milli_bpm']*q/(60000*plan['sample_rate'])
    clean = [v for v in plan['voice_events'] if v['clean']]
    harmonics = [t for t in plan['tracks'] if t['instrument'] in ('piano', 'organ')]
    if not clean or len(harmonics) != 1:
        raise ValueError('Composition trial requires an intact source call and one piano/organ track')
    harmonic = harmonics[0]
    # Keep the original whole-source calls, never infer word boundaries from transients.
    plan['voice_events'] = clean
    clips = {c['id']: c for c in plan['voice_clips']}
    calls = []
    for voice in clean:
        clip = clips[voice['clip_id']]
        if (voice.get('rate', 1) != 1 or voice.get('reverse') or
                voice.get('time_stretch', 1) != 1 or voice.get('pitch_semitones', 0) != 0 or
                voice.get('echo_ticks', 0) != 0):
            raise ValueError('Only untransformed clean calls are supported')
        calls.append((voice['start_tick'], voice['start_tick'] +
                      math.ceil((clip['end_frame']-clip['start_frame'])*ticks_per_frame)))
    onsets = original['analysis']['onsets']
    if not onsets:
        raise ValueError('No source rhythm to develop')
    # shortcut: onset timing is not syllable annotation; upgrade after corrected phrase labels.
    rhythm = sorted({round((f-onsets[0])*ticks_per_frame/(q//4))*(q//4)
                     for f in onsets})
    rhythm = [t for t in rhythm if 0 <= t < 2*q][:4]
    if len(rhythm) < 2:
        raise ValueError('Insufficient distinct onsets for a source-rhythm motif')
    answers = sorted({math.ceil(stop/bar)*bar for _, stop in calls})
    answers = [start for start in answers if start+bar <= end
               and not any(start < stop and start+bar > begin for begin, stop in calls)]
    if not answers:
        raise ValueError('No space for an instrumental answer')
    original_notes = copy.deepcopy(harmonic['events'])
    for track in plan['tracks']:
        kept = []
        for note in track['events']:
            start = note['start_tick']
            if track is not harmonic and track['instrument'] in ('lead', 'pad', 'organ', 'guitar'):
                continue  # One answer instrument instead of competing melodic parts.
            if track['instrument'] != 'drums':
                if any(begin <= start < stop for begin, stop in calls):
                    continue
                for begin, _ in calls:
                    if start < begin < start+note['duration_ticks']:
                        note['duration_ticks'] = begin-start
            if track is harmonic:
                if any(a <= start < a+bar for a in answers):
                    continue
                # Remove upper decorative responses elsewhere; retain existing harmony.
                chord = [n['note'] for n in original_notes if n['start_tick']//bar == start//bar]
                if chord and note['note'] > min(chord)+12:
                    continue
            kept.append(note)
        track['events'] = kept
    for ai, start in enumerate(answers):
        tones = sorted({n['note'] for n in original_notes if n['start_tick']//bar == start//bar})
        if not tones:
            raise ValueError('No established harmony at answer boundary')
        tones = tones[:3]
        contour = [0, 1, 2, 0] if ai == 0 else [0, 2, 1, 0]
        for i, offset in enumerate(rhythm):
            next_tick = rhythm[i+1] if i+1 < len(rhythm) else bar
            harmonic['events'].append({'start_tick': start+offset,
                'duration_ticks': min(next_tick-offset, q if i+1 < len(rhythm) else 2*q),
                'note': tones[min(contour[i], len(tones)-1)],
                'velocity': [78, 68, 74, 60][i]})
    harmonic['events'].sort(key=lambda n: (n['start_tick'], n['note']))
    return plan, {'version': '1.0-q0-call-response', 'source_rhythm_ticks': rhythm,
        'intact_call_windows': calls, 'answer_start_ticks': answers,
        'removed_short_vocal_events': len(original['voice_events'])-len(clean),
        'intent': 'Intact calls, recurring rhythm with a second contour, existing harmony and contrast.',
        'quality': 'NOT RUN'}
