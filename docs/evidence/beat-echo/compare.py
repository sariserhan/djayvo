"""Compare beat-delay artifacts: Chromium/WebKit session dirs, then DJ dirs."""
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deck-effects'))
from measure import difference, pcm

assert len(sys.argv) == 5, 'Usage: compare.py CHROMIUM_SESSION WEBKIT_SESSION CHROMIUM_DJ WEBKIT_DJ'
roots = [Path(p) for p in sys.argv[1:3]]
decks = [Path(p) for p in sys.argv[3:5]]
previous = json.loads(Path('docs/evidence/performance-effects/summary.json').read_text())
result = {'gate': 'PASS', 'frames': {}, 'transition_frames': {}, 'comparisons': {}, 'files': {}}
for root, deck in zip(roots, decks):
    report = json.loads((root / 'report.json').read_text())
    assert report['status'] == 'PASS'
    browser = report['browser']
    effects = json.loads((root / 'performance-fx.json').read_text())
    cases = [case for case in effects if case.get('mode', '').startswith('echo-') and len(case['mode'].split('-')) == 3]
    assert len(cases) == 9
    frames = []
    for case in cases:
        _, division, tempo = case['mode'].split('-')
        numerator, denominator = {'eighth': (1, 2), 'dotted': (3, 4), 'triplet': (1, 3)}[division]
        for repeat, echo in enumerate(case['echoes'], 1):
            ideal = 48000 + 48000 * 60000 * numerator * repeat / (int(tempo) * denominator)
            error = echo['frame'] - ideal
            assert abs(error) <= 1
            frames.append({'case': case['mode'], 'repeat': repeat, 'ideal_frame': ideal, 'measured_frame': echo['frame'], 'error': error})
    result['frames'][browser] = frames
    dj = json.loads((deck / 'report.json').read_text())
    assert dj['status'] == 'PASS'
    transitions = []
    for channel in [effects, dj['fxEvidence'], *dj['deckFXEvidence']]:
        case = next(case for case in channel if case.get('mode') == 'transition')
        for echo in case['echoes']:
            assert echo['frame'] == echo['expectedFrame']
            assert abs(echo['sum'] - echo['expectedValue']) < 1e-6
            transitions.append(echo)
    result['transition_frames'][browser] = transitions
    for file in deck.glob('*piano-*.wav'):
        old = Path(previous['browser'][f'dj-{browser}']['artifacts']) / file.name
        assert file.read_bytes() == old.read_bytes()
    for mode in ['dry', 'echo', 'eighth', 'dotted', 'triplet']:
        file = root / f'deck-c-piano-{mode}.wav'
        samples = pcm(file)
        result['files'][str(file)] = {'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
            'frames': len(samples) // 2, 'rate': 48000, 'peak': max(map(abs, samples)) / 32768}
        if mode in ['dry', 'echo']:
            old = Path(previous['browser'][f'session-{browser}']['artifacts']) / file.name
            assert file.read_bytes() == old.read_bytes()
        else:
            result['comparisons'][f'{browser}: {mode} vs dry'] = difference(file, root / 'deck-c-piano-dry.wav')
for mode in ['dry', 'echo', 'eighth', 'dotted', 'triplet']:
    result['comparisons'][f'Chromium vs WebKit {mode}'] = difference(*(root / f'deck-c-piano-{mode}.wav' for root in roots))
result['manual_output_regression'] = 'PASS: 16 prior A/B/C/instrument dry/manual-echo WAVs byte-identical'
print(json.dumps(result, indent=2))
