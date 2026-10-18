"""Fresh private audition and portability material, never overwrite a recording."""
from pathlib import Path
import subprocess
root=Path('renders/creative-strategies-20261018');root.mkdir()
for style in ('call_response','hybrid'):
    for seed in range(4123,4127):
        subprocess.run(['build-mac/djayvo_remix','--input','renders/voice-20261017-221411/source-pcm.wav',
            '--consent','--seed',str(seed),'--style',style,'--stems','--output',str(root/f'owner-{style}-{seed}')],check=True)
for style in ('all','club','funk','baseline','call_response','hybrid'):
    subprocess.run(['build-mac/djayvo_remix','--input','renders/fixtures/synthetic-speech.wav',
        '--synthetic-fixture','--style',style,'--stems','--output',str(root/('fixture' if style=='all' else style))],check=True)
