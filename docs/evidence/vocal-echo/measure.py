"""Run from repository root with .venv-analysis/bin/python; audio stays ignored."""
import copy
import hashlib
import json
import math
from pathlib import Path
import sys
import wave
import numpy as np
import jsonschema

sys.path.insert(0, 'scripts')
from compare_portability import compare
from verify_export import verify_export

root = Path('renders/vocal-echo-20261018')
linux = Path('renders/arrangement-linux/vocal-echo-20261018')
smoke = Path('renders/vocal-echo-smoke-20261018')
evidence = Path('docs/evidence/vocal-echo')
schema = json.loads(Path('schemas/remix-plan.schema.json').read_text())
cases = ['control', 'eighth-echo', 'dotted-echo', 'pitched-echo', 'tail-probe']
suffixes = ['.wav', '.piano.wav', '.bass.wav', '.drums.wav', '.vocals.wav']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pcm(path):
    with wave.open(str(path)) as f:
        assert f.getsampwidth() == 2 and f.getnchannels() == 2
        return f.getframerate(), np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').reshape(-1, 2).astype(np.float64) / 32768


report = {'portability': {}, 'changed_waveforms': {}, 'clean_hooks': {}, 'waveforms': {}, 'voice_frames': {}}
control = json.loads((root / 'control.club.score.json').read_text())
rate, original = pcm(root / 'control.club.wav')
_, original_voice = pcm(root / 'control.club.vocals.wav')
for name in cases:
    verify_export(root / name)
    verify_export(linux / name)
    plan = json.loads((root / f'{name}.club.score.json').read_text())
    report['portability'][name] = compare(linux / f'{name}.club', root / f'{name}.club')
    for suffix in suffixes:
        file = root / f'{name}.club{suffix}'
        assert digest(file) == digest(linux / file.name), 'cross-platform waveform differs'
        _, data = pcm(file)
        peak = float(np.abs(data).max())
        assert peak < 10**(-1/20) and np.all(data[-rate//10:] == 0)
        report['waveforms'][file.name] = {'sha256': digest(file), 'frames': len(data), 'peak': peak,
                                        'full_scale_samples': int((np.abs(data) >= 1).sum())}
    _, current = pcm(root / f'{name}.club.wav')
    delta = current - original
    report['changed_waveforms'][name] = {'max_error_vs_control': float(np.abs(delta).max()),
                                       'rms_error_vs_control': float(np.sqrt(np.mean(delta**2)))}
    _, voice = pcm(root / f'{name}.club.vocals.wav')
    frames = []
    for event in plan['voice_events']:
        denominator = 960 * plan['tempo_milli_bpm']
        begin = (event['start_tick'] * rate * 60000 + denominator//2)//denominator
        clip = plan['voice_clips'][event['clip_id']]
        count = math.ceil((clip['end_frame'] - clip['start_frame']) * event.get('time_stretch', 1) / event['rate'])
        frames.append({'start': begin, 'end': begin + count, 'clean': event['clean']})
        if event['clean']:
            assert np.array_equal(voice[begin:begin+count], original_voice[begin:begin+count])
    report['voice_frames'][name] = frames
    echo_frames=[]
    for event in plan['voice_events']:
        if not event.get('echo_ticks'):continue
        clip=plan['voice_clips'][event['clip_id']]
        count=math.ceil((clip['end_frame']-clip['start_frame'])*event.get('time_stretch',1)/event['rate'])
        for repeat in (1,2,3):
            start=((event['start_tick']+repeat*event['echo_ticks'])*rate*60000+denominator//2)//denominator
            echo_frames.append({'start':start,'end':start+count,'repeat':repeat})
    report.setdefault('echo_frames',{})[name]=echo_frames
    if name=='tail-probe':
        tick=plan['target_bars']*960*4*plan['time_signature'][0]//plan['time_signature'][1]
        music_end=(tick*rate*60000+denominator//2)//denominator
        assert any(e['start']>=music_end for e in echo_frames)
        tail_peak=float(np.abs(voice[music_end:]).max())
        assert tail_peak>0
        report['tail_probe']={'status':'PASS','music_end_frame':music_end,'post_music_voice_peak':tail_peak,'final_100ms_silent':True}

    report['clean_hooks'][name] = {'status': 'PASS', 'maximum_pcm_error_vs_control': 0}
    for instrument in ('piano', 'bass', 'drums'):
        assert digest(root / f'{name}.club.{instrument}.wav') == digest(root / f'control.club.{instrument}.wav')
for suffix in suffixes:
    assert digest(root / f'control.club{suffix}') == digest(Path(f'renders/voice-club-v8/final/remix.club{suffix}'))

for style in ('hiphop', 'reggae', 'experimental'):
    for suffix in suffixes:
        assert digest(smoke / f'remix.{style}{suffix}') == digest(Path(f'renders/plan-import-20261018/remix.{style}{suffix}'))
for style in ('hiphop', 'reggae', 'experimental', 'club'):
    native = smoke / f'{"club" if style=="club" else "remix"}.{style}'
    report.setdefault('wasm_default', {})[style] = compare(native, root / f'wasm/mix.{style}')

paths = [*root.glob('*.score.json'), *linux.glob('*.score.json'), *smoke.glob('*.score.json'), *root.glob('wasm/*.score.json')]
for path in paths:
    jsonschema.validate(json.loads(path.read_text()), schema)
invalid = []
base = json.loads((root / 'eighth-echo.club.score.json').read_text())
bad = copy.deepcopy(base); bad['schema_version'] = '1.0-remix'; invalid.append(bad)
for field, value in [('echo_ticks', 119), ('echo_gain_db', -5.9), ('echo_ticks', 961)]:
    bad = copy.deepcopy(base)
    next(e for e in bad['voice_events'] if not e['clean'])[field] = value
    invalid.append(bad)
bad = copy.deepcopy(base)
next(e for e in bad['voice_events'] if e['clean'])['echo_ticks'] = 480
invalid.append(bad)
for bad in invalid:
    try:
        jsonschema.validate(bad, schema)
    except jsonschema.ValidationError:
        pass
    else:
        raise AssertionError('schema accepted invalid independent transformation')
report['schema'] = {'status': 'PASS', 'valid_plans': len(paths), 'invalid_plans_rejected': len(invalid)}
report['preserved'] = {
    name: digest(Path(name)) for name in ('ai_improvisational_musician_master_spec_v1.md',
        'renders/fixtures/synthetic-speech.wav', 'renders/voice-20261017-221411/source-pcm.wav')}
expected = json.loads(Path('docs/evidence/plan-import/report.json').read_text())['preserved_sha256']
assert report['preserved'] == expected
report['render_timings'] = {name: value['render_with_stems_seconds'] for name, value in json.loads((root/'comparison.json').read_text())['cases'].items()}
report.update(cross_platform_identical_wavs=25, preserved_legacy_wavs=20, echo_listening='NOT RUN',
              formant_preservation='NOT RUN', production_quality='PARTIAL', cloud_calls=0)
(evidence / 'measurements.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'cross_platform_identical_wavs': 25, 'clean_hooks': 'PASS', 'schemas': report['schema'],
                  'default_wasm': 'PASS', 'legacy_wavs_preserved': 20, 'listening': 'NOT RUN'}, indent=2))
