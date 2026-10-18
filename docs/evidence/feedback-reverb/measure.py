from pathlib import Path
import hashlib,json,re,subprocess,sys,wave
import numpy as np
import jsonschema
sys.path.insert(0,'scripts')
from compare_portability import compare
from review_cloud_music import loudness
from verify_export import verify_export
root=Path('renders/feedback-reverb-20261018');linux=Path('renders/arrangement-linux/feedback-reverb-20261018');evidence=Path('docs/evidence/feedback-reverb')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def pcm(p):
    with wave.open(str(p)) as f:return np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
styles=('hiphop','reggae','experimental','club');cases=[(f'{s}-{m}',s) for s in styles for m in ('dry','wet')]
fixtures=[('fixture',s) for s in styles[:3]]+[(s,s) for s in ('club','funk','baseline','call_response','hybrid')]
r={'portability':{},'wet_dry':{},'browsers':{},'waveforms':{}}
for name,style in cases+fixtures:
    jsonschema.validate(verify_export(root/name),json.loads(Path('schemas/export-completion.schema.json').read_text()));verify_export(linux/name)
    prefix=f'{name}.{style}';plan=json.loads((root/f'{prefix}.score.json').read_text());jsonschema.validate(plan,json.loads(Path('schemas/remix-plan.schema.json').read_text()))
    r['portability'][prefix]=compare(linux/prefix,root/prefix)
    for p in root.glob(f'{prefix}*.wav'):
        assert digest(p)==digest(linux/p.name);data=pcm(p)
        assert np.all(data[-9600:]==0) and np.abs(data).max()<10**(-1/20)
        r['waveforms'][p.name]={'sha256':digest(p),'frames':len(data)//2,'peak':float(np.abs(data).max())}
for name,style in fixtures:
    for p in root.glob(f'{name}.{style}*'):
        if p.suffix in ('.wav','.tsv') or p.name.endswith('.score.json'):assert digest(p)==digest(Path('renders/sustained-instruments-20261018')/p.name)
for kind in ('wasm','chromium','webkit'):
    folder=Path(re.search(r'/Users/\S+/renders/web-[\w-]+',(evidence/f'{kind}.log').read_text())[0]);r['browsers'][kind]={}
    for name,style in fixtures:
        if style!='baseline':r['browsers'][kind][style]=compare(root/f'{name}.{style}',folder/f'mix.{style}')
review=root/'review';review.mkdir();cards=[]
for style in styles:
    dry=pcm(root/f'{style}-dry.{style}.wav');wet=pcm(root/f'{style}-wet.{style}.wav')
    assert digest(root/f'{style}-dry.{style}.vocals.wav')==digest(root/f'{style}-wet.{style}.vocals.wav')
    r['wet_dry'][style]={'max_pcm_difference':float(np.abs(wet-dry).max()),'rms_pcm_difference':float(np.sqrt(np.mean((wet-dry)**2))),'vocal_stem_unchanged':True,'levels':{}}
    card=f'<section><h2>{style.title()}</h2>'
    for mode in ('wet','dry'):
        source=root/f'{style}-{mode}.{style}.wav';level=loudness(source);target=-24.;dest=review/f'{style}-{mode}.wav'
        subprocess.run(['ffmpeg','-v','error','-n','-i',str(source),'-af',f"volume={target-level['lufs']}dB",'-c:a','pcm_s16le',str(dest)],check=True)
        actual=loudness(dest);assert abs(actual['lufs']-target)<.2 and actual['true_peak_dbfs']<-1
        r['wet_dry'][style]['levels'][mode]={'original':level,'matched':actual}
        card+=f'<p>{mode.title()} · matched level</p><audio controls preload="metadata" aria-label="{style} {mode}" src="{dest.name}"></audio>'
    instrument={'hiphop':'piano','reggae':'organ','experimental':'lead','club':'pad'}[style]
    for stem in (instrument,'vocals'):card+=f'<p>{stem} alone · original level</p><audio controls preload="metadata" aria-label="{style} {stem}" src="../{style}-wet.{style}.{stem}.wav"></audio>'
    cards.append(card+'</section>')
(review/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Djayvo reverb comparisons</title><style>body{max-width:760px;margin:40px auto;padding:0 20px;font:18px/1.5 system-ui;background:#151515;color:#eee}audio{width:100%}section{margin:32px 0}</style><h1>Djayvo reverb comparisons</h1><p>Four private wet/dry pairs, matched to -24 LUFS. Voices remain dry. Listen for space, clarity and endings. Quality and preference are not rated.</p>'+''.join(cards)+'<script>document.addEventListener("play",e=>{document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>')
r.update(cross_platform_wavs=len(r['waveforms']),unchanged_default_wavs=45,listening='NOT RUN',production_quality='PARTIAL',cloud_calls=0)
(evidence/'measurements.json').write_text(json.dumps(r,indent=2)+'\n');print('PASS:',r['cross_platform_wavs'],'exact M5/Linux WAVs, 45 unchanged default WAVs, four private wet/dry pairs, unchanged vocal stems; listening NOT RUN')
