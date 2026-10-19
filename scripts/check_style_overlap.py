#!/usr/bin/env python3
"""Local waveform-reuse diagnostic; not a perceptual novelty or quality test."""
import argparse
import hashlib
import json
from itertools import combinations
from pathlib import Path
import platform
import subprocess
import time

import numpy as np
import scipy
from scipy.signal import correlate

ROOT = Path('renders/style-training-20261018')
RATE = 4000
WINDOW = 2 * RATE
HOP = RATE
THRESHOLD = .8
MIN_VARIANCE = 1e-8  # Ignore centered RMS below -80 dBFS.


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decode(path, expected):
    if digest(path) != expected:
        raise ValueError(f'Checksum mismatch: {path.name}')
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(path),
                                   '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'], timeout=60)
    data = np.frombuffer(raw, dtype='<f4').astype(np.float64)
    if len(data) != 30 * RATE or not np.isfinite(data).all():
        raise ValueError(f'Invalid decoded 30-second audio: {path.name}')
    return data


def best_match(query, target, first=0):
    """Absolute centered normalized correlation at every valid target offset."""
    query = np.asarray(query, dtype=np.float64)
    target = np.asarray(target, dtype=np.float64)
    if query.ndim != 1 or target.ndim != 1 or not len(query) or first < 0:
        raise ValueError('Expected nonempty mono query and nonnegative offset')
    if not np.isfinite(query).all() or not np.isfinite(target).all():
        raise ValueError('Nonfinite audio')
    size = len(query)
    if first + size > len(target):
        return None
    centered = query - query.mean()
    energy = centered @ centered
    if energy / size < MIN_VARIANCE:
        return None
    sums = np.r_[0., np.cumsum(target)]
    squares = np.r_[0., np.cumsum(target * target)]
    variance = np.maximum(0, squares[size:] - squares[:-size] -
                          (sums[size:] - sums[:-size]) ** 2 / size)
    valid = variance >= MIN_VARIANCE * size
    valid[:first] = False
    if not valid.any():
        return None
    numerator = correlate(target, centered, mode='valid', method='fft')
    scores = np.full(len(variance), -1.)
    scores[valid] = np.minimum(1, np.abs(numerator[valid]) / np.sqrt(energy * variance[valid]))
    offset = int(np.argmax(scores))
    return {'correlation': float(scores[offset]), 'target_seconds': offset / RATE}


def scan(query, target, same_file=False):
    # shortcut: fixed-rate mono waveform matching misses transformed melodic reuse;
    # add perceptual assessment before making novelty or release claims.
    rows = []
    for start in range(0, len(query) - WINDOW + 1, HOP):
        match = best_match(query[start:start + WINDOW], target, start + WINDOW if same_file else 0)
        if match is not None:
            rows.append({'query_seconds': start / RATE, **match})
    flagged = [row for row in rows if row['correlation'] >= THRESHOLD]
    intervals = []
    for row in flagged:
        start, stop = row['query_seconds'], row['query_seconds'] + WINDOW / RATE
        if intervals and start <= intervals[-1][1]:
            intervals[-1][1] = max(stop, intervals[-1][1])
        else:
            intervals.append([start, stop])
    return {'eligible_windows': len(rows),
            'strongest': max(rows, key=lambda row: row['correlation']) if rows else None,
            'flagged_windows': flagged, 'flagged_query_intervals_seconds': intervals,
            'flagged_query_coverage_seconds': sum(stop - start for start, stop in intervals)}


def aligned_difference(query, target):
    """Fit gain/DC only, without aligning time; no perceptual-quality interpretation."""
    x, y = np.asarray(query, dtype=np.float64), np.asarray(target, dtype=np.float64)
    if x.ndim != 1 or y.shape != x.shape or not x.size or not np.isfinite(x).all() or not np.isfinite(y).all():
        raise ValueError('Expected equal, finite, nonempty mono signals')
    x, y = x - x.mean(), y - y.mean()
    xx, yy, xy = float(x @ x), float(y @ y), float(x @ y)
    if min(xx, yy) / len(x) < MIN_VARIANCE:
        return None
    gain = xy / xx
    residual = y - gain * x
    return {'signed_correlation': float(np.clip(xy / np.sqrt(xx * yy), -1, 1)),
            'fitted_gain': gain, 'gain_dc_removed_residual_rms': float(np.sqrt(np.mean(residual ** 2))),
            'residual_fraction_of_target_centered_rms': float(np.sqrt((residual @ residual) / yy))}


def calibration():
    rng = np.random.default_rng(51019)
    query = rng.normal(0, .1, WINDOW)
    target = rng.normal(0, .1, 8 * RATE)
    offset = 3 * RATE + 123
    target[offset:offset + WINDOW] = -.3 * query + .02
    copied = best_match(query, target)
    assert copied['correlation'] > .999999
    assert abs(copied['target_seconds'] - offset / RATE) < 1e-10
    target[offset:offset + WINDOW] += rng.normal(0, .005, WINDOW)
    noisy = best_match(query, target)
    assert noisy['correlation'] > THRESHOLD
    unrelated = best_match(query, rng.normal(0, .1, 8 * RATE))
    assert unrelated['correlation'] < THRESHOLD
    assert best_match(np.zeros(WINDOW), target) is None
    assert best_match(query, np.ones(4 * WINDOW)) is None
    assert best_match(query, query, first=1) is None
    assert scan(query, query, same_file=True)['eligible_windows'] == 0
    try:
        best_match(np.array([np.nan]), query)
        raise AssertionError('Accepted NaN')
    except ValueError:
        pass
    small, long = rng.normal(size=17), rng.normal(size=79)
    brute = np.array([abs(np.corrcoef(small, long[i:i + len(small)])[0, 1])
                      for i in range(len(long) - len(small) + 1)])
    actual = best_match(small, long)
    assert abs(actual['correlation'] - brute.max()) < 1e-12
    assert actual['target_seconds'] == int(brute.argmax()) / RATE
    repeated = np.tile(query, 3)
    assert best_match(query, repeated, first=WINDOW)['correlation'] > .999999
    return {'status': 'PASS', 'gain_inverted_dc_shifted_copy': copied,
            'noisy_copy': noisy, 'unrelated_noise': unrelated,
            'brute_force_agreement_silence_nonfinite_nonoverlap': 'PASS'}


def main():
    global ROOT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blood', action='store_true')
    parser.add_argument('--output', type=Path, required=True, help='New JSON evidence path')
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Output exists; preserve earlier evidence')
    started = time.monotonic()
    controls = calibration()  # Fixed controls/threshold run before real audio.
    if args.blood:
        ROOT = Path('renders/blood-training-20261019')
        accepted = json.loads((ROOT / 'train-input/dataset.json').read_text())['samples']
        assert {item['filename'] for item in accepted} == {f'blood-{n:02d}.wav' for n in range(1, 17)}
    else:
        accepted = json.loads((ROOT / 'results/accepted.json').read_text())['samples']
        assert {item['filename'] for item in accepted} == {'x-01.wav', 'x-02.wav', 'x-06.wav', 'y-04.wav', 'y-05.wav'}
    modes = ('base', 'step80', 'step160') if args.blood else ('base', 'adapter')
    comparison = json.loads((ROOT / 'results/comparison.json').read_text())
    cases = comparison['cases']
    assert {c['file'] for c in cases} == {f'{mode}-{name}.wav' for mode in modes
                                        for name in ('bass-a', 'bass-b', 'funk', 'hiphop')}
    inputs = {ROOT / ('train-input' if args.blood else 'headroom') / item['filename']: item['sha256'] for item in accepted}
    inputs.update({ROOT / 'results' / c['file']: c['sha256'] for c in cases})
    signals = {path.name: decode(path, sha) for path, sha in inputs.items()}
    training, repetition, seeds, adapters = [], [], [], []
    for case in cases:
        name = case['file']
        for item in accepted:
            training.append({'output': name, 'training_excerpt': item['filename'],
                             **scan(signals[name], signals[item['filename']])})
        repetition.append({'output': name, **scan(signals[name], signals[name], same_file=True)})
    for mode in modes:
        a, b = f'{mode}-bass-a.wav', f'{mode}-bass-b.wav'
        seeds.append({'query': a, 'target': b, **scan(signals[a], signals[b])})
    for name in ('bass-a', 'bass-b', 'funk', 'hiphop'):
        for left, right in combinations(modes, 2):
            a, b = f'{left}-{name}.wav', f'{right}-{name}.wav'
            adapters.append({'query': a, 'target': b, 'aligned': aligned_difference(signals[a], signals[b]),
                             **scan(signals[a], signals[b])})
    for path, sha in inputs.items():
        assert digest(path) == sha, f'Input changed: {path}'
    report = {'diagnostic_execution': 'PASS', 'copying_and_perceptual_novelty': 'PARTIAL',
              'human_listening': 'NOT RUN', 'production_acceptance': 'NOT RUN',
              'method': {'rate': RATE, 'mono': True, 'window_seconds': WINDOW / RATE,
                         'query_hop_seconds': HOP / RATE, 'target_hop_samples': 1,
                         'absolute_centered_correlation_threshold': THRESHOLD,
                         'minimum_centered_rms_dbfs': -80,
                         'coverage': 'Union of flagged query windows only; excludes later matching target passages and does not double-count overlapping windows.',
                         'aligned_comparison': 'Least-squares gain and DC removal at fixed sample alignment. Correlation and residual are not arrangement, audibility or quality scores.',
                         'limitations': 'No pitch/time invariance, stereo-side search, melody/identity test or proof of originality. Short copies and boundary-straddling copies may be missed. Natural musical repetition can correlate.'},
              'calibration': controls, 'training_overlap': training, 'within_output_repetition': repetition,
              'same_brief_different_seed': seeds, 'inputs_sha256': {str(p): sha for p, sha in inputs.items()},
              'same_brief_checkpoints': adapters,
              'input_preservation': 'PASS', 'holdout' if args.blood else 'holdout_z': 'NOT RUN: excluded from this diagnostic',
              'toolchain': {'python': platform.python_version(), 'numpy': np.__version__,
                            'scipy': scipy.__version__, 'platform': platform.platform(),
                            'ffmpeg': subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0]},
              'script_sha256': digest(Path(__file__)), 'elapsed_seconds': time.monotonic() - started}
    with args.output.open('x') as output:
        output.write(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print(json.dumps({key: {'pairs': len(rows), 'flagged_windows': sum(len(r['flagged_windows']) for r in rows),
                           'maximum_correlation': max(r['strongest']['correlation'] for r in rows if r['strongest'])}
                      for key, rows in [('training', training), ('repetition', repetition), ('seeds', seeds)]}, indent=2))


if __name__ == '__main__':
    main()
