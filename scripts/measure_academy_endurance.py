"""Decode every retained set with bounded memory; no musical-quality inference.

Run with the existing .venv-analysis Python (NumPy), after academy-endurance.mjs.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def quiet_runs(quiet, prior):
    edges = np.flatnonzero(np.diff(np.r_[False, quiet, False].astype(np.int8)))
    lengths = edges[1::2] - edges[::2]
    if len(lengths) and quiet[0]:
        lengths[0] += prior
    return int(lengths.max(initial=0)), int(lengths[-1]) if quiet[-1] else 0


# The streaming boundary must not hide a gap or join silence separated by music.
assert quiet_runs(np.array([True, True, False, True]), 3) == (5, 1)
assert quiet_runs(np.array([True, True]), 3) == (5, 5)
assert quiet_runs(np.array([False, False]), 3) == (0, 0)


def measure(path):
    receipt = json.loads(path.with_suffix('.json').read_text())
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    assert digest == receipt['sha256'], path
    assert receipt['gaps'] == 0, path
    requested = int(path.stem.rsplit('-', 1)[1])
    assert receipt['seconds'] >= requested, path
    command = ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '2', '-ar', '48000', '-f', 'f32le', '-']
    frames = longest = prior = 0
    peak = 0.0
    with subprocess.Popen(command, stdout=subprocess.PIPE) as decoder:
        while block := decoder.stdout.read(48000 * 8):
            assert len(block) % 8 == 0
            pcm = np.frombuffer(block, dtype='<f4').reshape(-1, 2)
            assert np.isfinite(pcm).all(), path
            levels = np.abs(pcm).max(axis=1)
            peak = max(peak, float(levels.max()))
            run, prior = quiet_runs(levels < .0005, prior)
            longest = max(longest, run)
            frames += len(pcm)
        assert decoder.wait() == 0, path
    seconds = frames / 48000
    assert abs(seconds - receipt['seconds']) < .5, path
    assert .001 < peak < 1, path
    assert longest / 48000 < .2, path
    return dict(file=path.name, sha256=digest, seconds=seconds,
                receipt_seconds=receipt['seconds'], peak_dbfs=float(20*np.log10(peak)),
                longest_quiet_ms=longest/48, timestamp_gaps=0, technical='PASS',
                human_listening='NOT RUN')


if __name__ == '__main__':
    suffix = '-silent' if '--silent' in sys.argv[1:] else ''
    paths = sorted((ROOT/('build-academy-endurance'+suffix)).glob('*.audio'))
    assert paths, 'No completed captures found'
    rows = []
    for path in paths:
        rows.append(measure(path))
        print(json.dumps(rows[-1]), flush=True)
    report = ROOT/('docs/evidence/academy-endurance'+suffix)/'decoded-audio.json'
    report.write_text(json.dumps(rows, indent=2)+'\n')
