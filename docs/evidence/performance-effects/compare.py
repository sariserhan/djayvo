"""Run from the repo root with Chromium/WebKit session dirs, then DJ dirs."""
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deck-effects'))
from measure import difference, pcm

assert len(sys.argv) == 5, 'Usage: compare.py CHROMIUM_SESSION WEBKIT_SESSION CHROMIUM_DJ WEBKIT_DJ'
sessions = [Path(p) for p in sys.argv[1:3]]
decks = [Path(p) for p in sys.argv[3:5]]
result = {'gate': 'PASS', 'echo_frame_errors': {}, 'comparisons': {}, 'files': {}}
previous = json.loads(Path('docs/evidence/midi-learn/summary.json').read_text())
for session, deck in zip(sessions, decks):
    report = json.loads((session / 'report.json').read_text())
    assert report['status'] == 'PASS'
    assert json.loads((deck / 'report.json').read_text())['status'] == 'PASS'
    browser = report['browser']
    effects = json.loads((session / 'performance-fx.json').read_text())
    offsets = [echo['frame'] - echo['expectedFrame'] for case in effects
               if case.get('mode', '').startswith('echo-') for echo in case['echoes']]
    assert len(offsets) == 9 and max(map(abs, offsets)) == 0
    result['echo_frame_errors'][browser] = offsets
    for mode in ['dry', 'echo']:
        file = session / f'deck-c-piano-{mode}.wav'
        samples = pcm(file)
        result['files'][str(file)] = {'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
            'frames': len(samples) // 2, 'rate': 48000, 'peak': max(map(abs, samples)) / 32768}
        diff = difference(file, deck / f'piano-{mode}.wav')
        assert diff['max_abs'] == 0
        result['comparisons'][f'{browser}: C vs existing instrument {mode}'] = diff
    for file in deck.glob('*piano-*.wav'):
        old = Path(previous['browser'][browser]['artifacts']) / file.name
        assert file.read_bytes() == old.read_bytes(), f'Changed prior output: {file}'
    result['comparisons'][f'{browser}: C echo vs dry'] = difference(
        session / 'deck-c-piano-echo.wav', session / 'deck-c-piano-dry.wav')
for mode in ['dry', 'echo']:
    diff = difference(*(root / f'deck-c-piano-{mode}.wav' for root in sessions))
    assert diff['max_abs'] <= 1 / 32768
    result['comparisons'][f'Chromium vs WebKit C {mode}'] = diff
result['previous_deck_and_instrument_wavs'] = 'PASS: 12 byte-identical files'
print(json.dumps(result, indent=2))
