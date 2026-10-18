"""Validate optional crop proposals on the frozen first-seed speech cohort."""
from pathlib import Path
import json,subprocess,sys
sys.path.insert(0,'scripts')
from align_word_crops import align
from verify_export import verify_export
root=Path('renders/licensed-crop-proposals-20261018');root.mkdir()
batch=Path('renders/licensed-evaluation-batch-final-20261018');frozen=json.loads((batch/'freeze.json').read_text())
rows=[]
for clip in frozen['dataset']['clips']:
    if clip['kind']!='speech':continue
    timing=json.loads((Path('renders/licensed-speech-timing-20261018')/(clip['id']+'.words.json')).read_text())
    folder=root/clip['id'];folder.mkdir()
    for style in ('hiphop','reggae','experimental'):
        source_plan=Path('renders/arrangement-linux/licensed-evaluation-20261018')/clip['id']/f'remix.{style}.score.json';original=json.loads(source_plan.read_text())
        candidate,changes=align(original,timing)
        assert candidate['voice_events']==original['voice_events'] and candidate['tracks']==original['tracks']
        clean={e['clip_id'] for e in original['voice_events'] if e['clean']}
        assert all(original['voice_clips'][i]==candidate['voice_clips'][i] for i in clean)
        row={'clip_id':clip['id'],'style':style,'changed_clips':len(changes),'native_validation':'NOT RUN','word_accuracy':'NOT RUN','listening':'NOT RUN'}
        if not changes:row['result']='UNCHANGED';rows.append(row);continue
        plan=folder/(style+'.json');plan.write_text(json.dumps(candidate,indent=2)+'\n')
        run=subprocess.run(['build-mac/djayvo_remix','--input',str(batch/'sources'/(clip['id']+'.wav')),'--consent','--style',style,
            '--plan',str(plan),'--output',str(folder/style)],capture_output=True,text=True,timeout=180)
        (folder/(style+'.log')).write_text(run.stdout+run.stderr)
        row['native_validation']='PASS' if run.returncode==0 else 'FAIL';row['result']='PROPOSED'
        if run.returncode==0:assert verify_export(folder/style)['source_sha256']==clip['sha256']
        rows.append(row)
report={'status':'FAIL' if any(r['native_validation']=='FAIL' for r in rows) else 'PASS','proposals':rows,
    'unchanged_fallbacks':sum(r['result']=='UNCHANGED' for r in rows),'native_validated':sum(r['native_validation']=='PASS' for r in rows),
    'scope':'Optional proposals from Linux first-seed plans replayed on M5; original frozen listening cohort unchanged','word_accuracy':'NOT RUN','musical_quality':'NOT RUN'}
Path('docs/evidence/licensed-evaluation/crop-proposals.json').write_text(json.dumps(report,indent=2)+'\n')
print(report['status'],len(rows),'source/style plans;',report['native_validated'],'validated proposals;',report['unchanged_fallbacks'],'unchanged fallbacks; accuracy/listening NOT RUN')
assert report['status']=='PASS'
