#!/usr/bin/env python3
"""Place one intact source phrase in a vocal gap without altering the song."""
import argparse
import json
import math
from pathlib import Path
import shutil

import numpy as np
from scipy.ndimage import gaussian_filter1d
from arrange_voice_research import RATE, digest, read_crops, read_pcm, write_pcm

PATTERNS = {
    'reggae': (.5, 2.5, 4.5), 'hiphop': (0, 1.5, 3), 'funk': (0, .75, 2.5, 3.5),
    'house': (0, 1, 2.5, 3), 'disco': (0, 1.5, 2, 3.5), 'rnb': (0, 2.5, 5),
    'soul': (0, 2, 4.5), 'afrobeats': (0, 1.5, 3.5, 5), 'latinpop': (0, 1.5, 3, 4.5),
    'drumandbass': (0, 1.5, 3.5, 5.5), 'acousticpop': (0, 2, 5), 'rock': (0, 2, 4),
    'edm': (0, 1, 2, 3.5), 'dj': (0, 1.5, 3, 3.5), 'lofi': (.25, 2.75, 5),
    'jazz': (0, 5/3, 10/3, 5), 'blues': (0, 8/3, 14/3), 'rap': (0, .75, 2.5, 4),
    'chill': (0, 3, 5.5), 'indie': (0, 1.5, 4.5), 'techno': (0, 1, 2, 3),
    'synthwave': (0, 2, 3.5, 5.5), 'country': (0, 2, 3, 5),
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


def intervals(mask):
    edges = np.diff(np.r_[False, mask, False].astype(int))
    return list(zip(np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)))


def envelope(pcm):
    hop = RATE//100
    padded = np.pad(pcm, ((0, (-len(pcm)) % hop), (0, 0)))
    return np.sqrt(np.mean(padded.reshape(-1, hop, 2)**2, axis=(1, 2)))


def source_crops(source):
    levels = envelope(source); hop = RATE//100
    threshold = max(.0003, float(np.max(levels))*.015)
    active = np.flatnonzero(levels > threshold)
    if not len(active): raise ValueError('No usable source phrase')
    begin = max(0, (int(active[0])-4)*hop)
    end = min(len(source), (int(active[-1])+5)*hop)
    spans = [(begin, end)]
    # shortcut: sustained quiet marks phrase candidates, not verified words; never chop inside continuous speech.
    pauses = [(int(a)*hop, int(b)*hop) for a,b in intervals(levels <= threshold)
              if b-a >= 18 and begin < a*hop < b*hop < end]
    starts = [begin, *[max(begin, b-4*hop) for a,b in pauses]]
    ends = [*[min(end, a+4*hop) for a,b in pauses], end]
    for a,b in zip(starts, ends):
        if .55*RATE <= b-a < end-begin: spans.append((a,b))
    spans[1:] = sorted(set(spans[1:]), key=lambda span: span[1]-span[0], reverse=True)
    return [{'id': i, 'start_frame': a, 'end_frame': b,
             'selection': 'whole-phrase' if i == 0 else 'pause-bounded-excerpt'}
            for i,(a,b) in enumerate(spans)]


def choose_placement(song, vocals, clips, grid, genre):
    levels = envelope(vocals); hop = RATE//100
    threshold = min(.006, max(.0003, float(np.quantile(levels, .9))*.05))
    gaps = intervals(levels <= threshold)
    beat = RATE*60/grid['bpm']; offset = grid['offset_frames']
    # Style accents select an entrance, never a mandatory repetition pattern.
    accents = sorted({0., *[p % 4 for p in PATTERNS[genre]]})
    pulses = sorted({round(offset+(bar*4+p)*beat) for bar in range(30) for p in accents})
    margin = round(.18*RATE)
    for clip in clips:
        duration = clip['end_frame']-clip['start_frame']; options = []
        for a,b in gaps:
            # A singer must return after the sample; do not fill the final outro.
            if b == len(levels) and np.any(levels > threshold): continue
            lo = max(RATE, int(a)*hop+margin)
            hi = min(len(song)-4*RATE-duration, int(b)*hop-margin-duration)
            if hi < lo: continue
            starts = [t for t in pulses if lo <= t <= hi] if grid['confidence'] >= .15 else []
            if not starts: starts = [hi]
            for start in starts:
                stop = start+duration
                band_rms = float(np.sqrt(np.mean(song[start:stop]**2)))
                if band_rms < .015: continue
                reply_delay = (int(b)*hop-stop)/RATE
                # Prefer a prompt answer over placing speech in a long empty introduction.
                options.append(((reply_delay, start), start, band_rms, int(a)*hop, int(b)*hop))
        if options:
            _,start,band_rms,a,b = min(options)
            return {'clip_id': clip['id'], 'start_frame': start, 'end_frame': start+duration,
                    'rate': 1., 'clean': True, 'gain': 1., 'echo': False,
                    'section': 'call', 'selection': clip['selection'],
                    'gap_frames': [a,b], 'band_rms': band_rms,
                    'vocal_threshold_rms': threshold,
                    'estimated_vocal_max_window_rms': float(np.max(levels[start//hop:math.ceil((start+duration)/hop)]))}
    return None


def keep_song(singer_dir, output, reason):
    singer_dir,output=map(Path,(singer_dir,output))
    if output.exists(): raise FileExistsError('Preserving existing arrangement')
    receipt=json.loads((singer_dir/'complete.json').read_text())
    source=singer_dir/'singer.wav'
    if receipt.get('technical')!='PASS' or digest(source)!=receipt['audio_sha256']:
        raise ValueError('Singing output provenance mismatch')
    song=read_pcm(source,(30,30))
    output.mkdir(parents=True);(output/'.partial').touch()
    for name in ('music.wav','performance.wav'):shutil.copyfile(source,output/name)
    write_pcm(output/'user.wav',np.zeros_like(song))
    report={'schema':'jamloom-integrated-source-2','technical':'PASS','sample_rate':RATE,'frames':len(song),
        'singer_sha256':receipt['audio_sha256'],'sha256':receipt['audio_sha256'],
        'events':[],'clips':[],'sample_used':False,'music_unchanged':True,'master_gain':1.,
        'arrangement_status':'MEANING_ONLY','note':reason,'listening':'NOT RUN',
        'artifacts':{n:digest(output/n) for n in ('performance.wav','music.wav','user.wav')}}
    (output/'complete.json').write_text(json.dumps(report,indent=2)+'\n');(output/'.partial').unlink()
    return report


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
    original=read_pcm(source,(2,5));read_crops(score,source,len(original))
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
    grid=beat_grid(loaded['drums'],bpm)
    clips=source_crops(original)
    event=choose_placement(song,loaded['vocals'],clips,grid,genre)
    voice=np.zeros_like(song);source_gain=0.;events=[];error=None
    reason='No natural vocal gap fits an intact phrase; original song retained.'
    if event:
        clip=clips[event['clip_id']]
        part=original[clip['start_frame']:clip['end_frame']].copy()
        edge=min(RATE//100,len(part)//2);fade=np.sin(np.linspace(0,np.pi/2,edge))**2
        part[:edge]*=fade[:,None];part[-edge:]*=fade[::-1,None]
        active=part[np.max(np.abs(part),axis=1)>np.max(np.abs(part))*.08]
        target=min(.09,event['band_rms']*.7)
        desired=min(target/np.sqrt(np.mean(active**2)),.35/np.max(np.abs(part)))
        start,stop=event['start_frame'],event['end_frame']
        bed=song[start:stop];ceiling=max(.89,float(np.max(np.abs(song))))
        mask=np.abs(part)>1e-8
        allowance=(ceiling-np.sign(part[mask])*bed[mask])/np.abs(part[mask])
        source_gain=float(min(desired,np.min(allowance)*.98))
        if source_gain >= desired*.5:
            voice[start:stop]=part*source_gain;events=[event]
            reason='One intact phrase in an estimated vocal gap; original singer and band unchanged.'
        else:
            source_gain=0.;reason='Insufficient mix headroom; original song retained.'
    output.mkdir(parents=True);(output/'.partial').touch()
    shutil.copyfile(singer_dir/'singer.wav',output/'music.wav')
    if events: write_pcm(output/'performance.wav',song+voice)
    else: shutil.copyfile(singer_dir/'singer.wav',output/'performance.wav')
    write_pcm(output/'user.wav',voice)
    if events:
        actual=read_pcm(output/'user.wav',(30,30));edge=RATE//100
        error=float(np.max(np.abs(actual[start+edge:stop-edge]-original[clip['start_frame']+edge:clip['end_frame']-edge]*source_gain)))
        assert error<=.5/32768+1e-12
    assert all(digest(Path(p))==h for p,h in protected.items())
    assert digest(output/'music.wav')==receipt['audio_sha256']
    report={'schema':'jamloom-integrated-source-2','technical':'PASS','source_sha256':digest(source),
        'singer_sha256':receipt['audio_sha256'],'sample_rate':RATE,'frames':len(song),'grid':grid,
        'clips':clips,'events':events,'source_starts_frames':[e['start_frame'] for e in events],
        'singer_start_frame':0,'source_identity_max_pcm_error':error,'source_gain':source_gain,
        'master_gain':1.,'music_unchanged':True,'sample_used':bool(events),
        'arrangement_status':'CANDIDATE' if events else 'NO_SAFE_PLACEMENT',
        'overlap_note':'Estimated low-vocal-energy gap, not a guarantee of absent vocals; no stems are subtracted.',
        'artifacts':{n:digest(output/n) for n in ('performance.wav','music.wav','user.wav')},
        'sha256':digest(output/'performance.wav'),'listening':'NOT RUN','note':reason}
    (output/'complete.json').write_text(json.dumps(report,indent=2)+'\n');(output/'.partial').unlink()
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('source','score','singer-dir','output'):p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--consent',action='store_true');a=p.parse_args()
    assemble(a.source,a.score,a.singer_dir,a.output,a.consent)
