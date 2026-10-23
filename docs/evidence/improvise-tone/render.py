"""Compare mix treatment at the exact owner-reviewed placements, without new inference."""
import json,sys,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'scripts'))
import numpy as np
from arrange_voice_research import RATE,digest,read_pcm,write_pcm
from local_call_edit import edit

prior=Path('renders/improvise-blending-20261023-final/report.json')
output=Path(sys.argv[1] if len(sys.argv)>1 else 'renders/improvise-tone-20261023');output.mkdir(exist_ok=False)
old=json.loads(prior.read_text());runs=[]
for index,row in enumerate(old['runs']):
    before=Path(row['performance']);old_dir=before.parent
    receipt=json.loads((old_dir/'complete.json').read_text())
    source=next(p for p in old_dir.parent.glob('source*.wav') if digest(p)==receipt['source_sha256'])
    song=Path('renders/integrated-singer-audition-20261022')/row['style']
    original_source=digest(source);original_song=digest(song/'singer.wav')
    target=output/f'{index+1:02}-{row["style"]}'
    region=[f/RATE for f in receipt['region_frames']] if receipt['mode']=='vocal-replacement' else None
    report=edit(song,source,target,receipt['events'][0]['start_frame']/RATE,True,
                replace_region=region,repeat_at=[e['start_frame']/RATE for e in receipt['events'][1:]])
    assert report['outside_region_max_pcm_error']==0 and report['processed_source_max_pcm_error']<=.5/32768+1e-12
    assert [(e['start_frame'],e['end_frame']) for e in report['events']]==[(e['start_frame'],e['end_frame']) for e in receipt['events']]
    assert report['artifacts']['music']==receipt['artifacts']['music']
    assert digest(source)==original_source and digest(song/'singer.wav')==original_song and digest(before)==row['sha256']
    voice=read_pcm(target/'user.wav',(30,45));event=report['events'][0]
    write_pcm(target/'voice-only.wav',voice[event['start_frame']:event['end_frame']])
    runs.append({'number':index+1,'style':row['style'],'pattern':row['pattern'],'selection':row['selection'],
        'before':str(before),'before_sha256':row['sha256'],'after':str(target/'performance.wav'),
        'after_sha256':report['artifacts']['performance'],'source':str(source),'source_sha256':original_source,
        'voice_only':str(target/'voice-only.wav'),'events':report['events'],
        'previous_target_rms':[e['target_lead_rms'] for e in receipt['events']],
        'peak':report['peak'],'outside_region_max_pcm_error':report['outside_region_max_pcm_error'],
        'processed_source_max_pcm_error':report['processed_source_max_pcm_error']})
result={'technical':'PASS','owner_identity_and_mix_listening':'NOT RUN','new_model_inference':'NOT RUN',
        'before_report_sha256':hashlib.sha256(prior.read_bytes()).hexdigest(),
        'same_placements_and_backing':True,'original_files_preserved':True,'runs':runs}
(output/'report.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'technical':'PASS','pairs':len(runs),'report':str(output/'report.json')}))
