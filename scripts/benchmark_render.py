#!/usr/bin/env python3
"""Measure offline render wall time and child-process peak RSS; not a live/device gate."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import resource
import statistics
import subprocess
import sys
import tempfile
import time
import wave
from make_fixture import make_signal
from verify_export import verify_export


def measure(command):
    start=time.perf_counter()
    result=subprocess.run(command,capture_output=True,text=True,timeout=180)
    wall=time.perf_counter()-start
    if result.returncode:
        raise RuntimeError(result.stderr)
    usage=resource.getrusage(resource.RUSAGE_CHILDREN)
    if platform.system() not in ('Darwin','Linux'):
        raise ValueError('RSS units are only defined here for Darwin/Linux')
    return {'wall_seconds':wall,'cpu_seconds':usage.ru_utime+usage.ru_stime,
            'peak_rss_bytes':int(usage.ru_maxrss*(1 if platform.system()=='Darwin' else 1024))}


def main():
    if len(sys.argv)>1 and sys.argv[1]=='--worker':
        print(json.dumps(measure(sys.argv[2:])))
        return
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--renderer',type=Path,required=True)
    parser.add_argument('--voice',type=Path,required=True,help='previously consented PCM WAV for this local benchmark')
    parser.add_argument('--consent',action='store_true')
    parser.add_argument('--report',type=Path,required=True)
    args=parser.parse_args()
    if not args.consent:parser.error('confirm consent for --voice')
    if args.report.exists():parser.error('report exists; preserve evidence and choose a new path')
    rows=[]
    with tempfile.TemporaryDirectory(prefix='jamloom-benchmark-') as folder:
        root=Path(folder);base=root/'base.wav';make_signal(base)
        with wave.open(str(base)) as audio:
            rate=audio.getframerate();raw=audio.readframes(audio.getnframes());params=audio.getparams()
        sources={'owner':args.voice.resolve()}
        for seconds in (2,5):
            path=root/f'signal-{seconds}.wav';sources[f'signal-{seconds}']=path
            with wave.open(str(path),'wb') as audio:
                audio.setparams(params);audio.writeframes((raw*2)[:rate*seconds*params.nchannels*params.sampwidth])
        cases=[(name,style,48000,512,False) for name in sources for style in ('hiphop','reggae','experimental')]
        cases += [('owner','experimental',192000,113,False),('owner','all',48000,512,True)]
        for index,(name,style,rate,block,stems) in enumerate(cases):
            trials=[]
            for repeat in range(3):
                prefix=root/f'case-{index}-{repeat}'
                command=[str(args.renderer.resolve()),'--input',str(sources[name]),'--consent' if name=='owner' else '--synthetic-fixture',
                         '--output',str(prefix),'--style',style,'--sample-rate',str(rate),'--block-size',str(block)]
                if stems:command.append('--stems')
                # Fresh Python worker ensures rusage contains only this one renderer child.
                trial=json.loads(subprocess.check_output([sys.executable,__file__,'--worker',*command],text=True,timeout=200))
                record=verify_export(prefix)
                seconds=0
                for item in record['artifacts']:
                    if item['suffix'].count('.')==2 and item['suffix'].endswith('.wav'):
                        with wave.open(str(prefix)+item['suffix']) as audio:seconds+=audio.getnframes()/audio.getframerate()
                    Path(str(prefix)+item['suffix']).unlink()
                Path(str(prefix)+'.complete.json').unlink()
                assert trial['wall_seconds']>0 and trial['peak_rss_bytes']>0 and seconds>0
                trial['master_audio_seconds']=seconds;trial['audio_seconds_per_wall_second']=seconds/trial['wall_seconds']
                trials.append(trial)
            rows.append({'source':name,'source_sha256':hashlib.sha256(sources[name].read_bytes()).hexdigest(),
                         'style':style,'sample_rate':rate,'block_size':block,'stems':stems,'trials':trials,
                         'median_wall_seconds':statistics.median(x['wall_seconds'] for x in trials),
                         'maximum_peak_rss_bytes':max(x['peak_rss_bytes'] for x in trials)})
    assert len(rows)==11 and sum(len(x['trials']) for x in rows)==33
    report={'status':'PASS','scope':'offline CLI including import/planning/render/I/O/completion hashing; three repetitions; no warmup exclusion',
            'system':platform.platform(),'python':sys.version,'renderer_sha256':hashlib.sha256(args.renderer.read_bytes()).hexdigest(),
            'live_device_performance':'NOT RUN','quality':'NOT RUN','cases':rows}
    args.report.parent.mkdir(parents=True,exist_ok=True)
    with args.report.open('x') as file:json.dump(report,file,indent=2);file.write('\n')
    print('PASS: 33 complete, hash-verified offline renders; live/device and musical quality NOT RUN')


if __name__=='__main__':main()
