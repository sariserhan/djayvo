#!/usr/bin/env python3
"""Make the source a recurring musical hook, with space in the singer and band."""
import argparse
import json
import math
from pathlib import Path
import subprocess

import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks
from arrange_voice_research import RATE, digest, read_crops, read_pcm, write_pcm

PATTERNS = {
    'reggae': (.5, 2.5, 4.5), 'hiphop': (0, 1.5, 3), 'funk': (0, .75, 2.5, 3.5),
    'house': (0, 1, 2.5, 3), 'disco': (0, 1.5, 2, 3.5), 'rnb': (0, 2.5, 5),
    'soul': (0, 2, 4.5), 'afrobeats': (0, 1.5, 3.5, 5), 'latinpop': (0, 1.5, 3, 4.5),
    'drumandbass': (0, 1.5, 3.5, 5.5), 'acousticpop': (0, 2, 5), 'rock': (0, 2, 4),
}


def beat_grid(drums, requested):
    """Fit an onset pulse near the requested tempo; not a downbeat annotation."""
    hop = RATE//200
    energy = np.sqrt(np.mean(drums[:len(drums)//hop*hop].reshape(-1,hop,2)**2,axis=(1,2)))
    onset = np.maximum(0, np.diff(gaussian_filter1d(energy,1),prepend=energy[0]))
    onset = gaussian_filter1d(onset,1)
    if np.max(onset) < 1e-6:
        return {'bpm':float(requested),'offset_frames':0,'confidence':0.,'method':'requested tempo fallback'}
    onset /= np.max(onset)
    times = np.arange(len(onset))/200
    candidates = []
    for bpm in np.linspace(requested*.9,requested*1.1,81):
        beat = 60/bpm
        for phase in np.arange(0,beat,.01):
            positions = np.arange(phase,times[-1]-.05,beat)
            score = float(np.interp(positions,times,onset).mean())
            candidates.append((score,float(bpm),float(phase)))
    score,bpm,phase = max(candidates)
    confidence = max(0.,min(1.,(score-float(onset.mean()))/(score+1e-9)))
    return {'bpm':bpm,'offset_frames':round(phase*RATE),'confidence':confidence,
            'method':'drum-stem onset grid; tempo searched within 10 percent; bar phase unverified'}


def source_crops(source, supplied):
    active = np.flatnonzero(np.max(np.abs(source),axis=1) > np.max(np.abs(source))*.03)
    begin,end = max(0,int(active[0])-RATE//25),min(len(source),int(active[-1])+RATE//20+1)
    clean = {'id':0,'start_frame':begin,'end_frame':end}
    cuts = [(c['start_frame'],c['end_frame']) for c in supplied
            if .18*RATE <= c['end_frame']-c['start_frame'] <= 1.2*RATE]
    if not cuts:
        hop=RATE//100
        energy=np.sqrt(np.mean(source[:len(source)//hop*hop].reshape(-1,hop,2)**2,axis=(1,2)))
        energy=gaussian_filter1d(energy,1)
        valleys,_=find_peaks(-energy,distance=18,prominence=max(energy)*.06)
        bounds=[begin,*[int(i*hop) for i in valleys if begin+RATE*.15<i*hop<end-RATE*.15],end]
        for a,b in zip(bounds,bounds[1:]):
            if b-a>1.2*RATE:
                count=math.ceil((b-a)/(RATE*.65));points=np.linspace(a,b,count+1).astype(int)
                cuts.extend(zip(points,points[1:]))
            else: cuts.append((a,b))
    # shortcut: envelope valleys are sound boundaries, not guaranteed words; retain the clean hook.
    cuts=[(int(a),int(b)) for a,b in cuts if .15*RATE<=b-a<=1.2*RATE and np.sqrt(np.mean(source[a:b]**2))>.005]
    return [clean,*[{'id':i+1,'start_frame':a,'end_frame':b} for i,(a,b) in enumerate(cuts[:16])]]


def stretch(part, rate):
    if abs(rate-1)<.001: return part.copy()
    raw=subprocess.run(['ffmpeg','-v','error','-nostdin','-protocol_whitelist','pipe','-f','f32le','-ar',str(RATE),
        '-ac','2','-i','pipe:0','-af',f'atempo={rate:.8f}','-f','f32le','pipe:1'],
        input=part.astype('<f4').tobytes(),capture_output=True,timeout=20,check=True).stdout
    pcm=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(float)
    if not len(pcm) or not np.isfinite(pcm).all(): raise ValueError('Invalid source time stretch')
    return pcm


def dip(envelope,start,stop,depth,attack=.035,release=.12):
    before=max(0,start-round(attack*RATE));after=min(len(envelope),stop+round(release*RATE))
    envelope[before:start]=np.minimum(envelope[before:start],np.linspace(1,depth,start-before))
    envelope[start:stop]=np.minimum(envelope[start:stop],depth)
    envelope[stop:after]=np.minimum(envelope[stop:after],np.linspace(depth,1,after-stop))


def assemble(source, score, singer_dir, output, consent=False):
    if not consent: raise ValueError('Local source-processing consent required')
    source,score,singer_dir,output=map(Path,(source,score,singer_dir,output))
    if output.exists(): raise FileExistsError('Preserving existing arrangement')
    receipt=json.loads((singer_dir/'complete.json').read_text());c=receipt['case']
    if receipt.get('technical')!='PASS' or digest(singer_dir/'singer.wav')!=receipt['audio_sha256']:
        raise ValueError('Singing output provenance mismatch')
    bpm,genre,seed=c.get('bpm'),c.get('genre','hiphop'),c.get('seed',0)
    if type(bpm) not in (int,float) or not math.isfinite(bpm) or not 60<=bpm<=180 or genre not in PATTERNS or type(seed) is not int or not 0<=seed<2**32:
        raise ValueError('Invalid musical context')
    if type(c.get('source_repetitions')) is not int or c['source_repetitions'] not in (1,2):
        raise ValueError('Invalid source timing budget')
    original=read_pcm(source,(2,5));supplied=read_crops(score,source,len(original))
    song=read_pcm(singer_dir/'singer.wav',(30,30));stems=singer_dir/'stems'
    separated=json.loads((stems/'complete.json').read_text())
    if separated.get('technical')!='PASS' or separated.get('source_sha256')!=receipt['audio_sha256']:
        raise ValueError('Stems must match the exact singer recording')
    loaded={}
    for name in ('vocals','drums'):
        path=stems/f'{name}.npy'
        if digest(path)!=separated['stems'][name]: raise ValueError('Stem checksum mismatch')
        pcm=np.load(path,allow_pickle=False)
        if pcm.shape!=song.shape or not np.isfinite(pcm).all() or np.max(np.abs(pcm))>=4: raise ValueError('Invalid stem audio')
        loaded[name]=pcm
    protected={str(p):digest(p) for p in (source,score,singer_dir/'singer.wav',singer_dir/'complete.json',stems/'complete.json')}
    grid=beat_grid(loaded['drums'],bpm);beat=RATE*60/grid['bpm'];offset=grid['offset_frames']
    clips=source_crops(original,supplied);clean=clips[0];length=clean['end_frame']-clean['start_frame']
    energy=np.r_[0.,np.cumsum(np.mean(loaded['vocals']**2,axis=1))]
    rng=np.random.default_rng(seed)
    def quiet_start(low,high,duration):
        choices=[round(offset+i*beat) for i in range(100) if low<=offset+i*beat<=high and offset+i*beat+duration<len(song)-RATE*.5]
        if not choices: raise ValueError('No space for source phrase')
        rng.shuffle(choices)
        return min(choices,key=lambda s:(energy[s+duration]-energy[s])/duration)
    first=quiet_start(0,4*beat,length)
    events=[{'clip_id':0,'start_frame':first,'rate':1.,'clean':True,'gain':1.,'echo':False,'section':'hook'}]
    fragments=clips[1:]
    if not fragments: fragments=[dict(clean,id=0)]
    rng.shuffle(fragments)
    for section,(low,high) in zip(('break','answer'),((.34,.48),(.65,.77))):
        start=quiet_start(int(len(song)*low),int(len(song)*high),round(6*beat))
        for i,position in enumerate(PATTERNS[genre]):
            clip=fragments[(i+(1 if section=='answer' else 0))%min(3,len(fragments))]
            duration=clip['end_frame']-clip['start_frame']
            target=min((.5,1,1.5,2),key=lambda b:abs(duration-b*beat))*beat
            rate=float(np.clip(duration/target,.8,1.25))
            at=round(start+position*beat)
            end=at+round(duration/rate)+int(.15*RATE)
            if end>=len(song)-RATE:continue
            if any(at<e['start_frame']+math.ceil((clips[e['clip_id']]['end_frame']-clips[e['clip_id']]['start_frame'])/e['rate'])+.12*RATE and end>e['start_frame'] for e in events):continue
            events.append({'clip_id':clip['id'],'start_frame':at,'rate':rate,'clean':False,
                'gain':.85 if i%2 else .7,'echo':i==len(PATTERNS[genre])-1,'section':section})
    events.sort(key=lambda e:e['start_frame'])
    voice=np.zeros_like(song);vocal_gain=np.ones(len(song));band_gain=np.ones(len(song))
    active=original[np.max(np.abs(original),axis=1)>np.max(np.abs(original))*.08]
    source_gain=min(.14/np.sqrt(np.mean(active**2)),.65/np.max(np.abs(original)))
    for event in events:
        clip=clips[event['clip_id']];part=stretch(original[clip['start_frame']:clip['end_frame']],event['rate'])
        edge=min(RATE//100,len(part)//2);fade=np.sin(np.linspace(0,np.pi/2,edge))**2
        part[:edge]*=fade[:,None];part[-edge:]*=fade[::-1,None]
        part*=source_gain*event['gain'];start=event['start_frame'];stop=start+len(part)
        if stop>len(song)-RATE//2:raise ValueError('Source event outside song')
        voice[start:stop]+=part;event['end_frame']=stop
        dip(vocal_gain,start,stop,0.,attack=.06,release=.16)
        dip(band_gain,start,stop,.30 if event['section']=='break' else .82)
        if event['echo']:
            delay=round(beat*.75)
            for repeat in (1,2):
                a=start+delay*repeat;b=min(len(song)-RATE//2,a+len(part))
                if b>a:voice[a:b]+=part[:b-a]*(.18**repeat)
    music=(song-loaded['vocals'])*band_gain[:,None]+loaded['drums']*(1-band_gain[:,None])*.65+loaded['vocals']*vocal_gain[:,None]
    ending=np.cos(np.linspace(0,np.pi/2,RATE//4))**2;ending[-1]=0
    music[-len(ending):]*=ending[:,None];voice[-len(ending):]*=ending[:,None]
    master=min(1.,10**(-2/20)/max(np.max(np.abs(music+voice)),np.max(np.abs(music)),np.max(np.abs(voice))))
    output.mkdir(parents=True);(output/'.partial').touch()
    for name,pcm in [('performance',music+voice),('music',music),('user',voice)]:write_pcm(output/f'{name}.wav',pcm*master)
    actual=read_pcm(output/'user.wav',(30,30));edge=RATE//100
    error=float(np.max(np.abs(actual[first+edge:first+length-edge]-original[clean['start_frame']+edge:clean['end_frame']-edge]*source_gain*master)))
    assert error<=.5/32768+1e-12
    assert all(digest(Path(p))==h for p,h in protected.items())
    report={'schema':'jamloom-integrated-source-1','technical':'PASS','source_sha256':digest(source),
        'singer_sha256':receipt['audio_sha256'],'sample_rate':RATE,'frames':len(song),'grid':grid,
        'source_crop_frames':[clean['start_frame'],clean['end_frame']],'clips':clips,'events':events,
        'source_starts_frames':[e['start_frame'] for e in events],'singer_start_frame':0,
        'source_identity_max_pcm_error':error,'source_gain':float(source_gain),'master_gain':float(master),
        'music_present_during_clean_hook_rms':float(np.sqrt(np.mean(music[first:first+length]**2))),
        'source_singer_overlap_frames':0,'overlap_note':'Estimated singer stem muted during dry user events; separator bleed/echo can remain.',
        'artifacts':{n:digest(output/n) for n in ('performance.wav','music.wav','user.wav')},
        'sha256':digest(output/'performance.wav'),'listening':'NOT RUN',
        'note':'Music from the start; clean hook, beat-fit fragments, recurring answers, rhythmic echo and a drum-led break.'}
    (output/'complete.json').write_text(json.dumps(report,indent=2)+'\n');(output/'.partial').unlink()
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('source','score','singer-dir','output'):p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--consent',action='store_true');a=p.parse_args()
    assemble(a.source,a.score,a.singer_dir,a.output,a.consent)
