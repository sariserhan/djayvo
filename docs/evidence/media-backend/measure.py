"""Summarize retained experiments and verify unchanged final studio PCM."""
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deck-effects'))
from measure import difference, pcm

evidence = Path('docs/evidence/media-backend')
def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def artifacts(log):
    line = next((line for line in log.read_text().splitlines() if line.startswith('Artifacts: ')), None)
    if not line:
        return None
    root = Path(line.removeprefix('Artifacts: '))
    return Path('renders/media-backend-20261019') / root.name if str(root).startswith('/work/') else root.relative_to(Path.cwd())

result = {'protected_sha256': {}, 'runs': {}, 'waveforms': {}, 'source_sha256': {}}
for name, expected in json.loads(Path('docs/evidence/media-restart/protected.json').read_text()).items():
    assert digest(Path(name)) == expected, name
    result['protected_sha256'][name] = expected
for name in ['apps/web/dj.html', 'apps/web/dj.js', 'apps/web/deck-controls.js',
             'apps/web/tests/dj.mjs', 'apps/web/tests/media-restart.mjs', 'apps/web/tests/deck-rate.test.js',
             'apps/web/tests/session.mjs']:
    result['source_sha256'][name] = digest(Path(name))
bundle = json.loads((evidence / 'bundle-audit-delivery.json').read_text())['files']
for name in ['dj.html', 'dj.js', 'deck-controls.js']:
    assert digest(Path('apps/web') / name) == bundle[name], name
for log in sorted(evidence.glob('*.log')):
    root = artifacts(log)
    if not root:
        continue
    file = next((root / name for name in ['result.json', 'report.json', 'failure.json'] if (root / name).exists()), None)
    if file is None:
        result['runs'][log.stem] = {'status': 'PARTIAL', 'log': str(log), 'sha256': digest(log),
                                  'note': 'Interrupted diagnostic without a completed receipt; see interruption note.'}
        continue
    data = json.loads(file.read_text())
    row = {key: data[key] for key in ['browser', 'version', 'preload', 'runner', 'probe_sha256', 'message', 'error', 'state', 'errors', 'warnings',
                                    'recordingAvailable', 'continuity', 'generationSeconds', 'heardA'] if key in data}
    row.update(status=data.get('status', 'PARTIAL' if 'cases' in data else 'FAIL'), receipt=str(file), sha256=digest(file))
    if 'cases' in data:
        row['cases'] = [{key: value for key, value in case.items() if key != 'final'} |
                        {'final': {key: value for key, value in case.get('final', {}).items() if key != 'events'}} for case in data['cases']]
    if log.stem == 'natural':
        row.update(status='FAIL', reported_status=data['status'],
                   note='Invalid cycle accounting: 1266 EOF callbacks for 15 requested cycles. Not valid natural-loop evidence.')
    if 'checks' in data:
        row['checks'] = data['checks']
    if data.get('status') == 'PASS' and 'fxEvidence' in data:
        frames = [[echo['expectedFrame'], echo['frame']] for group in [data['fxEvidence'], *data['deckFXEvidence']]
                  for case in group if case.get('mode', '').startswith('echo-') for echo in case['echoes']]
        assert frames
        row['echo_frames'] = frames
        row['max_echo_frame_error'] = max(abs(a-b) for a, b in frames)
        assert row['max_echo_frame_error'] == 0
    result['runs'][log.stem] = row

for name in ['mac-chromium-delivery', 'mac-webkit-delivery', 'linux-chromium-delivery', 'linux-webkit-delivery',
             'session-chromium-isolated', 'session-webkit']:
    root = artifacts(evidence / (name + '.log'))
    assert result['runs'][name]['status'] == 'PASS', name
    session = name.startswith('session-')
    if session:
        assert len(result['runs'][name]['checks']) == 29
        baseline = Path('renders') / ('session-webkit-8s6EQa' if 'webkit' in name else 'session-chromium-RoEJcn')
        timing = json.loads((root / 'timing.json').read_text())
        assert timing == json.loads((baseline / 'timing.json').read_text())
        result['runs'][name]['prepared_timing'] = timing
        names = [f'deck-c-piano-{mode}.wav' for mode in ['dry', 'echo', 'eighth', 'dotted', 'triplet']]
    else:
        assert len(result['runs'][name]['checks']) == 43
        baseline = Path('renders') / ('dj-webkit-wXU65G' if 'webkit' in name else 'dj-chromium-rXzvBo')
        names = [f'{prefix}piano-{mode}.wav' for prefix in ['', 'deck-a-', 'deck-b-'] for mode in ['dry', 'echo']]
    waves = {}
    for filename in names:
        file, old = root / filename, baseline / filename
        delta = difference(file, old)
        assert delta == {'max_abs': 0, 'rms': 0}, str(file)
        assert file.read_bytes() == old.read_bytes(), str(file)
        waves[filename] = {**delta, 'sha256': digest(file), 'baseline_sha256': digest(old),
                           'frames': len(pcm(file)) // 2, 'byte_identical': True}
    result['waveforms'][name] = {'run': str(root), 'baseline': str(baseline), 'files': waves}
result['waveform_gate'] = 'PASS'
result['waveform_count'] = sum(len(row['files']) for row in result['waveforms'].values())
assert result['waveform_count'] == 34
print(json.dumps(result, indent=2))
