#!/usr/bin/env python3
"""Measure the locally generated talk/percussion demos without listening claims."""
from pathlib import Path
import json, hashlib, wave
import numpy as np
from scipy import signal
folder = Path('renders/talk-performance-20261018')
report = {'status': 'PASS', 'human_listening': 'NOT RUN', 'files': {}, 'vowels': []}
for name in ['talk-bass-vowels', 'new-percussion', 'studio-jam']:
    path = folder / f'{name}.wav'
    with wave.open(str(path), 'rb') as wav:
        rate = wav.getframerate()
        audio = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').reshape(-1, 2).astype(np.float64) / 32768
    assert rate == 48000 and np.isfinite(audio).all()
    assert 0 < np.max(abs(audio)) < .8 and np.count_nonzero(abs(audio) >= 1) == 0
    report['files'][name] = {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'frames': len(audio), 'rate': rate,
        'peak_dbfs': float(20*np.log10(np.max(abs(audio)))), 'rms_dbfs': float(10*np.log10(np.mean(audio**2))),
        'dc_mean': float(np.mean(audio)), 'maximum_step': float(np.max(abs(np.diff(audio, axis=0)))), 'clipped_samples': 0}
    if name == 'talk-bass-vowels':
        for position, start in [('OO', .5), ('AH', 1.5), ('EE', 2.5)]:
            samples = audio[int(start*rate):int((start+.4)*rate), 0]
            frequencies = np.fft.rfftfreq(len(samples), 1/rate)
            power = abs(np.fft.rfft(samples*np.hanning(len(samples))))**2
            ac = signal.fftconvolve(samples, samples[::-1], mode='full')[len(samples)-1:]
            first, last = int(rate/100), int(rate/40)
            lag = first+np.argmax(ac[first:last])
            pitch = rate/lag
            assert abs(pitch - 65.4064) < .3
            report['vowels'].append({'shape': position, 'measured_fundamental_hz': pitch,
                'expected_note': 'C2', 'expected_fundamental_hz': 65.4064,
                'spectral_centroid_hz': float(np.sum(frequencies*power)/np.sum(power))})
assert report['vowels'][1]['spectral_centroid_hz'] > report['vowels'][0]['spectral_centroid_hz']+100
assert report['vowels'][1]['spectral_centroid_hz'] > report['vowels'][2]['spectral_centroid_hz']+100
Path('docs/evidence/talk-bass/demo-measurements.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
