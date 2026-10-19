"""Compare the playable browser-test outputs; run from the repository root."""
import array
import hashlib
import json
import math
from pathlib import Path
import sys
import wave


def pcm(path):
    with wave.open(str(path)) as audio:
        assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) == (2, 2, 48000)
        data = array.array('h', audio.readframes(audio.getnframes()))
        if sys.byteorder != 'little':
            data.byteswap()
        return data


def difference(a, b):
    a, b = pcm(a), pcm(b)
    assert len(a) == len(b) and len(a) > 0
    errors = [(x - y) / 32768 for x, y in zip(a, b)]
    return {'max_abs': max(map(abs, errors)), 'rms': math.sqrt(sum(x*x for x in errors) / len(errors))}


if __name__ == '__main__':
    assert len(sys.argv) == 3, 'Usage: measure.py CHROMIUM_ARTIFACT_DIR WEBKIT_ARTIFACT_DIR'
    roots = [Path(name) for name in sys.argv[1:]]
    result = {'gate': 'PASS', 'comparisons': {}, 'files': {}, 'echo_peak_frame_errors': {}}
    for root in roots:
        report = json.loads((root / 'report.json').read_text())
        assert report['status'] == 'PASS'
        timings = [echo['frame'] - echo['expectedFrame'] for strip in report['deckFXEvidence']
                   for case in strip if case.get('mode', '').startswith('echo-') for echo in case['echoes']]
        assert max(map(abs, timings)) <= 1
        result['echo_peak_frame_errors'][report['browser']] = timings
        for name in ['piano-dry.wav', 'piano-echo.wav', 'deck-a-piano-dry.wav', 'deck-a-piano-echo.wav', 'deck-b-piano-dry.wav', 'deck-b-piano-echo.wav']:
            file = root / name
            data = pcm(file)
            result['files'][str(file)] = {'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
                'frames': len(data) // 2, 'rate': 48000, 'peak': max(map(abs, data)) / 32768,
                'full_scale_samples': sum(abs(x) >= 32767 for x in data)}
        for mode in ['dry', 'echo']:
            for deck in ['a', 'b']:
                compared = difference(root / f'deck-{deck}-piano-{mode}.wav', root / f'piano-{mode}.wav')
                assert compared['max_abs'] == 0
                result['comparisons'][f'{report["browser"]}: {deck} vs instrument {mode}'] = compared
        result['comparisons'][f'{report["browser"]}: deck echo vs dry'] = difference(root / 'deck-a-piano-echo.wav', root / 'deck-a-piano-dry.wav')
    for mode in ['dry', 'echo']:
        result['comparisons'][f'Chromium vs WebKit deck {mode}'] = difference(*(root / f'deck-a-piano-{mode}.wav' for root in roots))
    print(json.dumps(result, indent=2))
