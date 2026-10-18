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
arrays = dict(re.findall(r'static constexpr std::int16_t (\w+)\[\] = \{([^}]+)\};', bank.decode()))
assert len(arrays) == len(manifest['samples']) == 14
for sample in manifest['samples']:
    pcm = array.array('h', (int(x) for x in arrays[sample['id']].split(',') if x.strip()))
    assert len(pcm) == sample['prepared']['frames']
    assert pcm[0] == pcm[-1] == 0 and max(abs(x) for x in pcm) <= 32767
    if sys.byteorder != 'little':
        pcm.byteswap()
    assert hashlib.sha256(pcm.tobytes()).hexdigest() == sample['prepared']['pcm_sha256']
    assert sample['commit'] in sample['url'] and len(sample['sha256']) == 64
for source in manifest['license_evidence']:
    assert hashlib.sha256((root/source['file']).read_bytes()).hexdigest() == source['sha256']
print('PASS: 14 pinned CC0 samples, compiled PCM hashes, fades, bounds, and license notices')
