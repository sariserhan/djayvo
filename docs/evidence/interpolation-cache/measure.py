"""Verify exact cache-change audio, portability, replay and browser evidence."""
import hashlib
import json
from pathlib import Path
import re
import statistics
import subprocess
import sys

root = Path(__file__).resolve().parents[3]
evidence = root / 'docs/evidence/interpolation-cache'
mac = root / 'renders/interpolation-cache-20261019'
linux = root / 'renders/arrangement-linux/interpolation-cache-20261019'
sys.path.insert(0, str(root / 'scripts'))
from compare_portability import compare


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text())


def artifact(log):
    return Path(re.search(r'^Artifacts: (.+)$', log.read_text(), re.M)[1])


reference = (mac / 'mac-before.f32').read_bytes()
assert len(reference) == 6000 * 256 * 4
timings = {}
for platform, folder in [('mac', mac), ('linux', linux)]:
    trials = []
    for trial in range(1, 4):
        for stage in ['before', 'after']:
            prefix = folder / f'{platform}-{stage}-{trial}'
            assert prefix.with_suffix('.f32').read_bytes() == reference
            trials.append({'stage': stage, 'trial': trial, **read(prefix.with_suffix('.json'))})
    medians = {stage: [statistics.median(t['cases'][case]['p50_us'] for t in trials if t['stage'] == stage)
                       for case in range(3)] for stage in ['before', 'after']}
    timings[platform] = {'trials': trials, 'median_note_start_us_by_case': medians}

replays = {}
for platform, folder in [('mac', mac / 'mac-replay'), ('linux', linux / 'replay')]:
    receipt = read(folder / 'comparison.json')
    assert receipt['wavs'] == 75 and len(receipt['plans']) == 14
    assert receipt['maximum_pcm_difference'] == receipt['rms_pcm_difference'] == 0
    replays[platform] = receipt
assert replays['mac'] == replays['linux']

live = mac / 'live-after'
old = root / 'renders/live-deadline-20261019/mac-detailed'
for suffix in ['.f32', '.tsv']:
    assert live.with_suffix(suffix).read_bytes() == old.with_suffix(suffix).read_bytes()
live_report = read(live.with_suffix('.json'))
assert live_report['callback_allocations'] == 0 and live_report['repeats'] == 60

wasm = root / re.search(r'renders/web-wasm-[A-Za-z0-9]+', (evidence / 'wasm.log').read_text())[0]
baseline = root / 'renders/active-vocals-20261019/after'
wasm_cases = {}
for style in ['hiphop', 'reggae', 'experimental', 'club', 'funk', 'call_response', 'hybrid']:
    name = 'fixture' if style in ['hiphop', 'reggae', 'experimental'] else style
    wasm_cases[style] = compare(baseline / f'{name}.{style}', wasm / f'mix.{style}')
    assert (baseline / f'{name}.{style}.wav').read_bytes() == (wasm / f'mix.{style}.wav').read_bytes()
owner = read(evidence / 'owner-wasm.json')
assert owner['status'] == 'PASS' and owner['cases'] == 4

linux_browser = artifact(evidence / 'linux-browser.log')
captures = [artifact(evidence / name) for name in ['mac-chromium.log', 'mac-webkit.log']]
captures += [linux_browser / artifact(linux_browser / f'{browser}.log').name for browser in ['chromium', 'webkit']]
for capture in captures:
    assert read(capture / 'result.json')['hashes']['engine'] == digest(root / 'dist/web/engine/djayvo_live.wasm')
subprocess.run([sys.executable, str(root / 'docs/evidence/worklet-load/measure.py'),
                str(evidence / 'worklet-measurements.json'), *map(str, captures)], check=True)
for i, capture in enumerate(captures):
    with (evidence / f'worklet-{i}.json').open('x') as file:
        json.dump(read(capture / 'result.json'), file, indent=2); file.write('\n')

protected = read(evidence / 'protected-before.json')
assert all(digest(root / name) == sha for name, sha in protected.items())
report = {'status': 'PASS', 'scope': 'exact coefficient reuse and preserved tested output, not overall live readiness',
          'probe_pcm_sha256': digest(mac / 'mac-before.f32'), 'probe_samples_per_run': 1536000,
          'initial_mac_probe': read(mac / 'mac-before.json'), 'microbenchmarks': timings,
          'replay_plans': 14, 'replay_wavs_per_platform': 75, 'replay_event_frames': 'PASS',
          'max_pcm_difference': 0, 'rms_pcm_difference': 0, 'wasm_fixture_cases': wasm_cases,
          'wasm_owner_cases': owner, 'native_load': live_report, 'protected_sha256': protected,
          'files_sha256': {name: digest(root / name) for name in ['core/include/djayvo/audio.h', 'core/instruments/voice.cpp',
              'core/tests/tests.cpp', 'build-mac/libdjayvo_core.a', 'dist/web/engine/djayvo_live.wasm',
              'dist/web/engine/djayvo_web.wasm', 'renders/interpolation-cache-20261019/before.a',
              'renders/interpolation-cache-20261019/before.wasm']},
          'cold_start_solution': 'NOT RUN', 'all_timing_outlier_causes': 'PARTIAL',
          'musical_quality': 'NOT RUN', 'physical_latency': 'NOT RUN', 'production': 'PARTIAL'}
with (evidence / 'measurements.json').open('x') as file:
    json.dump(report, file, indent=2); file.write('\n')
print('PASS exact before/after/Mac/Linux voice PCM, 75 WAVs per platform, 11 remix WASM cases and four real-time browser captures')
