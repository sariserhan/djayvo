"""Compare Linux browser PCM and event frames with retained Apple M5 baselines."""
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deck-effects'))
from measure import difference, pcm

assert len(sys.argv) == 5, 'Usage: compare.py LINUX_SESSION_CHROMIUM LINUX_SESSION_WEBKIT LINUX_DJ_CHROMIUM LINUX_DJ_WEBKIT'
roots = [Path(value) for value in sys.argv[1:]]
mac = [Path('renders') / name for name in ['session-chromium-RoEJcn', 'session-webkit-8s6EQa', 'dj-chromium-rXzvBo', 'dj-webkit-wXU65G']]
result = {'gate': 'PASS', 'scope': 'Linux ARM64 VM versus Apple M5; same DSP, 48 kHz offline PCM',
          'limits': {'max_abs': .001, 'rms': .0001}, 'runs': [], 'protected_inputs': {}}
for name, expected in json.loads(Path('docs/evidence/beat-echo/summary.json').read_text())['protected_sha256'].items():
    actual = hashlib.sha256(Path(name).read_bytes()).hexdigest()
    assert actual == expected, name
    result['protected_inputs'][name] = actual
for index, (linux, baseline) in enumerate(zip(roots, mac)):
    receipt = linux / 'report.json'
    if not receipt.exists():
        receipt = linux / 'failure.json'
    report = json.loads(receipt.read_text())
    browser = ['chromium', 'webkit'][index % 2]
    assert linux.name.startswith(('session-' if index < 2 else 'dj-') + browser + '-')
    assert report.get('browser', browser) == browser
    status = report.get('status', 'FAIL')
    assert status in ['PASS', 'PARTIAL', 'FAIL']
    if status == 'FAIL':
        assert index >= 2 and any(c['name'].startswith('both deck strips:') and c['status'] == 'PASS' for c in report['checks']), 'Offline PCM checks must have completed before a later control failure'
    assert not any(check['status'] == 'FAIL' for check in report['checks'])
    assert not report['errors']
    item = {'linux': str(linux), 'mac': str(baseline), 'linux_suite_status': status, 'receipt': str(receipt), 'waves': {}}
    if index < 2:
        timing = json.loads((linux / 'timing.json').read_text())
        assert timing == json.loads((baseline / 'timing.json').read_text())
        item['event_frames'] = {'status': 'PASS', 'timing': timing}
        names = [f'deck-c-piano-{mode}.wav' for mode in ['dry', 'echo', 'eighth', 'dotted', 'triplet']]
    else:
        names = [f'{prefix}piano-{mode}.wav' for prefix in ['', 'deck-a-', 'deck-b-'] for mode in ['dry', 'echo']]
    for name in names:
        file, old = linux / name, baseline / name
        delta = difference(file, old)
        passed = all(delta[key] <= limit for key, limit in result['limits'].items())
        if not passed:
            result['gate'] = 'FAIL'
        item['waves'][name] = {'status': 'PASS' if passed else 'FAIL', **delta,
            'byte_identical': file.read_bytes() == old.read_bytes(),
            'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
            'baseline_sha256': hashlib.sha256(old.read_bytes()).hexdigest(), 'frames': len(pcm(file)) // 2}
    result['runs'].append(item)
print(json.dumps(result, indent=2))
assert result['gate'] == 'PASS', 'Waveform difference exceeds the declared portability bounds'
