"""Verify the offset fix against preserved renders, Linux and WASM outputs."""
from pathlib import Path
import hashlib
import json
import re
import sys
import wave

import numpy as np

sys.path.insert(0, 'scripts')
from compare_portability import compare
from verify_export import verify_export

root = Path('renders/analysis-offset-20261019')
evidence = Path('docs/evidence/analysis-offset')
linux = Path('renders/arrangement-linux/analysis-offset-20261019')
after, before = root/'after', root/'before'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def pcm(path):
    with wave.open(str(path)) as f:
        assert (f.getsampwidth(), f.getframerate(), f.getnchannels()) == (2, 48000, 2)
        return np.frombuffer(f.readframes(f.getnframes()), '<i2').astype(float)/32768

report = {'native_portability': {}, 'before_after': {}, 'saved_score_replay': {}, 'wasm': {}}
assert len(list(after.glob('*.score.json'))) == 13
for score in sorted(after.glob('*.score.json')):
    prefix = score.name.removesuffix('.score.json')
    name, style = prefix.rsplit('.', 1)
    verify_export(after/name)
    verify_export(linux/name)
    report['native_portability'][prefix] = compare(linux/prefix, after/prefix)
    native = json.loads(score.read_text())['analysis']
    other = json.loads((linux/score.name).read_text())['analysis']
    errors = {}
    for key in native:
        if isinstance(native[key], (int, float)):
            error = abs(native[key]-other[key])
            assert error <= 1e-12
            if error: errors[key] = error
        else: assert native[key] == other[key]
    report['native_portability'][prefix]['analysis_absolute_errors'] = errors
    for wav in sorted(after.glob(f'{prefix}*.wav')):
        assert digest(wav) == digest(linux/wav.name)
        actual, previous = pcm(wav), pcm(before/wav.name)
        assert actual.shape == previous.shape
        assert np.isfinite(actual).all() and np.abs(actual).max() < 10**(-1/20)
        assert np.all(actual[-9600:] == 0)
        delta = actual-previous
        report['before_after'][wav.name] = {
            'sha256': digest(wav), 'peak': float(np.abs(actual).max()),
            'max_pcm_difference': float(np.abs(delta).max()),
            'rms_pcm_difference': float(np.sqrt(np.mean(delta**2))),
        }
        if name != 'offset': assert digest(wav) == digest(before/wav.name)
        if style == 'call_response':
            assert digest(before/wav.name) == digest(root/'replay'/wav.name)
    if style == 'call_response':
        report['saved_score_replay'][prefix] = compare(before/prefix, root/'replay'/prefix)

wasm = Path(re.search(r'renders/web-wasm-[A-Za-z0-9]+', (evidence/'wasm.log').read_text())[0])
for style in ('hiphop', 'reggae', 'experimental', 'club', 'funk', 'call_response', 'hybrid'):
    name = 'fixture' if style in ('hiphop', 'reggae', 'experimental') else style
    report['wasm'][style] = compare(after/f'{name}.{style}', wasm/f'mix.{style}')
report['wasm_owner_and_offset'] = json.loads((evidence/'owner-wasm.json').read_text())

plain = json.loads((after/'owner-4123.call_response.score.json').read_text())['analysis']
offset = json.loads((after/'offset.call_response.score.json').read_text())['analysis']
old_offset = json.loads((before/'offset.call_response.score.json').read_text())['analysis']
for key in ('onsets', 'phrases', 'pitch_hz'):
    assert plain[key] == offset[key]
    assert old_offset[key] != offset[key]
assert abs(plain['pitch_confidence']-offset['pitch_confidence']) < 1e-12
report['offset_recovery'] = {'status': 'PASS', 'before_attack_count': len(old_offset['onsets']),
                            'after_attack_count': len(offset['onsets']),
                            'matches_unmodified_source': ['onsets', 'phrases', 'pitch_hz']}
preserved = json.loads((evidence/'preservation-before.json').read_text())
assert all(digest(Path(p)) == sha for p, sha in preserved.items())
report.update(preserved_sha256=preserved, cross_platform_wavs=len(report['before_after']),
              unchanged_original_wavs=sum(v['max_pcm_difference'] == 0 for v in report['before_after'].values()),
              human_quality='NOT RUN', physical_microphone='NOT RUN', rendered_browser_interaction='NOT RUN')
assert report['cross_platform_wavs'] == 70 and report['unchanged_original_wavs'] == 65
assert len(report['saved_score_replay']) == 6 and report['wasm_owner_and_offset']['cases'] == 5
with (evidence/'measurements.json').open('x') as f:
    f.write(json.dumps(report, indent=2)+'\n')
print('PASS:', report['cross_platform_wavs'], 'exact Mac/Linux WAVs;',
      report['unchanged_original_wavs'], 'original WAVs unchanged; six saved-score replays; 12 WASM comparisons')
