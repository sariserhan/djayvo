#!/usr/bin/env python3
"""Check that the full-mix waveform change is explained by the guitar alone."""
import json
from pathlib import Path
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'scripts'))
from q0_audit import digest, write
from q0_measure_comparisons import pcm

evidence = Path(__file__).parent
report = json.loads((evidence/'report.json').read_text())
measurements = json.loads((evidence/'measurements.json').read_text())
trial = ROOT/'renders/q0-guitar-mix-20261020'
prior = ROOT/'renders/q0-phrase-form-20261020'
for name, sha in measurements['trial_file_sha256'].items():
    assert digest(trial/name) == sha, name
for name, sha in json.loads((evidence/'preservation.json').read_text()).items():
    assert digest(ROOT/name) == sha, name
rows = []
for row in report['records']:
    prefix = row['id']+'/candidate.'+row['style']
    buffers = []
    for root, suffix in [(prior,'.wav'), (trial,'.wav'), (prior,'.guitar.wav'), (trial,'.guitar.wav')]:
        rate, samples = pcm(root/(prefix+suffix))
        assert rate == 48000
        buffers.append(np.asarray(samples,dtype=np.float64))
    before, after, guitar_before, guitar_after = buffers
    assert len({len(x) for x in buffers}) == 1
    # Four independently quantized PCM16 files; permit rounding and float summation error.
    residual = (after-before)-(guitar_after-guitar_before)
    maximum = float(abs(residual).max())
    assert maximum <= 3, (row['id'],maximum)
    rows.append({'id': row['id'], 'max_pcm16_residual': maximum,
        'rms_pcm16_residual': float(np.sqrt(np.mean(residual**2))),
        'master_rms_change_db': float(10*np.log10(np.sum(after**2)/np.sum(before**2)))})
write(evidence/'mix-isolation.json', {'technical':'PASS', 'human_quality':'NOT RUN',
    'method':'Candidate minus control master compared with candidate minus control guitar stem',
    'tolerance_pcm16_units':3,'records':rows,
    'limits':'Verifies source of waveform change; does not rank musical quality or prove subjective balance.'})
print('PASS: five master changes explained by guitar; maximum residual',
      max(r['max_pcm16_residual'] for r in rows),'PCM16 units')
