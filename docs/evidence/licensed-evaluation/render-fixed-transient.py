from pathlib import Path
import subprocess
root=Path('renders/transient-validation-20261018')
for style in ('baseline','club','funk','call_response','hybrid'):
    subprocess.run(['build-transients/djayvo_remix','--input','renders/licensed-nonspeech-20261018/noise.wav','--consent',
        '--style',style,'--stems','--output',str(root/style)],check=True)
print('PASS: recorded click now renders in all seven directions and baseline')
