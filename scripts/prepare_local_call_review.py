#!/usr/bin/env python3
"""Compare bounded edits at the same playback gain, preserving earlier auditions."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

import numpy as np
from arrange_voice_research import RATE, digest, read_pcm
from review_cloud_music import loudness


def prepare(work, previous):
    rows=[('original',work/'gap/original.wav','Original song','The unchanged reggae song used for both comparisons.',8.)]
    receipts={}
    for name,label,description in [
        ('gap','A · A short call before the chorus','Only “I have a question” at 9.4 seconds. The original singer answers next; the band and singing are untouched.'),
        ('replacement','B · Let the user ask first','The real voice replaces the opening sung question at 1.3 seconds. The original singer continues with “I wanna know.” Only 1.1–3.5 seconds is edited; no music is regenerated.')]:
        path=work/name/'complete.json'
        if not path.exists():continue
        r=json.loads(path.read_text())
        if r.get('technical')!='PASS' or digest(work/name/'performance.wav')!=r['artifacts']['performance']:
            raise ValueError('Invalid audition candidate')
        if r['song_sha256']!=digest(rows[0][1]) or r['outside_region_max_pcm_error']!=0:
            raise ValueError('Candidate must preserve the same original outside its edit')
        rows.append((name,work/name/'performance.wav',label,description,8. if name=='gap' else 0.))
        receipts[name]=r
    if not receipts:raise ValueError('No completed edit to compare')
    levels={name:loudness(path) for name,path,*_ in rows}
    gain=min(-20-levels['original']['lufs'],*(-2-m['true_peak_dbfs'] for m in levels.values()))
    folder=work/'review';folder.mkdir(exist_ok=False)
    cards=[];measured={}
    for name,path,label,description,start in rows:
        dest=folder/f'{name}.wav'
        subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(path),'-af',f'volume={gain}dB',
                        '-c:a','pcm_s16le',str(dest)],check=True,timeout=30)
        measured[name]={**loudness(dest),'sha256':digest(dest)}
        if measured[name]['true_peak_dbfs']>-1.8:raise ValueError('Unsafe audition peak')
        cards.append(f'<section><h2>{label}</h2><p>{description}</p><audio controls preload="metadata" '
                     f'aria-label="{label}" src="{name}.wav"></audio><div class="actions">'
                     f'<button type="button" data-start="{start}">Hear {"the chorus lead-in" if start else "the opening"}</button>'
                     f'<a download href="{name}.wav">Download {name}</a></div></section>')
    original=read_pcm(folder/'original.wav',(30,30))
    for name,r in receipts.items():
        pcm=read_pcm(folder/f'{name}.wav',(30,30));a,b=r['region_frames']
        if not np.array_equal(original[:a],pcm[:a]) or not np.array_equal(original[b:],pcm[b:]):
            raise ValueError('Audition processing changed the untouched music')
        measured[name]['unchanged_pcm_outside_edit']=True
    shutil.copyfile(previous/'index.html',folder/'previous.html')
    for path in previous.glob('*.wav'):
        if (folder/path.name).exists():raise FileExistsError('Review asset collision')
        shutil.copyfile(path,folder/path.name)
    (folder/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jamloom · keep the song</title><style>
body{font:18px/1.6 system-ui;background:#111b20;color:#e9f0eb;max-width:850px;margin:32px auto;padding:0 20px}
h1{line-height:1.15}section{padding:22px;background:#213039;border-radius:12px;margin:20px 0}audio{width:100%}
a{color:#b5efac}button{font:inherit;background:#b5efac;color:#111b20;border:0;border-radius:7px;padding:8px 14px;cursor:pointer}
.actions{display:flex;align-items:center;gap:16px;flex-wrap:wrap}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style>
<h1>The same song. One small change.</h1><p>Compare the original with a short call from the real recording.
The singer stays in its original place. Each button jumps to the part that matters.</p>
<p>These are listening candidates, not approved improvements. All versions use the same playback gain.</p>'''+''.join(cards)+'''
<p role="status" aria-live="polite" id="status"></p><p><a href="previous.html">Earlier style comparisons</a></p>
<script>
document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true);
document.querySelectorAll('button[data-start]').forEach(b=>b.addEventListener('click',async()=>{const a=b.closest('section').querySelector('audio');
try{a.currentTime=Number(b.dataset.start);await a.play();document.querySelector('#status').textContent=''}
catch{document.querySelector('#status').textContent='Could not start playback. Try the audio player.'}}));
</script></html>''')
    report={'technical':'PASS','players':len(rows),'common_gain_db':gain,'tracks':measured,
            'outside_edit_audition_pcm_identical':True,'listening':'NOT RUN'}
    with (work/'review.json').open('x') as f:json.dump(report,f,indent=2);f.write('\n')
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--work',type=Path,required=True);p.add_argument('--previous',type=Path,required=True)
    a=p.parse_args();prepare(a.work,a.previous)
