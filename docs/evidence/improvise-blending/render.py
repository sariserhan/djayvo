"""Blend cleared recordings into existing generated songs; no model inference or playback."""
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'scripts'))
from singer_studio import prepare_source, sample_candidate
from local_call_edit import arrange
from arrange_voice_research import digest

root=Path(sys.argv[1] if len(sys.argv)>1 else 'renders/improvise-blending-20261023-final')
root.mkdir(exist_ok=False)
source=Path('renders/meaning-singer-trial-20261022/original-recording')
speech=json.loads(Path('renders/meaning-singer-trial-20261022/meaning.json').read_text())
short=Path('renders/source-led-response-20261022/hook.wav')
reports=[];failures=[]
songs=Path('renders/integrated-singer-audition-20261022')
for style in ('reggae-male','house-female','funk-male','acousticpop-female','drumandbass-male'):
    song=songs/style
    if not (song/'singer.wav').exists():continue
    original=digest(song/'singer.wav')
    for seed in range(6):
        work=root/f'{style}-{seed}';work.mkdir()
        recording=short if seed==3 else source
        before=digest(recording);info=prepare_source(recording,work)
        for attempt in range(4):
            candidate=sample_candidate(work,{} if seed==3 else speech,style.split('-')[0],info['original_seconds'],seed,attempt)
            if candidate is None:break
            meta=json.loads(candidate[1].read_text())
            if seed==3 and meta['selection']!='whole-recording':continue
            try:
                r=arrange(candidate[0],song,work/f'mix-{attempt}',root/'history.json',seed+attempt,True)
            except ValueError:continue
            assert r['sample_used'] and r['events'] and r['outside_region_max_pcm_error']==0
            assert r['source_identity_max_pcm_error']<=.5/32768+1e-12
            meta=json.loads(candidate[1].read_text())
            reports.append({'style':style,'seed':seed,'pattern':r['pattern'],'mode':r['mode'],
                'selection':meta['selection'],'crop_seconds':meta['original_seconds'],'events':r['events'],
                'unchanged_seconds':r['unchanged_seconds'],'peak':r['peak'],
                'outside_region_max_pcm_error':r['outside_region_max_pcm_error'],
                'source_identity_max_pcm_error':r['source_identity_max_pcm_error'],
                'performance':str(work/f'mix-{attempt}/performance.wav'),'sha256':r['artifacts']['performance']})
            break
        else:
            failures.append({'style':style,'seed':seed});continue
        if not any(r['style']==style and r['seed']==seed for r in reports):failures.append({'style':style,'seed':seed})
        assert digest(recording)==before and digest(song/'singer.wav')==original
result={'technical':'PASS' if not failures else 'PARTIAL','listening':'NOT RUN',
        'new_model_inference':'NOT RUN - existing generated songs reused','originals_preserved':True,
        'runs':reports,'rejected_runs':failures}
(root/'report.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'status':result['technical'],'runs':len(reports),'patterns':sorted({r['pattern'] for r in reports}),
                  'selections':sorted({r['selection'] for r in reports}),'failures':failures,'report':str(root/'report.json')}))
