"""Verify actual final renders, preserved scores, pause controls and cohort impact."""
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

root = Path('renders/chop-offset-20261019')
evidence = Path('docs/evidence/chop-offset')
linux = Path('renders/arrangement-linux/chop-offset-20261019')
before, after = root/'before', root/'after'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def pcm(path):
    with wave.open(str(path)) as f:
        assert (f.getsampwidth(), f.getframerate(), f.getnchannels()) == (2, 48000, 2)
        return np.frombuffer(f.readframes(f.getnframes()), '<i2').astype(float)/32768

def difference(previous, actual):
    a, b = pcm(previous), pcm(actual)
    assert a.shape == b.shape and np.isfinite(b).all()
    assert np.abs(b).max() < 10**(-1/20) and np.all(b[-9600:] == 0)
    return {'sha256': digest(actual), 'peak': float(np.abs(b).max()),
            'maximum_pcm_difference': float(np.abs(b-a).max()),
            'rms_pcm_difference': float(np.sqrt(np.mean((b-a)**2)))}

report = {'native_portability': {}, 'before_after': {}, 'saved_scores': {}, 'wasm': {}}
assert len(list(after.glob('*.score.json'))) == 18
for path in sorted(after.glob('*.score.json')):
    prefix = path.name.removesuffix('.score.json')
    name, style = prefix.rsplit('.', 1)
    verify_export(after/name)
    verify_export(linux/name)
    report['native_portability'][prefix] = compare(after/prefix, linux/prefix)
    assert json.loads(path.read_text()) == json.loads((linux/path.name).read_text())
    old, new = json.loads((before/path.name).read_text()), json.loads(path.read_text())
    assert old['analysis'] == new['analysis'] and old['tracks'] == new['tracks']
    assert old['voice_clips'][0] == new['voice_clips'][0]
    control = name.startswith(('short-', 'long-'))
    if control:
        end = 22560 if name.startswith('short-') else 38400
        assert end <= new['voice_clips'][1]['end_frame'] <= end+1440
        assert new['voice_clips'][1]['confidence'] == .65
        if not name.endswith('flat'):
            assert old['voice_clips'][1]['confidence'] == .3
            assert old['voice_clips'][1]['end_frame'] < end
    else:
        assert old == new
    for wav in sorted(after.glob(f'{prefix}*.wav')):
        assert digest(wav) == digest(linux/wav.name)
        report['before_after'][wav.name] = difference(before/wav.name, wav)
        if not control:
            assert digest(wav) == digest(before/wav.name)

for path in sorted((root/'replay').glob('*.score.json')):
    prefix = path.name.removesuffix('.score.json')
    verify_export(root/'replay'/prefix.rsplit('.', 1)[0])
    report['saved_scores'][prefix] = compare(before/prefix, root/'replay'/prefix)
    for wav in (root/'replay').glob(f'{prefix}*.wav'):
        assert digest(wav) == digest(before/wav.name)
assert len(report['saved_scores']) == 11

wasm = Path(re.search(r'renders/web-wasm-[A-Za-z0-9]+', (evidence/'wasm.log').read_text())[0])
for style in ['hiphop', 'reggae', 'experimental', 'club', 'funk', 'call_response', 'hybrid']:
    name = 'fixture' if style in ['hiphop', 'reggae', 'experimental'] else style
    report['wasm'][style] = compare(after/f'{name}.{style}', wasm/f'mix.{style}')
report['wasm_owner_controls'] = json.loads((evidence/'owner-controls-wasm.json').read_text())
assert report['wasm_owner_controls']['status'] == 'PASS' and report['wasm_owner_controls']['cases'] == 10

cohort_changes = []
for path in sorted((root/'cohort-after').glob('*.score.json')):
    a, b = json.loads((root/'cohort-before'/path.name).read_text()), json.loads(path.read_text())
    fields = [k for k in a if a[k] != b[k]]
    assert set(fields) <= {'voice_clips', 'voice_events'}
    if fields:
        cohort_changes.append({'plan': path.name, 'changed_fields': fields,
                               'before_clips': a['voice_clips'], 'after_clips': b['voice_clips'],
                               'before_voice_events': a['voice_events'], 'after_voice_events': b['voice_events']})
assert len(list((root/'cohort-after').glob('*.score.json'))) == 140
assert len(cohort_changes) == 7 and all(x['plan'].startswith('ls-1988-147956-0018.') for x in cohort_changes)
report['cohort_changes'] = cohort_changes
report['cohort_portability'] = compare(root/'cohort-render/after.club', Path('renders/arrangement-linux/chop-offset-cohort-20261019')/'cohort.club')
verify_export(root/'cohort-render/after')
verify_export(Path('renders/arrangement-linux/chop-offset-cohort-20261019')/'cohort')
report['cohort_audio'] = {}
for wav in sorted((root/'cohort-render').glob('after.club*.wav')):
    assert digest(wav) == digest(Path('renders/arrangement-linux/chop-offset-cohort-20261019')/wav.name.replace('after.', 'cohort.', 1))
    report['cohort_audio'][wav.name] = difference(wav.with_name(wav.name.replace('after.', 'before.', 1)), wav)

preserved = json.loads((evidence/'preservation-before.json').read_text())
assert all(digest(Path(p)) == sha for p, sha in preserved.items())
report.update(preserved_sha256=preserved, cross_platform_wavs=len(report['before_after'])+len(report['cohort_audio']),
              unchanged_original_wavs=sum(not p.startswith(('short-', 'long-')) for p in report['before_after']),
              human_quality='NOT RUN', rendered_browser='NOT RUN', physical_microphone='NOT RUN')
assert report['unchanged_original_wavs'] == 65 and report['cross_platform_wavs'] == 107
with (evidence/'measurements.json').open('x') as f:
    f.write(json.dumps(report, indent=2)+'\n')
print('PASS: 107 exact Mac/Linux WAVs; 65 original WAVs unchanged; 11 saved scores; 17 WASM cases')
print('PARTIAL: one of 20 licensed speech inputs changes crops; musical benefit NOT RUN')
