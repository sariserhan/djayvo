#!/usr/bin/env python3
"""Isolated plan-level expression experiment; never mutates the engine or input plan."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROFILE = ROOT/'experiments/q0/expression-profiles.json'


def express(original, seed):
    if type(seed) is not int or not 0 <= seed <= 0xffffffff:
        raise ValueError('Expected a uint32 expression seed')
    config = json.loads(PROFILE.read_text())
    if (original.get('strategy') not in config['profiles'] or original.get('tempo_changes') or
            original.get('time_signature') != [4, 4] or original.get('ticks_per_quarter') != 960 or
            not 60000 <= original.get('tempo_milli_bpm', 0) <= 180000):
        raise ValueError('Expression requires a supported constant-tempo 4/4 score')
    plan = copy.deepcopy(original)
    profile = config['profiles'][plan['strategy']]
    q, bar, end = 960, 3840, plan['target_bars'] * 3840
    depth = config['seed_depth_percent'][seed % 3] / 100
    ticks_per_ms = q * plan['tempo_milli_bpm'] / 60000000
    kicks = {n['start_tick'] for t in original['tracks'] if t['instrument'] == 'drums'
             for n in t['events'] if n['note'] == 36}
    protected = kicks | {n['start_tick'] for n in original['voice_events'] if n['clean']}
    changes = []

    def shift(tick):
        if tick in protected or tick % bar == 0:
            return 0
        # Shared onset warp: simultaneous instruments and vocal starts stay together.
        phase = tick % q
        ms = profile['offbeat_ms'] if q//2 <= phase < 3*q//4 else 0
        if tick % (2*q) == q:
            ms = profile['backbeat_ms']
        return round(min(config['maximum_offset_ms'], ms * depth) * ticks_per_ms)

    for ti, (track, old_track) in enumerate(zip(plan['tracks'], original['tracks'])):
        ins = track['instrument']
        for ni, (note, old) in enumerate(zip(track['events'], old_track['events'])):
            start = old['start_tick']
            note['start_tick'] = min(end-1, start+shift(start))
            accent = 0
            if ins == 'drums':
                if old['note'] == 42:
                    accent = 3 if start % q == 0 else -7
                elif old['note'] == 38 and start % q:
                    accent = -12  # Existing off-beat snare strokes become restrained ghost notes.
            dynamics = config['phrase_velocity_curve'][(start//bar) % 4]
            note['velocity'] = max(1, min(127, old['velocity'] + round((accent+dynamics)*depth)))
            factor = profile['bass_gate'] if ins == 'bass' else (
                profile['harmonic_gate'] if ins in ('piano', 'guitar', 'organ') else 1)
            duration = max(1, round(old['duration_ticks'] * factor))
            # Do not extend a pitched note through the next attack of the same pitch.
            following = [n['start_tick']+shift(n['start_tick']) for n in old_track['events']
                         if n['note'] == old['note'] and n['start_tick'] > start]
            if ins != 'drums' and following:
                duration = min(duration, max(1, min(following)-note['start_tick']))
            note['duration_ticks'] = min(duration, end-note['start_tick'])
            if ins == 'guitar' and 'muted' in note:
                note['muted'] = old['muted'] or (note['duration_ticks'] <= q//4)
            changes.append({'track': ti, 'note': ni, 'before': old, 'after': copy.deepcopy(note)})
    for old, new in zip(original['voice_events'], plan['voice_events']):
        new['start_tick'] = old['start_tick']+shift(old['start_tick'])
    return plan, {'schema_version': config['version'], 'expression_seed': seed,
        'profile': plan['strategy'], 'changes': changes,
        'voice_start_offsets': [b['start_tick']-a['start_tick'] for a, b in
                               zip(original['voice_events'], plan['voice_events'])],
        'quality_status': 'NOT RUN', 'engine_changed': False}
