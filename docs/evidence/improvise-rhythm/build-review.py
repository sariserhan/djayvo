"""Present only successful, source-bound rhythm trials on the local review server."""
import html
import json
import os
from pathlib import Path
import shutil
import sys

ROOT=Path(__file__).resolve().parents[3];sys.path.insert(0,str(ROOT/'scripts'))
from arrange_voice_research import digest

render=ROOT/'renders/improvise-rhythm-20261023'
report=json.loads((render/'report.json').read_text())
parent=ROOT/'renders/improvise-blending-20261023-final/listening-review'
out=parent/'rhythm-match';out.mkdir(exist_ok=False)
assets={}
def audio(path,name,label):
    os.link(path,out/name);assets[name]=digest(path)
    return f'<p>{html.escape(label)}</p><audio controls preload="none" aria-label="{html.escape(label)}" src="{name}"></audio>'

cards=[]
for row in report['runs']:
    if row['technical']!='PASS':continue
    style=row['style'];work=render/style
    pair=''.join(f'<div>{audio(work/f"{tag}-preview.wav",f"{style}-{tag}.wav",style.title()+" — "+label)}</div>'
        for tag,label in [('before','A · Previous phrase treatment'),('after','B · Phrase fitted to the beat, with a word reply')])
    full=''.join(audio(work/tag/'performance.wav',f'{style}-{tag}-full.wav',style.title()+' — '+label)
                 for tag,label in [('before','A · Full song'),('after','B · Full song')])
    voice=audio(work/'hook.wav',f'{style}-voice.wav',style.title()+' — Rhythmic recording by itself')
    cards.append(f'<article><h2>{style.title()}</h2><div class="pair">{pair}</div><details><summary>Hear the voice and full songs</summary>{voice}{full}</details></article>')
source=audio(render/'phrase.wav','original-phrase.wav','Original recorded phrase')
(out/'index.html').write_text('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Fit the recording to the rhythm</title><link rel="stylesheet" href="review.css"><script src="review.js" defer></script></head><body><main><a href="../reggae-revision/">← Earlier comparison</a><h1>Make the recording part of the rhythm.</h1><p>A uses the previous phrase treatment. B fits the complete phrase to the beat and brings back “question” as a short reply. Both use the same music, entrance and tone treatment.</p><p>The original voice is used throughout. This trial changes timing, not pitch. Listen for a better groove, clear words and the same recognizable person.</p>'''+''.join(cards)+'''<details><summary>The original phrase</summary>'''+source+'''</details><p>The reggae comparison uses the revised singing you preferred. The house trial was left out because there was no safe shared space for both versions. These are local experiments, awaiting listening; they are not the default.</p></main></body></html>''')
shutil.copyfile(parent/'reggae-revision/review.css',out/'review.css')
shutil.copyfile(parent/'reggae-revision/review.js',out/'review.js')
(render/'review.json').write_text(json.dumps({'report_sha256':digest(render/'report.json'),'assets':assets,'listening':'NOT RUN'},indent=2)+'\n')
previous=parent/'reggae-revision/index.html';s=previous.read_text()
s=s.replace('</h1>','</h1><p>Reggae B was preferred; the stronger recording treatment did not improve the blend. <a href="../rhythm-match/">Try the new rhythm comparisons →</a></p>',1)
previous.write_text(s)
print('http://127.0.0.1:4249/rhythm-match/')
