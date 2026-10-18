"""Fresh local timeline comparisons; run from the repository root."""
import copy
import json
from pathlib import Path
import subprocess

root = Path('renders/timeline-20261018')
root.mkdir()
base = json.loads(Path('renders/hiphop-diversity-20261018/after-4123.hiphop.score.json').read_text())
source = 'renders/voice-20261017-221411/source-pcm.wav'
for name in ('control', 'tempo', 'mix', 'combined'):
    plan = copy.deepcopy(base)
    if name != 'control':
        plan['schema_version'] = '1.3-remix'
    if name in ('tempo', 'combined'):
        plan['tempo_changes'] = [{'start_tick': 30720, 'tempo_milli_bpm': 108000},
                                 {'start_tick': 38400, 'tempo_milli_bpm': 84000}]
    if name in ('mix', 'combined'):
        for track in plan['tracks']:
            gain, pan = track['gain_db'], track['pan']
            track['automation'] = [{'start_tick': tick, 'gain_db': level, 'pan': position}
                for tick, level, position in [(0, gain, pan), (15360, gain, pan),
                    (23040, gain-8, -pan), (30720, gain, pan),
                    (38400, gain, -pan), (46080, gain-18, 0)]]
    candidate = root / f'{name}.candidate.json'
    candidate.write_text(json.dumps(plan, indent=2)+'\n')
    subprocess.run(['build-mac/djayvo_remix', '--input', source, '--consent', '--seed', '4123',
        '--style', 'hiphop', '--stems', '--plan', str(candidate), '--output', str(root/name)], check=True)
for name, style in [('fixture', 'all'), ('club', 'club')]:
    subprocess.run(['build-mac/djayvo_remix', '--input', 'renders/fixtures/synthetic-speech.wav',
        '--synthetic-fixture', '--style', style, '--stems', '--output', str(root/name)], check=True)
