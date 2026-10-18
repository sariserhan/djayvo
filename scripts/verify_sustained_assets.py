"""Verify provenance for the original, dependency-free sustained presets."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'assets/manifests/sustained-v1.json').read_text())
assert m['presets']==['organ','pad','lead'] and m['models']==[]
assert m['third_party_recordings'] is False and m['reference_audio_used'] is False
assert hashlib.sha256((root/m['implementation']).read_bytes()).hexdigest()==m['sha256']
print('PASS: three original sustained presets, source hash, no recordings/reference audio/models')
