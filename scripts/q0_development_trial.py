#!/usr/bin/env python3
"""Compare new composition against frozen Q0 E, keeping instruments and mixing fixed."""
import argparse
import hashlib
import json
from pathlib import Path
import random
import re
import shutil
import subprocess

from q0_audit import ROOT, digest, event_metrics, inspect, level_match, loudness, inputs, write
from q0_development import develop
from q0_listening_results import summarize
from q0_measure_comparisons import timing
from verify_export import verify_export


def run(output, source_groove=False):
    prior=ROOT/'renders/q0-performance-20261020'
    summarize(prior,[])
    frozen=json.loads((prior/'report.json').read_text())
    inventory=json.loads((ROOT/'docs/evidence/q0-performance/measurements.json').read_text())['trial_file_sha256']
    renderer=ROOT/'build-q0-decay-20261020/build/jamloom_remix'
    if digest(renderer)!=frozen['instrument_build']['renderer_sha256'] or output.exists():
        raise ValueError('Expected frozen renderer and fresh output')
    rights={r['id']:r for r in inputs()}
    output.mkdir(parents=True);(output/'INCOMPLETE').touch()
    listener=output/'listener';listener.mkdir()
    rows,keys={},{}
    document=(prior/'listener/index.html').read_text()
    for record in frozen['records']:
        ident,style=record['id'],record['style']
        source=ROOT/'renders/q0-baseline-v2-20261020'/ident/'source.wav'
        if digest(source)!=rights[ident]['sha256']:
            raise ValueError('Source identity changed')
        base=prior/ident/f'E.{style}'
        for suffix in ('wav','score.json','events.tsv'):
            path=Path(str(base)+'.'+suffix)
            if digest(path)!=inventory[str(path.relative_to(prior))]:
                raise ValueError('Frozen control changed')
        original=json.loads(Path(str(base)+'.score.json').read_text())
        wordpath=(ROOT/'renders/arrangement-linux/word-timing-20261018/owner.words.json'
                  if ident=='owner-speech' else
                  ROOT/'renders/licensed-speech-timing-20261018'/(ident+'.words.json'))
        words=None if ident=='commons-laughter' else json.loads(wordpath.read_text())
        if words and (words['model_manifest_sha256']!=digest(ROOT/'assets/manifests/word-timing-tiny.json') or
                      words.get('consent_confirmed') is not True):
            raise ValueError('Unverified word-analysis provenance')
        candidate,trace=develop(original,source,words,source_groove=source_groove)
        folder=output/ident;folder.mkdir()
        if source_groove:
            control,_=develop(original,source,words)
            write(folder/'control.plan.json',control)
            subprocess.run([str(renderer),'--input',str(source),'--consent','--plan',str(folder/'control.plan.json'),
                '--style',style,'--seed',str(control['seed']),'--stems','--output',str(folder/'control')],check=True,timeout=120)
            verify_export(folder/'control',(style,))
            base=folder/f'control.{style}'
            original=control
        write(folder/'candidate.plan.json',candidate);write(folder/'development.json',trace)
        command=[str(renderer),'--input',str(source),'--consent','--plan',str(folder/'candidate.plan.json'),
                 '--style',style,'--seed',str(candidate['seed'])]
        for name,options in [('candidate',['--stems']),('replay',['--block-size','113'])]:
            subprocess.run([*command,*options,'--output',str(folder/name)],check=True,timeout=120)
            verify_export(folder/name,(style,))
        for suffix in ('wav','score.json','events.tsv'):
            if (folder/f'candidate.{style}.{suffix}').read_bytes()!=(folder/f'replay.{style}.{suffix}').read_bytes():
                raise ValueError('Replay differs')
        if candidate!=json.loads((folder/f'candidate.{style}.score.json').read_text()):
            raise ValueError('Importer changed candidate plan')
        if [(t['instrument'],t.get('sound'),t['gain_db'],t['pan']) for t in candidate['tracks']]!=[
                (t['instrument'],t.get('sound'),t['gain_db'],t['pan']) for t in original['tracks']]:
            raise ValueError('Instrument palette or balance changed')
        for field in ('tempo_milli_bpm','target_bars','mix','source','tail_ms'):
            if candidate[field]!=original[field]:raise ValueError('Unexpected control change: '+field)
        paths={'A':Path(str(base)+'.wav'),'B':folder/f'candidate.{style}.wav'}
        levels={arm:loudness(path) for arm,path in paths.items()}
        target=min(-23.,*(float(x['input_i'])-2-float(x['input_tp']) for x in levels.values()))
        order=list(paths);random.Random('q0-development-'+ident).shuffle(order)
        arms={}
        for number,arm in enumerate(order,1):
            code=f'{ident}-{number}';destination=listener/(code+'.wav')
            gain,matched=level_match(paths[arm],destination,target,levels[arm])
            keys[code]={'arm':arm,'gain_db':gain,'sha256':digest(destination)}
            arms[arm]={'raw':inspect(paths[arm]),'raw_loudness':levels[arm],'matched_loudness':matched}
        shutil.copyfile(source,listener/(ident+'-source.wav'))
        # Reuse the frozen accessible form, keeping only its first two anonymous fields.
        pattern=r'<section><h2>'+re.escape(ident)+r'</h2>.*?</section>'
        section=re.search(pattern,document,re.S)
        if section is None:raise ValueError('Missing source review section')
        old=section.group()
        fieldsets=list(re.finditer(r'<fieldset>.*?</fieldset>',old,re.S))
        if len(fieldsets)!=5:raise ValueError('Unexpected frozen review layout')
        reduced=old
        for match in reversed(fieldsets[2:]):reduced=reduced[:match.start()]+reduced[match.end():]
        document=document[:section.start()]+reduced+document[section.end():]
        rows[ident]={'id':ident,'style':style,'arms':arms,'target_lufs':target,
            'control_timing':timing(original,Path(str(base)+'.events.tsv')),
            'candidate_timing':timing(candidate,folder/f'candidate.{style}.events.tsv'),
            'candidate_metrics':event_metrics(candidate),'control_plan_sha256':digest(Path(str(base)+'.score.json')),
            'word_estimates_sha256':digest(wordpath) if words else None,
            'source_derived_motif':trace['source_analysis'],'replay_512_113':'PASS'}
    start='Five conditions: existing rendering, instrument decay, expression, their combination, and composition plus both. Same source and tempo throughout; the composition condition changes notes and vocal arrangement. '
    if document.count(start)!=1:raise ValueError('Unexpected frozen experiment description')
    document=document.replace(start,('Two compositions: source-motif development with fixed accompaniment and source-responsive bass/drums. '
        if source_groove else 'Two compositions: the previous full Q0 candidate and a new source-motif development. ')+
        'Same instruments, renderer, mix settings, tempo and duration. Notes, form and vocal placement differ. ')
    document=document.replace('Q0 controlled listening diagnostic','Q0 source-responsive groove' if source_groove else 'Q0 source-motif development')
    (listener/'index.html').write_text(document)
    shutil.copyfile(ROOT/'scripts/q0-review.js',listener/'review.js')
    for name in ('review.css','ATTRIBUTION.txt'):shutil.copyfile(prior/'listener'/name,listener/name)
    audio={p.name:digest(p) for p in sorted(listener.glob('*.wav'))}
    identity=hashlib.sha256(json.dumps(audio,sort_keys=True).encode()).hexdigest()
    write(listener/'packet.json',{'packet_id':identity,'audio_sha256':audio})
    write(output/'organizer-key.json',keys)
    write(output/'report.json',{'version':'1.0-q0-source-groove' if source_groove else '1.0-q0-development','technical':'PASS','human_quality':'NOT RUN',
        'packet_id':identity,'records':list(rows.values()),'renderer_sha256':digest(renderer),
        'control':('Source-motif development' if source_groove else 'Frozen Q0 E')+'; same instruments, renderer, tempo, duration and mix settings',
        'production_changed':False,'source_sha256':{name:digest(ROOT/'scripts'/name) for name in
            ('q0_development.py','q0_authored_score.py','q0_performance.py','q0_expression.py')}})
    (output/'INCOMPLETE').unlink()
    write(output/'listening-results.json',summarize(output,[]))
    print('PASS: five composition-only comparisons, stems, exact replays and matched listening WAVs; quality NOT RUN')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--source-groove',action='store_true')
    args=parser.parse_args()
    run(args.output.resolve(),args.source_groove)
