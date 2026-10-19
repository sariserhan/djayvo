"""Verify delivered sources, protected assets, browser receipts and regression PCM.
Run from repo root: python3 docs/evidence/audio-resume/measure.py LINUX_ARTIFACT_DIR [RETRY_DIR]
"""
import hashlib
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deck-effects'))
from measure import difference

assert 2 <= len(sys.argv) <= 3
linux = Path(sys.argv[1])
retry = Path(sys.argv[2]) if len(sys.argv) == 3 else linux
evidence = Path('docs/evidence/audio-resume')
previous = json.loads(Path('docs/evidence/media-backend/summary.json').read_text())
def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()
def root_of(log):
    line = next(line for line in log.read_text().splitlines() if line.startswith('Artifacts: '))
    root = Path(line.removeprefix('Artifacts: '))
    return log.parent / root.name if str(root).startswith('/work/') else root.relative_to(Path.cwd())

result = {'protected_sha256': previous['protected_sha256'], 'source_sha256': {}, 'runs': {}, 'waveforms': {}}
result['unit'] = {}
for platform, log in [('mac', evidence / 'unit.log'), ('linux', linux / 'unit.log')]:
    output = log.read_text().replace('ℹ ', '# ')
    assert '# tests 41\n' in output and '# pass 41\n' in output and '# fail 0\n' in output
    result['unit'][platform] = {'status': 'PASS', 'tests': 41, 'log': str(log), 'sha256': digest(log)}
for name, expected in result['protected_sha256'].items():
    assert digest(Path(name)) == expected, name
bundle = json.loads((evidence / 'bundle.json').read_text())['files']
for name in ['audio.js', 'dj.js', 'keyboard.js', 'performance-session.js']:
    file = Path('apps/web') / name
    result['source_sha256'][str(file)] = digest(file)
    assert digest(file) == bundle[name]
for name in ['dj.mjs', 'session.mjs', 'session-start.mjs', 'audio-resume.test.js']:
    file = Path('apps/web/tests') / name
    result['source_sha256'][str(file)] = digest(file)
failed = root_of(evidence / 'before-chromium.log') / 'failure.json'
result['before'] = {'status': 'FAIL', 'receipt': str(failed), 'sha256': digest(failed), 'details': json.loads(failed.read_text())}
result['mac_setup_failures'] = {}
for log in evidence.glob('mac-webkit-session-*.log'):
    file = root_of(log) / 'failure.json'
    result['mac_setup_failures'][log.stem] = {'status': 'FAIL', 'receipt': str(file), 'sha256': digest(file), 'details': json.loads(file.read_text())}
result['initial_linux_failures'] = {}
if retry != linux:
    for name in ['webkit-dj', 'chromium-session']:
        file = root_of(linux / (name + '.log')) / 'failure.json'
        result['initial_linux_failures'][name] = {'status': 'FAIL', 'receipt': str(file), 'sha256': digest(file), 'details': json.loads(file.read_text())}
for platform in ['mac', 'linux']:
    for browser in ['chromium', 'webkit']:
        for suite in ['dj', 'session']:
            name = f'{platform}-{browser}-{suite}'
            base = retry if (browser, suite) in [('webkit', 'dj'), ('chromium', 'session')] else linux
            log = evidence / f'{name}.log' if platform == 'mac' else base / f'{browser}-{suite}.log'
            root = root_of(log)
            receipt = root / 'report.json'
            if receipt.exists():
                report = json.loads(receipt.read_text())
                expected = 'PARTIAL' if (platform, browser, suite) == ('linux', 'webkit', 'session') else 'PASS'
                assert report['status'] == expected, name
                assert sum(check['status'] == 'PASS' for check in report['checks']) == (46 if suite == 'dj' else 28 if expected == 'PARTIAL' else 29), name
                assert sum(check['status'] == 'NOT RUN' for check in report['checks']) == (2 if expected == 'PARTIAL' else 0), name
            else:
                assert (platform, browser, suite) == ('linux', 'webkit', 'dj')
                assert 'Target crashed' in log.read_text()
                version = json.loads((root_of(linux / 'webkit-session.log') / 'report.json').read_text())['version']
                report = {'status': 'FAIL', 'browser': browser, 'version': version, 'errors': None, 'warnings': None,
                          'checks': [{'name': line.removeprefix('PASS: '), 'status': 'PASS'} for line in log.read_text().splitlines() if line.startswith('PASS: ')]}
                receipt = log
            row = {key: report[key] for key in ['status', 'browser', 'version', 'checks', 'errors', 'warnings']}
            if report['status'] != 'FAIL':
                assert not row['errors'], name
            row.update(receipt=str(receipt), sha256=digest(receipt), log=str(log), log_sha256=digest(log))
            if report['status'] == 'FAIL':
                row['note'] = 'Browser target crashed after the listed checks; failure-state evaluation also rejected. Raw decoder log retained. No complete suite receipt or runtime-error accounting.'
            if suite == 'dj':
                baseline = Path(previous['waveforms'][f'mac-{browser}-delivery']['run'])
                names = [f'{prefix}piano-{mode}.wav' for prefix in ['', 'deck-a-', 'deck-b-'] for mode in ['dry', 'echo']]
                fx = [report['fxEvidence'], *report['deckFXEvidence']] if 'fxEvidence' in report else []
            else:
                baseline = Path(previous['waveforms']['session-webkit' if browser == 'webkit' else 'session-chromium-isolated']['run'])
                names = [f'deck-c-piano-{mode}.wav' for mode in ['dry', 'echo', 'eighth', 'dotted', 'triplet']]
                timing = json.loads((root / 'timing.json').read_text())
                assert timing == json.loads((baseline / 'timing.json').read_text()), name
                row.update(timing=timing, continuity=report['continuity'], recordingAvailable=report['recordingAvailable'])
                assert report['continuity']['silent'] == report['continuity']['signalFrameGaps'] == 0, name
                row['startup'] = json.loads((root / 'startup.json').read_text())
                assert all(case['resumeTimeoutRecoverable'] for case in row['startup'])
                fx = [json.loads((root / 'performance-fx.json').read_text())]
            frames = [[echo['frame'], echo['expectedFrame']] for group in fx for case in group
                      if case.get('mode', '').startswith('echo-') for echo in case['echoes']]
            errors = [actual - expected for actual, expected in frames]
            if fx:
                if suite == 'session':
                    baseline_fx = [json.loads((baseline / 'performance-fx.json').read_text())]
                else:
                    old_report = json.loads((baseline / 'report.json').read_text())
                    baseline_fx = [old_report['fxEvidence'], *old_report['deckFXEvidence']]
                old_frames = [[echo['frame'], echo['expectedFrame']] for group in baseline_fx for case in group
                              if case.get('mode', '').startswith('echo-') for echo in case['echoes']]
                assert frames == old_frames, name
                assert errors and max(map(abs, errors)) <= .5, name
                row['echo_frames_match_baseline'] = True
            row['echo_frame_errors'] = errors
            result['runs'][name] = row
            waves = {}
            for filename in names:
                file, old = root / filename, baseline / filename
                delta = difference(file, old)
                assert delta == {'max_abs': 0, 'rms': 0}, str(file)
                assert file.read_bytes() == old.read_bytes(), str(file)
                waves[filename] = {**delta, 'sha256': digest(file), 'baseline_sha256': digest(old)}
            result['waveforms'][name] = {'run': str(root), 'baseline': str(baseline), 'files': waves}
result['waveform_count'] = sum(len(row['files']) for row in result['waveforms'].values())
assert result['waveform_count'] == 44
result['waveform_gate'] = 'PASS'
print(json.dumps(result, indent=2))
