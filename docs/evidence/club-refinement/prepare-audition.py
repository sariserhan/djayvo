#!/usr/bin/env python3
"""Make a private, gain-only listening comparison without overwriting recordings."""
from pathlib import Path
import hashlib
import html
import json
import re
import subprocess

out=Path('renders/voice-club-v8/review');out.mkdir()
root=Path('renders/voice-club-v8/final')
clips=[]
for label,prefix in [('fragment opening','remix'),('full voice opening','seed4124'),('instrumental opening','seed4125')]:
    clips += [(prefix+'-before','Previous · '+label,Path(f'renders/voice-club-v7/final/{prefix}.club.wav'),False),
              (prefix+'-after','New · '+label,root/f'{prefix}.club.wav',True)]
for stem,label in [('bass','Bass'),('drums','Drums'),('vocals','Voice')]:
    clips += [(stem+'-before',label+' · previous export',Path(f'renders/voice-club-v7/final/remix.club.{stem}.wav'),False),
              (stem+'-after',label+' · new export',root/f'remix.club.{stem}.wav',False)]
clips.append(('reference','Blood Club · reference 3:20–4:10',Path('renders/voice-arrangement-v2/review/reference-blood.wav'),False))

def measure(path):
    result=subprocess.run(['ffmpeg','-hide_banner','-i',str(path),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True,check=True)
    summary=result.stderr[result.stderr.rfind('Summary:'):]
    return {key:float(re.search(pattern,summary).group(1)) for key,pattern in [
        ('lufs',r'I:\s+([-\d.]+) LUFS'),('true_peak_dbfs',r'Peak:\s+([-\d.]+) dBFS')]}

measurements=[];cards=[]
for name,label,source,raw_link in clips:
    before=measure(source);gain=-22-before['lufs'];target=out/f'{name}.wav'
    subprocess.run(['ffmpeg','-v','error','-n','-i',str(source),'-af',f'volume={gain}dB','-c:a','pcm_s16le',str(target)],check=True)
    after=measure(target)
    assert abs(after['lufs']+22)<=.2 and after['true_peak_dbfs']<-1
    measurements.append({'source':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                         'file':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
                         'original':before,'gain_db':gain,'matched':after})
    link=f'<a href="../final/{source.name}" download>Save original mix</a>' if raw_link else ''
    cards.append(f'<article><h2>{html.escape(label)}</h2><audio controls preload="metadata" aria-label="{html.escape(label)}" src="{target.name}"></audio>{link}</article>')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Djayvo · club refinement</title><style>
body{font:18px/1.6 system-ui;max-width:1080px;margin:40px auto;padding:0 24px;background:#111b20;color:#e9f0eb}
h1{font-size:clamp(34px,6vw,58px);line-height:1.05;max-width:760px}h2{font-size:19px;margin-top:0}p{max-width:850px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
article{background:#213039;border:1px solid #41545b;border-radius:14px;padding:22px}audio{width:100%;margin:12px 0}a{color:#98e8b4}a:focus-visible,audio:focus-visible{outline:3px solid #d7ff80;outline-offset:5px}.tag{color:#98e8b4;letter-spacing:.16em;font-size:13px;text-transform:uppercase}
@media(max-width:640px){.grid{grid-template-columns:1fr}body{margin:24px auto;padding:0 18px}}
</style><p class="tag">Djayvo · original club sketches</p><h1>More shape.<br>More room for your voice.</h1>
<p>Compare each previous/new pair: more bass harmonics with less bass level, stronger drums, a clearer pause before the drop, and longer voice fragments selected around pauses. Three different openings are retained.</p>
<p>Listen through the first drop at <strong>0:10</strong>, the vocal break at <strong>0:17</strong> and the return at <strong>0:24</strong>. Compare groove, bass character, transitions and voice clarity. The lower players isolate bass, drums and voice; a stem export bug was also corrected, so the new stems now match their instrument performance in the master.</p>
<p>Playback levels are matched. Downloads keep the original mix level. Blood Club is a private listening reference; the new music contains no samples from it. These are work in progress and need your listening judgment.</p>
<main class="grid">'''+''.join(cards)+'''</main><p><a href="../../voice-articulation-v4/review/index.html">Earlier instrument comparison</a></p><script>
document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)
</script></html>'''
assert page.count('<audio ')==len(measurements)==13
(out/'index.html').write_text(page)
Path('docs/evidence/club-refinement/audition-measurements.json').write_text(json.dumps(measurements,indent=2)+'\n')
print('PASS: thirteen local gain-matched players at -22 LUFS; no listening judgment inferred')
