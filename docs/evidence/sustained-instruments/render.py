"""Fresh owner material and fixture renders; keep all historical recordings intact."""
from pathlib import Path
import subprocess
root=Path('renders/sustained-instruments-20261018');root.mkdir()
for style in ('reggae','experimental','club','hybrid'):
    for seed in (4123,4124):
        subprocess.run(['build-mac/djayvo_remix','--input','renders/voice-20261017-221411/source-pcm.wav',
            '--consent','--seed',str(seed),'--style',style,'--stems','--output',str(root/f'owner-{style}-{seed}')],check=True)
for style in ('all','club','funk','baseline','call_response','hybrid'):
    subprocess.run(['build-mac/djayvo_remix','--input','renders/fixtures/synthetic-speech.wav','--synthetic-fixture',
        '--style',style,'--stems','--output',str(root/('fixture' if style=='all' else style))],check=True)
for style in ('hiphop','reggae','experimental','club','funk','baseline','call_response','hybrid'):
    old=Path('renders/guitar-20261018')/('fixture' if style in ('hiphop','reggae','experimental') else style)
    subprocess.run(['build-mac/djayvo_remix','--input','renders/fixtures/synthetic-speech.wav','--synthetic-fixture',
        '--style',style,'--stems','--plan',str(old)+f'.{style}.score.json','--output',str(root/f'replay-{style}')],check=True)
