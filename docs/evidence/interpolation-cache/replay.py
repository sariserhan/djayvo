"""Replay retained, previously consented scores and require exact existing audio."""
import hashlib
import json
import pathlib
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parents[3]
renderer, output = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve()
output.mkdir(parents=True, exist_ok=False)
baseline = root / 'renders/active-vocals-20261019/after'
sys.path.insert(0, str(root / 'scripts'))
from verify_export import verify_export
rows = []
for score in sorted(baseline.glob('*.score.json')):
    plan = json.loads(score.read_text())
    old = score.name.removesuffix('.score.json')
    source = root / ('renders/fixtures/synthetic-speech.wav' if plan['source']['kind'] == 'synthetic'
                     else 'renders/voice-20261017-221411/source-pcm.wav')
    assert hashlib.sha256(source.read_bytes()).hexdigest() == plan['source']['sha256']
    prefix = output / old.replace('.', '-')
    subprocess.run([str(renderer), '--input', str(source), '--synthetic-fixture' if plan['source']['kind'] == 'synthetic' else '--consent',
                    '--plan', str(score), '--seed', str(plan['seed']), '--style', plan['strategy'], '--stems',
                    '--output', str(prefix)], check=True)
    verify_export(prefix)
    name = f'{prefix.name}.{plan["strategy"]}'
    assert json.loads((output / f'{name}.score.json').read_text()) == plan
    assert (output / f'{name}.events.tsv').read_bytes() == (baseline / f'{old}.events.tsv').read_bytes()
    hashes = {}
    for wav in baseline.glob(f'{old}*.wav'):
        candidate = output / (name + wav.name[len(old):])
        assert candidate.read_bytes() == wav.read_bytes(), str(candidate)
        hashes[wav.name] = hashlib.sha256(candidate.read_bytes()).hexdigest()
    assert hashes
    rows.append({'plan': old, 'event_frames': 'PASS', 'pcm': 'PASS', 'wav_sha256': hashes})
assert len(rows) == 14
with (output / 'comparison.json').open('x') as file:
    json.dump({'status': 'PASS', 'plans': rows, 'wavs': sum(len(row['wav_sha256']) for row in rows),
               'maximum_pcm_difference': 0, 'rms_pcm_difference': 0, 'listening': 'NOT RUN'}, file, indent=2)
print('PASS 14 saved scores, unchanged event frames and all master/stem WAVs')
