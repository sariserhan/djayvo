from pathlib import Path
import hashlib,json,subprocess,sys
sys.path.insert(0,'scripts')
from align_word_crops import align
from verify_export import verify_export
root=Path('renders/word-timing-20261018');source=Path('renders/voice-20261017-221411/source-pcm.wav')
timing=json.loads((root/'owner.words.json').read_text());reports={}
for style in ('hiphop','reggae','experimental','club'):
    old=Path('renders/feedback-reverb-20261018')/f'rules-{style}.{style}.score.json'
    original=json.loads(old.read_text());candidate,changes=align(original,timing)
    path=root/f'{style}-aligned.json';path.write_text(json.dumps(candidate,indent=2)+'\n')
    assert original['voice_events']==candidate['voice_events']
    clean={e['clip_id'] for e in original['voice_events'] if e['clean']}
    assert all(original['voice_clips'][i]==candidate['voice_clips'][i] for i in clean)
    for mode,plan in [('aligned',path),('control',old)]:
        subprocess.run(['build-mac/djayvo_remix','--input',str(source),'--consent','--style',style,'--plan',str(plan),
            '--output',str(root/f'{style}-{mode}'),'--stems'],check=True)
        verify_export(root/f'{style}-{mode}')
    reports[style]={'changed_clips':len(changes),'changes':changes,'native_validation':'PASS','source_sha256':timing['source_sha256'],
        'candidate_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'clean_clips_and_schedule_unchanged':True,'boundary_accuracy':'NOT RUN','listening':'NOT RUN'}
Path('docs/evidence/word-timing/renders.json').write_text(json.dumps(reports,indent=2)+'\n')
print('PASS: four aligned/control owner render pairs; unchanged complete clean hooks and schedule; boundary accuracy NOT RUN')
