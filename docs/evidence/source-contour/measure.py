"""Check source-contour renders and prepare four private, level-matched comparisons."""
from pathlib import Path
import hashlib,json,re,subprocess,sys,wave
import numpy as np
import jsonschema
sys.path.insert(0,'scripts')
from compare_portability import compare
from prepare_voice_transforms import frame_at
from review_cloud_music import loudness
from verify_export import verify_export

root=Path('renders/source-contour-20261019')
after=root/'after';before=root/'before/audio';linux=Path('renders/arrangement-linux/source-contour-20261019')
evidence=Path('docs/evidence/source-contour')
schema=json.loads(Path('schemas/remix-plan.schema.json').read_text())
owners=[(f'owner-{seed}','call_response') for seed in range(4123,4127)]
fixtures=[('fixture',s) for s in ('hiphop','reggae','experimental')]+[(s,s) for s in ('club','funk','baseline','call_response','hybrid')]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def pcm(p):
    with wave.open(str(p)) as f:
        assert (f.getsampwidth(),f.getframerate())==(2,48000)
        return np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float).reshape(-1,f.getnchannels())/32768

report={'portability':{},'waveforms':{},'unchanged_styles':{},'replay':{},'browser':{},'owner_changes':{},'review':{}}
for name,style in owners+fixtures:
    verify_export(after/name);verify_export(linux/name)
    prefix=f'{name}.{style}'
    jsonschema.validate(json.loads((after/f'{prefix}.score.json').read_text()),schema)
    report['portability'][prefix]=compare(linux/prefix,after/prefix)
    for p in after.glob(f'{prefix}*.wav'):
        assert digest(p)==digest(linux/p.name),p
        data=pcm(p);peak=float(np.abs(data).max())
        assert np.isfinite(data).all() and peak<10**(-1/20) and np.all(data[-4800:]==0)
        report['waveforms'][p.name]={'sha256':digest(p),'frames':len(data),'peak':peak,'final_100ms_silent':True}
    if style=='call_response':
        verify_export(root/'replay'/name)
        report['replay'][prefix]=compare(before/prefix,root/'replay'/prefix)
        for p in before.glob(f'{prefix}*.wav'):assert digest(p)==digest(root/'replay'/p.name)
    else:
        report['unchanged_styles'][style]=compare(before/prefix,after/prefix)
        for p in before.glob(f'{prefix}*.wav'):assert digest(p)==digest(after/p.name)

for engine,log in [('node','wasm.log'),('chromium','chromium-engine.log'),('webkit','webkit-engine.log')]:
    folder=Path(re.search(r'renders/web-(?:wasm|chromium-engine|webkit-engine)-[A-Za-z0-9]+',(evidence/log).read_text())[0])
    report['browser'][engine]={style:compare(after/f'{name}.{style}',folder/f'mix.{style}') for name,style in fixtures if style!='baseline'}

source=pcm(Path('renders/voice-20261017-221411/source-pcm.wav'));bodies=set()
for name,style in owners:
    prefix=f'{name}.{style}';p=json.loads((after/f'{prefix}.score.json').read_text());voice=pcm(after/f'{prefix}.vocals.wav')
    hooks=[]
    for e in p['voice_events']:
        if not e['clean']:continue
        clip=p['voice_clips'][e['clip_id']];assert clip['start_frame']==0 and clip['end_frame']==len(source)
        start=frame_at(p,e['start_tick']);expected=source[240:-240]*p['analysis']['normalization_gain']*10**(e['gain_db']/20)/np.sqrt(2)
        error=float(np.abs(voice[start+240:start+len(source)-240]-expected).max())
        assert error<=1/32768
        hooks.append({'start_frame':start,'maximum_pcm_error':error})
    assert len(hooks)==2
    body=[(t['instrument'],e['start_tick'],e['duration_ticks'],e['note']) for t in p['tracks'] for e in t['events'] if 2*3840<=e['start_tick']<15*3840]
    bodies.add(json.dumps(body))
    new=pcm(after/f'{prefix}.wav');old=pcm(before/f'{prefix}.wav');assert new.shape==old.shape
    assert all(digest(after/f'{prefix}.{stem}.wav')==digest(before/f'{prefix}.{stem}.wav') for stem in ('vocals','bass','drums'))
    previous=json.loads((before/f'{prefix}.score.json').read_text())
    old_notes=previous['tracks'][0]['events'];new_notes=p['tracks'][0]['events']
    assert len(old_notes)==len(new_notes)
    assert all({k:v for k,v in a.items() if k!='note'}=={k:v for k,v in b.items() if k!='note'} for a,b in zip(old_notes,new_notes))
    report['owner_changes'][name]={'changed_piano_pitches':sum(a['note']!=b['note'] for a,b in zip(old_notes,new_notes)), 'nonpitch_events_and_other_stems_unchanged':True, 'clean_hooks':hooks,'maximum_pcm_difference':float(np.abs(new-old).max()),
        'rms_pcm_difference':float(np.sqrt(np.mean((new-old)**2))),'comparison':'same seed, same absolute frames; no time alignment',
        'vocal_events_before':len(json.loads((before/f'{prefix}.score.json').read_text())['voice_events']),
        'vocal_events_after':len(p['voice_events'])}
assert len(bodies)==4
protected={'ai_improvisational_musician_master_spec_v1.md':'389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2',
           'renders/fixtures/synthetic-speech.wav':'c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e',
           'renders/voice-20261017-221411/source-pcm.wav':'7b23204717e1f114ebb25821ba4847416af336278fc0ee22275481d330950427'}
assert all(digest(Path(p))==h for p,h in protected.items())
report['preserved_sha256']=protected
report['engine_source_sha256']=digest(root/'candidate/remix.cpp')

review=root/'review';review.mkdir();cards=[]
levels={(name,stage):loudness(folder/f'{name}.{style}.wav') for name,style in owners for stage,folder in [('before',before),('after',after)]}
target=min(-22.,*(v['lufs']-v['true_peak_dbfs']-2 for v in levels.values()))
for name,style in owners:
    card=f'<section><h2>Take {name.split("-")[1]}</h2>';report['review'][name]={}
    for stage,folder in [('after',after),('before',before)]:
        original=folder/f'{name}.{style}.wav';dest=review/f'{name}-{stage}.wav';level=levels[name,stage]
        subprocess.run(['ffmpeg','-v','error','-n','-i',str(original),'-af',f"volume={target-level['lufs']}dB",'-c:a','pcm_s16le',str(dest)],check=True)
        measured=loudness(dest);assert abs(measured['lufs']-target)<=.2 and measured['true_peak_dbfs']<=-1.8
        report['review'][name][stage]={'original':level,'matched':measured,'sha256':digest(dest)}
        card+=f'<p>{stage.title()} · matched loudness</p><audio controls preload="metadata" aria-label="{name} {stage}" src="{dest.name}"></audio>'
    for stem in ('piano','bass','vocals'):
        card+=f'<p>{stem.title()} alone · original level</p><audio controls preload="metadata" aria-label="{name} {stem}" src="../after/{name}.{style}.{stem}.wav"></audio>'
    cards.append(card+'</section>')
(review/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Djayvo pitch contour comparisons</title><style>body{max-width:760px;margin:40px auto;padding:0 20px;font:18px/1.5 system-ui;background:#151515;color:#eee}audio{width:100%}section{margin:32px 0}</style><h1>Djayvo pitch contour</h1><p>Four private Call &amp; Response comparisons from your recording. Listen around 10–15 seconds for the first answer and 27–32 seconds for the changed return. Compare whether the piano follows the rise and fall of your phrase. Rhythm, voice, bass and drums are unchanged. This is deterministic DSP research, not a newly trained model. Owner feedback: no clear difference. This research candidate is not active in the studio; formal quality has not been rated. Stems play at their original level.</p>'+''.join(cards)+'<script>document.addEventListener("play",e=>{document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>')
report.update(distinct_owner_bodies=len(bodies),identical_cross_platform_wavs=len(report['waveforms']),human_listening='NOT RUN',production_quality='PARTIAL')
(evidence/'measurements.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS:',len(report['waveforms']),'exact cross-platform WAVs, five old-score replays, seven unchanged styles, 21 WASM comparisons and four owner pairs')
