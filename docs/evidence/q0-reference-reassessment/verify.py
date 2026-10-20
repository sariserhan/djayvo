#!/usr/bin/env python3
"""Verify the exact reference files and rejected Q0 controls; no audio upload."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


references = json.loads((ROOT/'docs/evidence/reference-analysis/measurements.json').read_text())
for name in ('x', 'y', 'z'):
    references.update(json.loads((ROOT/f'docs/evidence/reference-{name}/analysis.json').read_text()))
references.update(json.loads((HERE/'f.json').read_text()))
rows = []
for name in ('f', 'x', 'y', 'z', 'down', 'question', 'blood_club'):
    path = Path.home()/'Downloads'/f'{name}.mp3'
    row = references[name]
    assert digest(path) == row['sha256'], f'Reference changed: {name}'
    rows.append({key: row[key] for key in (
        'file', 'sha256', 'duration_seconds', 'integrated_lufs',
        'loudness_range_lu', 'mono_bass_20_150hz_energy_fraction', 'side_to_mid_db')})
for name, source in [
    ('owner-A', 'renders/q0-baseline-v2-20261020/owner-speech/A.hiphop.wav'),
    ('owner-E', 'renders/q0-five-arm-20261020/owner-speech/E.hiphop.wav'),
]:
    row = next(iter(json.loads((HERE/f'{name}.json').read_text()).values()))
    assert digest(ROOT/source) == row['sha256'], f'Control changed: {source}'
packet = json.loads((ROOT/'renders/q0-five-arm-20261020/listener/packet.json').read_text())
assert packet['packet_id'] == '0896a2136e68f3545c6e32b4f8cc02283ad704dedc2476f8294002184919c85f'
assert digest(ROOT/'ai_improvisational_musician_master_spec_v1.md') == '389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2'
(HERE/'verification.json').write_text(json.dumps({
    'source_integrity': 'PASS', 'reference_files': rows,
    'new_full_file_measurements': ['f.mp3', 'owner A', 'owner E'],
    'prior_measurements_reused_after_hash_check': ['x', 'y', 'z', 'down', 'question', 'blood_club'],
    'new_packet_owner_acceptance': 'FAIL', 'packet_id': packet['packet_id'],
    'direct_agent_audio_perception': 'NOT RUN: no available audio-perception tool',
    'reference_musical_annotation': 'NOT RUN',
    'authorization': 'Owner requested local reference analysis. No new training authorization inferred.',
    'training_upload_publication': 'NOT RUN',
}, indent=2, allow_nan=False)+'\n')
print('PASS: seven reference hashes, both Q0 controls, packet identity and master preserved')
