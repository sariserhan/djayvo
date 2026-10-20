#!/usr/bin/env python3
"""Original Q0 performance study; no reference audio, training or engine edits."""
import copy
import math
from array import array
import sys
import wave

from q0_audit import digest

Q, BAR = 960, 3840


def motif(plan, source, *, tempo_milli_bpm=112000):
    if type(tempo_milli_bpm) is not int or not 60000 <= tempo_milli_bpm <= 180000:
        raise ValueError('Unsupported motif tempo')
    if (plan['sample_rate'] != 48000 or plan['source']['kind'] != 'recorded' or
            plan['source']['consent_confirmed'] is not True or
            digest(source) != plan['source']['sha256']):
        raise ValueError('Expected the authorized, hash-matched source')
    with wave.open(str(source)) as wav:
        channels, width, rate, frames, compression, _ = wav.getparams()
        if (channels not in (1, 2) or width != 2 or rate != plan['source']['original_rate'] or
                compression != 'NONE' or not 2*rate <= frames <= 5*rate or
                frames != plan['source']['original_frames'] or
                round(frames*48000/rate) != plan['source']['processed_frames']):
            raise ValueError('Expected bounded source PCM16')
        pcm = array('h', wav.readframes(frames))
    if sys.byteorder != 'little':
        pcm.byteswap()
    if len(pcm) != frames*channels:
        raise ValueError('Truncated source')
    onsets = plan['analysis']['onsets']
    if not onsets or any(type(f) is not int or not 0 <= f < plan['source']['processed_frames'] for f in onsets):
        raise ValueError('Missing or invalid source onsets')
    if sorted(set(onsets)) != onsets:
        raise ValueError('Source onsets must be ordered and unique')
    # Preserve chronological rhythm; compress only phrases exceeding six beats.
    ticks_per_frame = tempo_milli_bpm*Q/(60000*48000)
    scale = min(1, 6*Q/max(1, (onsets[-1]-onsets[0])*ticks_per_frame))
    choices = {}
    for f in onsets:
        tick = round((f-onsets[0])*ticks_per_frame*scale/120)*120
        source_frame = min(frames-1, round(f*rate/48000))
        values = pcm[source_frame*channels:min(frames, source_frame+rate//25)*channels]
        energy = math.sqrt(sum(v*v for v in values)/len(values))/32768
        if tick not in choices or energy > choices[tick][1]:
            choices[tick] = (f, energy)
    chosen = sorted(sorted(choices, key=lambda t: choices[t][1], reverse=True)[:6])
    if len(chosen) < 3:
        raise ValueError('Insufficient source rhythm for this study')
    peak = max(choices[t][1] for t in chosen)
    if peak <= 1e-5:
        raise ValueError('Source motif is effectively silent')
    return [{'tick': t, 'analysis_frame_48khz': choices[t][0],
             'source_frame': round(choices[t][0]*rate/48000),
             'velocity': round(62+24*choices[t][1]/peak)} for t in chosen]


def authored(plan, source, *, hybrid, expressive):
    if type(hybrid) is not bool or type(expressive) is not bool:
        raise ValueError('Palette and expression switches must be booleans')
    if plan.get('key', {}).get('mode') != 'minor' or plan.get('tempo_changes'):
        raise ValueError('This original score requires constant-tempo minor context')
    phrase = motif(plan, source)
    p = copy.deepcopy(plan)
    p.update(schema_version='1.6-remix', tempo_milli_bpm=112000,
             target_bars=16, tail_ms=2500)
    p['mix'] = {'master_target_peak_dbfs': -1,
                'clean_hook_instrument_duck_db': -16.4781748189,
                'instrument_room_mix': .10, 'instrument_reverb_mix': .08,
                'kick_duck_db': -3}
    p['sections'] = [
        {'name': name, 'start_bar': start, 'bars': bars}
        for name, start, bars in [('invitation', 0, 2), ('voice_call', 2, 3),
            ('answer', 5, 4), ('contrast', 9, 3), ('developed_return', 12, 3), ('resolve', 15, 1)]]
    p['voice_clips'] = [{'id': 0, 'start_frame': 0,
        'end_frame': p['source']['processed_frames'], 'confidence': 1}]
    # Both intact calls fit in dedicated three-bar spaces; no guessed word cuts.
    p['voice_events'] = [
        {'start_tick': start*BAR, 'clip_id': 0, 'gain_db': -4,
         'rate': 1, 'reverse': False, 'pan': 0, 'clean': clean}
        for start, clean in [(2, True), (9, False)]]
    tracks = {
        'piano': {'instrument': 'piano', 'gain_db': -10, 'pan': -.12, 'events': []},
        'guitar': {'instrument': 'guitar', 'gain_db': -14, 'pan': .24, 'events': []},
        'bass': {'instrument': 'bass', 'gain_db': -10, 'pan': 0, 'events': []},
        'drums': {'instrument': 'drums', 'gain_db': -10, 'pan': 0, 'events': []},
    }
    if hybrid:
        for instrument in ('bass', 'drums'):
            tracks[instrument]['sound'] = 'electronic'
    tonic = p['key']['tonic_midi']
    chords = [(-12, -5, -2, 3), (-16, -9, -5, 0),
              (-19, -12, -9, -4), (-17, -10, -7, -2)]
    roots = [-24, -28, -31, -29]

    def shift(tick):
        # A shared sixteenth-pair pocket keeps simultaneous bass and kick locked.
        return 24 if expressive and tick % Q in (Q//2, 3*Q//4) else 0

    def note(instrument, tick, duration, pitch, velocity, muted=False, strum=0):
        start = tick+shift(tick)+(strum*7 if expressive else 0)
        gate = duration if expressive or instrument == 'drums' else min(duration, Q//2)
        event = {'start_tick': start, 'duration_ticks': gate, 'note': pitch,
                 'velocity': velocity if expressive else {'drums': 80, 'bass': 90,
                     'piano': 76, 'guitar': 70}[instrument]}
        if muted:
            event['muted'] = True
        tracks[instrument]['events'].append(event)

    # Establish one harmonic identity before the voice, then leave room for it.
    for b in (0, 1):
        for i, degree in enumerate(chords[0]):
            note('guitar', b*BAR+(0 if b == 0 else 2*Q), Q, tonic+degree, 66-i*3, strum=i)
    for b in (2, 3, 4, 9, 10, 11):
        for beat in (0, 2):
            note('drums', b*BAR+beat*Q, 120, 42, 34 if b < 5 else 44)
    active = [5, 6, 7, 8, 12, 13, 14]
    for b in active:
        harmony = (b-5)%4 if b < 9 else (b-12)%4
        root = tonic+roots[harmony]
        base = b*BAR
        for offset, interval, duration, strength in [
            (0, 0, 660, 102), (7*Q//4, 7, 180, 73),
            (5*Q//2, 12, 420, 88), (7*Q//2, 0, 240, 79)]:
            note('bass', base+offset, duration, root+interval, strength)
            note('drums', base+offset, 240, 36, strength+3)
        for offset in (Q, 3*Q):
            note('drums', base+offset, 240, 38, 98 if offset == Q else 105)
        for h in range(8):
            note('drums', base+h*Q//2, 120, 42, 65 if h%2 == 0 else 42)
        if b in (8, 14):
            # Two restrained pickups lead into contrast or resolution.
            note('drums', base+13*Q//4, 120, 38, 42)
            note('drums', base+15*Q//4, 120, 38, 62)
        for offset in (Q//2, 5*Q//2):
            for i, degree in enumerate(chords[harmony][1:]):
                note('guitar', base+offset, 150, tonic+degree, 65-i*5,
                     muted=True, strum=i)
    # Rhythm comes from this source; the original contour has a recognizable return.
    contour = [0, 3, 7, 5, 3, 0]
    for start, direction in [(5*BAR, 1), (7*BAR, -1), (12*BAR, 1)]:
        for i, point in enumerate(phrase):
            degree = contour[i] if direction == 1 else contour[len(phrase)-1-i]
            next_tick = phrase[i+1]['tick'] if i+1 < len(phrase) else 2*BAR
            duration = max(90, min(1200 if i+1 == len(phrase) else 660,
                                   next_tick-point['tick']-60))
            note('piano', start+point['tick'], duration, tonic+degree,
                 point['velocity']-(5 if direction == -1 else 0))
    # Cadence is played once, followed by space; no abrupt end-of-loop cutoff.
    for i, degree in enumerate(chords[0]):
        note('guitar', 15*BAR, Q, tonic+degree, 68-i*4, strum=i)
    note('bass', 15*BAR, Q, tonic-24, 85)
    note('drums', 15*BAR, 240, 36, 88)
    note('piano', 15*BAR, 3*Q//2, tonic, 66)
    for track in tracks.values():
        track['events'].sort(key=lambda n: (n['start_tick'], n['note']))
    p['tracks'] = list(tracks.values())
    return p, {'version': '1.0-q0-original-score', 'hybrid_palette': hybrid,
        'authored_expression': expressive, 'source_motif': phrase,
        'harmony': ['minor7', 'flat6_major7', 'minor4_7', 'minor5_7'],
        'reference_audio_used': False, 'human_quality': 'NOT RUN',
        'limits': 'Developer-authored hypothesis, not a musician-approved score or trained improviser.'}
