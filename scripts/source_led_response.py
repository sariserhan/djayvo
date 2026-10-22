#!/usr/bin/env python3
"""One private source-led reggae study: guide, band, singer, timed exchange."""
import argparse
import html
import json
from pathlib import Path
import shutil

import numpy as np
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from assemble_sung_response import beat_grid, envelope, intervals
from singing_response import CODE_REVISION, WEIGHT_REVISION, source_conditioning, validate_plan


def save(path, value):
    with Path(path).open('x') as f:
        f.write(json.dumps(value, indent=2) + '\n')


def faded(pcm, seconds=.01):
    pcm = pcm.copy()
    n = min(round(seconds*RATE), len(pcm)//2)
    fade = np.sin(np.linspace(0, np.pi/2, n))**2
    pcm[:n] *= fade[:, None]; pcm[-n:] *= fade[::-1, None]
    return pcm


def prepare(source, output, start, end, phrase, consent):
    if not consent:
        raise ValueError('Explicit local source consent required')
    original = read_pcm(source, (.1, 30))
    if not np.isfinite([start, end]).all() or not 0 <= start < end <= len(original)/RATE:
        raise ValueError('Invalid source crop')
    a, b = round(start*RATE), round(end*RATE)
    hook = original[a:b]
    if not 1.875 <= len(hook)/RATE <= 2.5:
        raise ValueError('This study needs a complete phrase lasting 1.875–2.5 seconds')
    # shortcut: three beats per selected phrase is a study arrangement, not automatic prosody inference.
    bpm = 180/(len(hook)/RATE)
    beat = 60/bpm
    calls = [round(i*beat*RATE) for i in (4, 20)]
    answers = [[round(i*beat*RATE), round(j*beat*RATE)] for i,j in ((8,20),(24,42))]
    output.mkdir(parents=True, exist_ok=False)
    (output/'.partial').touch()
    shutil.copyfile(source, output/'original.wav')
    write_pcm(output/'hook.wav', hook)
    hook = read_pcm(output/'hook.wav', (1.875,2.5))
    gain = min(.14/max(float(np.sqrt(np.mean(hook**2))),1e-6), .48/np.max(np.abs(hook)))
    user = np.zeros((30*RATE,2))
    for at in calls: user[at:at+len(hook)] = faded(hook)*gain
    write_pcm(output/'user-guide.wav', user)
    guide = user.copy()
    rng = np.random.default_rng(61024)
    # Quiet self-generated timing cues condition the model; these are never mixed into the final song.
    for i in range(int(30/beat)):
        at = round(i*beat*RATE)
        t = np.arange(round(.12*RATE))/RATE
        pulse = .12*np.sin(2*np.pi*(65*t+1.8*(1-np.exp(-30*t))))*np.exp(-32*t)
        if i%4 == 2: pulse += .045*rng.normal(size=len(t))*np.exp(-40*t)
        n = min(len(pulse), len(guide)-at)
        guide[at:at+n] += pulse[:n,None]
    write_pcm(output/'guide.wav', guide)
    plan = validate_plan({'schema':'jamloom-sung-response-1','model_code':CODE_REVISION,
        'weights':WEIGHT_REVISION,'phrase':phrase,'lyric_origin':'authored study replies; not a general planner',
        'cases':[{'id':'reggae-male','genre':'reggae','voice':'male','seed':61024,'bpm':84,
                  'duration':30,'source_repetitions':2,
                  'lyrics':"[Verse]\nYou've got a question, I wanna know\nCome on and let that question flow\n[Chorus]\nWhat's your question? Don't leave me on hold\nEven my coffee is getting cold"}]})
    save(output/'plan.json', plan)
    save(output/'arrangement.json', {'schema':'jamloom-source-led-study-1','source_sha256':digest(source),
        'hook_sha256':digest(output/'hook.wav'),'crop_frames':[a,b],'source_gain':float(gain),
        'bpm':bpm,'calls':calls,'answer_windows':answers,'sample_rate':RATE,'frames':30*RATE,
        'selection':'ASR-assisted, manually selected complete phrase; no automatic selection claim'})
    save(output/'band-conditioning.json', {'audio':str((output/'guide.wav').resolve()),
        'sha256':digest(output/'guide.wav'),'bpm':bpm,'strength':.35,'instrumental':True,
        'direction':'Build a warm live reggae groove around the rhythmic calls in the reference. '
        'Replace guide percussion with a real drum kit, deep electric bass, organ and offbeat guitar. '
        'Leave melodic space for conversational calls, keep the groove moving, finish naturally.'})
    source_conditioning(output/'band-conditioning.json')


def rendered(folder):
    receipt = json.loads((folder/'complete.json').read_text())
    if receipt.get('technical') != 'PASS' or digest(folder/'singer.wav') != receipt['audio_sha256']:
        raise ValueError('Generated audio provenance mismatch')
    return read_pcm(folder/'singer.wav',(30,30)), receipt


def arrangement(work):
    path = work/'arrangement.json'
    if path.stat().st_size > 8192: raise ValueError('Arrangement exceeds budget')
    plan = json.loads(path.read_text())
    if (plan.get('schema') != 'jamloom-source-led-study-1' or plan.get('frames') != 30*RATE
            or plan.get('sample_rate') != RATE or type(plan.get('bpm')) not in (int,float)
            or not 72 <= plan['bpm'] <= 96 or type(plan.get('source_gain')) not in (int,float)
            or not 0 < plan['source_gain'] <= 100):
        raise ValueError('Invalid arrangement context')
    calls, windows = plan.get('calls'), plan.get('answer_windows')
    if not isinstance(calls,list) or len(calls)!=2 or not isinstance(windows,list) or len(windows)!=2:
        raise ValueError('Expected two calls and answers')
    end=0
    for at,window in zip(calls,windows):
        if (type(at) is not int or not isinstance(window,list) or len(window)!=2
                or any(type(v) is not int for v in window)
                or not end <= at < window[0] < window[1] <= 30*RATE):
            raise ValueError('Invalid call and answer bounds')
        end=window[1]
    return plan


def stem(folder, name, receipt, shape):
    report = json.loads((folder/'stems/complete.json').read_text())
    path = folder/f'stems/{name}.npy'
    if (report.get('technical') != 'PASS' or report['source_sha256'] != receipt['audio_sha256']
            or digest(path) != report['stems'][name]):
        raise ValueError('Stem provenance mismatch')
    pcm = np.load(path,allow_pickle=False)
    if pcm.shape != shape or not np.isfinite(pcm).all() or np.max(np.abs(pcm)) >= 4:
        raise ValueError('Invalid separated audio')
    return pcm


def answer_guide(work):
    for name in ('backing.wav','answer-guide.wav','singer-conditioning.json','backing.json'):
        if (work/name).exists(): raise FileExistsError('Preserving answer guide')
    band, receipt = rendered(work/'band')
    vocals = stem(work/'band','vocals',receipt,band.shape)
    backing = band-vocals
    user = read_pcm(work/'user-guide.wav',(30,30))
    gain = min(1., .7/max(float(np.max(np.abs(backing))),1e-6))
    write_pcm(work/'backing.wav', backing*gain)
    guide = backing*gain+user
    guide *= min(1., .9/max(float(np.max(np.abs(guide))),1e-6))
    write_pcm(work/'answer-guide.wav', guide)
    plan = arrangement(work)
    save(work/'singer-conditioning.json', {'audio':str((work/'answer-guide.wav').resolve()),
        'sha256':digest(work/'answer-guide.wav'),'bpm':plan['bpm'],'strength':.2,'instrumental':False,
        'direction':'Keep the reference reggae harmony, tempo and groove. A warm natural male singer answers '
        'the spoken calls with the supplied short lyrics. Two relaxed complete sung phrases, '
        'instrumental breaths between them. Do not sing or imitate the spoken reference voice.'})
    save(work/'backing.json', {'sha256':digest(work/'backing.wav'),'band_sha256':receipt['audio_sha256'],
        'gain':gain,'note':'Estimated vocal removal can leave bleed; listening required.'})


def answer_phrases(vocals, windows):
    levels = envelope(vocals); hop = RATE//100
    threshold = max(.003, float(np.quantile(levels,.9))*.09)
    active = intervals(levels > threshold)
    merged = []
    for a,b in active:
        if merged and (a-merged[-1][1])*hop < .32*RATE:
            merged[-1][1] = b
        else: merged.append([a,b])
    spans = [(max(0,int(a)*hop-round(.06*RATE)), min(len(vocals),int(b)*hop+round(.1*RATE)))
             for a,b in merged if (b-a)*hop >= .5*RATE]
    events = []; cursor = 0
    for lo,hi in windows:
        choices = [(i,a,b) for i,(a,b) in enumerate(spans) if i >= cursor and b-a <= hi-lo-round(.2*RATE)]
        if not choices:
            raise ValueError('No complete estimated vocal phrase fits an answer; keep this trial incomplete')
        i,a,b = choices[0]
        events.append({'source_frames':[a,b],'start_frame':lo,'end_frame':lo+b-a})
        cursor = i+1
    return events


def assemble(work):
    for name in ('complete.json','performance.wav','music.wav','user.wav','reply.wav'):
        if (work/name).exists(): raise FileExistsError('Preserving existing study output')
    plan = arrangement(work)
    hook = read_pcm(work/'hook.wav',(1.875,2.5))
    if digest(work/'hook.wav') != plan['hook_sha256'] or digest(work/'original.wav') != plan['source_sha256']:
        raise ValueError('Original source changed')
    backing = read_pcm(work/'backing.wav',(30,30))
    if digest(work/'backing.wav') != json.loads((work/'backing.json').read_text())['sha256']:
        raise ValueError('Backing changed')
    band, band_receipt = rendered(work/'band')
    grid = beat_grid(stem(work/'band','drums',band_receipt,band.shape),plan['bpm'])
    if grid['confidence'] >= .15:
        def pulse(frame):
            return round(grid['offset_frames']+frame*plan['bpm']/grid['bpm'])
        plan['calls'] = [pulse(at) for at in plan['calls']]
        plan['answer_windows'] = [[pulse(lo),min(len(backing),pulse(hi))] for lo,hi in plan['answer_windows']]
    song, receipt = rendered(work/'singer')
    vocals = stem(work/'singer','vocals',receipt,song.shape)
    events = answer_phrases(vocals,plan['answer_windows'])
    singer = np.zeros_like(backing); user = np.zeros_like(backing)
    for event in events:
        a,b = event['source_frames']; start,stop = event['start_frame'],event['end_frame']
        singer[start:stop] = faded(vocals[a:b], .025)
    for at in plan['calls']:
        if at+len(hook)>len(user) or any(at < e['end_frame'] and at+len(hook) > e['start_frame'] for e in events):
            raise ValueError('Source and singer collide')
        user[at:at+len(hook)] = faded(hook)*plan['source_gain']
    singer_gain = min(1., .5/max(float(np.max(np.abs(singer))),1e-6))
    mix = backing+singer*singer_gain+user
    master = min(1., .84/max(float(np.max(np.abs(mix))),1e-6))
    for name,pcm in [('performance',mix),('music',backing+singer*singer_gain),('user',user),('reply',singer*singer_gain)]:
        write_pcm(work/f'{name}.wav', pcm*master)
    saved_user = read_pcm(work/'user.wav',(30,30))
    error = float(np.max(np.abs(saved_user-user*master)))
    if error > .5/32768+1e-12: raise ValueError('Source identity check failed')
    save(work/'complete.json', {'technical':'PASS','schema':'jamloom-source-led-study-1',
        'source_sha256':plan['source_sha256'],'hook_sha256':plan['hook_sha256'],
        'requested_bpm':plan['bpm'],'grid':grid,'calls_seconds':[x/RATE for x in plan['calls']],
        'answer_events':events,'source_identity_max_pcm_error':error,'source_rate':1.,
        'singer_gain':singer_gain,'master_gain':master,'peak':float(np.max(np.abs(mix*master))),
        'source_singer_scheduled_overlap_frames':0,'listening':'NOT RUN',
        'limitations':'Estimated stem bleed and phrase boundaries; source conditioning does not prove musical responsiveness.',
        'artifacts':{n:digest(work/f'{n}.wav') for n in ('performance','music','user','reply','backing')}})
    (work/'.partial').unlink()


def review(work, previous=None):
    from review_cloud_music import loudness
    import subprocess
    receipt = json.loads((work/'complete.json').read_text())
    folder = work/'review'; folder.mkdir(exist_ok=False)
    pairs = [('performance','New call and response'),('music','Same arrangement without the user'),
             ('hook','The selected original phrase')]
    levels = {name:loudness(work/f'{name}.wav') for name,_ in pairs}
    target = min(-20., *(m['lufs']-m['true_peak_dbfs']-2 for m in levels.values()))
    cards=[]; checks={}
    for name,label in pairs:
        source=work/f'{name}.wav'
        if digest(source) != (receipt['hook_sha256'] if name=='hook' else receipt['artifacts'][name]):
            raise ValueError('Review source changed')
        subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(source),'-af',
            f"volume={target-levels[name]['lufs']}dB",'-c:a','pcm_s16le',str(folder/f'{name}.wav')],check=True,timeout=30)
        checks[name]=loudness(folder/f'{name}.wav')
        if abs(checks[name]['lufs']-target)>.2 or checks[name]['true_peak_dbfs']>-1.8:
            raise ValueError('Review loudness check failed')
        cards.append(f'<section><h2>{label}</h2><audio controls preload="metadata" aria-label="{label}" src="{name}.wav"></audio>'
                     f'<a download href="{name}.wav">Download {label.lower()}</a></section>')
    previous_link=''
    if previous:
        shutil.copyfile(previous/'index.html',folder/'previous.html')
        for path in previous.glob('*.wav'):
            dest=folder/path.name
            if dest.exists(): raise FileExistsError('Review filename collision')
            shutil.copyfile(path,dest)
        previous_link='<p><a href="previous.html">Earlier style comparisons</a></p>'
    times=', '.join(f'{t:.1f}s' for t in receipt['calls_seconds'])
    (folder/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jamloom · a musical conversation</title><style>
body{font:18px/1.6 system-ui;background:#111b20;color:#e9f0eb;max-width:850px;margin:32px auto;padding:0 20px}
h1{line-height:1.15}section{padding:22px;background:#213039;border-radius:12px;margin:20px 0}audio{width:100%}a{color:#b5efac}
:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style>
<h1>A musical conversation.</h1><p>One reggae experiment: your phrase sets the call, and the singer answers.</p>
<p>Listen for the original voice at '''+html.escape(times)+'''. The second player removes only that voice so you can compare.
These are new test recordings; they have not yet passed a listening review.</p>'''+''.join(cards)+previous_link+'''
<script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>''')
    save(work/'review.json', {'technical':'PASS','matched_lufs':target,'tracks':checks,'human_listening':'NOT RUN'})


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('phase',choices=('prepare','answer-guide','assemble','review'))
    p.add_argument('--work',type=Path,required=True)
    p.add_argument('--source',type=Path);p.add_argument('--start',type=float);p.add_argument('--end',type=float)
    p.add_argument('--phrase');p.add_argument('--consent',action='store_true')
    p.add_argument('--previous',type=Path)
    a=p.parse_args()
    if a.phase=='prepare':prepare(a.source,a.work,a.start,a.end,a.phrase,a.consent)
    elif a.phase=='answer-guide':answer_guide(a.work)
    elif a.phase=='assemble':assemble(a.work)
    else:review(a.work,a.previous)
