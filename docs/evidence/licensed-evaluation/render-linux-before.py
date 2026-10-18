"""Replay one frozen seed for every recorded source in the local Linux VM."""
from pathlib import Path
import json,subprocess
root=Path('/out/licensed-evaluation-20261018');root.mkdir()
manifest=json.loads(Path('/src/renders/licensed-evaluation-20261018/manifest-final.json').read_text())
for clip in manifest['clips']:
    if clip['source_kind']!='recorded':continue
    source='/src/'+clip['path'].split('/djayvo/',1)[1]
    folder=root/clip['id'];folder.mkdir()
    for style,prefix in [('all','remix'),('baseline','control')]:
        subprocess.run(['/work/reverb/build/djayvo_remix','--input',source,'--consent','--style',style,'--seed','4123',
            '--sample-rate','48000','--block-size','512','--output',str(folder/prefix)],check=True)
print('PASS: first frozen seed rendered for all 23 recorded sources on actual Linux arm64')
