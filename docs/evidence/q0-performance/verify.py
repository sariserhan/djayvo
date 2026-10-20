#!/usr/bin/env python3
"""Recheck retained Q0 artifacts and reproduce descriptive sample-attack measurements."""
import json
from pathlib import Path
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'scripts'))
from q0_audit import digest, inputs, write
from q0_measure_comparisons import pcm

out = Path(__file__).parent
trial = ROOT/'renders/q0-performance-20261020'
wasm = ROOT/'renders/q0-performance-wasm-v3-20261020'
assert not (trial/'INCOMPLETE').exists() and not (wasm/'INCOMPLETE').exists()
inputs()
measurements = json.loads((out/'measurements.json').read_text())
for name, sha in measurements['trial_file_sha256'].items():
    assert digest(trial/name) == sha, name
wasm_report = json.loads((out/'wasm-report.json').read_text())
for name, sha in wasm_report['files_sha256'].items():
    assert digest(wasm/name) == sha, name
preserved = json.loads((ROOT/'docs/evidence/q0-guitar-single/report.json').read_text())['preserved_sha256']
for name, sha in preserved.items():
    assert digest(ROOT/name) == sha, name
for path in trial.glob('*/*.report.json'):
    report = json.loads(path.read_text())
    assert report['limited_samples'] == report['nonfinite_samples'] == 0, path
rows = []
for path in sorted((ROOT/'renders/q0-instrument-probes-20261020').glob('*-long.wav')):
    rate, values = pcm(path)
    x = np.asarray(values, dtype=np.float64).reshape(-1, 2)[:rate//4]
    onset = np.flatnonzero(np.max(np.abs(x), axis=1) > 10)
    assert len(onset), path
    hop = rate//1000
    rms = np.sqrt(np.mean(x[:len(x)//hop*hop].reshape(-1, hop, 2)**2, axis=(1, 2)))
    peak = float(rms.max()); first = np.flatnonzero(rms >= peak*.5)
    assert len(first), path
    rows.append({'instrument': path.stem.removesuffix('-long'), 'sha256': digest(path), 'velocity': 40,
        'first_above_10_pcm16_units_ms': float(onset[0]*1000/rate),
        'first_1ms_window_at_half_250ms_peak_rms_ms': int(first[0]), 'peak_1ms_rms_pcm16': peak})
assert len(rows) == 7
write(out/'attack-measurements.json', {'status': 'PASS',
    'method': 'First scheduled note at frame zero, velocity40, 1.5s gate; first250ms measured. Half-peak is a relative RMS threshold, not a perceptual onset or speaker latency.',
    'records': rows, 'human_timing': 'NOT RUN'})
print('PASS: native/WASM inventory, source permissions, frozen core/specs, zero limiting/nonfinite samples, seven attack measurements')
