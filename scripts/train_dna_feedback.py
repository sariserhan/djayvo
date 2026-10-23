#!/usr/bin/env python3
"""Consent-bound local QLoRA research candidates from positively reviewed Jamloom songs.
Never trains on catalogue references, promotes adapters, or treats synthetic tests as listening data.
"""
import argparse
import fcntl
import hashlib
import json
import os
import re
from pathlib import Path
import signal
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
import unicodedata
from singing_response import digest

ROOT=Path(__file__).resolve().parents[1]
MODEL_MANIFEST=json.loads((ROOT/'assets/manifests/lyric-planner.json').read_text())

def group_key(references):
    names=sorted({unicodedata.normalize('NFKC',r).strip().lower() for r in references})
    return hashlib.sha256(json.dumps(names,ensure_ascii=False).encode()).hexdigest()

def training_data(plan,f):
    case=plan['cases'][0]
    direction=plan['direction'];code=case.get('vocal_language','en');traits=plan.get('musical_traits')
    from dna_direction import direction_for
    refs=[{'reference':'Generated musical direction','catalogue_genre':'Metal' if direction['id']=='heavy-rock' else direction['id']}]
    direction=direction_for(refs)
    prompt={'favorites':refs,'required_direction':direction,'requested_language':code,'listener_feedback':[{'rating':'like','tags':f['tags'],'language':code,'traits':traits,'bpm':case['bpm']}]}
    target={'title':plan['title'],'summary':'An original song guided by the supplied genres and positive listener feedback.',
        'influences':[{'index':i+1,'basis':'genre_only' if r['catalogue_genre'] else 'unknown','description':'Guided by the supplied catalogue genre.' if r['catalogue_genre'] else 'No genre evidence.'} for i,r in enumerate(refs)],
        'sound':plan.get('production_sound',direction['label']+' with '+', '.join(direction['instruments'])),'direction_id':direction['id'],'energy':direction['energy'],'instruments':direction['instruments'],
        'vocal_language':code,'voice':case['voice'],'bpm':case['bpm'],'lyrics':case['lyrics'],'musical_traits':traits}
    from music_dna_song import song_plan
    song_plan(target,refs,0,code)
    return {'messages':[{'role':'system','content':'Write an original two-minute vocal song plan in JSON from this musical direction. Keep the requested language. Use coherent verses, a memorable returning chorus, a bridge and a resolved ending.'},{'role':'user','content':json.dumps(prompt,ensure_ascii=False)},{'role':'assistant','content':json.dumps(target,ensure_ascii=False)}]}

def collect(root):
    records=[];seen=set();counts={'consented':0,'negative':0,'invalid':0}
    for path in sorted((root/'renders/music-dna-feedback').glob('*/*.json')):
        try:
            f=json.loads(path.read_text())
            if f.get('trainingConsent') is not True or f.get('consentVersion')!=1:continue
            counts['consented']+=1
            if f.get('rating')!='like':counts['negative']+=1;continue
            job=f['job']
            if len(job)!=32 or any(c not in '0123456789abcdef' for c in job):raise ValueError('Invalid job')
            work=root/'renders/music-dna-songs'/job
            plan=json.loads((work/'plan.json').read_text());case=plan['cases'][0]
            fit=json.loads((work/'fit.json').read_text());receipt=json.loads((work/'singer/complete.json').read_text())
            request=json.loads((work/'input.json').read_text())
            if json.loads((work/'status.json').read_text())['state']!='completed' or fit.get('accepted') is not True:raise ValueError('Unaccepted output')
            if plan['schema']!='jamloom-dna-song-1' or receipt.get('source_conditioning') is not None:raise ValueError('Not original text-to-music')
            for field,file in [('plan_sha256','plan.json'),('audio_sha256','singer/singer.wav')]:
                sha=digest(work/file)
                if any(row.get(field)!=sha for row in (f,fit,receipt)):raise ValueError('Changed output')
            if fit['input_sha256']!=digest(work/'input.json') or plan['input_sha256']!=fit['input_sha256']:raise ValueError('Changed input')
            if f['audio_sha256'] in seen:continue
            seen.add(f['audio_sha256'])
            # Group by the entire original list, never split variants between train and holdout.
            group=group_key(request['profile']['references'])
            records.append({'path':str(path.relative_to(root)),'sha256':digest(path),'group':group,'genre':plan['direction']['id'],'language':case.get('vocal_language','en'),
                'data':training_data(plan,f)})
        except (OSError,ValueError,KeyError,TypeError,IndexError):counts['invalid']+=1
    hosted=hosted_snapshot(root)
    if hosted:
        counts['hosted_eligible']=len(hosted['records'])
        for item in hosted['records']:
            try:
                f=item['record'];plan=f['plan'];case=plan['cases'][0]
                if f.get('trainingConsent') is not True or f.get('consentVersion')!=1 or f.get('rating')!='like':continue
                if plan['schema']!='jamloom-dna-song-1' or f['audio_sha256'] in seen:continue
                data=training_data(plan,f);seen.add(f['audio_sha256'])
                records.append({'path':'renders/music-dna-training/hosted-feedback.json','hosted_job':f['job'],'sha256':item['sha256'],
                    'group':f['group'],'genre':plan['direction']['id'],'language':case.get('vocal_language','en'),'data':data})
            except (ValueError,KeyError,TypeError,IndexError):counts['invalid']+=1
    return records,counts

def split(records):
    groups=sorted({r['group'] for r in records})
    if len(records)<24 or len(groups)<6 or len({r['genre'] for r in records})<3 or len({r['language'] for r in records})<2:return None
    holdout=set(groups[::5]);train=[r for r in records if r['group'] not in holdout];valid=[r for r in records if r['group'] in holdout]
    if len(train)<16 or len(valid)<4:return None
    return train,valid

def hosted_snapshot(root):
    try:
        from datetime import datetime, timezone
        snapshot=json.loads((root/'renders/music-dna-training/hosted-feedback.json').read_text())
        age=(datetime.now(timezone.utc)-datetime.fromisoformat(snapshot['checkedAt'].replace('Z','+00:00'))).total_seconds()
        if snapshot.get('schema')!='jamloom-hosted-training-1' or snapshot.get('live') is not True or not 0<=age<20:return None
        return snapshot
    except (OSError,ValueError,KeyError,TypeError):return None

def consent_current(root,sources):
    try:
        snapshot=hosted_snapshot(root) if any('hosted_job' in r for r in sources) else None
        for r in sources:
            if 'hosted_job' in r:
                if not snapshot or not any(x['record']['job']==r['hosted_job'] and x['sha256']==r['sha256'] and x['record'].get('trainingConsent') is True for x in snapshot['records']):return False
            elif digest(root/r['path'])!=r['sha256'] or json.loads((root/r['path']).read_text()).get('trainingConsent') is not True:return False
        return True
    except (OSError,ValueError,KeyError,TypeError):return False

def invalidate(root):
    for path in (root/'renders/music-dna-training/runs').glob('*/manifest.json'):
        manifest=json.loads(path.read_text())
        if not consent_current(root,manifest['sources']):
            adapter=path.parent/'adapter'
            if adapter.exists():shutil.rmtree(adapter)
            manifest.update(state='withdrawn',promotion='BLOCKED: source consent changed')
            path.write_text(json.dumps(manifest,indent=2)+'\n')

def command(model,data,adapter,train):
    return [sys.executable,'-m','mlx_lm','lora','--model',str(model),'--data',str(data),'--adapter-path',str(adapter) if adapter else '',
            '--train' if train else '--test','--batch-size','1','--num-layers','4','--max-seq-length','4096','--seed','63023','--mask-prompt',
            *(['--iters','100','--learning-rate','0.00001','--grad-checkpoint','--steps-per-eval','25','--val-batches','4','--save-every','100'] if train else ['--test-batches','-1'])]

def check_lengths(model,records):
    from mlx_lm.utils import load_tokenizer
    tokenizer=load_tokenizer(model,{'local_files_only':True})
    maximum=max(len(tokenizer.apply_chat_template(r['data']['messages'])) for r in records)
    if maximum>4096:raise ValueError('Training example exceeds context budget; do not truncate the song ending')
    return maximum

def heldout_loss(path):
    matches=re.findall(r'Test loss ([0-9]+\.[0-9]+), Test ppl',path.read_text())
    if not matches:raise ValueError('Held-out evaluation did not report a finite test loss')
    return float(matches[-1])

def execute(args,root,sources,log):
    env={**os.environ,'HF_HUB_OFFLINE':'1','HF_HUB_DISABLE_TELEMETRY':'1','WANDB_DISABLED':'true'}
    with log.open('w') as output:
        child=subprocess.Popen(args,stdout=output,stderr=subprocess.STDOUT,env=env,start_new_session=True)
        start=time.monotonic()
        try:
            while child.poll() is None:
                if not consent_current(root,sources):raise ValueError('Training consent changed during the run')
                if time.monotonic()-start>1800:raise TimeoutError('Local training phase exceeded 30 minutes')
                time.sleep(2)
            if child.returncode:raise RuntimeError('Training phase failed; see local log')
        finally:
            if child.poll() is None:os.killpg(child.pid,signal.SIGKILL);child.wait()

def run(root,train=False):
    output=root/'renders/music-dna-training';output.mkdir(parents=True,exist_ok=True)
    invalidate(root);records,counts=collect(root);parts=split(records)
    report={'state':'ready' if parts else 'waiting_for_feedback','positive_songs':len(records),**counts,
        'minimum':'24 distinct positively rated songs, 6 favorite-list groups, 3 genre families and 2 languages; at least 16 training and 4 holdout songs',
        'promotion':'NOT RUN: research candidates never replace the generator automatically'}
    (output/'status.json').write_text(json.dumps(report,indent=2)+'\n')
    if not parts or not train:return report
    with (root/'renders/.music-dna-singer.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:
            report['state']='waiting_for_idle_compute';(output/'status.json').write_text(json.dumps(report,indent=2)+'\n');return report
        train_rows,valid=parts;sources=[{k:r[k] for k in ('path','sha256','group','hosted_job') if k in r} for r in records]
        for previous in (output/'runs').glob('*/manifest.json'):
            candidate=json.loads(previous.read_text())
            if candidate.get('sources')==sources and candidate.get('state')=='candidate_needs_review':
                (output/'status.json').write_text(json.dumps({**report,'state':'candidate_needs_review','run':previous.parent.name},indent=2)+'\n')
                return candidate
        model=root/'build-style-training/lyric-planner'
        run_dir=output/'runs'/uuid.uuid4().hex;run_dir.mkdir(parents=True,mode=0o700)
        manifest={**report,'state':'training','base_revision':MODEL_MANIFEST['revision'],'sources':sources,'train_groups':sorted({r['group'] for r in train_rows}),'holdout_groups':sorted({r['group'] for r in valid})}
        path=run_dir/'manifest.json';path.write_text(json.dumps(manifest,indent=2)+'\n')
        (output/'status.json').write_text(json.dumps({**report,'state':'training','run':run_dir.name},indent=2)+'\n')
        try:
            for name,sha in MODEL_MANIFEST['files_sha256'].items():
                if digest(model/name)!=sha:raise ValueError('Base planner manifest mismatch')
            manifest['max_example_tokens']=check_lengths(model,records)
            with tempfile.TemporaryDirectory(prefix='jamloom-dna-train-') as folder:
                data=Path(folder)
                for name,rows in [('train',train_rows),('valid',valid),('test',valid)]:
                    (data/(name+'.jsonl')).write_text(''.join(json.dumps(r['data'],ensure_ascii=False)+'\n' for r in rows))
                execute(command(model,data,None,False),root,sources,run_dir/'baseline.log')
                execute(command(model,data,run_dir/'adapter',True),root,sources,run_dir/'training.log')
                execute(command(model,data,run_dir/'adapter',False),root,sources,run_dir/'holdout.log')
            if not consent_current(root,sources):raise ValueError('Training consent changed')
            baseline=heldout_loss(run_dir/'baseline.log');candidate=heldout_loss(run_dir/'holdout.log')
            manifest.update(state='candidate_needs_review',trained_weights_sha256=digest(run_dir/'adapter/adapters.safetensors'),
                evaluation={'baseline_loss':baseline,'candidate_loss':candidate,'loss_improved':candidate<baseline,'listening':'NOT RUN','musical_quality':'NOT RUN'})
        except (OSError,ValueError,RuntimeError,TimeoutError) as error:
            if (run_dir/'adapter').exists():shutil.rmtree(run_dir/'adapter')
            manifest.update(state='failed_or_withdrawn',failure=str(error));raise
        finally:
            path.write_text(json.dumps(manifest,indent=2)+'\n')
            (output/'status.json').write_text(json.dumps({**report,'state':manifest['state'],'run':run_dir.name},indent=2)+'\n')
        return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,default=ROOT);p.add_argument('--auto',action='store_true');p.add_argument('--train',action='store_true');a=p.parse_args()
    # Eligible feedback can train locally while idle; candidates never change the serving model.
    print(json.dumps(run(a.root.resolve(),a.train or a.auto)))
