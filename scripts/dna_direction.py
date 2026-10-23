"""Shared catalogue-based creative constraints, not measured reference audio features."""
import json
from pathlib import Path
import re
import unicodedata

POLICY = json.loads((Path(__file__).resolve().parents[1]/'assets/manifests/dna-directions.json').read_text())


def direction_for(refs):
    votes = {}; seen = set()
    for ref in refs:
        name = unicodedata.normalize('NFKC', ref['reference']).strip().lower()
        if name in seen:continue
        seen.add(name)
        match = next((d for d in POLICY['directions'] if re.search(d['match'], ref.get('catalogue_genre') or '', re.I)), None)
        if match:votes[match['id']] = votes.get(match['id'], 0)+1
    ranked = sorted(votes, key=lambda k: (-votes[k], k))
    if not ranked:raise ValueError('No supported catalogue genres. Choose a specific song or artist from search.')
    primary = next(d for d in POLICY['directions'] if d['id'] == ranked[0])
    return {'version': POLICY['version'], **primary, 'coverage': sum(votes.values()), 'total': len(seen),
            'families': [{'id': k, 'label': next(d['label'] for d in POLICY['directions'] if d['id'] == k), 'count': votes[k]} for k in ranked]}


def validate_direction(data, direction):
    if data.get('direction_id') != direction['id'] or data.get('energy') != direction['energy']:
        raise ValueError('Keep the required musical direction and energy')
    if type(data.get('bpm')) is not int or not direction['bpm'][0] <= data['bpm'] <= direction['bpm'][1]:
        raise ValueError(f"Choose a tempo within {direction['bpm']}")
    if data.get('instruments') != direction['instruments']:
        raise ValueError('Keep all required instrument roles in their supplied order')
    if re.search(direction['avoid'], data.get('sound', ''), re.I):
        raise ValueError('The sound description contradicts the musical direction')

    tempos = re.findall(r'(\d{2,3})\s*(?:bpm|beats per minute)', data.get('sound', ''), re.I)
    if any(int(tempo) != data['bpm'] for tempo in tempos):
        raise ValueError('The sound description must use the selected BPM')
