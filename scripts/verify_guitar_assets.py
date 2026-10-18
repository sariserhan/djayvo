#!/usr/bin/env python3
"""Offline rights, selector coverage and PCM integrity checks for the guitar bank."""
import array
import hashlib
import json
from pathlib import Path
import re
import sys
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'assets/manifests/guitar-v1.json').read_text())
bank=(root/m['generated_file']).read_bytes();text=bank.decode()
assert hashlib.sha256(bank).hexdigest()==m['generated_sha256']
assert m['license']=='CC0-1.0' and m['redistribution_allowed'] and m['commercial_use_allowed']
arrays=dict(re.findall(r'static constexpr std::int16_t (\w+)\[\] = \{([^}]+)\};',text))
expected={(pitch,layer,take,muted) for pitch in range(40,77,3) for take in (0,1)
          for muted in (False,True) for layer in ((127,) if muted else (84,127))}
assert {(s['root_midi'],s['velocity_max'],s['take'],s['muted']) for s in m['samples']}==expected
assert len(arrays)==len(m['samples'])==len(expected)==78
for s in m['samples']:
    assert s['commit'] in s['url'] and s['license']==m['license'] and len(s['sha256'])==64
    pcm=array.array('h',(int(x) for x in arrays[s['id']].split(',') if x.strip()))
    assert pcm[0]==pcm[-1]==0 and len(pcm)==s['prepared']['frames']
    assert max(abs(x) for x in pcm)<32767 and s['prepared']['sample_rate']==22050
    if sys.byteorder!='little':pcm.byteswap()
    assert hashlib.sha256(pcm.tobytes()).hexdigest()==s['prepared']['pcm_sha256']
    entry=(f"{{Instrument::guitar, {s['root_midi']}, {s['velocity_max']}, {s['take']}, {s['id']}, "
           f"sizeof({s['id']})/sizeof({s['id']}[0]), 22050, {'true' if s['muted'] else 'false'}}}")
    assert entry in text
for evidence in m['license_evidence']:
    assert hashlib.sha256((root/evidence['file']).read_bytes()).hexdigest()==evidence['sha256']
print('PASS: 78 recorded guitar samples, pitch/layer/take/articulation coverage, PCM hashes, fades and pinned CC0 evidence')
