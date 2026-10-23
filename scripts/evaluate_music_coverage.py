#!/usr/bin/env python3
"""Serial local GPU coverage, with verified R2 publication of every completed test take."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time
from dna_direction import POLICY, direction_for
from dna_language import LANGUAGES
from singing_response import STYLES, STYLE_LABELS, digest, load_plan

ROOT=Path(__file__).resolve().parents[1]
NODE=shutil.which('node')


def matrix():
    priority=['es','ru','tr','fr','ja','ar','hi','en']
    codes=priority+[code for code in LANGUAGES if code not in priority]
    preferred=['latin','rock','pop','pop','pop','arabic','indian','heavy-rock']
    remaining=[d['id'] for d in POLICY['directions'] if d['id'] not in preferred]
    genres=preferred+remaining
    genres+=(['pop','rock','soul','dance']*20)
    rows=[]
    for i,code in enumerate(codes):
        direction=next(d for d in POLICY['directions'] if d['id']==genres[i])
        genre='Metal' if direction['id']=='heavy-rock' else direction['id']
        reference='Coverage favorite: '+direction['label']
        assert direction_for([{'reference':reference,'catalogue_genre':genre}])['id']==direction['id']
        rows.append({'id':'dna-'+code,'product':'music-dna','language':code,'direction':direction['id'],
                     'payload':{'profile':{'references':[reference],'referenceMetadata':[{'reference':reference,'genre':genre,'source':'coverage-fixture'}],'vocalLanguage':code},'seed':9102300+i,'feedback':[]}})
    for i,style in enumerate(STYLES):
        rows.append({'id':'improvise-'+style,'product':'improvise','language':'en','direction':style,
                     'payload':{'phrase':'I have a question','voice':'female' if i%2 else 'male','genre':style,'consent':True}})
    assert {r['language'] for r in rows if r['product']=='music-dna'}==set(LANGUAGES)
    assert {r['direction'] for r in rows if r['product']=='music-dna'}=={d['id'] for d in POLICY['directions']}
    return rows


def publish(work, row):
    entries=[]
    for receipt_path in sorted(work.rglob('singer/complete.json')):
        singer=receipt_path.parent;receipt=json.loads(receipt_path.read_text());audio=singer/'singer.wav'
        plan_path=singer.parent/('plan.json' if row['product']=='music-dna' else 'reply.json')
        plan=load_plan(plan_path)
        if receipt['plan_sha256']!=digest(plan_path) or receipt['case']!=plan['cases'][0] or receipt['audio_sha256']!=digest(audio):
            raise ValueError('Completed render receipt differs from its song')
        case=receipt['case'];fit_path=singer.parent/'fit.json';fit=json.loads(fit_path.read_text()) if fit_path.exists() else None
        if fit and fit['audio_sha256']!=digest(audio):raise ValueError('Style check belongs to different audio')
        check='passed' if fit and fit['accepted'] else 'style-mismatch' if fit else 'not-checked'
        variants=[(audio,plan.get('title',STYLE_LABELS.get(case['genre'],case['genre'])+' · musician reply'))]
        for name in ('exchange','meaning-only'):
            result=singer.parent/name/'performance.wav'
            if result.exists() and digest(result)!=digest(audio):variants.append((result,STYLE_LABELS.get(case['genre'],case['genre'])+' · with the input'))
        for selected,title in variants:
            entry={'publicationConsent':True,'audio':str(selected.relative_to(ROOT)),'audioSha256':digest(selected),'title':title,
                   'product':row['product'],'language':case.get('vocal_language','en'),'direction':case['genre'],'check':check}
            path=work/(entry['audioSha256']+'.publication.json');path.write_text(json.dumps(entry,ensure_ascii=False))
            result=subprocess.run([str(NODE),'--import','tsx','scripts/publish-validation-song.ts','--entry',str(path)],cwd=ROOT/'apps/site',capture_output=True,text=True,timeout=300)
            if result.returncode:
                (work/'publication-error.log').write_text(result.stderr)
                raise RuntimeError('R2 publication failed; audio is retained locally')
            entries.append(json.loads(result.stdout))
    return entries


def evaluate(output, source, resume=False):
    if not NODE:raise RuntimeError('Node 22 is required for verified storage')
    rows=matrix();output.mkdir(parents=True,exist_ok=resume)
    report={'schema':'jamloom-music-coverage-1','device':'local Mac GPU','paidCompute':False,'startedAt':time.time(),
            'scope':'Each of 50 languages, all 25 DNA families and 23 Improvise styles; not every language/style combination.',
            'source_sha256':digest(source),'matrix':rows,'results':[],'listening':'NOT RUN'}
    if resume:
        report=json.loads((output/'report.json').read_text())
        if report['matrix']!=rows or report['source_sha256']!=digest(source):raise ValueError('Resume inputs differ from the preserved run')
    def save():
        temporary=output/'report.tmp';temporary.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');temporary.replace(output/'report.json')
    save()
    for row in rows:
        previous=next((r for r in report['results'] if r['id']==row['id']),None)
        if previous:
            if 'published' not in previous:
                status=json.loads((output/row['id']/'status.json').read_text())
                if status['state'] not in ('completed','failed','rejected'):raise ValueError('Interrupted case is not terminal; preserve it for inspection')
                previous.update(state='completed' if status['state']=='completed' else 'failed',pipelineStatus=status,resumedAfterRender=True)
                previous['published']=publish(output/row['id'],row);save()
            continue
        if shutil.disk_usage(ROOT).free<8*1024**3:raise RuntimeError('Less than 8 GiB free; preserving all audio and stopping')
        work=output/row['id'];work.mkdir();(work/'request.json').write_text(json.dumps(row['payload'],ensure_ascii=False));(work/'product.txt').write_text(row['product'])
        if row['product']=='improvise':shutil.copyfile(source,work/'source')
        result={'id':row['id'],'product':row['product'],'language':row['language'],'direction':row['direction'],'state':'running','startedAt':time.time()}
        report['results'].append(result);save();print(json.dumps({'starting':row['id'],'number':len(report['results']),'total':len(rows)}),flush=True)
        with (ROOT/'renders/.music-dna-singer.lock').open('a') as lock,(work/'pipeline.log').open('w') as log:
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            child=subprocess.Popen([sys.executable,str(ROOT/'services/runpod/pipeline.py'),str(work)],env={**os.environ,'JAMLOOM_INFERENCE_DEVICE':'mps','HF_HUB_OFFLINE':'1','HF_HUB_DISABLE_TELEMETRY':'1'},stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            try:code=child.wait(timeout=900)
            except subprocess.TimeoutExpired:os.killpg(child.pid,signal.SIGKILL);code=child.wait();result['timeout']=True
        result['exit']=code;result['state']='completed' if code==0 else 'failed'
        if (work/'status.json').exists():result['pipelineStatus']=json.loads((work/'status.json').read_text())
        try:result['published']=publish(work,row)
        except (ValueError,OSError,RuntimeError,subprocess.SubprocessError) as error:
            result['publicationError']=type(error).__name__;save();raise
        result['seconds']=round(time.time()-result['startedAt'],2);save();print(json.dumps(result),flush=True)
    report['finishedAt']=time.time();save()
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--dry-run',action='store_true');p.add_argument('--resume',action='store_true')
    a=p.parse_args()
    if a.dry_run:print(json.dumps({'cases':len(matrix()),'languages':len(LANGUAGES),'dna_families':len(POLICY['directions']),'improvise_styles':len(STYLES),'cloud_generation':False}))
    else:evaluate(a.output.resolve(),a.source.resolve(),a.resume)
