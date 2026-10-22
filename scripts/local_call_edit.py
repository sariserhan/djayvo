#!/usr/bin/env python3
"""Private same-song study: one intact call, optional bounded instrumental repair."""
import argparse
import json
from pathlib import Path
import shutil

import numpy as np
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from assemble_sung_response import envelope
from source_led_response import faded, rendered, stem


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
    part = faded(hook)
    active = part[np.max(np.abs(part),axis=1)>np.max(np.abs(part))*.08]
    if not len(active): raise ValueError('No audible source phrase')
    band_rms = float(np.sqrt(np.mean(song[start:stop]**2)))
    if band_rms<.015: raise ValueError('The call needs ongoing music')
    lead_level=min(.14,max(.06,float(np.quantile(envelope(vocals),.9))*.9))
    desired=lead_level/float(np.sqrt(np.mean(active**2)))
    desired=min(desired,.5/float(np.max(np.abs(part))))
    mask=np.abs(part)>1e-8; bed=song[start:stop]
    allowed=np.min((.98-np.sign(part[mask])*bed[mask])/np.abs(part[mask]))
    gain=float(min(desired,allowed*.98))
    if gain<desired*.8: raise ValueError('Insufficient source headroom')
    voice=np.zeros_like(song);voice[start:stop]=part*gain
    return song+voice, voice, {'start_frame':start,'end_frame':stop,'gain':gain,
        'estimated_vocal_max_rms':float(np.max(levels)),'vocal_threshold_rms':threshold,
        'band_rms':band_rms,'target_lead_rms':lead_level,'rate':1.,'transpose_semitones':0}


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


def edit(song_dir, source, output, call_at, consent=False, repaint_dir=None, replace_region=None):
    if not consent: raise ValueError('Local source consent required')
    if output.exists(): raise FileExistsError('Preserving existing edit')
    song, receipt=rendered(song_dir)
    source_hash=digest(source);hook=read_pcm(source,(.35,5))
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
    mix,voice,event=add_call(music,hook,start,vocals,repair_gain)
    if np.max(np.abs(mix))>=.98: raise ValueError('Unsafe mix peak')
    output.mkdir(parents=True);(output/'.partial').touch()
    shutil.copyfile(song_dir/'singer.wav',output/'original.wav')
    for name,pcm in [('performance',mix),('music',music),('user',voice)]:write_pcm(output/f'{name}.wav',pcm)
    actual=read_pcm(output/'performance.wav',(30,30));saved_voice=read_pcm(output/'user.wav',(30,30))
    a,b=region;outside=np.r_[np.arange(a),np.arange(b,len(song))]
    error=float(np.max(np.abs(actual[outside]-song[outside])))
    identity=float(np.max(np.abs(saved_voice-voice)))
    if error!=0 or identity>.5/32768+1e-12: raise ValueError('Preservation check failed')
    if digest(song_dir/'singer.wav')!=receipt['audio_sha256'] or digest(source)!=source_hash:
        raise ValueError('Original song or source changed during editing')
    report={'technical':'PASS','mode':'localized-repair' if repaint_dir else 'vocal-replacement' if replace_region else 'existing-gap',
        'song_sha256':receipt['audio_sha256'],'source_sha256':source_hash,'repair_sha256':repair_hash,
        'region_frames':region,'unchanged_seconds':len(outside)/RATE,'outside_region_max_pcm_error':error,
        'source_identity_max_pcm_error':identity,'repair_gain':repair_gain,'event':event,
        'peak':float(np.max(np.abs(actual))),'singer_moved':False,'master_gain':1.,
        'listening':'NOT RUN','vocal_subtraction':replace_region is not None,
        'note':'Manually selected phrase and passage; estimated quiet or subtraction does not prove musical fit or absence of bleed.',
        'artifacts':{name:digest(output/f'{name}.wav') for name in ('performance','original','music','user')}}
    (output/'complete.json').write_text(json.dumps(report,indent=2)+'\n');(output/'.partial').unlink()
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('song-dir','source','output'):p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--repaint-dir',type=Path);p.add_argument('--call-at',type=float,required=True)
    p.add_argument('--replace-vocal',type=float,nargs=2,metavar=('START','END'))
    p.add_argument('--consent',action='store_true');a=p.parse_args()
    edit(a.song_dir,a.source,a.output,a.call_at,a.consent,a.repaint_dir,a.replace_vocal)
