#!/usr/bin/env python3
"""Blend recorded calls into a song while preserving the surrounding performance."""
import argparse
import json
import random
from pathlib import Path
import shutil
import subprocess

import numpy as np
from scipy.signal import butter, sosfilt
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from assemble_sung_response import envelope, intervals, beat_grid
from source_led_response import faded, rendered, stem


def fit_call_rhythm(hook, recipe):
    """Fit the original phrase to beats; optionally answer with one original word."""
    ratio=recipe.get('duration_ratio') if isinstance(recipe,dict) else None
    if (hook.ndim!=2 or hook.shape[1]!=2 or not .35*RATE<=len(hook)<=5*RATE
            or not np.isfinite(hook).all() or type(ratio) not in (int,float)
            or not np.isfinite(ratio) or not .8<=ratio<=1.25):
        raise ValueError('Invalid source rhythm transform')
    frames=round(len(hook)*ratio);word=recipe.get('word_frames');repeat=recipe.get('repeat_offset_frames')
    if not .35*RATE<=frames<=5*RATE:raise ValueError('Rhythmic phrase exceeds duration budget')
    if word is not None:
        if (not isinstance(word,list) or len(word)!=2 or any(type(f) is not int for f in word)
                or not 0<=word[0]<word[1]<=len(hook) or not .18*RATE<=word[1]-word[0]<=1.2*RATE
                or type(repeat) is not int or repeat<frames+.12*RATE or repeat+word[1]-word[0]>5*RATE):
            raise ValueError('Invalid repeated word bounds')
    elif repeat is not None:raise ValueError('Repeat requires a source word')
    result=subprocess.run(['ffmpeg','-v','error','-nostdin','-f','f32le','-ar',str(RATE),'-ac','2',
        '-i','pipe:0','-af',f'atempo={1/ratio:.12f}','-f','f32le','pipe:1'],
        input=hook.astype('<f4').tobytes(),capture_output=True,check=True,timeout=30)
    if len(result.stdout)%8:raise ValueError('Invalid tempo output framing')
    pcm=np.frombuffer(result.stdout,dtype='<f4').reshape(-1,2).astype(np.float64)
    if not np.isfinite(pcm).all() or abs(len(pcm)-frames)>.08*RATE:
        raise ValueError('Tempo transform failed finite/duration checks')
    # shortcut: short endpoint error is padded/faded; upgrade if listening exposes lost consonants.
    pcm=faded(np.pad(pcm,((0,max(0,frames-len(pcm))),(0,0)))[:frames])
    if word is not None:
        pcm=np.pad(pcm,((0,repeat+word[1]-word[0]-frames),(0,0)))
        pcm[repeat:]+=faded(hook[word[0]:word[1]])*.72
    if np.max(np.abs(pcm))>=1:raise ValueError('Unsafe transformed source peak')
    return pcm


def blend_patch(original, generated, start, end):
    if (original.shape != generated.shape or original.ndim != 2 or original.shape[1] != 2
            or not np.isfinite(original).all() or not np.isfinite(generated).all()
            or type(start) is not int or type(end) is not int
            or not 0 <= start < end <= len(original) or not 3*RATE <= end-start <= 6*RATE):
        raise ValueError('Expected a finite, bounded 3–6 second repair')
    old, new = original[start:end], generated[start:end]
    rms = float(np.sqrt(np.mean(new**2)))
    gain = float(np.sqrt(np.mean(old**2)))/max(rms,1e-9)
    if not .5 <= gain <= 2:
        raise ValueError('Repair level differs too much from the original passage')
    weight = np.ones((end-start,1)); n = round(.08*RATE)
    fade = np.sin(np.linspace(0,np.pi/2,n))**2
    weight[:n,0] = fade; weight[-n:,0] = fade[::-1]
    result = original.copy()
    result[start:end] = old*(1-weight)+new*gain*weight
    return result, gain


def match_call_tone(hook, reference):
    """Recording mix treatment; no resynthesis, pitch or formant shifting."""
    if (hook.ndim!=2 or hook.shape[1]!=2 or not .35*RATE<=len(hook)<=5*RATE
            or reference.ndim!=2 or reference.shape[1]!=2 or not len(reference)
            or not np.isfinite(hook).all() or not np.isfinite(reference).all()):
        raise ValueError('Expected finite stereo source and vocal reference')
    def active(pcm):
        levels=envelope(pcm)
        return np.repeat(levels>max(.0003,float(np.max(levels))*.12),RATE//100)[:len(pcm)]
    def bands(pcm):
        edges=[np.zeros_like(pcm),*[sosfilt(butter(2,hz,fs=RATE,output='sos'),pcm,axis=0)
                                   for hz in (160,400,1000,2500,6000)],pcm]
        return [b-a for a,b in zip(edges,edges[1:])]
    part=sosfilt(butter(2,80,btype='highpass',fs=RATE,output='sos'),hook,axis=0)
    mask=active(part)
    if not mask.any():raise ValueError('No audible source phrase')
    reference_mask=active(reference);eq=np.zeros(6);reference_rms=0.
    components=bands(part)
    if np.count_nonzero(reference_mask)>=.15*RATE:
        reference_rms=float(np.sqrt(np.mean(reference[reference_mask]**2)))
        source_power=np.array([np.mean(b[mask]**2) for b in components])
        target_power=np.array([np.mean(b[reference_mask]**2) for b in bands(reference)])
        ratio=(target_power/max(float(target_power.sum()),1e-12)+1e-6)/(source_power/max(float(source_power.sum()),1e-12)+1e-6)
        eq=np.clip(10*np.log10(ratio)*.8,-6,6)
    part=sum(b*10**(db/20) for b,db in zip(components,eq))
    levels=envelope(part);voiced=levels[levels>max(.0003,float(np.max(levels))*.12)]
    if not len(voiced):raise ValueError('Source is too quiet after tone matching')
    threshold=max(.0003,float(np.quantile(voiced,.4)))
    reduction=np.minimum(9.,np.maximum(0,20*np.log10(np.maximum(levels,1e-12)/threshold))*2/3)
    smoothed=[];previous=0.
    for db in reduction:
        coefficient=np.exp(-.01/(.02 if db>previous else .12))
        previous=coefficient*previous+(1-coefficient)*db;smoothed.append(previous)
    curve=np.interp(np.arange(len(part))/RATE,(np.arange(len(smoothed))+.5)*.01,smoothed)
    part*=10**(-curve[:,None]/20)
    # Short, quiet reflections stay inside the phrase and cannot spill over the next singer.
    room_source=sosfilt(butter(2,[300,4500],btype='bandpass',fs=RATE,output='sos'),part,axis=0)
    room=np.zeros_like(part)
    for delay,weight in [(.017,.5),(.029,.3),(.043,.2)]:
        for channel in range(2):
            shift=round((delay+channel*.004)*RATE)
            room[shift:,channel]+=room_source[:-shift,channel]*weight
    part=faded(part*.94+room*.06)
    return part,{'version':2,'highpass_hz':80,'eq_crossovers_hz':[160,400,1000,2500,6000],'eq_db':eq.tolist(),
        'max_compression_db':float(max(smoothed)),'room_wet':.06,'reference_rms':reference_rms,
        'pitch_shift_semitones':0,'formant_shift_semitones':0,'time_scale':1.,
        'speaker_identity_listening':'NOT RUN'}


def add_call(song, hook, start, vocals, voice_scale=1.):
    if (type(start) is not int or not 0 <= start < start+len(hook) <= len(song)
            or vocals.shape != song.shape or not np.isfinite(vocals).all()
            or type(voice_scale) not in (int,float) or not .5 <= voice_scale <= 2):
        raise ValueError('Invalid call bounds or vocal estimate')
    stop = start+len(hook); margin=round(.12*RATE)
    levels = envelope(vocals[max(0,start-margin):min(len(song),stop+margin)]*voice_scale)
    threshold = min(.006,max(.0003,float(np.quantile(envelope(vocals),.9))*.05))
    if np.max(levels)>threshold:
        raise ValueError('Estimated singing overlaps the call; no candidate produced')
    reference=vocals[max(0,start-6*RATE):min(len(vocals),stop+6*RATE)]*voice_scale
    part,processing=match_call_tone(hook,reference)
    active = part[np.max(np.abs(part),axis=1)>np.max(np.abs(part))*.08]
    if not len(active): raise ValueError('No audible source phrase')
    band_rms = float(np.sqrt(np.mean(song[start:stop]**2)))
    if band_rms<.015: raise ValueError('The call needs ongoing music')
    reference_level=processing['reference_rms']*.85 or band_rms*.7
    lead_level=float(np.clip(reference_level,band_rms*.5,min(.18,band_rms*1.1)))
    desired=lead_level/float(np.sqrt(np.mean(active**2)))
    desired=min(desired,.5/float(np.max(np.abs(part))))
    mask=np.abs(part)>1e-8; bed=song[start:stop]
    allowed=np.min((.98-np.sign(part[mask])*bed[mask])/np.abs(part[mask]))
    gain=float(min(desired,allowed*.98))
    if gain<desired*.8: raise ValueError('Insufficient source headroom')
    voice=np.zeros_like(song);voice[start:stop]=part*gain
    return song+voice, voice, {'start_frame':start,'end_frame':stop,'gain':gain,
        'estimated_vocal_max_rms':float(np.max(levels)),'vocal_threshold_rms':threshold,
        'band_rms':band_rms,'target_lead_rms':lead_level,'rate':1.,'transpose_semitones':0,
        'processing':processing,'processed_active_rms':float(np.sqrt(np.mean(active**2)))*gain}


def replace_vocal(song, vocals, start, end):
    if (song.shape!=vocals.shape or not np.isfinite(vocals).all()
            or type(start) is not int or type(end) is not int
            or not 0<=start<end<=len(song) or not .5*RATE<=end-start<=4*RATE):
        raise ValueError('Expected a bounded vocal replacement')
    mask=np.zeros((len(song),1));mask[start:end]=1
    n=round(.04*RATE);fade=np.sin(np.linspace(0,np.pi/2,n))**2
    mask[start:start+n,0]=fade;mask[end-n:end,0]=fade[::-1]
    # Estimated vocals may contain instruments; restrict subtraction to this one phrase.
    return song-vocals*mask, vocals*(1-mask)


def mix_calls(song, hook, start, vocals, repeat_at=(), voice_scale=1.):
    if (not isinstance(repeat_at,(list,tuple)) or len(repeat_at)>2
            or any(type(t) not in (int,float) or not np.isfinite(t) for t in repeat_at)):
        raise ValueError('Expected at most two finite repeat times')
    starts=[start,*[round(t*RATE) for t in repeat_at]]
    if len(starts)*len(hook)>6*RATE or any(b<a+len(hook)+round(.12*RATE) for a,b in zip(starts,starts[1:])):
        raise ValueError('Calls must be separated and leave room for the singer')
    voice=np.zeros_like(song);events=[]
    for at in starts:
        _,part,event=add_call(song,hook,at,vocals,voice_scale)
        voice+=part;events.append(event)
    mix=song+voice
    if np.max(np.abs(mix))>=.98:raise ValueError('Unsafe mix peak')
    return mix,voice,events


def edit(song_dir, source, output, call_at, consent=False, repaint_dir=None, replace_region=None, repeat_at=(), rhythm=None):
    if not consent: raise ValueError('Local source consent required')
    if output.exists(): raise FileExistsError('Preserving existing edit')
    song, receipt=rendered(song_dir)
    source_hash=digest(source);hook=read_pcm(source,(.35,5))
    if rhythm is not None:hook=fit_call_rhythm(hook,rhythm)
    if type(call_at) not in (int,float) or not np.isfinite(call_at): raise ValueError('Invalid call time')
    start=round(call_at*RATE);stop=start+len(hook)
    vocals=stem(song_dir,'vocals',receipt,song.shape)
    music=song.copy(); region=[start,stop]; repair_gain=1.; repair_hash=None
    if repaint_dir and replace_region is not None:
        raise ValueError('Choose one local editing method')
    if replace_region is not None:
        if (not isinstance(replace_region,(list,tuple)) or len(replace_region)!=2
                or any(type(v) not in (int,float) or not np.isfinite(v) for v in replace_region)):
            raise ValueError('Invalid vocal replacement region')
        a,b=[round(t*RATE) for t in replace_region]
        if not a+round(.12*RATE)<=start<stop<=b-round(.12*RATE):
            raise ValueError('The call must fit inside the replaced vocal phrase')
        music,vocals=replace_vocal(song,vocals,a,b);region=[a,b]
    if repaint_dir:
        generated, repair=rendered(repaint_dir)
        c=repair.get('source_conditioning') or {}
        span=c.get('repaint')
        if (repair.get('task_type')!='repaint' or c.get('sha256')!=receipt['audio_sha256']
                or c.get('instrumental') is not True or not isinstance(span,list) or len(span)!=2
                or any(type(v) not in (int,float) or not np.isfinite(v) for v in span)):
            raise ValueError('Repair must belong to this exact original song')
        a,b=[round(t*RATE) for t in span]
        if not a+round(.2*RATE)<=start<stop<=b-round(.2*RATE):
            raise ValueError('Call must fit inside the repaired passage')
        music,repair_gain=blend_patch(song,generated,a,b)
        vocals=stem(repaint_dir,'vocals',repair,song.shape)
        repair_hash=repair['audio_sha256'];region=[a,b]
    mix,voice,events=mix_calls(music,hook,start,vocals,repeat_at,repair_gain)
    if np.max(np.abs(mix))>=.98: raise ValueError('Unsafe mix peak')
    output.mkdir(parents=True);(output/'.partial').touch()
    shutil.copyfile(song_dir/'singer.wav',output/'original.wav')
    for name,pcm in [('performance',mix),('music',music),('user',voice)]:write_pcm(output/f'{name}.wav',pcm)
    actual=read_pcm(output/'performance.wav',(30,45));saved_voice=read_pcm(output/'user.wav',(30,45))
    regions=[region]+[[e['start_frame'],e['end_frame']] for e in events[1:]]
    outside_mask=np.ones(len(song),dtype=bool)
    for a,b in regions:outside_mask[a:b]=False
    outside=np.flatnonzero(outside_mask)
    error=float(np.max(np.abs(actual[outside]-song[outside])))
    identity=float(np.max(np.abs(saved_voice-voice)))
    if error!=0 or identity>.5/32768+1e-12: raise ValueError('Preservation check failed')
    if digest(song_dir/'singer.wav')!=receipt['audio_sha256'] or digest(source)!=source_hash:
        raise ValueError('Original song or source changed during editing')
    report={'technical':'PASS','mode':'localized-repair' if repaint_dir else 'vocal-replacement' if replace_region else 'existing-gap',
        'song_sha256':receipt['audio_sha256'],'source_sha256':source_hash,'repair_sha256':repair_hash,
        'region_frames':region,'regions_frames':regions,'unchanged_seconds':len(outside)/RATE,'outside_region_max_pcm_error':error,
        'processed_source_max_pcm_error':identity,'speaker_identity_listening':'NOT RUN','repair_gain':repair_gain,'event':events[0],'events':events,
        'peak':float(np.max(np.abs(actual))),'singer_moved':False,'master_gain':1.,
        'listening':'NOT RUN','vocal_subtraction':replace_region is not None,
        'note':'Manually selected phrase and passage; estimated quiet or subtraction does not prove musical fit or absence of bleed.',
        'artifacts':{name:digest(output/f'{name}.wav') for name in ('performance','original','music','user')}}
    if rhythm is not None:
        write_pcm(output/'rhythm-source.wav',hook)
        report['source_rhythm']={**rhythm,'pitch_shift_semitones':0,'word_gain':.72 if rhythm.get('word_frames') else 0,
            'input_sha256':source_hash,'output_sha256':digest(output/'rhythm-source.wav')}
    (output/'complete.json').write_text(json.dumps(report,indent=2)+'\n');(output/'.partial').unlink()
    return report


def arrangement_options(song, vocals, hook, grid):
    """Bounded calls in gaps or in place of isolated estimated vocal phrases."""
    hop=RATE//100; levels=envelope(vocals)
    threshold=min(.006,max(.0003,float(np.quantile(levels,.9))*.05))
    active=levels>threshold
    # shortcut: quiet boundaries estimate phrases, not words; broaden only with listening evidence.
    joined=active.copy()
    for a,b in intervals(~active):
        if a>0 and b<len(active) and b-a<30: joined[a:b]=True
    phrases=intervals(joined); options=[]; duration=len(hook)
    beat=RATE*60/grid['bpm']; offset=grid['offset_frames']
    pulses=[round(offset+i*beat/2) for i in range(int(len(song)/beat*2)+1)]
    for mode,spans in [('existing-gap',intervals(~active)),('vocal-replacement',phrases)]:
        for a,b in spans:
            a,b=int(a),int(b)
            # Keep an answering singer and the ending; do not turn the call into an intro pasted before music.
            if b>=len(levels) or b*hop>len(song)-4*RATE or not np.any(active[b:]):continue
            region=None
            if mode=='vocal-replacement':
                lo=max(0,(a-12)*hop);hi=min(len(song),(b+12)*hop)
                if not .5*RATE<=hi-lo<=4*RATE:continue
                if np.any(active[max(0,a-30):a]) or np.any(active[b:min(len(active),b+30)]):continue
                region=[lo/RATE,hi/RATE]
                lo+=round(.12*RATE);hi-=round(.12*RATE)+duration
            else:
                lo=max(RATE,a*hop+round(.18*RATE));hi=b*hop-round(.18*RATE)-duration
                lo=max(lo,b*hop-duration-2*RATE)
            if hi<lo:continue
            starts=[t for t in pulses if lo<=t<=hi] if grid['confidence']>=.15 else []
            if not starts:starts=[(lo+hi)//2]
            for start in starts:
                options.append({'mode':mode,'call_at':start/RATE,'replace_region':region,
                    'fingerprint':f'{mode}:{int(start/(4*RATE))}'})
    return options


def read_history(path):
    try:
        if path.stat().st_size>16384:return []
        items=json.loads(path.read_text())
        if not isinstance(items,list):return []
        return [s for s in items[-12:] if isinstance(s,str) and len(s)<80]
    except (OSError,ValueError):return []


def performance_options(options, hook, grid, song_frames):
    """Keep single calls available; try sparse repeats only where they can fit."""
    result=[];beat=RATE*60/grid['bpm']
    spacing=int(np.ceil((len(hook)+.18*RATE)/beat))*beat
    for candidate in options:
        first=round(candidate['call_at']*RATE)
        result.append({**candidate,'pattern':'single-call','repeat_at':[]})
        if len(hook)>2*RATE:continue
        variants=[]
        if grid['confidence']>=.15:
            for count in (1,2):
                repeats=[round(first+i*spacing)/RATE for i in range(1,count+1)]
                if (repeats[-1]*RATE+len(hook)<song_frames-4*RATE
                        and (count+1)*len(hook)<=6*RATE):
                    variants.append(('rhythmic-loop',candidate['call_at'],repeats))
                if candidate['mode']=='existing-gap' and first-count*spacing>=RATE:
                    starts=[round(first-i*spacing)/RATE for i in reversed(range(count+1))]
                    variants.append(('rhythmic-loop',starts[0],starts[1:]))
        later=[c['call_at'] for c in options if c['mode']=='existing-gap'
               and c['call_at']>=candidate['call_at']+max(4.,len(hook)/RATE+.18)]
        if later:variants.append(('returning-hook',candidate['call_at'],[min(later)]))
        for pattern,call_at,repeats in variants:
            result.append({**candidate,'pattern':pattern,'call_at':call_at,'repeat_at':repeats,
                'fingerprint':f"{candidate['mode']}:{int(call_at/4)}:{pattern}:{len(repeats)+1}"})
    return result


def rank_options(options, history, seed):
    rng=random.Random(seed); remaining=list(options); ranked=[]
    while remaining:
        # Penalize recent shapes, not A or B outright: A-A and B-B can still occur at different entrances.
        weights=[1/(sum((other['mode'],other.get('treatment'))==(c['mode'],c.get('treatment')) for other in remaining)*
                    (1+3*history.count(c['fingerprint'])+
                     sum(h.split(':')[0]==c['mode'] for h in history[-4:]))) for c in remaining]
        if history and any(c['fingerprint']!=history[-1] for c in remaining):
            weights=[0 if c['fingerprint']==history[-1] else w for c,w in zip(remaining,weights)]
        i=rng.choices(range(len(remaining)),weights=weights,k=1)[0]
        ranked.append(remaining.pop(i))
    return ranked


def arrange(source, song_dir, output, history_path, seed, consent=False, source_score=None):
    if not consent:raise ValueError('Local source consent required')
    if output.exists():raise FileExistsError('Preserving existing arrangement')
    song,receipt=rendered(song_dir);hook=read_pcm(source,(.35,5))
    word=None
    if source_score is not None:
        if source_score.stat().st_size>1024**2:raise ValueError('Source metadata exceeds budget')
        score=json.loads(source_score.read_text())
        if (not isinstance(score,dict) or not isinstance(score.get('source'),dict)
                or score['source'].get('sha256')!=digest(source) or score.get('sample_rate')!=RATE
                or score['source'].get('processed_frames')!=len(hook)):
            raise ValueError('Source rhythm metadata does not match recording')
        word=score.get('rhythm_word_frames')
        if word is not None and (not isinstance(word,list) or len(word)!=2 or any(type(f) is not int for f in word)
                or not 0<=word[0]<word[1]<=len(hook) or not .18*RATE<=word[1]-word[0]<=1.2*RATE):
            raise ValueError('Invalid source word bounds')
    vocals=stem(song_dir,'vocals',receipt,song.shape)
    drums=stem(song_dir,'drums',receipt,song.shape)
    bpm=receipt['case']['bpm']
    if type(bpm) not in (int,float) or not np.isfinite(bpm) or not 60<=bpm<=180:
        raise ValueError('Invalid musical tempo')
    grid=beat_grid(drums,bpm);history=read_history(history_path)
    hooks={'original':(hook,None)};rhythm_failure=None
    if grid['confidence']>=.15:
        beat=RATE*60/grid['bpm'];beats=round(len(hook)/beat);ratio=beats*beat/len(hook)
        if .8<=ratio<=1.25:
            for treatment in ('beat-fitted','word-reply'):
                if treatment=='word-reply' and word is None:continue
                recipe={'duration_ratio':ratio}
                if treatment=='word-reply':recipe.update(word_frames=word,repeat_offset_frames=round((beats+.5)*beat))
                try:hooks[treatment]=(fit_call_rhythm(hook,recipe),recipe)
                except (ValueError,OSError,subprocess.SubprocessError) as error:rhythm_failure=type(error).__name__
    choices=[]
    for treatment,(clip,recipe) in hooks.items():
        base=arrangement_options(song,vocals,clip,grid)
        options=(performance_options(base,clip,grid,len(song)) if treatment=='original' else
                 [{**c,'pattern':treatment,'repeat_at':[]} for c in base])
        choices.extend({**c,'treatment':treatment,'fingerprint':c['fingerprint']+':'+treatment} for c in options)
    options=rank_options(choices,history,seed)
    rejected=0
    for candidate in options:
        clip,recipe=hooks[candidate.get('treatment','original')]
        try:
            bed,estimate=song,vocals
            if candidate['replace_region']:
                bed,estimate=replace_vocal(song,vocals,*[round(t*RATE) for t in candidate['replace_region']])
            mix,_,_=mix_calls(bed,clip,round(candidate['call_at']*RATE),estimate,candidate.get('repeat_at',[]))
            if np.max(np.abs(mix))>=.98:raise ValueError('Unsafe mix peak')
        except ValueError:
            rejected+=1;continue
        report=edit(song_dir,source,output,candidate['call_at'],True,replace_region=candidate['replace_region'],repeat_at=candidate.get('repeat_at',[]),rhythm=recipe)
        report.update(sample_used=True,selection_seed=seed,grid=grid,options_considered=len(options),
            pattern=candidate.get('pattern','single-call'),
            rejected_candidates=rejected,arrangement_fingerprint=candidate['fingerprint'],rhythm_fallback=rhythm_failure,
            note='Automatic quiet-boundary selection; estimated vocal subtraction and musical fit still need listening.')
        # The studio serializes jobs. Save only completed arrangements, without speech or paths.
        try:
            history_path.parent.mkdir(parents=True,exist_ok=True)
            temporary=history_path.with_suffix('.tmp')
            temporary.write_text(json.dumps([*history,candidate['fingerprint']][-12:])+'\n')
            temporary.replace(history_path)
            report['history_saved']=True
        except OSError:report['history_saved']=False
        (output/'complete.json').write_text(json.dumps(report,indent=2)+'\n')
        return report
    raise ValueError('No safe source-inclusive arrangement; do not deliver the song without the recording')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('song-dir','source','output'):p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--repaint-dir',type=Path);p.add_argument('--call-at',type=float,required=True)
    p.add_argument('--replace-vocal',type=float,nargs=2,metavar=('START','END'))
    p.add_argument('--consent',action='store_true');a=p.parse_args()
    edit(a.song_dir,a.source,a.output,a.call_at,a.consent,a.repaint_dir,a.replace_vocal)
