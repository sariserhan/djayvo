"""Compare unchanged transport timing and C effect waveforms with beat-echo."""
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deck-effects'))
from measure import difference

assert len(sys.argv) == 3, 'Usage: compare.py CHROMIUM_SESSION WEBKIT_SESSION'
previous = json.loads(Path('docs/evidence/beat-echo/summary.json').read_text())
result = {'gate': 'PASS', 'browsers': {}, 'protected_inputs': {}}
for name, expected in previous['protected_sha256'].items():
    actual = hashlib.sha256(Path(name).read_bytes()).hexdigest()
    assert actual == expected, name
    result['protected_inputs'][name] = actual
for directory, browser in zip(sys.argv[1:], ['chromium', 'webkit']):
    root = Path(directory)
    report = json.loads((root / 'report.json').read_text())
    assert report['status'] == 'PASS' and report['browser'] == browser
    old = Path(previous['browser'][f'session-{browser}']['artifacts'])
    timing = json.loads((root / 'timing.json').read_text())
    assert timing == json.loads((old / 'timing.json').read_text())
    waves = {}
    for mode in ['dry', 'echo', 'eighth', 'dotted', 'triplet']:
        file = root / f'deck-c-piano-{mode}.wav'
        baseline = old / file.name
        assert file.read_bytes() == baseline.read_bytes(), str(file)
        waves[mode] = {'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
                       'difference': difference(file, baseline)}
    result['browsers'][browser] = {'artifacts': str(root), 'timing': timing, 'waves': waves}
print(json.dumps(result, indent=2))
