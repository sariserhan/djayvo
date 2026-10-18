from pathlib import Path
import subprocess
root=Path('/out/sustained-instruments-20261018/before');root.mkdir()
for style in ('reggae','experimental','club','hybrid'):
    for seed in (4123,4124):
        subprocess.run(['/work/guitar/build/djayvo_remix','--input','renders/voice-20261017-221411/source-pcm.wav',
            '--consent','--seed',str(seed),'--style',style,'--stems','--output',str(root/f'owner-{style}-{seed}')],check=True)
