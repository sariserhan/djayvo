#!/usr/bin/env python3
"""Verify this revision's local renders; never infer human quality from audio metrics."""
import copy
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import wave

import jsonschema
import numpy as np

sys.path.insert(0, str(Path('scripts').resolve()))
from inspect_wav import inspect
from compare_portability import compare, load_audio

out = Path('docs/evidence/arrangement-review')
private = Path('renders/voice-arrangement-v2')
styles = ('hiphop', 'reggae', 'experimental')
measurements = {}
for path in sorted(private.glob('*.wav')):
    item = inspect(path)
    assert item['full_scale_samples'] == 0 and item['peak_dbfs'] <= -1
    assert item['last_100ms_peak'] == 0 and 20 <= item['duration_seconds'] <= 40
    item['file'] = path.name
    measurements[path.name] = item
assert len(measurements) == 22, 'Expected nine masters, twelve stems, and a baseline'

schema = json.loads(Path('schemas/remix-plan.schema.json').read_text())
validator = jsonschema.Draft202012Validator(schema)
plans = list(private.glob('*.score.json')) + list(Path('renders/arrangement-smoke-mac').glob('*.score.json'))
for path in plans:
    p = json.loads(path.read_text())
    validator.validate(p)
    bad = copy.deepcopy(p)
    bad['mix']['instrument_room_mix'] = .36
    assert list(validator.iter_errors(bad)), 'Schema accepts an excessive room level'
    del bad['mix']['instrument_room_mix']
    validator.validate(bad)  # Earlier exports remain structurally valid.

with wave.open('renders/voice-20261017-221411/source-pcm.wav') as f:
    assert f.getframerate() == 48000 and f.getsampwidth() == 2
    original = np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').reshape(-1, f.getnchannels()).mean(axis=1)/32768

hook_errors, sections = {}, {}
for style in styles:
    p = json.loads((private/f'remix.{style}.score.json').read_text())
    rate, frames, pcm = load_audio(private/f'remix.{style}.vocals.wav')
    vocals = np.asarray(pcm).reshape(-1, 2)/32768
    hooks = [e for e in p['voice_events'] if e['clean']]
    assert len(hooks) == 2
    errors = []
    for hook in hooks:
        denom = p['tempo_milli_bpm']*960
        start = (hook['start_tick']*rate*60000+denom//2)//denom
        gain = 10**(hook['gain_db']/20)*p['analysis']['normalization_gain']*2**-.5
        error = np.max(np.abs(vocals[start+200:start+len(original)-200, 0]-original[200:-200]*gain))
        assert error < 2/32768
        errors.append(float(error))
    hook_errors[style] = errors
    sections[style] = {}
    for instrument in ('bass', 'drums'):
        _, _, pcm = load_audio(private/f'remix.{style}.{instrument}.wav')
        audio = np.asarray(pcm, dtype=np.float64).reshape(-1, 2)/32768
        levels = {}
        for section in p['sections']:
            start = section['start_bar']*4*60/(p['tempo_milli_bpm']/1000)
            end = (section['start_bar']+section['bars'])*4*60/(p['tempo_milli_bpm']/1000)
            # Exclude one second of inherited instrument release/reflections.
            part = audio[round((start+1)*rate):round((end-.1)*rate)]
            energy = np.mean(part**2)
            levels[section['name']] = 10*math.log10(energy) if energy else None
        assert levels['break'] is None, 'Rhythm stem does not clear during the break'
        assert levels['return'] is not None and levels['return'] > -65, 'Rhythm section never returns'
        sections[style][instrument] = levels

portability, block = {}, {}
for style in styles:
    portability[style] = compare(Path(f'renders/arrangement-linux/remix.{style}'), Path(f'renders/arrangement-smoke-mac/remix.{style}'))
    block[style] = compare(Path(f'renders/arrangement-smoke-mac/remix.{style}'), Path(f'renders/arrangement-block113/remix.{style}'))
    for stem in ('piano', 'bass', 'drums', 'vocals'):
        name = f'remix.{style}.{stem}.wav'
        a = Path('renders/arrangement-linux', name).read_bytes()
        b = Path('renders/arrangement-smoke-mac', name).read_bytes()
        assert a == b, f'Linux/Mac stem differs: {name}'

expected = {'ai_improvisational_musician_master_spec_v1.md': '389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2',
            'renders/fixtures/synthetic-speech.wav': 'c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e'}
for name, digest in expected.items():
    assert hashlib.sha256(Path(name).read_bytes()).hexdigest() == digest
# Guard the actual recordings before any build or render in the smoke entry point.
protected = Path('renders/voice-20261017-221411/source-pcm.wav')
before = hashlib.sha256(protected.read_bytes()).hexdigest()
import os
result = subprocess.run(['sh', 'scripts/mac_smoke.sh'], env={**os.environ, 'DJAYVO_OUTPUT_DIR': str(protected.parent)}, capture_output=True, text=True)
assert result.returncode != 0 and 'preserving recordings' in result.stderr
assert hashlib.sha256(protected.read_bytes()).hexdigest() == before

report = {'gates': {'decoded_audio_bounds_and_tails': 'PASS', 'two_clean_hooks_each_style': 'PASS',
    'rhythm_subtraction_and_return': 'PASS', 'schema_and_room_limits': 'PASS',
    'linux_arm64_vs_native_m5': 'PASS', 'block_512_vs_113': 'PASS',
    'master_spec_and_supplied_fixture_unchanged': 'PASS', 'smoke_overwrite_guard': 'PASS',
    'human_listening': 'NOT RUN', 'formal_quality': 'NOT RUN'},
    'decoded_files': len(measurements), 'schema_validated_scores': len(plans),
    'clean_hook_maximum_pcm_errors': hook_errors, 'section_instrument_rms_dbfs': sections,
    'cross_os': portability, 'block_size': block, 'all_twelve_cross_os_stems_byte_identical': True,
    'measurements': measurements}
for name, log in (('native_m5_release', 'release.log'), ('native_m5_sanitizers', 'sanitizer.log'),
                  ('linux_arm64_release', 'linux-release.log')):
    text = (out/log).read_text()
    assert '100% tests passed' in text and '7/7' in text
    report['gates'][name] = 'PASS'
assert json.loads((out/'portability-report.json').read_text())['apple_m5_gate'] == 'PASS'
assert json.loads((out/'browser-check.json').read_text())['status'] == 'PASS'
audition = json.loads((out/'audition-measurements.json').read_text())
assert len(audition) == 15 and all(abs(x['lufs']+25) <= .2 and x['true_peak_dbfs'] < -1 for x in audition)
report['gates'].update({'matched_audition_and_browser_controls': 'PASS', 'original_owner_feedback': 'PARTIAL',
    'original_intel_machine_rerun': 'NOT RUN', 'iphone_live_ai_and_release': 'NOT RUN'})
(out/'report.json').write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ('measurements','section_instrument_rms_dbfs')}, indent=2))
