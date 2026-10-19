"""Interleaved old/new offline CLI timings; validate exports and identical PCM."""
from pathlib import Path
import argparse
import hashlib
import json
import platform
import statistics
import subprocess
import sys

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root/'scripts'))
from verify_export import verify_export

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--before', type=Path, required=True)
parser.add_argument('--after', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=False)
rows = []
hashes = {}
for name, block in [('sparse', 512), ('dense', 512), ('echo', 512), ('dense', 113)]:
    trials = []
    expected = hashes.get(name)
    for repeat in range(3):
        for stage in (['before', 'after'] if repeat%2 == 0 else ['after', 'before']):
            renderer = getattr(args, stage).resolve()
            prefix = args.output/f'{name}-{block}-{repeat}-{stage}'
            command = [str(renderer), '--input', str(root/'renders/fixtures/synthetic-speech.wav'),
                       '--synthetic-fixture', '--style', 'hiphop', '--plan',
                       str(root/f'renders/active-vocals-20261019/plans/{name}.json'),
                       '--block-size', str(block), '--output', str(prefix)]
            result = json.loads(subprocess.check_output([sys.executable, str(root/'scripts/benchmark_render.py'),
                                                        '--worker', *command], text=True, timeout=200))
            verify_export(prefix)
            wav = Path(str(prefix)+'.hiphop.wav')
            sha = hashlib.sha256(wav.read_bytes()).hexdigest()
            if expected is None: expected = sha; hashes[name] = sha
            assert sha == expected, 'Timing run changed output audio'
            trials.append(dict(stage=stage, repeat=repeat, wav=str(wav), sha256=sha, **result))
    medians = {stage: statistics.median(t['wall_seconds'] for t in trials if t['stage'] == stage)
               for stage in ['before', 'after']}
    rows.append(dict(plan=name, block=block, trials=trials, median_seconds=medians,
                     observed_speedup=medians['before']/medians['after']))
report = {'status': 'PASS', 'system': platform.platform(), 'python': sys.version,
          'scope': 'Offline CLI import/planning/render/IO/hashing; 3 trials, alternating order, no warmup exclusion',
          'binary_sha256': {stage: hashlib.sha256(getattr(args,stage).read_bytes()).hexdigest() for stage in ['before','after']},
          'cases': rows, 'live_latency': 'NOT RUN', 'quality': 'NOT RUN'}
with (args.output/'benchmark.json').open('x') as f:
    json.dump(report, f, indent=2);f.write('\n')
print(json.dumps({row['plan']+'-'+str(row['block']): row['observed_speedup'] for row in rows}))
