"""Render the two prepared dense plans through the native validated import path."""
from pathlib import Path
import argparse
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--renderer', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[3]
for name in ['dense', 'echo']:
    subprocess.run([str(args.renderer.resolve()), '--input', str(root/'renders/fixtures/synthetic-speech.wav'),
                    '--synthetic-fixture', '--style', 'hiphop', '--plan',
                    str(root/f'renders/active-vocals-20261019/plans/{name}.json'), '--stems',
                    '--output', str(args.output/name)], check=True)
print('PASS: dense and echo plans validated, imported and rendered')
