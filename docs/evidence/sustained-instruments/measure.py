"""Compare fresh native/browser artifacts and prepare private matched review."""
import hashlib,json,subprocess,sys,wave
from pathlib import Path
import numpy as np
import jsonschema
sys.path.insert(0,'scripts')
from compare_portability import compare
from prepare_voice_transforms import frame_at
from review_cloud_music import loudness
from verify_export import verify_export
root=Path('renders/sustained-instruments-20261018')
linux=Path('renders/arrangement-linux/sustained-instruments-20261018')
old=Path('renders/guitar-20261018')
evidence=Path('docs/evidence/sustained-instruments')
schema=json.loads(Path('schemas/remix-plan.schema.json').read_text())
export_schema=json.loads(Path('schemas/export-completion.schema.json').read_text())
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def pcm(p):
    with wave.open(str(p)) as f:
        assert (f.getsampwidth(),f.getframerate())==(2,48000)
        return np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float).reshape(-1,f.getnchannels())/32768
report={'portability':{},'waveforms':{},'replays':{},'wasm':{},'owner_changes':{},'matched_review':{}}
owners=[(f'owner-{s}-{n}',s) for s in ('reggae','experimental','club','hybrid') for n in (4123,4124)]
fixtures=[('fixture',s) for s in ('hiphop','reggae','experimental')]+[(s,s) for s in ('club','funk','baseline','call_response','hybrid')]
for name,style in owners+fixtures:
    jsonschema.validate(verify_export(root/name),export_schema);verify_export(linux/name)
    prefix=f'{name}.{style}';plan=json.loads((root/f'{prefix}.score.json').read_text());jsonschema.validate(plan,schema)
    report['portability'][prefix]=compare(linux/prefix,root/prefix)
    for p in root.glob(f'{prefix}*.wav'):
        assert digest(p)==digest(linux/p.name),p
        data=pcm(p);peak=float(np.abs(data).max());assert peak<10**(-1/20) and np.all(data[-4800:]==0)
        report['waveforms'][p.name]={'sha256':digest(p),'frames':len(data),'peak':peak,'final_100ms_silent':True}
report['cross_platform_identical_wavs']=len(report['waveforms'])
unchanged=0;replayed=0
for name,style in fixtures:
    for engine,folder in [('node','web-wasm-gMtf3S'),('chromium','web-chromium-engine-4MATvQ'),('webkit','web-webkit-engine-NDNXWy')]:
        if style!='baseline':report['wasm'].setdefault(engine,{})[style]=compare(root/f'{name}.{style}',Path('renders')/folder/f'mix.{style}')
    report['replays'][style]=compare(old/f'{name}.{style}',root/f'replay-{style}.{style}')
    for p in old.glob(f'{name}.{style}*.wav'):
        suffix=p.name[len(name):]
        assert digest(p)==digest(root/f'replay-{style}{suffix}');replayed+=1
        if style in ('hiphop','funk','baseline','call_response'):
            assert digest(p)==digest(root/p.name);unchanged+=1
    if style in ('hiphop','funk','baseline','call_response'):
        for ext in ('.score.json','.events.tsv'):assert digest(old/f'{name}.{style}{ext}')==digest(root/f'{name}.{style}{ext}')
report.update(unchanged_generated_wavs=unchanged,byte_identical_replayed_wavs=replayed)
source=pcm(Path('renders/voice-20261017-221411/source-pcm.wav'));bodies=set()
for name,style in owners:
    plan=json.loads((root/f'{name}.{style}.score.json').read_text());vocals=pcm(root/f'{name}.{style}.vocals.wav');hooks=[]
    for e in plan['voice_events']:
        if not e['clean']:continue
        clip=plan['voice_clips'][e['clip_id']];assert clip['start_frame']==0 and clip['end_frame']==len(source)
        begin=frame_at(plan,e['start_tick']);expected=source[240:-240]*plan['analysis']['normalization_gain']*10**(e['gain_db']/20)/np.sqrt(2)
        error=float(np.abs(vocals[begin+240:begin+len(source)-240]-expected).max());assert error<=1/32768
        hooks.append({'start_frame':begin,'frames':len(source),'maximum_pcm_error':error})
    assert len(hooks)==2
    bodies.add(json.dumps([(t['instrument'],e['start_tick'],e['duration_ticks'],e['note']) for t in plan['tracks'] for e in t['events'] if 7680<=e['start_tick']<23040]))
    before=pcm(linux/'before'/f'{name}.{style}.wav');after=pcm(root/f'{name}.{style}.wav');assert before.shape==after.shape
    report['owner_changes'][name]={'clean_hooks':hooks,'max_pcm_difference':float(np.abs(after-before).max()),'rms_pcm_difference':float(np.sqrt(np.mean((after-before)**2))),'comparison':'same absolute frames against frozen guitar-stage Linux engine; no alignment', 'vocal_stem_unchanged':digest(root/f'{name}.{style}.vocals.wav')==digest(linux/'before'/f'{name}.{style}.vocals.wav')}
assert len(bodies)==8;report['distinct_owner_instrumental_bodies']=8
protected=('ai_improvisational_musician_master_spec_v1.md','renders/fixtures/synthetic-speech.wav','renders/voice-20261017-221411/source-pcm.wav')
report['preserved_sha256']={p:digest(Path(p)) for p in protected}
assert report['preserved_sha256']==json.loads(Path('docs/evidence/timeline/measurements.json').read_text())['preserved_sha256']
review=root/'review';review.mkdir();cards=[]
levels={(name,stage):loudness((root if stage=='after' else linux/'before')/f'{name}.{style}.wav') for name,style in owners for stage in ('before','after')}
target=min(-22.,*(v['lufs']-v['true_peak_dbfs']-2 for v in levels.values()))
for name,style in owners:
    card=f'<section><h2>{name.replace("-"," ")}</h2>';report['matched_review'][name]={}
    for stage in ('after','before'):
        origin=(root if stage=='after' else linux/'before')/f'{name}.{style}.wav';level=levels[name,stage];dest=review/f'{name}-{stage}.wav'
        subprocess.run(['ffmpeg','-v','error','-n','-i',str(origin),'-af',f"volume={target-level['lufs']}dB",'-c:a','pcm_s16le',str(dest)],check=True)
        measured=loudness(dest);assert abs(measured['lufs']-target)<=.2 and measured['true_peak_dbfs']<=-1.8
        report['matched_review'][name][stage]={'source':str(origin),'original':level,'matched':measured,'sha256':digest(dest)}
        card+=f'<p>{stage.title()} · matched level</p><audio controls preload="metadata" aria-label="{name} {stage}" src="{dest.name}"></audio>'
    instrument={'reggae':'organ','experimental':'lead','club':'pad','hybrid':'guitar'}[style]
    for stem in (instrument,'vocals'):
        card+=f'<p>{stem.title()} alone · original level</p><audio controls preload="metadata" aria-label="{name} {stem}" src="../{name}.{style}.{stem}.wav"></audio>'
    cards.append(card+'</section>')
(review/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Djayvo instrument and groove comparisons</title><style>body{max-width:760px;margin:40px auto;padding:0 20px;font:18px/1.5 system-ui;background:#151515;color:#eee}audio{width:100%}section{margin:32px 0}</style><h1>Djayvo instrument and groove comparisons</h1><p>Eight private before/after pairs from your recording, matched in loudness. Organ, lead and pad are intentional synthesizer voices; hybrid retains recorded guitar. Listen for the groove, section changes and voice entrances. Musical quality has not been rated.</p>'+''.join(cards)+'<script>document.addEventListener("play",e=>{document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>')
report.update(human_listening='NOT RUN',production_quality='PARTIAL',cloud_calls=0)
(evidence/'measurements.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS:',report['cross_platform_identical_wavs'],'exact M5/Linux WAVs;',unchanged,'unchanged generated WAVs;',replayed,'exact old-score replay WAVs; 8 private matched pairs; listening NOT RUN')
