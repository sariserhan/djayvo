"""Run from repo root: python3 docs/evidence/saved-mixes/measure.py > docs/evidence/saved-mixes/summary.json"""
import hashlib
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deck-effects'))
from measure import difference

folder = Path('docs/evidence/saved-mixes')
previous = json.loads(Path('docs/evidence/audio-resume/summary.json').read_text())
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def artifacts(log):
    name = next(line.removeprefix('Artifacts: ') for line in log.read_text().splitlines() if line.startswith('Artifacts: '))
    return Path(name)

result = {'protected_sha256': previous['protected_sha256'], 'sources': {}, 'runs': {}, 'waveforms': {},
          'physical_audio': 'NOT RUN', 'listening': 'NOT RUN', 'production': 'PARTIAL', 'r2': 'NOT RUN', 'resend': 'NOT RUN'}
for name, expected in result['protected_sha256'].items():
    assert digest(Path(name)) == expected, name
for name in ['dj.js', 'dj.html', 'dj.css', 'performance-session.js', 'library.js']:
    source = Path('apps/web') / name
    value = digest(source)
    assert value == digest(Path('dist/web') / name) == digest(Path('apps/site/public/studio') / name), name
    result['sources'][str(source)] = value
for log in sorted(folder.glob('*-session.log')) + sorted(folder.glob('*-dj.log')):
    name = log.stem
    root = artifacts(log)
    # Linux logs use container paths; retain a small mapping receipt with the host output root.
    if str(root).startswith('/work/'):
        root = Path(json.loads((folder / 'linux-artifacts.json').read_text())[name]) / root.name
    if root.is_absolute():
        root = root.relative_to(Path.cwd())
    report = root / 'report.json'
    if not report.exists():
        report = root / 'failure.json'
    data = json.loads(report.read_text())
    if report.name == 'failure.json':
        data['status'] = 'FAIL'
        data['error'] = data.get('error', data.get('message'))
    counts = {status: sum(check['status'] == status for check in data['checks']) for status in ['PASS', 'PARTIAL', 'FAIL', 'NOT RUN']}
    result['runs'][name] = {'status': data['status'], 'version': data.get('version'), 'checks': counts,
                            'receipt': str(report), 'sha256': digest(report), 'log_sha256': digest(log)}
    if 'error' in data:
        result['runs'][name]['error'] = data['error']
    browser, suite = name.split('-')[1:]
    baseline = Path(previous['runs'][f'mac-{browser}-{suite}']['receipt']).parent
    if suite == 'session' and data['status'] in ['PASS', 'PARTIAL']:
        timing = json.loads((root / 'timing.json').read_text())
        assert timing == json.loads((baseline / 'timing.json').read_text())
        assert data['continuity']['silent'] == data['continuity']['signalFrameGaps'] == 0
        result['runs'][name].update(timing=timing, continuity=data['continuity'], savedMix=data['savedMix'])
        fx = json.loads((root / 'performance-fx.json').read_text())
        old_fx = json.loads((baseline / 'performance-fx.json').read_text())
        frames = lambda rows: [[e['frame'], e['expectedFrame']] for row in rows if row.get('mode', '').startswith('echo-') for e in row['echoes']]
        assert frames(fx) == frames(old_fx)
        errors = [abs(a - b) for a, b in frames(fx)]
        assert max(errors) <= .5
        result['runs'][name]['max_echo_frame_error'] = max(errors)
    waves = {}
    for file in sorted(root.glob('*piano*.wav')):
        old = baseline / file.name
        assert old.exists(), str(old)
        delta = difference(file, old)
        assert delta == {'max_abs': 0, 'rms': 0}, str(file)
        assert digest(file) == digest(old), str(file)
        waves[file.name] = {**delta, 'sha256': digest(file)}
    result['waveforms'][name] = {'run': str(root), 'baseline': str(baseline), 'files': waves}
assert set(result['runs']) == {f'{platform}-{browser}-{suite}' for platform in ['mac', 'linux'] for browser in ['chromium', 'webkit'] for suite in ['dj', 'session']}
result['waveform_count'] = sum(len(row['files']) for row in result['waveforms'].values())
result['waveform_gate'] = 'PASS'
result['integrated'] = json.loads((folder / 'site-browser.json').read_text())
assert all(row['gate'] == 'PASS' for row in result['integrated'])
print(json.dumps(result, indent=2))
