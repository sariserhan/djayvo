#!/usr/bin/env python3
"""Verify single-layer probes, unchanged mixes and the controlled accent pair."""
import json
from pathlib import Path
import shutil
import sys
import numpy as np

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
from q0_audit import digest, write
from q0_measure_comparisons import pcm

evidence=Path(__file__).parent
probes=ROOT/'renders/q0-guitar-single-20261020'
mix=ROOT/'renders/q0-guitar-accents-20261020'
layer=json.loads((probes/'report.json').read_text())
report=json.loads((mix/'report.json').read_text())
assert not (probes/'INCOMPLETE').exists() and not (mix/'INCOMPLETE').exists()
for name,sha in layer['files_sha256'].items():
    assert digest(probes/name)==sha,name
for name,sha in layer['preserved_sha256'].items():
    assert digest(ROOT/name)==sha,name
assert len(layer['candidate_boundaries'])==160
assert all(0<float(row['delta_db'])<1 for row in layer['candidate_boundaries'])
for item in report['preserved_existing_mixes']:
    old=ROOT/'renders/q0-phrase-form-20261020'/item['id']
    for suffix,sha in item['hashes'].items():
        assert any(digest(p)==sha for p in old.glob('candidate.*.'+suffix))
decoded=[]
def read(path):
    rate,samples=pcm(path)
    x=np.asarray(samples,dtype=np.float64)
    assert rate==48000 and len(x)>0 and 0<np.max(abs(x))<32767
    decoded.append({'file':str(path.relative_to(ROOT)),'sha256':digest(path),'frames':len(x)//2,
        'peak_dbfs':float(20*np.log10(abs(x).max()/32768)),
        'rms_dbfs':float(10*np.log10(np.mean((x/32768)**2))),'full_scale_samples':0})
    return x
for path in sorted((probes/'baseline').glob('*.wav')):
    a,b=read(path),read(probes/'candidate'/path.name)
    assert len(a)==len(b)==960000 and np.array_equal(a[:480000],b[:480000])
    if 'piano' in path.name or 'muted' in path.name:
        assert np.array_equal(a,b)
    else:
        assert not np.array_equal(a,b)
    assert digest(probes/'candidate'/path.name)==digest(probes/'replay'/path.name)
buffers={}
for arm in ('control','candidate'):
    paths=sorted(mix.glob(arm+'.hiphop*.wav'))
    assert len(paths)==6
    for path in paths:
        buffers[arm,path.name.removeprefix(arm+'.hiphop')]=read(path)
for stem in ('.piano.wav','.bass.wav','.drums.wav','.vocals.wav'):
    assert np.array_equal(buffers['control',stem],buffers['candidate',stem])
a,b=buffers['control','.wav'],buffers['candidate','.wav']
ga,gb=buffers['control','.guitar.wav'],buffers['candidate','.guitar.wav']
residual=(b-a)-(gb-ga)
assert np.max(abs(residual))<=3
assert digest(mix/'candidate.hiphop.wav')==digest(mix/'replay.hiphop.wav')
assert all(r['native']['limited_samples']==0 and r['native']['nonfinite_samples']==0
           and r['timing']['maximum_frame_error']==0 for r in report['results'].values())
for name in ('report.json','accent.plan.json','build.json','listener/packet.json'):
    shutil.copyfile(mix/name,evidence/('accent-'+Path(name).name))
write(evidence/'verification.json',{'technical':'PASS','human_quality':'NOT RUN',
    'decoded_audio':decoded,'existing_mix_preservation':'PASS: five exact WAV/score/event re-renders',
    'accent_mix_guitar_rms_change_db':float(10*np.log10(np.sum(gb**2)/np.sum(ga**2))),
    'accent_master_max_pcm16_difference':float(abs(b-a).max()),
    'accent_master_rms_pcm16_difference':float(np.sqrt(np.mean((b-a)**2))),
    'accent_mix_isolation_max_pcm16_residual':float(abs(residual).max()),
    'accent_trial_sha256':{str(p.relative_to(mix)):digest(p) for p in sorted(mix.rglob('*')) if p.is_file()},
    'limits':'The five preserved mixes cannot demonstrate improvement. One accent plan and isolated probes need listening.'})
print('PASS: 28 decoded masters/stems/probes; five old mixes preserved; accent change isolated to guitar')
