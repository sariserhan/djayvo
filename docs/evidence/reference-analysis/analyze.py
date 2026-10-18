#!/usr/bin/env python3
"""Reproduce the 2026-10-17 local reference measurements; run from repo root.

Requires the two owner-supplied MP3s in Downloads and the acoustic-v1 renders.
This is a fixed evidence snapshot, not a music annotation or listening tool.
"""
from pathlib import Path
import subprocess, json, hashlib, re
import numpy as np
from scipy import signal, ndimage
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def energy_db(numerator, denominator=1):
    # JSON null represents silence or an undefined energy ratio.
    return round(float(10*np.log10(numerator/denominator)), 2) if numerator > 0 and denominator > 0 else None


def fraction(numerator, denominator):
    return round(float(numerator/denominator), 3) if denominator > 0 else None


assert energy_db(0) is None and energy_db(1, 0) is None
assert energy_db(.01) == -20 and energy_db(1) == 0
assert fraction(0, 0) is None and fraction(1, 4) == .25
check_f, _, check_z = signal.stft(np.sin(2*np.pi*80*np.arange(22050)/22050), fs=22050, nperseg=2048)
check_power = np.abs(check_z)**2
assert check_power[(check_f >= 20) & (check_f < 150)].sum()/check_power.sum() > .99

out=Path('renders/reference-analysis')
out.mkdir(exist_ok=True)
paths={'down':Path.home()/'Downloads/down.mp3','question':Path.home()/'Downloads/question.mp3',
       'djayvo_hiphop':Path('renders/voice-acoustic-v1/remix.hiphop.wav'),
       'djayvo_reggae':Path('renders/voice-acoustic-v1/remix.reggae.wav'),
       'djayvo_experimental':Path('renders/voice-acoustic-v1/remix.experimental.wav')}
summary={}
fig,axes=plt.subplots(2,3,figsize=(16,8),constrained_layout=True)
for number,(name,path) in enumerate(paths.items()):
    blob=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','2','-ar','22050','-'])
    stereo=np.frombuffer(blob,dtype='<f4').reshape(-1,2).astype(np.float64)
    assert stereo.size and np.isfinite(stereo).all(), f"invalid decoded audio: {path}"
    sr=22050; duration=len(stereo)/sr; mono=stereo.mean(axis=1)
    mid=mono;side=(stereo[:,0]-stereo[:,1])/2
    hop=220;nfft=2048
    freqs,t,z=signal.stft(mono,fs=sr,nperseg=nfft,noverlap=nfft-hop,boundary=None)
    power=np.abs(z)**2
    band_edges=[20,150,500,2500,10000]
    bands=np.array([power[(freqs>=a)&(freqs<b)].sum(axis=0) for a,b in zip(band_edges[:-1],band_edges[1:])])
    band_fraction=bands/np.maximum(bands.sum(axis=0),1e-20)
    quarter=sr//4;chunks=stereo[:len(stereo)//quarter*quarter].reshape(-1,quarter,2)
    level=10*np.log10(np.maximum(np.mean(chunks**2,axis=(1,2)),1e-15))
    lt=(np.arange(len(level))+.5)*quarter/sr
    flux=np.maximum(np.diff(np.log1p(100*np.abs(z)),axis=1),0).mean(axis=0)
    flux-=ndimage.gaussian_filter1d(flux,100)
    flux=np.maximum(flux,0)
    ac=signal.fftconvolve(flux,flux[::-1],mode='full')[len(flux)-1:]
    ac/=np.maximum(len(flux)-np.arange(len(flux)),1)
    ac/=max(ac[0],1e-20)
    lo=int(60*sr/hop/190);hi=int(60*sr/hop/55)
    peaks,_=signal.find_peaks(ac[lo:hi],distance=3)
    candidates=[]
    for k in sorted(peaks+lo,key=lambda k:ac[k],reverse=True)[:6]:
        delta=.5*(ac[k-1]-ac[k+1])/(ac[k-1]-2*ac[k]+ac[k+1])
        candidates.append({'bpm':round(60*sr/hop/(k+delta),2),'correlation':round(float(ac[k]),3)})
    # Contrast across adjacent 2-second windows. Candidates, not annotated verses/drops.
    w=round(2*sr/hop)
    features=np.vstack([np.log10(np.maximum(bands,1e-14)),np.log10(np.maximum(power.sum(axis=0),1e-14))])
    features=(features-features.mean(axis=1,keepdims=True))/np.maximum(features.std(axis=1,keepdims=True),.1)
    smooth=ndimage.uniform_filter1d(features,w,axis=1)
    novelty=np.zeros(len(t));novelty[w:-w]=np.linalg.norm(smooth[:,2*w:]-smooth[:,:-2*w],axis=0)
    boundary_peaks,_=signal.find_peaks(novelty,distance=int(5*sr/hop),prominence=.6)
    boundaries=sorted(boundary_peaks,key=lambda p:novelty[p],reverse=True)[:10]
    changes=[]
    for i in sorted(boundaries):
        sec=float(t[i]);before=(lt>=sec-2)&(lt<sec);after=(lt>=sec)&(lt<sec+2)
        changes.append({'seconds':round(sec,2),'contrast_score':round(float(novelty[i]),2),
                        'rms_before_dbfs':round(float(np.mean(level[before])),2),
                        'rms_after_dbfs':round(float(np.mean(level[after])),2)})
    loud=subprocess.run(['ffmpeg','-hide_banner','-i',str(path),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True,check=True)
    tail=loud.stderr[loud.stderr.rfind('Summary:'):]
    (out/f'{name}-loudness.txt').write_text(tail)
    extract=lambda pattern:float(re.search(pattern,tail).group(1))
    windows=[]
    for start in range(0,int(duration),10):
        a=int(start*sr);b=min(len(stereo),int((start+10)*sr));part=stereo[a:b];mask=(t>=start)&(t<start+10)
        windows.append({'start':start,'end':min(round(duration,2),start+10),
                        'rms_dbfs':energy_db(np.mean(part**2)),
                        'bass_fraction':fraction(bands[0,mask].sum(),bands[:,mask].sum()),
                        'upper_fraction':fraction(bands[3,mask].sum(),bands[:,mask].sum()),
                        'side_to_mid_db':energy_db(np.sum(((part[:,0]-part[:,1])/2)**2),np.sum(part.mean(axis=1)**2))})
    result={'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
     'duration_seconds':round(duration,3),'integrated_lufs':extract(r'I:\s+([-\d.]+) LUFS'),
     'loudness_range_lu':extract(r'LRA:\s+([-\d.]+) LU'),
     'true_peak_dbfs':extract(r'Peak:\s+([-\d.]+) dBFS'),
     'rms_dbfs':round(float(10*np.log10(np.mean(stereo**2))),2),
     'rms_p10_p90_dbfs':[round(float(v),2) for v in np.percentile(level[level>-50],[10,90])],
     'side_to_mid_db':round(float(10*np.log10(np.sum(side**2)/max(np.sum(mid**2),1e-15))),2),
     'stereo_correlation':round(float(np.corrcoef(stereo.T)[0,1]),3),
     'mono_bass_20_150hz_energy_fraction':round(float(bands[0].sum()/bands.sum()),3),
     'pulse_candidates_not_confirmed_tempo':candidates,'change_candidates':changes,'ten_second_windows':windows}
    summary[name]=result
    if number<2:
        ax=axes[number]
        ax[0].plot(lt,level,color='#1864ab',lw=.8);ax[0].set(title=f'{name}: level',ylabel='Quarter-second RMS (dBFS)',ylim=(-50,0),xlabel='Seconds')
        for change in changes:
            ax[0].axvline(change['seconds'],color='#d9480f',lw=.6,alpha=.5)
        ax[1].stackplot(t,band_fraction,labels=['20–150 Hz','150–500 Hz','0.5–2.5 kHz','2.5–10 kHz'],colors=['#1864ab','#15aabf','#ffd43b','#e8590c']);ax[1].set(title='Mono spectral energy balance',ylim=(0,1),xlabel='Seconds');ax[1].legend(fontsize=7,loc='lower right')
        sample=stereo[:len(stereo)//sr*sr].reshape(-1,sr,2)
        side_energy=np.mean(((sample[:,:,0]-sample[:,:,1])/2)**2,axis=1)
        mid_energy=np.mean(sample.mean(axis=2)**2,axis=1)
        ax[2].plot(np.arange(len(sample)),10*np.log10(np.maximum(side_energy,1e-15)/np.maximum(mid_energy,1e-15)),color='#862e9c');ax[2].set(title='Stereo width',ylabel='Side / mid energy (dB)',xlabel='Seconds')
    print(name,'LUFS',result['integrated_lufs'],'LRA',result['loudness_range_lu'],'pulse',candidates[:3],flush=True)
fig.suptitle('Reference tracks: measured structure (boundary candidates are not listening annotations)',fontsize=14)
fig.savefig(out/'reference-structure.png',dpi=160)
(out/'analysis.json').write_text(json.dumps(summary,indent=2,allow_nan=False)+'\n')
