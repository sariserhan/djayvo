from pathlib import Path
import json,hashlib,subprocess,sys,wave
import numpy as np
sys.path.insert(0,'scripts')
from prepare_voice_transforms import frame_at
from review_cloud_music import loudness
root=Path('renders/word-timing-20261018');review=root/'review';review.mkdir();report={};cards=[]
def pcm(path):
    with wave.open(str(path)) as f:return np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float).reshape(-1,f.getnchannels())/32768
source=pcm(Path('renders/voice-20261017-221411/source-pcm.wav'))
for style in ('hiphop','reggae','experimental','club'):
    plan=json.loads((root/f'{style}-aligned.{style}.score.json').read_text());old=json.loads((root/f'{style}-control.{style}.score.json').read_text())
    hooks=[];v=pcm(root/f'{style}-aligned.{style}.vocals.wav');voice_before=pcm(root/f'{style}-control.{style}.vocals.wav')
    for event in plan['voice_events']:
        if not event['clean']:continue
        clip=plan['voice_clips'][event['clip_id']];assert clip['start_frame']==0 and clip['end_frame']==len(source)
        begin=frame_at(plan,event['start_tick']);frames=len(source)
        assert np.array_equal(v[begin:begin+frames],voice_before[begin:begin+frames])
        hooks.append({'frame':begin,'frames':frames,'pcm_unchanged':True})
    assert len(hooks)==2
    # Accompaniment and event scheduling must not change when only crop boundaries change.
    for p in root.glob(f'{style}-aligned.{style}.*.wav'):
        if p.name.endswith('.vocals.wav'):continue
        assert p.read_bytes()==(root/p.name.replace('-aligned.','-control.')).read_bytes()
    assert (root/f'{style}-aligned.{style}.events.tsv').read_bytes()==(root/f'{style}-control.{style}.events.tsv').read_bytes()
    after=pcm(root/f'{style}-aligned.{style}.wav');before=pcm(root/f'{style}-control.{style}.wav')
    assert np.all(after[-4800:]==0) and np.abs(after).max()<10**(-1/20)
    report[style]={'clean_hooks':hooks,'instrument_stems_and_event_frames':'PASS','max_pcm_difference':float(np.abs(after-before).max()),'rms_pcm_difference':float(np.sqrt(np.mean((after-before)**2))),'levels':{}}
    card=f'<section><h2>{style.title()}</h2>'
    for mode in ('aligned','control'):
        origin=root/f'{style}-{mode}.{style}.wav';level=loudness(origin);dest=review/f'{style}-{mode}.wav'
        subprocess.run(['ffmpeg','-v','error','-n','-i',str(origin),'-af',f"volume={-24-level['lufs']}dB",'-c:a','pcm_s16le',str(dest)],check=True)
        actual=loudness(dest);assert abs(actual['lufs']+24)<.2 and actual['true_peak_dbfs']<-1
        report[style]['levels'][mode]={'original':level,'matched':actual}
        card+=f'<p>{mode.title()} · matched level</p><audio controls preload="metadata" aria-label="{style} {mode}" src="{dest.name}"></audio>'
    for mode in ('aligned','control'):
        card+=f'<p>{mode.title()} voice alone · original level</p><audio controls preload="metadata" aria-label="{style} {mode} voice" src="../{style}-{mode}.{style}.vocals.wav"></audio>'
    cards.append(card+'</section>')
(review/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Djayvo word crop comparisons</title><style>body{max-width:760px;margin:40px auto;padding:0 20px;font:18px/1.5 system-ui;background:#151515;color:#eee}audio{width:100%}section{margin:32px 0}</style><h1>Djayvo word crop comparisons</h1><p>Four private estimated-word versus original crop pairs, matched to -24 LUFS. Complete hooks and accompaniment remain unchanged. Listen for cut words, rhythm and repeat clarity. Recognition confidence does not certify word boundaries. No accuracy or musical quality rating has been recorded.</p>'+''.join(cards)+'<script>document.addEventListener("play",e=>{document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>')
Path('docs/evidence/word-timing/measurements.json').write_text(json.dumps({'styles':report,'listening':'NOT RUN','boundary_accuracy':'NOT RUN','cloud_calls':0},indent=2)+'\n')
print('PASS: four matched owner comparisons, unchanged clean hooks/instrument stems/events, bounded PCM and tails; boundary accuracy and quality NOT RUN')
