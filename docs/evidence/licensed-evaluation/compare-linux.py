from pathlib import Path
import hashlib,json,sys
sys.path.insert(0,'scripts')
from compare_portability import compare
from verify_export import verify_export
root=Path('renders/licensed-evaluation-validated-20261018');linux=Path('renders/arrangement-linux/licensed-evaluation-fixed-20261018')
manifest=json.loads((root/'freeze.json').read_text())['dataset'];rows={}
for clip in manifest['clips']:
    if clip['source_kind']!='recorded':continue
    mac=root/clip['id']/'4123';other=linux/clip['id']
    for prefix,styles in [('remix',('hiphop','reggae','experimental')),('control',('baseline',))]:
        verify_export(mac/prefix,styles);verify_export(other/prefix,styles)
        for style in styles:
            name=prefix+'.'+style;rows[clip['id']+':'+style]=compare(other/name,mac/name)
            assert hashlib.sha256((mac/(name+'.wav')).read_bytes()).digest()==hashlib.sha256((other/(name+'.wav')).read_bytes()).digest()
assert len(rows)==92
report={'status':'PASS','mix_wavs':len(rows),'scope':'one seed, 23 recorded inputs, three styles plus baseline','comparisons':rows,'human_listening':'NOT RUN'}
Path('docs/evidence/licensed-evaluation/portability.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS: 92 exact M5/Linux WAVs, score decisions and event frames across 23 recorded inputs; maximum/RMS PCM error zero')
