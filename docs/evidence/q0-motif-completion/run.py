#!/usr/bin/env python3
"""Check final motif events, render only changed plans, preserve the pending listening packet."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

import numpy as np

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
from q0_audit import digest, inputs, loudness, write
from q0_development import develop
from q0_measure_comparisons import pcm, timing
from compare_portability import compare
from verify_export import verify_export

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,required=True)
output=parser.parse_args().output.resolve()
if output.exists():raise ValueError('Choose a fresh output directory')
evidence=Path(__file__).parent
prior=ROOT/'renders/q0-development-v2-20261020'
inventory=json.loads((ROOT/'docs/evidence/q0-development/measurements.json').read_text())
for name,sha in inventory['trial_file_sha256'].items():assert digest(prior/name)==sha,name
for name,sha in inventory['preserved_sha256'].items():assert digest(ROOT/name)==sha,name
rights={r['id']:r['sha256'] for r in inputs()}
renderer=ROOT/'build-q0-decay-20261020/build/jamloom_remix'
frozen=json.loads((prior/'report.json').read_text())
assert digest(renderer)==frozen['renderer_sha256']
wasmdir=ROOT/'renders/q0-development-wasm-20261020'
wasm_report=json.loads((wasmdir/'report.json').read_text())
for name in ('jamloom_remix.js','jamloom_remix.wasm'):
    assert digest(wasmdir/name)==wasm_report['files_sha256'][name]
output.mkdir(parents=True);(output/'INCOMPLETE').touch()
rows=[]; changed=[]
for record in frozen['records']:
    ident,style=record['id'],record['style']
    source=ROOT/'renders/q0-baseline-v2-20261020'/ident/'source.wav'
    assert digest(source)==rights[ident]
    original_path=ROOT/'renders/q0-performance-20261020'/ident/f'E.{style}.score.json'
    assert digest(original_path)==record['control_plan_sha256']
    original=json.loads(original_path.read_text())
    wordpath=(ROOT/'renders/arrangement-linux/word-timing-20261018/owner.words.json' if ident=='owner-speech'
              else ROOT/'renders/licensed-speech-timing-20261018'/(ident+'.words.json'))
    words=None if ident=='commons-laughter' else json.loads(wordpath.read_text())
    if words:assert digest(wordpath)==record['word_estimates_sha256']
    candidate,trace=develop(original,source,words)
    assert (candidate,trace)==develop(original,source,words)
    old=json.loads((prior/ident/'candidate.plan.json').read_text())
    oldtrace=json.loads((prior/ident/'development.json').read_text())
    def missing(plan,statements):
        notes=[n for t in plan['tracks'] if t['instrument'] in ('piano','organ') for n in t['events']]
        return [dict(kind=s['kind'],**n) for s in statements for n in s['events']
                if not any(e['note']==n['note'] and abs(e['start_tick']-n['tick'])<100 for e in notes)]
    assert not missing(candidate,trace['statements'])
    for s in trace['statements']:
        assert len(s['events'])==len(s['performed_events'])
        if s['kind'] in ('statement','return','development'):assert len(s['performed_events'])==6
    row={'id':ident,'plan_changed':old!=candidate,'previous_missing_events':missing(old,oldtrace['statements']),
         'final_statements':trace['statements'],'rests':trace['intentional_rest_windows']}
    if old==candidate:
        row['retained_timing']=timing(candidate,prior/ident/f'candidate.{style}.events.tsv')
    else:
        assert ident=='ls-2277-149896-0026'
        folder=output/ident;folder.mkdir()
        write(folder/'candidate.plan.json',candidate)
        write(folder/'development.json',trace)
        for name,args in [('candidate',['--stems']),('replay',['--block-size','113'])]:
            command=[str(renderer),'--input',str(source),'--consent','--plan',str(folder/'candidate.plan.json'),
                     '--style',style,'--seed',str(candidate['seed']),'--output',str(folder/name),*args]
            subprocess.run(command,check=True,timeout=120)
            verify_export(folder/name,(style,))
        assert json.loads((folder/f'candidate.{style}.score.json').read_text())==candidate
        row['replay']=compare(folder/f'candidate.{style}',folder/f'replay.{style}')
        row['timing']=timing(candidate,folder/f'candidate.{style}.events.tsv')
        row['stem_differences']={}
        for stem in ('bass','drums','piano','vocals','organ'):
            name=f'candidate.{style}.{stem}.wav'
            _,a=pcm(prior/ident/name);_,b=pcm(folder/name)
            delta=np.asarray(a,dtype=np.float64)-np.asarray(b,dtype=np.float64)
            row['stem_differences'][stem]={'maximum_pcm16':float(np.max(np.abs(delta))),
                                         'rms_pcm16':float(np.sqrt(np.mean(delta**2)))}
            if stem in ('piano','vocals'):assert digest(folder/name)==digest(prior/ident/name)
        for a,b in zip(old['tracks'],candidate['tracks']):
            if a['instrument']!='organ':assert a==b
        for field in ('source','voice_events','voice_clips','tempo_milli_bpm','target_bars','mix','tail_ms'):
            assert old[field]==candidate[field]
        row['decoded']=[]
        for path in folder.glob('candidate.*.wav'):
            rate,values=pcm(path);x=np.asarray(values,dtype=np.float64)
            assert rate==48000 and np.max(x)<32767 and np.min(x)>-32768
            row['decoded'].append({'file':path.name,'sha256':digest(path),'max_abs_pcm16':float(np.max(np.abs(x)))})
        native=json.loads((folder/f'candidate.{style}.report.json').read_text())
        assert native['nonfinite_samples']==native['limited_samples']==0
        _,a=pcm(prior/ident/f'candidate.{style}.wav');_,b=pcm(folder/f'candidate.{style}.wav')
        delta=np.asarray(a,dtype=np.float64)-np.asarray(b,dtype=np.float64)
        row['difference_pcm16']={'maximum':float(np.max(np.abs(delta))),'rms':float(np.sqrt(np.mean(delta**2)))}
        row['loudness']=loudness(folder/f'candidate.{style}.wav')
        subprocess.run(['node',str(wasmdir/'jamloom_remix.js'),str(source),str(folder/'candidate.plan.json'),
                        style,str(folder/f'wasm.{style}'),'--consent'],check=True,timeout=120)
        row['wasm']=compare(folder/f'candidate.{style}',folder/f'wasm.{style}')
        write(evidence/'candidate.plan.json',candidate)
        changed.append({'id':ident,'style':style})
    rows.append(row)
assert len(changed)==1 and sum(len(r['previous_missing_events']) for r in rows)==1
write(output/'report.json',{'version':'1.0-q0-development','renderer_sha256':digest(renderer),'records':changed})
(output/'INCOMPLETE').unlink()
for name,sha in inventory['trial_file_sha256'].items():assert digest(prior/name)==sha,name
write(evidence/'report.json',{'technical':'PASS','human_quality':'NOT RUN','rows':rows,
    'old_packet_unchanged':True,'old_packet_id':frozen['packet_id'],
    'node':subprocess.check_output(['node','--version'],text=True).strip(),
    'python':sys.version,'renderer_sha256':digest(renderer),
    'planner_sha256':digest(ROOT/'scripts/q0_development.py'),
    'output':str(output.relative_to(ROOT)),
    'artifact_sha256':{str(p.relative_to(output)):digest(p) for p in sorted(output.rglob('*')) if p.is_file()}})
print('PASS: five final-score audits; one missing motif note reproduced and fixed; four plans unchanged; corrected native/WASM render and exact replay; old packet preserved; quality NOT RUN')
