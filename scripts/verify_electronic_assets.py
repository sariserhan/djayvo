#!/usr/bin/env python3
"""Verify the original electronic palette and generator provenance offline."""
import array
import hashlib
import json
from pathlib import Path
import re
import sys

root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'assets/manifests/electronic-v1.json').read_text())
bank=(root/manifest['generated_file']).read_bytes()
assert hashlib.sha256(bank).hexdigest()==manifest['generated_sha256']
assert hashlib.sha256((root/'scripts/prepare_electronic_bank.py').read_bytes()).hexdigest()==manifest['generator_sha256']
assert manifest['reference_audio_used'] is False and manifest['third_party_sound_assets'] is False
text=bank.decode()
arrays=dict(re.findall(r'static constexpr std::int16_t (\w+)\[\] = \{([^}]+)\};',text))
expected={(family,pitch,0) for family,pitches in [('piano',(48,60,72)),('bass',(36,43,48))] for pitch in pitches}
expected|={('drums',pitch,take) for pitch in (36,38,42,46) for take in (0,1)}
assert len(arrays)==len(manifest['samples'])==14
assert {(s['instrument'],s['root_midi'],s['take']) for s in manifest['samples']}==expected
for s in manifest['samples']:
    pcm=array.array('h',(int(x) for x in arrays[s['id']].split(',') if x.strip()))
    assert len(pcm)==s['frames'] and pcm[0]==pcm[-1]==0 and 0<max(abs(x) for x in pcm)<32767
    assert s['sample_rate']==24000 and s['velocity_max']==127
    if sys.byteorder!='little':pcm.byteswap()
    assert hashlib.sha256(pcm.tobytes()).hexdigest()==s['pcm_sha256']
    assert f"{{Instrument::{s['instrument']}, {s['root_midi']}, 127, {s['take']}, {s['id']}, {s['frames']}, 24000}}" in text
print('PASS: 14 original electronic samples, selector coverage, PCM/fade bounds and generator/bank hashes')
