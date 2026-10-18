#!/usr/bin/env python3
"""Snapshot recipe: fresh private exports only; existing prefixes are preserved."""
from pathlib import Path
import json
import subprocess
import time

root=Path('renders/voice-club-v7/final')
source='renders/voice-20261017-221411/source-pcm.wav'
runs=[]
for name,input_file,permission,style,seed,block,stems in [
    ('remix',source,'--consent','club',4123,512,True),
    ('seed4124',source,'--consent','club',4124,512,False),
    ('seed4125',source,'--consent','club',4125,512,False),
    ('block113',source,'--consent','club',4123,113,True),
    ('fixture','renders/fixtures/synthetic-speech.wav','--synthetic-fixture','club',4123,512,True),
    ('legacy',source,'--consent','all',4123,512,True),
]:
    command=['build-mac/djayvo_remix','--input',input_file,permission,'--style',style,
             '--seed',str(seed),'--block-size',str(block),'--output',str(root/name)]
    if stems:command.append('--stems')
    start=time.monotonic();result=subprocess.run(command,capture_output=True,text=True,check=True)
    runs.append({'command':command,'seconds':time.monotonic()-start,'stdout':result.stdout,'stderr':result.stderr})
Path('docs/evidence/club-direction/native-renders.json').write_text(json.dumps(runs,indent=2)+'\n')
print('PASS: three original club mixes, stems, block repeat, supplied fixture and legacy regression renders')
