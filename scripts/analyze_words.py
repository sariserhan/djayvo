#!/usr/bin/env python3
"""Optional offline CPU word-time estimates; no transcript is saved or printed."""
import argparse
import hashlib
import io
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
import wave

ROOT=Path(__file__).resolve().parents[1]


def wav_info(data):
    if len(data)>4*1024*1024:raise ValueError('WAV exceeds analysis size limit')
    with wave.open(io.BytesIO(data)) as audio:
        rate,frames=audio.getframerate(),audio.getnframes()
        if audio.getsampwidth()!=2 or audio.getnchannels() not in (1,2) or not 8000<=rate<=192000 or not 2*rate<=frames<=5*rate:
            raise ValueError('Use a 2–5 second PCM16 mono/stereo WAV')
        pcm=audio.readframes(frames)
        if len(pcm)!=frames*audio.getnchannels()*2:raise ValueError('Truncated WAV')
    return rate,frames


def analyze(path,model):
    import resource
    if path.stat().st_size>4*1024*1024:raise ValueError('WAV exceeds analysis size limit')
    data=path.read_bytes();rate,frames=wav_info(data)
    manifest_path=ROOT/'assets/manifests/word-timing-tiny.json'
    manifest=json.loads(manifest_path.read_text())
    for name,item in manifest['files'].items():
        if (model/name).stat().st_size!=item['bytes'] or hashlib.sha256((model/name).read_bytes()).hexdigest()!=item['sha256']:raise ValueError('Speech model hash mismatch')
    os.environ.update(HF_HUB_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1',TOKENIZERS_PARALLELISM='false')
    def deny_network(event,args):
        if event in ('socket.connect','socket.getaddrinfo'):raise RuntimeError('Network disabled during speech analysis')
    sys.addaudithook(deny_network)
    import numpy as np
    from faster_whisper import WhisperModel
    raw=subprocess.run(['ffmpeg','-v','error','-nostdin','-protocol_whitelist','pipe','-i','pipe:0',
                        '-ar','16000','-ac','1','-f','f32le','pipe:1'],input=data,capture_output=True,check=True,timeout=15).stdout
    samples=np.frombuffer(raw,dtype='<f4')
    if len(samples)>80000 or not np.isfinite(samples).all() or np.sqrt(np.mean(samples*samples))<.001:
        raise ValueError('Silence or invalid audio is not a speech-timing source')
    start=time.monotonic()
    engine=WhisperModel(str(model.resolve()),device='cpu',compute_type='int8',cpu_threads=4,num_workers=1,local_files_only=True)
    loaded=time.monotonic()
    segments,info=engine.transcribe(samples,word_timestamps=True,beam_size=1,best_of=1,temperature=0,
        condition_on_previous_text=False,vad_filter=False,max_new_tokens=128,log_progress=False)
    words=[]
    for segment in segments:
        if segment.no_speech_prob>.6 or segment.avg_logprob< -1:continue
        for word in segment.words or []:
            begin=max(0,round(word.start*rate));end=min(frames,round(word.end*rate));confidence=float(word.probability)
            if not all(math.isfinite(x) for x in (word.start,word.end,confidence)) or not 0<=confidence<=1:
                raise ValueError('Invalid model timestamp/confidence')
            if end<=begin or (words and begin<words[-1]['end_frame']):continue
            words.append({'start_frame':begin,'end_frame':end,'confidence':confidence})
            if len(words)>128:raise ValueError('Word estimate budget exceeded')
    elapsed=time.monotonic()
    return {'schema_version':'1.0-word-times','source_sha256':hashlib.sha256(data).hexdigest(),
        'source_rate':rate,'source_frames':frames,'model_manifest_sha256':hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
        'words':words,'language':info.language,'language_probability':float(info.language_probability),
        'device':'cpu','compute_type':'int8','threads':4,'model_load_seconds':loaded-start,'inference_seconds':elapsed-loaded,
        'peak_rss_bytes':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*(1 if sys.platform=='darwin' else 1024),
        'transcript_saved':False,'network_policy':'offline local model; Python socket connections denied',
        'timing_accuracy':'NOT RUN','musical_quality':'NOT RUN'}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input',type=Path,required=True);p.add_argument('--model',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    permission=p.add_mutually_exclusive_group(required=True);permission.add_argument('--consent',action='store_true');permission.add_argument('--synthetic-fixture',action='store_true')
    p.add_argument('--worker',action='store_true',help=argparse.SUPPRESS)
    args=p.parse_args()
    if args.worker:
        result=analyze(args.input,args.model);result['source_kind']='recorded' if args.consent else 'synthetic';result['consent_confirmed']=args.consent
        print(json.dumps(result,allow_nan=False));return
    if args.output.exists():raise ValueError('Output exists; preserving previous analysis')
    if args.input.stat().st_size>4*1024*1024:raise ValueError('WAV exceeds analysis size limit')
    wav_info(args.input.read_bytes())
    result=subprocess.run([sys.executable,__file__,*sys.argv[1:],'--worker'],capture_output=True,text=True,timeout=120)
    if result.returncode:raise RuntimeError('Local speech analysis failed: '+result.stderr[-2000:])
    report=json.loads(result.stdout)
    with args.output.open('x') as out:json.dump(report,out,indent=2,allow_nan=False);out.write('\n')
    print(json.dumps({'status':'PASS','word_estimates':len(report['words']),'inference_seconds':report['inference_seconds'],
                      'peak_rss_bytes':report['peak_rss_bytes'],'timing_accuracy':'NOT RUN','transcript_saved':False}))


if __name__=='__main__':main()
