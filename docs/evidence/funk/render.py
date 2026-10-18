"""Fresh funk listening material; does not overwrite existing recordings."""
from pathlib import Path
import subprocess

root = Path('renders/funk-20261018')
root.mkdir()
for seed in range(4123, 4127):
    subprocess.run(['build-mac/djayvo_remix', '--input', 'renders/voice-20261017-221411/source-pcm.wav',
        '--consent', '--seed', str(seed), '--style', 'funk', '--stems', '--output', str(root/f'owner-{seed}')], check=True)
for style in ('all', 'club', 'funk', 'baseline'):
    subprocess.run(['build-mac/djayvo_remix', '--input', 'renders/fixtures/synthetic-speech.wav',
        '--synthetic-fixture', '--style', style, '--stems', '--output', str(root/('fixture' if style=='all' else style))], check=True)
