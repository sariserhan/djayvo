#!/usr/bin/env python3
"""Inspect actual browser recorder WAVs; signal metrics never imply musical quality."""
import array,hashlib,json,math,subprocess,sys,wave
from pathlib import Path
root=Path(__file__).resolve().parents[1]
results=[]
for browser in ('chromium','webkit'):
 path=root/'build-academy'/f'{browser}-first-crossfade.wav'
 with wave.open(str(path)) as w:
  assert w.getsampwidth()==2 and w.getnchannels()==2
  rate=w.getframerate();frames=w.getnframes();pcm=array.array('h',w.readframes(frames))
 if sys.byteorder!='little':pcm.byteswap()
 peak=max(abs(v) for v in pcm)/32768
 assert frames>rate*3 and peak>0.001 and peak<.8
 clips=sum(v in (-32768,32767) for v in pcm);assert clips==0
 receipt=json.loads(path.with_name(browser+'-recording.json').read_text())
 assert hashlib.sha256(path.read_bytes()).hexdigest()==receipt['wav_sha256']
 automation=json.loads(path.with_name(browser+'-automation.json').read_text())
 assert automation['wav_sha256']==receipt['wav_sha256']
 longest=run=0
 for l,r in zip(pcm[::2],pcm[1::2]):
  run=run+1 if l==0 and r==0 else 0;longest=max(longest,run)
 measured=subprocess.run(['ffmpeg','-hide_banner','-i',str(path),'-af','loudnorm=I=-18:TP=-3:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 loudness=json.JSONDecoder().raw_decode(measured.stderr[measured.stderr.rfind('{'):])[0]
 results.append({'browser':browser,'file':str(path.relative_to(root)),'sha256':receipt['wav_sha256'],'frames':frames,'sample_rate':rate,'seconds':frames/rate,'peak_dbfs':20*math.log10(peak),'integrated_lufs':float(loudness['input_i']),'true_peak_dbtp':float(loudness['input_tp']),'clipped_samples':clips,'longest_exact_silence_ms':longest/rate*1000,'recording_timestamp_discontinuities':receipt['timestamp_discontinuities'],'automation_events':len(automation['events']),'audio_clock_gate':'PARTIAL' if receipt['timestamp_discontinuities'] else 'PASS','human_listening':'NOT RUN','interpretation':'Actual post-limiter music capture. A clock diagnostic alone does not prove missing PCM; zero clips does not prove no audible crackle.'})
(root/'docs/evidence/academy/captured-audio.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
