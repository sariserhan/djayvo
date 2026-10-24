"""Build stopped-by-default local comparisons without changing existing auditions."""
import html
import json
import os
from pathlib import Path
import shutil
import sys

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
import numpy as np
from arrange_voice_research import RATE,digest,read_pcm,write_pcm

parent=ROOT/'renders/improvise-blending-20261023-final/listening-review'
out=parent/'reggae-revision'
out.mkdir(exist_ok=False)
render=ROOT/'renders/improvise-reggae-revision-20261023'
studio=json.loads((render/'studio-revised/report.json').read_text())
before=json.loads((ROOT/'renders/improvise-tone-20261023/report.json').read_text())
after=json.loads((ROOT/'renders/improvise-tone-v2-20261023/report.json').read_text())
assets={}
def audio(path,name,label):
    path=Path(path)
    if not path.is_absolute():path=ROOT/path
    os.link(path,out/name)
    assets[name]=digest(path)
    return f'<p>{html.escape(label)}</p><audio controls preload="none" aria-label="{html.escape(label)}" src="{name}"></audio>'

song=audio(ROOT/'renders/integrated-singer-audition-20261022/reggae-male/singer.wav','reggae-before.wav','A · Previous reggae singing')
song+=audio(render/'controlled/singer.wav','reggae-after.wav','B · Revised reggae direction — same lyrics and seed')
song+=audio(studio['song'],'reggae-new-song.wav','C · Fresh 35-second song — new lyrics, still needing polish')
flow=audio(studio['performance'],'reggae-new-blend.wav','Fresh song with your recording blended in')
events=studio['mix_receipt']['events']
times=', '.join(f"{e['start_frame']/RATE:.1f}–{e['end_frame']/RATE:.1f}s" for e in events)
flow+=f'<p>Your recording appears at {times}.</p>'
styles={'reggae-male':'Reggae','house-female':'House','funk-male':'Funk','acousticpop-female':'Acoustic pop','drumandbass-male':'Drum and bass'}
cards=[];metrics=[]
for old,new in zip(before['runs'],after['runs']):
    assert old['number']==new['number'] and old['source_sha256']==new['source_sha256']
    if new['number'] not in (1,7,13,22,27):continue
    n=new['number'];title=styles[new['style']]
    a=max(0,new['events'][0]['start_frame']-2*RATE)
    b=min(30*RATE,new['events'][-1]['end_frame']+2*RATE)
    pair=''
    for tag,row,label in [('a',old,'A · Previous gentle treatment'),('b',new,'B · Stronger tone and dynamics')]:
        pcm=read_pcm(ROOT/row['after'],(30,45))
        preview=render/f'{n}-{tag}-context.wav';write_pcm(preview,pcm[a:b])
        pair+=f'<div>{audio(preview,preview.name,title+" — "+label)}</div>'
    raw=read_pcm(ROOT/new['source'],(.35,5));processed=read_pcm(ROOT/new['voice_only'],(.35,5))
    rms=lambda x:float(np.sqrt(np.mean(x*x)))
    level=min(.08,*[.8*rms(x)/float(np.max(np.abs(x))) for x in (raw,processed)])
    isolated=''
    for tag,pcm,label in [('raw',raw,'Original voice'),('processed',processed,'Stronger treatment, voice only')]:
        dest=render/f'{n}-{tag}-voice.wav';write_pcm(dest,pcm*level/rms(pcm))
        isolated+=audio(dest,dest.name,title+' — '+label)
    cards.append(f'<article id="sample-{n}"><h3>{title}</h3><div class="pair">{pair}</div><details><summary>Compare the voice by itself</summary><p>Both previews use the same average level.</p>{isolated}</details></article>')
    metrics.append({'number':n,'style':new['style'],'processing':new['events'][0]['processing'],
                    'normalized_voice_difference_rms':rms(raw/rms(raw)-processed/rms(processed)),
                    'speaker_identity_and_better_fit':'NOT RUN'})

(out/'index.html').write_text('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Reggae and recording comparisons</title><link rel="stylesheet" href="review.css"><script src="review.js" defer></script></head><body><main><a href="../tone-match/">← Previous comparisons</a><h1>Reggae singing. A new recording treatment.</h1><p>Two separate checks: the singer’s reggae phrasing, then how your recording fits the music. These are new trials, awaiting your judgment.</p><section aria-labelledby="singing"><h2 id="singing">1. Does the singing feel like reggae?</h2><p>Listen without the recording first. B keeps the old words and seed; C uses the normal song-making flow with new lyrics.</p>'''+song+'''</section><section aria-labelledby="blend"><h2 id="blend">2. The fresh song with your recording</h2>'''+flow+'''</section><section aria-labelledby="tone"><h2 id="tone">3. Does the stronger treatment help?</h2><p>Each pair uses exactly the same music, source excerpt and placement. The new treatment shapes the tone in more detail and evens out loud syllables. It does not replace the voice or change its pitch.</p>'''+''.join(cards)+'''</section><p>Local review only. Nothing plays automatically. These versions have not been published.</p></main></body></html>''')
shutil.copyfile(parent/'tone-match/review.css',out/'review.css')
shutil.copyfile(parent/'tone-match/review.js',out/'review.js')
report={'technical':'PASS','listening':'NOT RUN','assets':assets,'tone_comparisons':metrics,
        'studio_report_sha256':digest(render/'studio-revised/report.json'),
        'tone_report_sha256':digest(ROOT/'renders/improvise-tone-v2-20261023/report.json')}
(render/'review-report.json').write_text(json.dumps(report,indent=2)+'\n')
previous=parent/'tone-match/index.html'
previous.write_text(previous.read_text().replace('<h1>Same voice. A closer blend.</h1>',
    '<h1>First tone comparison</h1><p>No noticeable improvement was reported for this round. '
    '<a href="../reggae-revision/">Listen to the new reggae and recording comparisons →</a></p>'))
print('http://127.0.0.1:4249/reggae-revision/')
