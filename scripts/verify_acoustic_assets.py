#!/usr/bin/env python3
"""Check the shipped CC0 bank and notices against the pinned asset ledger offline."""
import array
import hashlib
import json
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root/'assets/manifests/acoustic-v1.json').read_text())
bank = (root/manifest['generated_file']).read_bytes()
assert hashlib.sha256(bank).hexdigest() == manifest['generated_sha256'], 'bank hash mismatch'
assert manifest['license'] == 'CC0-1.0'
text = bank.decode()
arrays = dict(re.findall(r'static constexpr std::int16_t (\w+)\[\] = \{([^}]+)\};', text))
assert len(arrays) == len(manifest['samples']) == 53
expected = {('piano', pitch, velocity, take) for pitch in (48,60,67,72,79,84,96)
            for velocity in (55,95,127) for take in (0,1)}
expected |= {('drums', pitch, 127, take) for pitch in (36,38,42,46) for take in (0,1)}
expected |= {('bass', pitch, 127, 0) for pitch in (36,45,52)}
assert {(s['instrument'],s['root_midi'],s['velocity_max'],s['take']) for s in manifest['samples']} == expected
for sample in manifest['samples']:
    pcm = array.array('h', (int(x) for x in arrays[sample['id']].split(',') if x.strip()))
    assert len(pcm) == sample['prepared']['frames']
    assert pcm[0] == pcm[-1] == 0 and max(abs(x) for x in pcm) <= 32767
    if sys.byteorder != 'little':
        pcm.byteswap()
    assert hashlib.sha256(pcm.tobytes()).hexdigest() == sample['prepared']['pcm_sha256']
    assert sample['commit'] in sample['url'] and len(sample['sha256']) == 64
    entry = (f"{{Instrument::{sample['instrument']}, {sample['root_midi']}, {sample['velocity_max']}, "
             f"{sample['take']}, {sample['id']}, sizeof({sample['id']})/sizeof({sample['id']}[0]), 22050}}")
    assert entry in text, 'compiled selector metadata differs from manifest'
for source in manifest['license_evidence']:
    assert hashlib.sha256((root/source['file']).read_bytes()).hexdigest() == source['sha256']
print('PASS: 53 pinned CC0 samples, layer/take coverage, compiled PCM hashes, fades, bounds, and license notices')
