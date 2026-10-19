"""Require unchanged old/new/native/WASM audio, decisions and event frames."""
from pathlib import Path
import hashlib
import json
import re
import sys
import wave

sys.path.insert(0, 'scripts')
from compare_portability import compare
from verify_export import verify_export

root = Path('renders/active-vocals-20261019')
evidence = Path('docs/evidence/active-vocals')
linux = Path('renders/arrangement-linux/active-vocals-20261019')
after = root/'after'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

report = {'native': {}, 'before_after': {}, 'wav_sha256': {}, 'wasm': {}}
for score in sorted(after.glob('*.score.json')):
    prefix = score.name.removesuffix('.score.json')
    name = prefix.rsplit('.', 1)[0]
    before = root/('before' if name in ['dense', 'echo'] else 'before-original')
    for folder in [after, before, linux]:
        verify_export(folder/name)
    assert json.loads(score.read_text()) == json.loads((before/score.name).read_text())
    assert json.loads(score.read_text()) == json.loads((linux/score.name).read_text())
    report['native'][prefix] = compare(after/prefix, linux/prefix)
    report['before_after'][prefix] = compare(before/prefix, after/prefix)
    for wav in sorted(after.glob(f'{prefix}*.wav')):
        sha = digest(wav)
        assert sha == digest(before/wav.name) == digest(linux/wav.name)
        with wave.open(str(wav)) as f:
            assert (f.getframerate(), f.getnchannels(), f.getsampwidth()) == (48000, 2, 2)
            raw = f.readframes(f.getnframes())
            assert raw[-4800*4:] == bytes(4800*4)
        report['wav_sha256'][wav.name] = sha
assert len(report['native']) == 14 and len(report['wav_sha256']) == 75

wasm = Path(re.search(r'renders/web-wasm-[A-Za-z0-9]+', (evidence/'wasm.log').read_text())[0])
for style in ['hiphop', 'reggae', 'experimental', 'club', 'funk', 'call_response', 'hybrid']:
    name = 'fixture' if style in ['hiphop', 'reggae', 'experimental'] else style
    report['wasm'][style] = compare(after/f'{name}.{style}', wasm/f'mix.{style}')
report['wasm_owner'] = json.loads((evidence/'owner-wasm.json').read_text())
assert report['wasm_owner']['cases'] == 4 and report['wasm_owner']['status'] == 'PASS'
preserved = json.loads((evidence/'preservation-before.json').read_text())
assert all(digest(Path(p)) == sha for p, sha in preserved.items())
report.update(preserved_sha256=preserved, all_75_wavs_unchanged='PASS',
              maximum_pcm_difference=0, rms_pcm_difference=0,
              human_quality='NOT RUN', live_latency='NOT RUN', physical_device='NOT RUN', rendered_browser='NOT RUN')
with (evidence/'measurements.json').open('x') as f:
    json.dump(report, f, indent=2);f.write('\n')
print('PASS: 75 exact old/new/Mac/Linux WAVs, 14 plans/event traces and 11 native/WASM cases')
