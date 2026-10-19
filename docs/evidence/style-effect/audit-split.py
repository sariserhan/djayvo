"""Read-only Blood Club split audit; no checkpoint selection or fitting."""
import argparse
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
import check_style_overlap as overlap

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
if args.output.exists():
    parser.error('Preserve existing evidence; choose a fresh output path')
started = time.monotonic()
controls = overlap.calibration()
root = ROOT / 'renders/blood-training-20261019'
prepared = json.loads((root / 'preparation.json').read_text())
clips = prepared['clips']
train = [row for row in clips if row['split'] == 'train']
holdout = [row for row in clips if row['split'] != 'train']
assert len(clips) == 20 and len(train) == 16 and len(holdout) == 4
assert {row['file'] for row in train} == {f'blood-{i:02d}.wav' for i in range(1, 17)}
assert {row['file'] for row in holdout} == {f'blood-{i:02d}.wav' for i in range(18, 22)}
assert all(row['source_id'] == 'blood_club' for row in clips)
assert len({row['session_group'] for row in clips}) == 1
signals, hashes = {}, {}
for group, folder in ((train, 'train-input'), (holdout, 'same-session-holdout')):
    for row in group:
        path = root / folder / row['file']
        signals[row['file']] = overlap.decode(path, row['sha256'])
        hashes[path] = row['sha256']
pairs = []
for query in holdout:
    for target in train:
        pairs.append({'query': query['file'], 'target': target['file'],
                      'query_source_start_seconds': query['start_seconds'],
                      'target_source_start_seconds': target['start_seconds'],
                      **overlap.scan(signals[query['file']], signals[target['file']])})
assert all(overlap.digest(path) == sha for path, sha in hashes.items())
report = {'diagnostic_execution': 'PASS', 'source_preservation': 'PASS', 'calibration': controls,
          'independent_session_split': 'FAIL: all clips share one declared source group; independence is not established',
          'independent_generalization': 'NOT RUN', 'human_listening': 'NOT RUN',
          'checkpoint_selection_or_training': 'NOT RUN', 'pairs': pairs,
          'input_sha256': {str(p.relative_to(ROOT)): h for p, h in hashes.items()},
          'method': {'rate': overlap.RATE, 'window_seconds': overlap.WINDOW / overlap.RATE,
                     'query_hop_seconds': overlap.HOP / overlap.RATE, 'threshold': overlap.THRESHOLD,
                     'limitations': 'Fixed-rate mono waveform matching cannot establish independence or absence of transformed/melodic reuse.'},
          'script_sha256': overlap.digest(Path(__file__)),
          'elapsed_seconds': time.monotonic() - started}
with args.output.open('x') as stream:
    stream.write(json.dumps(report, indent=2, allow_nan=False) + '\n')
print(json.dumps({'pairs': len(pairs), 'flagged_windows': sum(len(row['flagged_windows']) for row in pairs),
                  'maximum_correlation': max(row['strongest']['correlation'] for row in pairs)}, indent=2))
