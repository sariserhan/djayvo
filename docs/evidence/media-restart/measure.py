"""Summarize retained browser runs and compare PCM; run from repository root."""
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deck-effects'))
from measure import difference, pcm

evidence = Path('docs/evidence/media-restart')
def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def artifacts(name):
    line = (evidence / (name + '.log')).read_text().splitlines()[0]
    assert line.startswith('Artifacts: '), name
    root = Path(line.removeprefix('Artifacts: '))
    if str(root).startswith('/work/renders/'):
        return Path('renders/media-restart-20261019') / root.name
    return root.relative_to(Path.cwd())

result = {'protected_sha256': {}, 'probes': {}, 'studio': {}, 'waveforms': []}
for name, expected in json.loads((evidence / 'protected.json').read_text()).items():
    actual = digest(Path(name))
    assert actual == expected, name
    result['protected_sha256'][name] = actual

for name in ['linux-minimal-before', 'linux-minimal-route-corrected', 'linux-minimal-unrouted',
             'linux-native-loop', 'linux-fresh-source', 'linux-fresh-ready',
             'linux-minimal-chromium', 'mac-minimal-webkit', 'linux-minimal-clean']:
    file = artifacts(name) / 'result.json'
    data = json.loads(file.read_text())
    row = {key: data[key] for key in ['status', 'browser', 'version', 'runner', 'probe_sha256'] if key in data}
    row.update(receipt=str(file), sha256=digest(file), cases=[])
    for case in data['cases']:
        final = case['final']
        row['cases'].append({**{key: value for key, value in case.items() if key != 'final'},
            'final': {key: value for key, value in final.items() if key != 'events'},
            'last_events': final.get('events', [])[-8:]})
    result['probes'][name] = row
for name in ['linux-minimal-chromium', 'mac-minimal-webkit']:
    assert result['probes'][name]['status'] == 'PASS'
    assert all(case['iterations'] == 15 for case in result['probes'][name]['cases'])

finals = ['mac-chromium', 'mac-webkit-final', 'linux-chromium-after', 'linux-webkit-after']
for name in ['linux-dj-before', 'mac-webkit', *finals]:
    root = artifacts(name)
    file = root / 'report.json'
    if not file.exists():
        file = root / 'failure.json'
    data = json.loads(file.read_text())
    row = {key: data[key] for key in ['status', 'version', 'message', 'state', 'checks', 'errors', 'warnings'] if key in data}
    row.update(status=data.get('status', 'FAIL'), receipt=str(file), sha256=digest(file))
    if data.get('status') == 'PASS':
        assert len(data['checks']) == 42
        assert not data['errors']
        echoes = [echo for group in [data['fxEvidence'], *data['deckFXEvidence']]
                  for case in group if case.get('mode', '').startswith('echo-') for echo in case['echoes']]
        assert echoes
        row['echo_frames'] = [[echo['expectedFrame'], echo['frame']] for echo in echoes]
        row['max_echo_frame_error'] = max(abs(a-b) for a, b in row['echo_frames'])
        assert row['max_echo_frame_error'] <= 1
    result['studio'][name] = row
    if name not in finals:
        continue
    baseline = Path('renders') / ('dj-webkit-wXU65G' if 'webkit' in name else 'dj-chromium-rXzvBo')
    waves = {}
    for prefix in ['', 'deck-a-', 'deck-b-']:
        for mode in ['dry', 'echo']:
            wav = f'{prefix}piano-{mode}.wav'
            file, old = root / wav, baseline / wav
            delta = difference(file, old)
            assert delta == {'max_abs': 0, 'rms': 0}, str(file)
            assert file.read_bytes() == old.read_bytes(), str(file)
            waves[wav] = {**delta, 'sha256': digest(file), 'baseline_sha256': digest(old),
                          'frames': len(pcm(file)) // 2, 'byte_identical': True}
    result['waveforms'].append({'run': str(root), 'baseline': str(baseline), 'files': waves})
for name in finals[:3]:
    assert result['studio'][name]['status'] == 'PASS'
result['waveform_gate'] = 'PASS'
result['waveform_count'] = sum(len(row['files']) for row in result['waveforms'])
assert result['waveform_count'] == 24
print(json.dumps(result, indent=2))
