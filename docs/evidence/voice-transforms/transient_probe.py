"""One-shot analytical pulse probe; never regenerates the supplied speech fixture."""
import copy
import json
from pathlib import Path
import subprocess
import wave
import numpy as np

root = Path('renders/voice-transforms-20261018/transients-v2')
root.mkdir(exist_ok=False)
rate = 48000
time = np.arange(rate * 3) / rate
signal = sum(0.1 * np.exp(-0.5 * ((time - center) / 0.0004)**2) for center in (0.2, 0.5, 0.8))
# The separate voiced calibration region lets the speech input gate accept this analytical source.
signal += .1 * np.sin(2*np.pi*220*time) * ((time>=1.5)&(time<2.5))
with wave.open(str(root / 'three-pulses.wav'), 'wb') as out:
    out.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
    out.writeframes(np.rint(signal * 32767).astype('<i2').tobytes())
base_command = ['build-mac/djayvo_remix', '--input', str(root / 'three-pulses.wav'),
                '--synthetic-fixture', '--style', 'hiphop', '--seed', '4123']
subprocess.run([*base_command, '--output', str(root/'rules')], check=True)
plan = json.loads((root/'rules.hiphop.score.json').read_text())
plan['voice_clips'] = [{'id': 0, 'start_frame': 0, 'end_frame': rate*3, 'confidence': 1},
                       {'id': 1, 'start_frame': 0, 'end_frame': rate, 'confidence': 1}]
plan['voice_events'] = [{'start_tick': 0, 'clip_id': 1, 'gain_db': -6, 'rate': 1, 'reverse': False, 'pan': 0, 'clean': False},
                        {'start_tick': 9600, 'clip_id': 0, 'gain_db': -6, 'rate': 1, 'reverse': False, 'pan': 0, 'clean': True}]
results = []
for name, pitch, stretch in [('control', 0, 1), ('pitch-up', 2, 1), ('longer', 0, 1.12), ('lower-shorter', -2, .9)]:
    current = copy.deepcopy(plan)
    if pitch or stretch != 1:
        current['schema_version'] = '1.1-remix'
        current['voice_events'][0].update(pitch_semitones=pitch, time_stretch=stretch)
    path = root / f'{name}.json'
    path.write_text(json.dumps(current))
    subprocess.run([*base_command, '--output', str(root/name), '--plan', str(path), '--stems'], check=True)
    with wave.open(str(root/f'{name}.hiphop.vocals.wav')) as audio:
        pcm = np.frombuffer(audio.readframes(round(rate*stretch)), dtype='<i2').reshape(-1, 2)[:, 0].astype(float)/32768
    active = np.flatnonzero(np.abs(pcm) > np.max(np.abs(pcm)) * .2)
    groups = np.split(active, np.flatnonzero(np.diff(active) > rate*.005)+1)
    peaks = [int(g[np.argmax(np.abs(pcm[g]))]) / rate for g in groups if len(g)]
    expected = np.array([.2, .5, .8]) * stretch
    results.append({'case': name, 'detected_pulses': len(peaks), 'peak_times_seconds': peaks,
                    'nominal_times_seconds': expected.tolist(),
                    'maximum_displacement_ms': float(np.max(np.abs(np.array(peaks)-expected))*1000) if len(peaks)==3 else None,
                    'count_preservation': 'PASS' if len(peaks)==3 else 'FAIL'})
report = {'probe': 'three original Gaussian pulses, 0.4 ms standard deviation; peaks above 20% output peak, groups separated by 5 ms',
          'cases': results, 'speech_intelligibility': 'NOT RUN', 'general_transient_preservation': 'PARTIAL'}
Path('docs/evidence/voice-transforms/transients.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
