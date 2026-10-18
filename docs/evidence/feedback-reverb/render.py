"""Optional reverb plans and matched dry controls, in an exclusive new directory."""
from pathlib import Path
import json,subprocess
root=Path('renders/feedback-reverb-20261018');root.mkdir()
for style in ('hiphop','reggae','experimental','club'):
    source=Path('renders/voice-20261017-221411/source-pcm.wav')
    # Generate the owner's exact dry control first to retain provenance and the same tail.
    subprocess.run(['build-mac/djayvo_remix','--input',str(source),'--consent','--style',style,'--output',str(root/f'rules-{style}')],check=True)
    plan=json.loads((root/f'rules-{style}.{style}.score.json').read_text());plan['tail_ms']=3000
    for mode in ('dry','wet'):
        if mode=='wet':plan['schema_version']='1.6-remix';plan['mix']['instrument_reverb_mix']=.18
        path=root/f'{style}-{mode}.json';path.write_text(json.dumps(plan,indent=2)+'\n')
        subprocess.run(['build-mac/djayvo_remix','--input',str(source),'--consent','--style',style,'--stems',
            '--plan',str(path),'--output',str(root/f'{style}-{mode}')],check=True)
for style in ('all','club','funk','baseline','call_response','hybrid'):
    subprocess.run(['build-mac/djayvo_remix','--input','renders/fixtures/synthetic-speech.wav','--synthetic-fixture',
        '--style',style,'--stems','--output',str(root/('fixture' if style=='all' else style))],check=True)
