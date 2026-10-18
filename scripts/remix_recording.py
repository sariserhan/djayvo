#!/usr/bin/env python3
"""Convert a consented local M4A/WAV and render three mixes into a fresh folder.

Optional developer workflow: uses installed FFmpeg/ffprobe, never uploads audio.
The portable renderer itself continues to depend only on C++17.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import wave
from verify_export import verify_export


def remix_recording(source, output, renderer, consent=False, seed=4123):
    if not consent:
        raise ValueError('explicit consent is required before processing a recording')
    source, output, renderer = Path(source).resolve(), Path(output).absolute(), Path(renderer).resolve()
    if source.suffix.lower() not in ('.m4a', '.wav') or not source.is_file() or not 44 <= source.stat().st_size <= 32*1024*1024:
        raise ValueError('supply a local M4A/WAV no larger than 32 MiB')
    if not renderer.is_file() or not 0 <= seed <= 4294967295:
        raise ValueError('renderer missing or seed outside uint32 range')
    ffmpeg, ffprobe = shutil.which('ffmpeg'), shutil.which('ffprobe')
    if not ffmpeg or not ffprobe:
        raise ValueError('installed FFmpeg and ffprobe are required for this optional import workflow')
    # Explicit demuxer and local-only protocols avoid playlist/network inputs.
    demuxer = 'mov' if source.suffix.lower()=='.m4a' else 'wav'
    common = ['-v','error','-protocol_whitelist','file','-f',demuxer,'-i',str(source)]
    probe = subprocess.run([ffprobe,*common,'-select_streams','a','-show_streams','-show_format','-of','json'],
                           capture_output=True,text=True,check=True,timeout=20)
    metadata = json.loads(probe.stdout)
    streams = metadata.get('streams', [])
    if len(streams)!=1 or streams[0].get('channels') not in (1,2):
        raise ValueError('recording must contain one mono/stereo audio stream')
    duration = float(streams[0].get('duration',metadata.get('format',{}).get('duration',0)))
    rate = int(streams[0].get('sample_rate',0))
    if not math.isfinite(duration) or not 2 <= duration <= 5 or not 8000 <= rate <= 192000:
        raise ValueError('record a 2–5 second clip at 8–192 kHz; no silent trimming is applied')
    original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    output.parent.mkdir(parents=True,exist_ok=True)
    output.mkdir()  # Exclusive reservation; preserve even empty existing folders.
    temporary = output/'.source.partial.wav'
    try:
        subprocess.run([ffmpeg,'-nostdin','-n',*common,'-map','0:a:0','-t','5.001',
                        '-ar','48000','-ac','2','-c:a','pcm_s16le','-f','wav',str(temporary)],
                       capture_output=True,text=True,check=True,timeout=30)
        with wave.open(str(temporary)) as audio:
            if audio.getnchannels()!=2 or audio.getsampwidth()!=2 or audio.getframerate()!=48000 or not 96000 <= audio.getnframes() <= 240000:
                raise ValueError('decoded recording is outside the supported format/duration')
            frames = audio.getnframes()
        converted = output/'source.wav'
        temporary.rename(converted)
        if hashlib.sha256(source.read_bytes()).hexdigest()!=original_hash:
            raise ValueError('original changed during conversion; retry from a stable recording')
        provenance={'source_sha256':original_hash,'converted_sha256':hashlib.sha256(converted.read_bytes()).hexdigest(),
                    'consent_confirmed':True,'processing':'local','input_duration_seconds':duration,
                    'output_frames':frames,'sample_rate':48000,'channels':2,'seed':seed,
                    'ffmpeg':subprocess.check_output([ffmpeg,'-version'],text=True).splitlines()[0]}
        (output/'source-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
        run=subprocess.run([str(renderer),'--input',str(converted),'--consent','--style','all','--stems',
                            '--seed',str(seed),'--output',str(output/'remix')],capture_output=True,text=True,timeout=180)
        (output/'render.log').write_text(run.stdout+run.stderr)
        if run.returncode:
            raise ValueError('renderer did not complete; see render.log; original and converted source are retained')
        verify_export(output/'remix',('hiphop','reggae','experimental'))
        cards=''.join(f'<section><h2>{style.capitalize()}</h2><audio controls preload="metadata" src="remix.{style}.wav"></audio><p><a href="remix.{style}.wav" download>Save WAV</a></p></section>' for style in ('hiphop','reggae','experimental'))
        page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Djayvo · your recording</title><style>body{font:18px/1.5 system-ui;max-width:780px;margin:40px auto;padding:0 20px;background:#f4f1eb;color:#242c29}section{background:white;padding:20px;margin:18px 0;border-radius:12px}audio{width:100%}a{color:#175b46}</style>
<h1>Your recording, three mixes</h1><p>Listen for a recognizable voice, groove and natural instrument sound. Technical checks do not establish musical quality. Playback starts only when you press play.</p>'''+cards+'''<script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
        (output/'index.html').write_text(page)
        (output/'session.json').write_text(json.dumps({'status':'complete','input':'source-provenance.json','export':'remix.complete.json','listening':'NOT RUN'},indent=2)+'\n')
        return output/'index.html'
    finally:
        temporary.unlink(missing_ok=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,required=True)
    parser.add_argument('--output-directory',type=Path,required=True)
    parser.add_argument('--renderer',type=Path,default=Path('build-mac/djayvo_remix'))
    parser.add_argument('--consent',action='store_true')
    parser.add_argument('--seed',type=int,default=4123)
    args=parser.parse_args()
    try:
        page=remix_recording(args.input,args.output_directory,args.renderer,args.consent,args.seed)
    except (ValueError,OSError,subprocess.SubprocessError) as error:
        raise SystemExit('FAIL: '+str(error))
    print(f'PASS: complete local recording session: {page}')
    print('NOT RUN: human listening and musical quality')
