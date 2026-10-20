#!/usr/bin/env python3
"""An authored local club edit, independent of the paused improvisation engine."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import wave

import numpy as np
from scipy import signal

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts'))
from q0_audit import loudness

RATE=48000
BEAT=60/140
BAR=4*BEAT
SOURCE=ROOT/'renders/cloud-trial-20261018/club-seed-7441.wav'
SOURCE_SHA='7d26706f5d0ed0ad597e8013832e20b9e3d3ecd425794d32737c3ffb320d56e6'

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def frame(seconds):return round(seconds*RATE)
def filt(x,hz,kind):return signal.sosfilt(signal.butter(2,hz,btype=kind,fs=RATE,output='sos'),x,axis=0)
def fade(x,attack=.008,release=.018):
    x=x.copy();a=min(frame(attack),len(x)//2);b=min(frame(release),len(x)//2)
    if a:x[:a]*=np.linspace(0,1,a)[:,None]
    if b:x[-b:]*=np.linspace(1,0,b)[:,None]
    return x

def write_wav(path,x):
    assert np.isfinite(x).all() and np.max(np.abs(x))<1
    with wave.open(str(path),'wb') as w:
        w.setparams((2,2,RATE,0,'NONE','not compressed'))
        w.writeframes(np.rint(x*32767).astype('<i2').tobytes())

def render(out):
    if out.exists():raise ValueError('Choose fresh output; preserve previous audio')
    assert digest(SOURCE)==SOURCE_SHA
    metadata=json.loads((SOURCE.parent/'batch.json').read_text())
    record=next(r for r in metadata['cases'] if r['name']==SOURCE.stem)
    assert record['sha256']==SOURCE_SHA and record['status']=='PASS'
    assert not record['parameters']['reference_audio'] and not record['parameters']['src_audio']
    with wave.open(str(SOURCE)) as w:
        assert w.getframerate()==RATE and w.getnchannels()==2 and w.getsampwidth()==2
        source=np.frombuffer(w.readframes(w.getnframes()),'<i2').astype(np.float64).reshape(-1,2)/32768
    out.mkdir(parents=True);(out/'INCOMPLETE').touch()
    n=frame(68*BAR+4)
    music=np.zeros((n,2));effects=np.zeros_like(music);percussion=np.zeros_like(music)
    edits=[]
    def phrase(start,bars):
        a,b=frame(start*BAR),frame((start+bars)*BAR)
        assert 0<=a<b<=len(source)
        return source[a:b].copy()
    def put(bus,x,bar,label,source_bar=None):
        at=frame(bar*BAR)
        assert at>=0 and at+len(x)<=len(bus)
        bus[at:at+len(x)]+=x
        edits.append({'label':label,'start_frame':at,'frames':len(x),'source_bar':source_bar})
    def filter_open(x,low=600,high=9000,highpass=100):
        dark=filt(x,low,'lowpass');bright=filt(x,high,'lowpass')
        ramp=np.linspace(0,1,len(x))[:,None]
        return filt(dark*(1-ramp)+bright*ramp,highpass,'highpass')
    # One harmonic identity: retain phrases from a single original generated take.
    for at,src in [(0,0),(4,2)]:
        x=filter_open(phrase(src,4),450,3200,180)*.65
        x*=np.linspace(.45,1,len(x))[:,None]
        put(music,fade(x,.25,.08),at,'filtered introduction',src)
    for at,src in [(8,4),(12,6)]:
        x=filter_open(phrase(src,4),1500,10000,110)*.88
        put(music,fade(x),at,'rising groove',src)
    # Eight-bar statements alternate contiguous A and B material; no independent note jitter.
    for at,src in [(16,8),(20,12),(24,8),(28,10)]:
        x=phrase(src,4)
        if at==28:
            # A half-beat stop before the breakdown, then its effect tail.
            cut=frame(3.875*BAR);x[cut:]=0;x[:cut]=fade(x[:cut],release=.025)
        put(music,fade(x),at,'first drop',src)
    # Contrast removes the rhythmic low end while the opening motif returns in space.
    for at,src in [(32,0),(36,2)]:
        x=filt(filt(phrase(src,4),240,'highpass'),2500,'lowpass')*.6
        put(music,fade(x,.15,.2),at,'breakdown',src)
        for tap,gain in [(0.375,.32),(.75,.18),(1.125,.10)]:
            delayed=np.pad(x[:,::-1]*gain,((frame(tap*BAR),0),(0,0)))
            put(effects,fade(delayed,release=.3),at,'breakdown echo',src)
    put(music,fade(filter_open(phrase(4,4),700,11000,250)*.8),40,'second build',4)
    for at,src in [(44,8),(48,10),(52,12),(56,8)]:
        x=phrase(src,4)
        if at==48:
            # Four measured eighth-note repeats replace the final half-bar as a fill.
            a=frame(3.5*BAR);unit=frame(.125*BAR)
            fragment=fade(x[a:a+unit],.004,.014)
            for i in range(4):
                lo=a+i*unit;hi=min(lo+unit,len(x));x[lo:hi]=fragment[:hi-lo]*(1-.09*i)
        if at==56:
            # A brief call/space/answer gesture inside the final return.
            a,b=frame(2.75*BAR),frame(3*BAR)
            x[a:b]=0
            x[max(0,a-frame(.02)):a]*=np.linspace(1,0,frame(.02))[:,None]
            x[b:b+frame(.008)]*=np.linspace(0,1,frame(.008))[:,None]
        put(music,fade(x)*1.025,at,'changed return',src)
    for at,src in [(60,8),(64,0)]:
        x=phrase(src,4);ramp=np.linspace(0,1,len(x))[:,None]
        x=(x*(1-ramp)+filt(x,900,'lowpass')*ramp)*np.linspace(.75,.12,len(x))[:,None]
        put(music,fade(x,.01,.5),at,'outro',src)
    # Cleared recorded snare velocity layers for deliberate builds, not random accents.
    bank=ROOT/'renders/q0-palette-research-20261020'
    manifest=json.loads((bank/'recorded-palette.json').read_text())
    assert manifest['license']=='CC0-1.0'
    layers=[r for r in manifest['samples'] if r['root']==38]
    used={};cache={}
    def snare(velocity):
        row=min(layers,key=lambda r:abs(r['velocity_max']-velocity))
        path=bank/'samples'/(row['id']+Path(row['path']).suffix)
        if row['id'] not in cache:
            assert digest(path)==row['sha256']
            pcm=subprocess.check_output(['ffmpeg','-nostdin','-v','error','-i',str(path),'-f','f32le','-ac','2','-ar',str(RATE),'-'])
            x=np.frombuffer(pcm,'<f4').reshape(-1,2).astype(float)
            x=x[:frame(.65)];x=fade(x,release=.08)
            cache[row['id']]=x/max(np.max(np.abs(x)),1e-6)
            used[row['id']]={k:row[k] for k in ('repo','commit','path','sha256','url')}
        return cache[row['id']]*.07*(velocity/100)**1.2
    rng=np.random.default_rng(20102026)
    for start in (12,40):
        for beat in np.arange(0,16,.5):
            if beat>=15:continue
            velocity=40+int(55*beat/16)+(5 if beat%2==0 else -5)
            put(percussion,snare(velocity),start+beat/4,'snare lift')
        for beat in np.arange(14,15.5,.25):
            put(percussion,snare(80+int((beat-14)*10)),start+beat/4,'roll pickup')
        length=frame(4*BAR);t=np.linspace(0,1,length)
        noise=rng.normal(0,1,(length,2));noise=filt(filt(noise,1700,'highpass'),10000,'lowpass')
        noise*=((t**2)*.025)[:,None]
        put(effects,fade(noise,.1,.07),start,'riser')
        # Leave the last eighth-note before each drop clear of the dry backing.
        a,b=frame((start+3.875)*BAR),frame((start+4)*BAR)
        music[a:b]=0
        music[a-frame(.02):a]*=np.linspace(1,0,frame(.02))[:,None]
    for bar in (16,44):
        length=frame(1.5);t=np.arange(length)/RATE
        down=filt(rng.normal(0,1,(length,2)),2500,'lowpass')*np.exp(-t*4)[:,None]*.035
        put(effects,fade(down,.008,.15),bar,'drop air')
    # Last motif with finite echoes rather than an abruptly cut loop.
    ending=fade(phrase(8,.5),.008,.25)*.45
    put(effects,ending,67.5,'final motif')
    for i in range(1,6):put(effects,ending[:,::-1]*(.45**i),67.5+i*.25,'ending echo')
    mix=music+effects+percussion
    mix=filt(mix,28,'highpass')
    low=filt(mix,115,'lowpass');mix=mix-low+low.mean(axis=1)[:,None]
    mix=fade(mix,.05,.7)
    assert len(mix)==n and np.isfinite(mix).all()
    # Preserve mastering headroom; delivered WAV/MP3 are measured after processing.
    pregain=min(1,.90/np.max(np.abs(mix)))
    write_wav(out/'premaster.wav',mix*pregain)
    for name,bus in [('arrangement',music),('transitions',effects),('snare-builds',percussion)]:
        write_wav(out/(name+'.wav'),bus*pregain)
    measured=loudness(out/'premaster.wav');gain=min(8,-13.5-float(measured['input_i']))
    chain=f'volume={gain:.8f}dB,aresample=96000,alimiter=limit=0.841395:attack=5:release=90:level=false:latency=true,aresample=48000,afade=t=out:st={len(mix)/RATE-.7}:d=0.7'
    subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(out/'premaster.wav'),'-af',chain,
                    '-c:a','pcm_s24le',str(out/'Night Current.wav')],check=True)
    subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(out/'Night Current.wav'),
                    '-c:a','libmp3lame','-b:a','320k','-metadata','title=Night Current','-metadata','artist=Jamloom',
                    str(out/'Night Current.mp3')],check=True)
    levels={name:loudness(out/name) for name in ('Night Current.wav','Night Current.mp3')}
    for level in levels.values():assert float(level['input_tp'])<=-1.0
    report={'title':'Night Current','bpm':140,'duration_seconds':len(mix)/RATE,'form':[
        {'name':name,'start_seconds':bar*BAR,'bar':bar} for name,bar in [('Intro',0),('Build',8),('Drop 1',16),('Breakdown',32),('Rebuild',40),('Drop 2',44),('Outro',60)]],
        'source':{'file':str(SOURCE.relative_to(ROOT)),'sha256':SOURCE_SHA,'generation':'Existing pretrained ACE-Step output; no adapter or reference audio input','seed':7441},
        'snare_samples':used,'sample_credit':manifest['credit'],'sample_license':'CC0-1.0',
        'edits':edits,'mastering_gain_db':gain,'levels':levels,'technical':'PASS','listening':'NOT RUN',
        'limits':'Authored arrangement of existing original generated material, not a fresh model generation or new improvisation algorithm. Beat grid estimated from audio; perceived groove and quality need listening.',
        'reference_audio_in_output':False,'new_paid_compute':False,'new_training':False,
        'script_sha256':digest(Path(__file__)),'files_sha256':{p.name:digest(p) for p in out.glob('*.wav')}}
    report['files_sha256']['Night Current.mp3']=digest(out/'Night Current.mp3')
    (out/'song.json').write_text(json.dumps(report,indent=2)+'\n')
    (out/'CREDITS.txt').write_text('Night Current — Jamloom\nOriginal local arrangement of an existing ACE-Step instrumental generation.\n'+manifest['credit']+'\nRecorded drum samples: CC0-1.0.\nNo Blood Club recording, melody transcription, lyrics or performer voice used.\n')
    (out/'INCOMPLETE').unlink()
    print(json.dumps({'status':'PASS','title':'Night Current','seconds':len(mix)/RATE,'levels':levels,'human_listening':'NOT RUN'}))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True)
    render(p.parse_args().output.resolve())
