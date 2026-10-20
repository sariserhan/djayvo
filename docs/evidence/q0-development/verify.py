#!/usr/bin/env python3
"""Reproduce the composition decisions and independently inspect the actual WAVs."""
import json
from pathlib import Path
import shutil
import sys

import numpy as np

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
from q0_audit import digest, inputs, write
from q0_development import develop
from q0_listening_results import summarize
from q0_measure_comparisons import pcm, timing
from verify_export import verify_export

evidence=Path(__file__).parent
trial=ROOT/'renders/q0-development-v2-20261020'
prior=ROOT/'renders/q0-performance-20261020'
report=json.loads((trial/'report.json').read_text())
original_inventory=json.loads((ROOT/'docs/evidence/q0-performance/measurements.json').read_text())['trial_file_sha256']
assert not (trial/'INCOMPLETE').exists()
rights={r['id']:r['sha256'] for r in inputs()}
preserved=json.loads((ROOT/'docs/evidence/q0-guitar-single/report.json').read_text())['preserved_sha256']
for name,sha in preserved.items():assert digest(ROOT/name)==sha,name
for name,sha in report['source_sha256'].items():assert digest(ROOT/'scripts'/name)==sha,name
rows=[]
for row in report['records']:
    ident,style=row['id'],row['style']
    folder=trial/ident
    source=ROOT/'renders/q0-baseline-v2-20261020'/ident/'source.wav'
    assert digest(source)==rights[ident]
    for suffix in ('wav','score.json','events.tsv'):
        name=f'{ident}/E.{style}.{suffix}'
        assert digest(prior/name)==original_inventory[name],name
    old=json.loads((prior/ident/f'E.{style}.score.json').read_text())
    wordpath=(ROOT/'renders/arrangement-linux/word-timing-20261018/owner.words.json' if ident=='owner-speech'
              else ROOT/'renders/licensed-speech-timing-20261018'/(ident+'.words.json'))
    words=None if ident=='commons-laughter' else json.loads(wordpath.read_text())
    if words:assert digest(wordpath)==row['word_estimates_sha256']
    candidate,trace=develop(old,source,words)
    assert candidate==json.loads((folder/f'candidate.{style}.score.json').read_text())
    assert json.loads(json.dumps(trace))==json.loads((folder/'development.json').read_text())
    statements={s['kind']:s['events'] for s in trace['statements']}
    assert len(statements['development'])==len(statements['statement'])==6
    assert [n['note'] for n in statements['statement']]==[n['note'] for n in statements['return']]
    timings=timing(candidate,folder/f'candidate.{style}.events.tsv')
    for stem in ('candidate','replay'):verify_export(folder/stem,(style,))
    for suffix in ('wav','score.json','events.tsv'):
        assert digest(folder/f'candidate.{style}.{suffix}')==digest(folder/f'replay.{style}.{suffix}')
    decoded=[]
    for path in sorted(folder.glob('candidate.*.wav')):
        rate,data=pcm(path);values=np.asarray(data,dtype=np.float64)
        assert rate==48000 and np.max(values)<32767 and np.min(values)>-32768
        decoded.append({'file':path.name,'sha256':digest(path),'frames':len(values)//2,
                        'max_abs_pcm16':float(np.max(np.abs(values))),'full_scale_samples':0})
    native=json.loads((folder/f'candidate.{style}.report.json').read_text())
    assert native['nonfinite_samples']==native['limited_samples']==0
    ar,a=pcm(prior/ident/f'E.{style}.wav');br,b=pcm(folder/f'candidate.{style}.wav')
    assert ar==br and len(a)==len(b)
    delta=np.asarray(a,dtype=np.float64)-np.asarray(b,dtype=np.float64)
    assert np.any(delta)
    destination=evidence/ident;destination.mkdir(exist_ok=True)
    for name in ('candidate.plan.json','development.json'):
        shutil.copyfile(folder/name,destination/name)
    rows.append({'id':ident,'timing':timings,'audio':decoded,
        'max_pcm16_difference':float(np.max(np.abs(delta))),
        'rms_pcm16_difference':float(np.sqrt(np.mean(delta**2))),
        'source_analysis':trace['source_analysis'],
        'development_notes':len(statements['development'])})
summary=summarize(trial,[])
assert summary['status']=='NOT RUN' and summary['candidate_ratings']==0
write(evidence/'measurements.json',{'technical':'PASS','human_quality':'NOT RUN','records':rows,
    'trial_file_sha256':{str(p.relative_to(trial)):digest(p) for p in sorted(trial.rglob('*')) if p.is_file()},
    'preserved_sha256':preserved})
for name in ('report.json','listening-results.json'):
    shutil.copyfile(trial/name,evidence/name)
shutil.copyfile(trial/'listener/packet.json',evidence/'packet.json')
print('PASS: five reproduced plans/traces; full motif development, exact replays/events, decoded masters/stems, no clipping/limiting, frozen core/specs; zero ratings')
