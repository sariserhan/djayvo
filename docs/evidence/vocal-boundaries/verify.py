#!/usr/bin/env python3
"""Reproduce v3 technical evidence, with no perceptual-quality inference."""
import hashlib
import json
from pathlib import Path
import sys
import wave
import jsonschema
import numpy as np
sys.path.insert(0, str(Path('scripts').resolve()))
from compare_portability import compare, load_audio
from inspect_wav import inspect

out = Path('docs/evidence/vocal-boundaries')
private = Path('renders/voice-boundaries-v3')
styles = ('hiphop', 'reggae', 'experimental')
with wave.open('renders/voice-20261017-221411/source-pcm.wav') as f:
    rate = f.getframerate()
    original = np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').reshape(-1, 2).mean(1)/32768
schema = json.loads(Path('schemas/remix-plan.schema.json').read_text())
for path in private.glob('*.score.json'):
    jsonschema.Draft202012Validator(schema).validate(json.loads(path.read_text()))
assert len(list(private.glob('*.score.json'))) == 9
measurements = {p.name: inspect(p) for p in private.glob('*.wav')}
assert len(measurements) == 21
for item in measurements.values():
    assert item['full_scale_samples'] == 0 and item['peak_dbfs'] <= -1
    assert item['last_100ms_peak'] == 0 and 20 <= item['duration_seconds'] <= 40

cross_os, blocks, errors, differences = {}, {}, {}, {}
for style in styles:
    cross_os[style] = compare(Path(f'renders/arrangement-linux/boundaries-v3/remix.{style}'), Path(f'renders/boundaries-smoke-mac/remix.{style}'))
    cross_os['owner_'+style] = compare(Path(f'renders/arrangement-linux/boundaries-v3/voice/remix.{style}'), private/f'remix.{style}')
    blocks[style] = compare(private/f'remix.{style}', Path(f'renders/boundaries-block113/remix.{style}'))
    for stem in ('piano', 'bass', 'drums', 'vocals'):
        filename = f'remix.{style}.{stem}.wav'
        assert Path('renders/arrangement-linux/boundaries-v3', filename).read_bytes() == Path('renders/boundaries-smoke-mac', filename).read_bytes()
        if stem != 'vocals':
            assert (private/filename).read_bytes() == Path('renders/voice-arrangement-v2', filename).read_bytes(), 'Instrument stem changed'
    plan = json.loads((private/f'remix.{style}.score.json').read_text())
    _, _, samples = load_audio(private/f'remix.{style}.vocals.wav')
    vocals = np.asarray(samples).reshape(-1, 2)/32768
    errors[style] = []
    for event in plan['voice_events']:
        if not event['clean']:
            continue
        denom = plan['tempo_milli_bpm']*960
        start = (event['start_tick']*rate*60000+denom//2)//denom
        gain = 10**(event['gain_db']/20)*plan['analysis']['normalization_gain']*2**-.5
        error = float(np.max(np.abs(vocals[start+200:start+len(original)-200, 0]-original[200:-200]*gain)))
        assert error < 2/32768
        errors[style].append(error)
    assert len(errors[style]) == 2
    _, _, old = load_audio(Path(f'renders/voice-arrangement-v2/remix.{style}.wav'))
    _, _, new = load_audio(private/f'remix.{style}.wav')
    delta = (np.asarray(old, dtype=float)-np.asarray(new, dtype=float))/32768
    differences[style] = {'maximum_pcm_error': float(np.max(np.abs(delta))), 'rms_pcm_error': float(np.sqrt(np.mean(delta**2)))}

ends = {}
for version in ('arrangement-v2', 'boundaries-v3'):
    plan = json.loads(Path(f'renders/voice-{version}/remix.experimental.score.json').read_text())
    values = []
    for clip in plan['voice_clips'][1:]:
        end = clip['end_frame']
        power = np.mean(original[max(0,end-rate//100):min(len(original),end+rate//100)]**2)
        values.append({'duration_ms': (end-clip['start_frame'])*1000/rate,
                       'end_window_rms': float(np.sqrt(power)), 'boundary_confidence': clip['confidence']})
    ends[version] = {'candidates': values, 'mean_end_window_rms': float(np.mean([v['end_window_rms'] for v in values]))}
assert sum(c['boundary_confidence']==.65 for c in ends['boundaries-v3']['candidates']) == 10

hashes = {'ai_improvisational_musician_master_spec_v1.md': '389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2',
          'renders/fixtures/synthetic-speech.wav': 'c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e',
          'renders/voice-20261017-221411/source-pcm.wav': '7b23204717e1f114ebb25821ba4847416af336278fc0ee22275481d330950427'}
for path, expected in hashes.items():
    assert hashlib.sha256(Path(path).read_bytes()).hexdigest() == expected
for log in ('release.log', 'sanitizer.log', 'linux-release.log', 'mac-smoke.log'):
    text = (out/log).read_text()
    assert '100% tests passed' in text and '7/7' in text
metadata = json.loads(Path('renders/boundaries-smoke-mac/environment.json').read_text())
assert metadata['system']=='Darwin' and metadata['machine']=='arm64' and 'Apple M5' in metadata['cpu_brand']
audition = json.loads((out/'audition-measurements.json').read_text())
assert len(audition)==12 and all(abs(x['lufs']+25)<=.2 and x['true_peak_dbfs'] < -1 for x in audition)
browser = json.loads((out/'browser-check.json').read_text())
assert browser['status']=='PASS' and browser['decoded_players']==12 and browser['exclusive_playback']
report = {'gates': {'native_m5_release': 'PASS', 'native_m5_sanitizers': 'PASS', 'linux_arm64_release': 'PASS',
    'plans_event_frames_and_waveforms': 'PASS', 'block_size_512_113': 'PASS', 'originals_unchanged': 'PASS',
    'clean_hooks_and_unchanged_instrument_stems': 'PASS', 'decoded_audio_and_schema': 'PASS',
    'matched_audition_preparation': 'PASS', 'browser_playback': 'PASS', 'word_boundaries': 'PARTIAL', 'v3_human_listening': 'NOT RUN',
    'formal_quality': 'NOT RUN', 'physical_intel_rerun': 'NOT RUN', 'iphone_ai_live_release': 'NOT RUN'},
    'decoded_wavs': len(measurements), 'cross_os': cross_os, 'blocks': blocks,
    'clean_hook_max_errors': errors, 'previous_revision_waveform_differences': differences,
    'candidate_boundary_metrics': ends, 'measurements': measurements, 'protected_sha256': hashes}
(out/'report.json').write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
(out/'environment.json').write_text(json.dumps(metadata, indent=2)+'\n')
print(json.dumps({'gates': report['gates'], 'boundary_mean_rms': {v: ends[v]['mean_end_window_rms'] for v in ends}, 'differences': differences}, indent=2))
