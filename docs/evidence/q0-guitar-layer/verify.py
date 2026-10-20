#!/usr/bin/env python3
"""Recheck Q0 layer artifacts and exercise the independent vocal oracle failures."""
import csv
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'scripts'))
from q0_audit import digest, write
from q0_measure_comparisons import pcm
from q0_voice_integrity import check

trial = ROOT/'renders/q0-guitar-layer-v2-20261020'
report = json.loads((trial/'report.json').read_text())
assert not (trial/'INCOMPLETE').exists()
for name, sha in report['files_sha256'].items():
    assert digest(trial/name) == sha, name
for name, sha in report['preserved_sha256'].items():
    assert digest(ROOT/name) == sha, name
assert digest(ROOT/'core/instruments/voice.cpp') == report['voice_source_sha256']
assert len(report['matching']) == 12 and len(report['candidate_boundaries']) == 160
with (trial/'baseline.csv').open() as f:
    baseline = list(csv.DictReader(f))
with (trial/'candidate.csv').open() as f:
    candidate = list(csv.DictReader(f))
assert len(baseline) == len(candidate) == 552
measurements, differences = [], []
for path in sorted((trial/'baseline').glob('*.wav')):
    rate, a = pcm(path); candidate_rate, b = pcm(trial/'candidate'/path.name)
    a, b = np.asarray(a,dtype=np.float64), np.asarray(b,dtype=np.float64)
    assert rate == candidate_rate == 48000 and len(a) == len(b) == 960000
    delta = b-a
    if 'muted' in path.name or 'piano' in path.name:
        assert not np.any(delta)
    else:
        assert np.any(delta) and not np.any(delta[5*48000*2:])
    differences.append({'probe':path.name,'max_pcm16_difference':float(abs(delta).max()),
        'rms_pcm16_difference':float(np.sqrt(np.mean(delta**2))),
        'all_notes_velocity_85_and_above_identical':True})
    for arm, values in [('baseline',a),('candidate',b)]:
        assert np.max(abs(values)) > 0 and not np.any((values>=32767)|(values<=-32768))
        measurements.append({'file':arm+'/'+path.name,
            'rms_dbfs':float(20*np.log10(np.sqrt(np.mean(values**2))/32768)),
            'peak_dbfs':float(20*np.log10(abs(values).max()/32768)), 'full_scale_samples':0})
assert len(differences) == 8
plan = ROOT/'renders/q0-phrase-form-20261020/owner-speech/candidate.hiphop.score.json'
source = ROOT/'renders/q0-baseline-v2-20261020/owner-speech/source.wav'
stem = ROOT/'renders/q0-phrase-form-20261020/owner-speech/candidate.hiphop.vocals.wav'
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    check(plan, source, stem, tmp/'valid.json')
    def rejects(p=plan, s=stem, out=tmp/'invalid.json'):
        try: check(p, source, s, out)
        except ValueError: return
        raise AssertionError('Expected rejection')
    rejects(out=tmp/'valid.json')
    changed = json.loads(plan.read_text()); changed['source']['consent_confirmed'] = False
    write(tmp/'bad.json',changed); rejects(p=tmp/'bad.json')
    changed['source']['consent_confirmed']=True; changed['source']['sha256']='0'*64
    write(tmp/'bad.json',changed); rejects(p=tmp/'bad.json')
    with wave.open(str(stem)) as wav:
        params=wav.getparams(); raw=bytearray(wav.readframes(wav.getnframes()))
    # Add a spurious sample in silence: the independent oracle must catch it.
    raw[0:2]=(64).to_bytes(2,'little',signed=True)
    with wave.open(str(tmp/'changed.wav'),'wb') as wav:
        wav.setparams(params); wav.writeframes(raw)
    rejects(s=tmp/'changed.wav')
summary={}
for arm, rows in [('baseline',baseline),('candidate',candidate)]:
    summary[arm]={}
    for rate in ('48000','16000'):
        guitar=[r for r in rows if r['instrument']=='guitar' and r['rate']==rate]
        summary[arm][rate]={key:{'min_db':min(float(r[key]) for r in guitar),
                                    'max_db':max(float(r[key]) for r in guitar)}
                           for key in ('delta_db','attack_delta_db','one_second_delta_db')}
write(Path(__file__).with_name('verification.json'), {
    'technical':'PASS','human_quality':'NOT RUN','boundary_summary':summary,
    'decoded_audio':measurements,'waveform_differences':differences,
    'vocal_oracle_negative_tests':'PASS: overwrite, consent, hash, added sample rejected',
    'versions':{'clang':subprocess.check_output(['clang++','--version'],text=True).strip(),
                'python':sys.version,'numpy':np.__version__},
    'script_sha256':{name:digest(ROOT/name) for name in (
        'scripts/q0_guitar_layer_trial.py','scripts/q0_layer_probe.cpp','scripts/q0_voice_integrity.py')}})
print('PASS: 552 paired boundary measurements, 16 decoded probes, preserved forte/muted/piano, exact vocal oracle and four rejection cases')
