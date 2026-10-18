#!/usr/bin/env python3
"""Verify retained workflow artifacts; human feedback is recorded separately."""
import hashlib
import json
from pathlib import Path
import sys
import jsonschema
import numpy as np
sys.path.insert(0, str(Path('scripts').resolve()))
from compare_portability import compare, load_audio, structural_plan
from inspect_wav import inspect
from verify_export import verify_export

out = Path('docs/evidence/workflow-hardening')
styles = ('hiphop', 'reggae', 'experimental')
mac = Path('renders/workflow-smoke-mac/remix')
linux = Path('renders/arrangement-linux/workflow-v5/remix')
owner = Path('renders/workflow-voice-v5/remix')
session = Path('renders/recording-workflow-v5')
prefixes = [mac, linux, owner, Path('renders/arrangement-linux/workflow-v5/voice'),
            Path('renders/workflow-block113-v5/remix'), Path('renders/workflow-extensible-v5/remix'),
            session/'remix', session/'control', Path('renders/workflow-ci-mac/remix'),
            Path('renders/arrangement-linux/workflow-v5/ci/remix')]
completion_schema = json.loads(Path('schemas/export-completion.schema.json').read_text())
plan_schema = json.loads(Path('schemas/remix-plan.schema.json').read_text())
counts = {}
for prefix in prefixes:
    record = verify_export(prefix)
    jsonschema.Draft202012Validator(completion_schema).validate(record)
    counts[str(prefix)] = len(record['artifacts'])
    for item in record['artifacts']:
        if item['suffix'].endswith('.score.json'):
            jsonschema.Draft202012Validator(plan_schema).validate(json.loads(Path(str(prefix)+item['suffix']).read_text()))

cross_os, blocks, extensible, previous = {}, {}, {}, {}
for style in styles:
    cross_os[style] = compare(Path(f'{linux}.{style}'), Path(f'{mac}.{style}'))
    cross_os['owner_'+style] = compare(Path(f'renders/arrangement-linux/workflow-v5/voice.{style}'), Path(f'{owner}.{style}'))
    blocks[style] = compare(Path(f'{owner}.{style}'), Path(f'renders/workflow-block113-v5/remix.{style}'))
    previous[style] = compare(Path(f'renders/voice-articulation-v4/remix.{style}'), Path(f'{owner}.{style}'))
    a = json.loads(Path(f'{owner}.{style}.score.json').read_text())
    b = json.loads(Path(f'renders/workflow-extensible-v5/remix.{style}.score.json').read_text())
    aa, bb = structural_plan(a), structural_plan(b)
    del aa['source_asset_id'], bb['source_asset_id']  # Container hashes differ; decoded audio is identical.
    assert aa == bb and a['analysis'] == b['analysis']
    assert Path(f'{owner}.{style}.events.tsv').read_bytes() == Path(f'renders/workflow-extensible-v5/remix.{style}.events.tsv').read_bytes()
    for stem in ('', '.piano', '.bass', '.drums', '.vocals'):
        current = Path(f'{owner}.{style}{stem}.wav').read_bytes()
        assert current == Path(f'renders/voice-articulation-v4/remix.{style}{stem}.wav').read_bytes()
        assert current == Path(f'renders/workflow-extensible-v5/remix.{style}{stem}.wav').read_bytes()
        assert Path(f'{mac}.{style}{stem}.wav').read_bytes() == Path(f'{linux}.{style}{stem}.wav').read_bytes()
    extensible[style] = {'status': 'PASS', 'plan_decisions_except_container_hash': 'PASS', 'event_frames': 'PASS',
                         'identical_master_and_stems': 5, 'maximum_pcm_error': 0, 'rms_pcm_error': 0}

measurements = {p.name: inspect(p) for p in session.glob('*.wav') if p.name != 'source.wav'}
assert len(measurements) == 16
for item in measurements.values():
    assert item['full_scale_samples'] == 0 and item['peak_dbfs'] <= -1
    assert item['last_100ms_peak'] == 0 and 20 <= item['duration_seconds'] <= 40
rate_a, frames_a, old = load_audio(Path('renders/voice-20261017-221411/source-pcm.wav'))
rate_b, frames_b, new = load_audio(session/'source.wav')
assert (rate_a, frames_a) == (rate_b, frames_b) == (48000, 233376)
delta = (np.asarray(old, dtype=float)-np.asarray(new, dtype=float))/32768
conversion = {'status': 'PASS', 'frames': frames_b, 'duration_seconds': frames_b/rate_b,
              'maximum_pcm_difference_from_afconvert': float(np.max(np.abs(delta))),
              'rms_pcm_difference_from_afconvert': float(np.sqrt(np.mean(delta**2))),
              'note': 'Decoder comparison, not an asserted cross-platform equivalence tolerance.'}
hashes = {'ai_improvisational_musician_master_spec_v1.md': '389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2',
          'renders/fixtures/synthetic-speech.wav': 'c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e',
          'renders/voice-20261017-221411/source.wav': 'e3ce91d30e6a0e3f49caa85958c19f71c47e0b97276d40d3fc84089db17d5e0b',
          'renders/voice-20261017-221411/source-pcm.wav': '7b23204717e1f114ebb25821ba4847416af336278fc0ee22275481d330950427',
          '~/Downloads/djayvo-my-voice.m4a': '24059b23a8a9b6f0de55b5854feee81675c31cbf92b305ce5dac5052a0547ec4'}
for path, expected in hashes.items():
    assert hashlib.sha256(Path(path).expanduser().read_bytes()).hexdigest() == expected
for log in ('release.log', 'sanitizer.log', 'linux-release.log', 'mac-smoke.log'):
    text = (out/log).read_text()
    assert '100% tests passed' in text and '7/7' in text
assert 'PASS' in (out/'import-test.log').read_text()
assert 'PASS' in (out/'listening-preparation.log').read_text()
benchmark = json.loads((out/'benchmark.json').read_text())
assert benchmark['status'] == 'PASS' and len(benchmark['cases']) == 11
assert sum(len(x['trials']) for x in benchmark['cases']) == 33
browser = json.loads((out/'browser-check.json').read_text())
assert browser['status'] == 'PASS' and browser['decoded_players'] == 3 and browser['exclusive_playback']
ci = json.loads((out/'ci-local-comparison.json').read_text())
assert ci['comparison_gate'] == 'PASS'
metadata = json.loads(Path('renders/workflow-smoke-mac/environment.json').read_text())
assert metadata['system'] == 'Darwin' and metadata['machine'] == 'arm64' and metadata['cpu_brand'] == 'Apple M5'
report = {'gates': {'native_m5_release': 'PASS', 'native_m5_sanitizers': 'PASS', 'linux_arm64_release': 'PASS',
    'plans_event_frames_and_waveforms': 'PASS', 'block_size_512_113': 'PASS', 'preserved_v4_audio': 'PASS',
    'protected_inputs': 'PASS', 'complete_export_hashes_and_schemas': 'PASS', 'cancel_collision_and_interruption': 'PASS',
    'extensible_wav': 'PASS', 'local_m4a_workflow': 'PASS', 'decoded_audio': 'PASS', 'browser_playback': 'PASS',
    'blinded_pilot_preparation': 'PASS', 'offline_benchmark': 'PASS', 'ci_local_recipe': 'PASS', 'hosted_ci': 'NOT RUN',
    'owner_v4_piano_drums_feedback': 'PASS', 'production_instrument_realism': 'PARTIAL', 'formal_quality': 'NOT RUN',
    'physical_intel_rerun': 'NOT RUN', 'iphone_ai_live_release': 'NOT RUN'},
    'owner_feedback': {'quote': 'they are fine', 'scope': 'Reply to v4 piano/drum comparison question; no per-style scores or timestamps.',
                       'date': '2026-10-17', 'formal_evaluation': False},
    'cross_os': cross_os, 'blocks': blocks, 'previous_v4': previous, 'extensible': extensible,
    'cross_os_identical_wavs': 18, 'unchanged_v4_owner_wavs': 15, 'verified_artifact_counts': counts,
    'm4a_conversion': conversion, 'm4a_provenance': json.loads((session/'source-provenance.json').read_text()),
    'measurements': measurements, 'protected_sha256': hashes}
(out/'report.json').write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
(out/'environment.json').write_text(json.dumps(metadata, indent=2)+'\n')
print(json.dumps({'gates': report['gates'], 'conversion': conversion}, indent=2))
