"""Render or replay the six saved controls; CLI rejects existing output paths."""
from pathlib import Path
import argparse
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--renderer', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--plans', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[3]
for kind, style in [('short', 'experimental'), ('long', 'club')]:
    for name in ['flat', 'positive', 'negative']:
        stem = f'{kind}-{name}'
        command = [str(args.renderer.resolve()), '--input',
                   str(root/f'renders/chop-offset-20261019/controls/{stem}.wav'),
                   '--synthetic-fixture', '--style', style, '--seed', '4123',
                   '--stems', '--output', str(args.output/stem)]
        if args.plans:
            command += ['--plan', str(args.plans/f'{stem}.{style}.score.json')]
        subprocess.run(command, check=True)
print('PASS: six complete exports; synthetic technical controls, not speech or listening evidence')
