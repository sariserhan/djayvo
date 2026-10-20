#!/usr/bin/env python3
"""Check unchanged mixes and compare one controlled guitar-accent plan."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import random
import shutil
import subprocess
import tempfile

from q0_audit import ROOT, digest, inputs, level_match, loudness, write
from q0_measure_comparisons import timing
from q0_phrase_trial import guitar_renderer
from verify_export import verify_export


def accents(plan):
    candidate = copy.deepcopy(plan)
    guitars = [t for t in candidate['tracks'] if t['instrument']=='guitar']
    if len(guitars)!=1 or candidate['ticks_per_quarter']!=960 or candidate['time_signature']!=[4,4]:
        raise ValueError('Expected the frozen guitar arrangement')
    ordinary = [n for n in guitars[0]['events'] if not n.get('muted',False)]
    groups = [(0,[86,82,78,74]),(3840+1920,[94,86,82,78]),
              ((candidate['target_bars']-1)*3840,[98,92,86,80])]
    if len(ordinary)!=12:
        raise ValueError('Expected three four-note ordinary guitar chords')
    for tick, velocities in groups:
        notes = sorted([n for n in ordinary if tick <= n['start_tick'] <= tick+21],key=lambda n:n['start_tick'])
        if [n['start_tick'] for n in notes] != [tick+i*7 for i in range(4)]:
            raise ValueError('Unexpected guitar strum timing')
        for note, velocity in zip(notes, velocities):
            note['velocity'] = velocity
    return candidate


def run(output):
    if output.exists():
        raise ValueError('Choose a fresh experiment directory')
    prior = ROOT/'renders/q0-phrase-form-20261020'
    inventory = json.loads((ROOT/'docs/evidence/q0-phrase-form/measurements.json').read_text())['trial_file_sha256']
    for name, sha in inventory.items():
        if digest(prior/name)!=sha:
            raise ValueError('Frozen control changed')
    rights = {r['id']:r['sha256'] for r in inputs()}
    report = json.loads((prior/'report.json').read_text())
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    candidate = guitar_renderer(output, single_layer=True)
    preserved = []
    for row in report['records']:
        ident, style = row['id'], row['style']
        source = ROOT/'renders/q0-baseline-v2-20261020'/ident/'source.wav'
        if digest(source)!=rights[ident]:
            raise ValueError('Source hash or authorization changed')
        plan_path = prior/ident/f'candidate.{style}.score.json'
        plan = json.loads(plan_path.read_text())
        if any(n['velocity']>84 for t in plan['tracks'] if t['instrument']=='guitar'
               for n in t['events'] if not n.get('muted',False)):
            raise ValueError('Preservation control unexpectedly uses the forte layer')
        with tempfile.TemporaryDirectory(prefix='jamloom-q0-preservation-') as tmp:
            prefix = Path(tmp)/'check'
            subprocess.run([str(candidate),'--input',str(source),'--consent','--plan',str(plan_path),
                '--style',style,'--seed',str(plan['seed']),'--output',str(prefix)],check=True,timeout=120)
            verify_export(prefix,(style,))
            hashes={}
            for suffix in ('wav','score.json','events.tsv'):
                actual=Path(str(prefix)+'.'+style+'.'+suffix)
                expected=prior/ident/f'candidate.{style}.{suffix}'
                if digest(actual)!=digest(expected):
                    raise ValueError('Existing arrangement changed')
                hashes[suffix]=digest(actual)
            preserved.append({'id':ident,'hashes':hashes,'result':'PASS',
                'temporary_check_exports':'Removed by test harness; identical original controls retained'})
    source = ROOT/'renders/q0-baseline-v2-20261020/owner-speech/source.wav'
    original = json.loads((prior/'owner-speech/candidate.hiphop.score.json').read_text())
    plan = accents(original); write(output/'accent.plan.json',plan)
    results={}
    for arm, renderer, block, stems in [('control',ROOT/'build-mac/jamloom_remix',512,True),
            ('candidate',candidate,512,True),('replay',candidate,113,False)]:
        command=[str(renderer),'--input',str(source),'--consent','--plan',str(output/'accent.plan.json'),
                 '--style','hiphop','--seed',str(plan['seed']),'--block-size',str(block),
                 '--output',str(output/arm)]
        subprocess.run([*command,*(['--stems'] if stems else [])],check=True,timeout=120)
        verify_export(output/arm,('hiphop',))
        if json.loads((output/f'{arm}.hiphop.score.json').read_text())!=plan:
            raise ValueError('Imported accent plan changed')
        results[arm]={'timing':timing(plan,output/f'{arm}.hiphop.events.tsv'),
            'native':json.loads((output/f'{arm}.hiphop.report.json').read_text())}
    for suffix in ('wav','score.json','events.tsv'):
        if digest(output/f'candidate.hiphop.{suffix}')!=digest(output/f'replay.hiphop.{suffix}'):
            raise ValueError('Accent replay differs')
    for suffix in ('score.json','events.tsv','piano.wav','bass.wav','drums.wav','vocals.wav'):
        if digest(output/f'control.hiphop.{suffix}')!=digest(output/f'candidate.hiphop.{suffix}'):
            raise ValueError('Non-guitar component changed')
    listener=output/'listener';listener.mkdir()
    shutil.copyfile(source,listener/'source.wav')
    paths={arm:output/f'{arm}.hiphop.wav' for arm in ('control','candidate')}
    raw={arm:loudness(path) for arm,path in paths.items()}
    target=min(-23.,*(float(m['input_i'])-2-float(m['input_tp']) for m in raw.values()))
    order=list(paths);random.Random('single-layer-accents').shuffle(order)
    keys={};players=[]
    for i,arm in enumerate(order,1):
        code=f'candidate-{i}'
        gain,matched=level_match(paths[arm],listener/(code+'.wav'),target,raw[arm])
        results[arm].update(raw_loudness=raw[arm],matched=matched,matching_gain_db=gain)
        keys[code]=arm
        players.append(f'<h2>Candidate {i}</h2><audio controls preload="none" src="{code}.wav"></audio>')
    shutil.copyfile(prior/'listener/ATTRIBUTION.txt',listener/'ATTRIBUTION.txt')
    (listener/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom guitar accent comparison</title>'
        '<style>body{font:18px/1.5 system-ui;max-width:850px;margin:auto;padding:24px;background:#10171b;color:#eee}'
        'audio{width:100%}a{color:#8de4e6}</style><h1>Guitar accents in the full mix</h1>'
        '<p>Same score and tempo, including stronger guitar accents in the introduction and ending. '
        'One sampler preserves its ordinary recorded guitar layer at higher velocities. Judge accent balance, '
        'tone and how the guitar fits the music. No version is assumed better. Whole mixes are loudness-matched. '
        'Private owner-only review; no uploads or ratings collection.</p><a href="ATTRIBUTION.txt">Credits</a>'
        '<h2>Original voice</h2><audio controls preload="none" src="source.wav"></audio>'+''.join(players)+
        '<script>document.addEventListener("play",e=>document.querySelectorAll("audio").forEach('
        'a=>{if(a!==e.target)a.pause()}),true)</script></html>')
    audio={p.name:digest(p) for p in sorted(listener.glob('*.wav'))}
    packet=hashlib.sha256(json.dumps(audio,sort_keys=True).encode()).hexdigest()
    write(listener/'packet.json',{'packet_id':packet,'audio_sha256':audio})
    write(output/'organizer-key.json',keys)
    write(output/'report.json',{'version':'1.0-q0-guitar-accents','technical':'PASS','human_quality':'NOT RUN',
        'preserved_existing_mixes':preserved,'results':results,'target_lufs':target,'packet_id':packet,
        'original_plan_sha256':digest(prior/'owner-speech/candidate.hiphop.score.json'),
        'accent_plan_sha256':digest(output/'accent.plan.json'),'production_changed':False})
    (output/'INCOMPLETE').unlink()
    print('PASS: five existing mixes unchanged; same-score accent pair and exact replay; listening NOT RUN')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True)
    run(p.parse_args().output.resolve())
