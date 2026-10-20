"""From repo root: python3 docs/evidence/media-readiness/measure.py > docs/evidence/media-readiness/summary.json"""
import hashlib
import json
import re
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deck-effects'))
from measure import difference

folder = Path('docs/evidence/media-readiness')
previous = json.loads(Path('docs/evidence/saved-mixes/summary.json').read_text())
environment = json.loads((folder / 'environment.json').read_text())
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def frames(report):
    return [[e['frame'], e['expectedFrame']]
            for group in [report['fxEvidence'], *report['deckFXEvidence']]
            for row in group if row.get('mode', '').startswith('echo-') or row.get('mode') == 'transition'
            for e in row['echoes']]

result = {'protected_sha256': previous['protected_sha256'], 'sources': {}, 'runs': {},
          'waveforms': {}, 'physical_audio': 'NOT RUN', 'listening': 'NOT RUN',
          'prepared_session_rerun': 'NOT RUN', 'production': 'PARTIAL',
          'r2': 'NOT RUN', 'resend': 'NOT RUN', 'deployment': 'NOT RUN'}
result['unit_tests'] = {}
for name, expected in [('unit-mac', 44), ('unit-linux', 44), ('site-unit', 7)]:
    log = folder / f'{name}.log'
    for metric, count in [('tests', expected), ('pass', expected), ('fail', 0)]:
        match = re.search(rf'^[#ℹ] {metric} (\d+)$', log.read_text(), re.MULTILINE)
        assert match and int(match[1]) == count, (name, metric)
    result['unit_tests'][name] = {'status': 'PASS', 'passed': expected, 'log_sha256': digest(log)}
for name, expected in result['protected_sha256'].items():
    assert digest(Path(name)) == expected, name
for name in ['deck-controls.js', 'dj.js', 'mixer.js']:
    source = Path('apps/web') / name
    value = digest(source)
    assert value == digest(Path('dist/web') / name) == digest(Path('apps/site/public/studio') / name)
    result['sources'][str(source)] = value
for platform in ['mac', 'linux']:
    for browser in ['chromium', 'webkit']:
        name = f'{platform}-{browser}'
        log = folder / f'{name}.log'
        root = Path(next(line.removeprefix('Artifacts: ') for line in log.read_text().splitlines() if line.startswith('Artifacts: ')))
        if platform == 'linux':
            root = Path(environment['linux_artifacts']) / root.name
        elif root.is_absolute():
            root = root.relative_to(Path.cwd())
        receipt = root / 'report.json'
        data = json.loads(receipt.read_text())
        assert data['status'] == 'PASS' and len(data['checks']) == 47
        assert all(row['status'] == 'PASS' for row in data['checks'])
        baseline = Path(previous['runs'][f'mac-{browser}-dj']['receipt']).parent
        assert frames(data) == frames(json.loads((baseline / 'report.json').read_text()))
        result['runs'][name] = {'status': 'PASS', 'checks': 47, 'version': data['version'],
                               'receipt': str(receipt), 'sha256': digest(receipt), 'log_sha256': digest(log),
                               'echo_frames': frames(data), 'console_errors': data['errors'],
                               'screenshot_csp_warnings': len(data['warnings'])}
        waves = {}
        for file in sorted(root.glob('*piano*.wav')):
            old = baseline / file.name
            delta = difference(file, old)
            assert delta == {'max_abs': 0, 'rms': 0} and digest(file) == digest(old), str(file)
            waves[file.name] = {**delta, 'sha256': digest(file)}
        assert len(waves) == 6
        result['waveforms'][name] = {'run': str(root), 'baseline': str(baseline), 'files': waves}
result['waveform_count'] = 24
result['waveform_gate'] = result['echo_frame_gate'] = 'PASS'
print(json.dumps(result, indent=2))
