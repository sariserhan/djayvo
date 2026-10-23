#!/usr/bin/env python3
"""Reproducible local Music DNA coverage; never creates human ratings or training labels."""
import argparse
import fcntl
import json
from pathlib import Path
import subprocess
import sys
import uuid
from dna_direction import direction_for, POLICY

ROOT=Path(__file__).resolve().parents[1]
CASES=json.loads((ROOT/'assets/manifests/dna-evaluation.json').read_text())['cases']

def evaluate(output, selected, render):
    output.mkdir(parents=True,exist_ok=True)
    results=[]
    for case in selected:
        work=ROOT/'renders/music-dna-songs'/uuid.uuid4().hex
        work.mkdir()
        profile={'references':[r['reference'] for r in case['favorites']], 'referenceMetadata':[{'reference':r['reference'],'genre':r['genre'],'source':'itunes'} for r in case['favorites']], 'vocalLanguage':case['language']}
        direction=direction_for([{'reference':r['reference'],'catalogue_genre':r['genre']} for r in case['favorites']])
        assert direction['id']==case['direction'],case['id']
        (work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction,'seed':case['seed'],'feedback':[]},ensure_ascii=False))
        with (work/'evaluation.log').open('w') as log:
            result=subprocess.run([sys.executable,str(ROOT/'scripts/music_dna_song.py'),'run' if render else 'draft',str(work)],stdout=log,stderr=subprocess.STDOUT)
        state=json.loads((work/'status.json').read_text()) if (work/'status.json').exists() else {'state':'planned' if result.returncode==0 else 'failed'}
        row={'case':case['id'],'job':work.name,'direction':case['direction'],'language':case['language'],'state':state['state'],'exit':result.returncode,'human_listening':'NOT RUN'}
        results.append(row);(output/'report.json').write_text(json.dumps(results,indent=2)+'\n')
        print(json.dumps(row),flush=True)
    return results

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--cases',default='all');p.add_argument('--render',action='store_true');a=p.parse_args()
    selected=CASES if a.cases=='all' else [next(c for c in CASES if c['id']==name) for name in a.cases.split(',')]
    with (ROOT/'renders/.music-dna-singer.lock').open('a') as lock:
        if not a.render:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        results=evaluate(a.output,selected,a.render)
    sys.exit(0 if all(r['state'] in ('completed','planned') for r in results) else 1)
