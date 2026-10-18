"""Verify the rendered timeline comparisons; run with .venv-analysis/bin/python."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import wave
import numpy as np
import jsonschema

sys.path.insert(0, 'scripts')
from compare_portability import compare
from prepare_voice_transforms import frame_at
from review_cloud_music import loudness
from verify_export import verify_export

root = Path('renders/timeline-20261018')
linux = Path('renders/arrangement-linux/timeline-20261018')
evidence = Path('docs/evidence/timeline')
schema = json.loads(Path('schemas/remix-plan.schema.json').read_text())
names = ('control', 'tempo', 'mix', 'combined')
suffixes = ('.wav', '.piano.wav', '.bass.wav', '.drums.wav', '.vocals.wav')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pcm(path):
    with wave.open(str(path)) as f:
        assert (f.getsampwidth(), f.getnchannels(), f.getframerate()) == (2, 2, 48000)
        return np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').astype(np.float64).reshape(-1, 2)/32768


report = {'portability': {}, 'waveforms': {}, 'owner_changes': {}, 'matched_review': {}}
cases = [(n, 'hiphop') for n in names] + [('fixture', s) for s in ('hiphop', 'reggae', 'experimental')] + [('club', 'club')]
for name, style in cases:
    verify_export(root/name)
    verify_export(linux/name)
    prefix = f'{name}.{style}'
    report['portability'][prefix] = compare(linux/prefix, root/prefix)
    jsonschema.validate(json.loads((root/f'{prefix}.score.json').read_text()), schema)
    for suffix in suffixes:
        path = root/f'{prefix}{suffix}'
        assert digest(path) == digest(linux/path.name)
        data = pcm(path)
        peak = float(np.abs(data).max())
        assert peak < 10**(-1/20) and np.all(data[-4800:] == 0)
        report['waveforms'][path.name] = {'sha256': digest(path), 'frames': len(data),
            'sample_peak': peak, 'final_100ms_silent': True}

control = pcm(root/'control.hiphop.wav')
voice = pcm(root/'control.hiphop.vocals.wav')
base = json.loads((root/'control.hiphop.score.json').read_text())
for name in names:
    plan = json.loads((root/f'{name}.hiphop.score.json').read_text())
    data = pcm(root/f'{name}.hiphop.wav')
    vocals = pcm(root/f'{name}.hiphop.vocals.wav')
    assert plan['voice_clips'] == base['voice_clips'] and plan['voice_events'] == base['voice_events']
    assert np.array_equal(voice[:960000], vocals[:960000]), 'unchanged clean-hook region changed PCM'
    if name == 'mix':
        assert np.array_equal(voice, vocals), 'instrument automation changed voice'
    count = min(len(data), len(control))
    difference = data[:count]-control[:count]
    report['owner_changes'][name] = {'frames': len(data), 'common_prefix_frames': count,
        'comparison': 'same absolute frames; unequal tails excluded, no time alignment',
        'maximum_pcm_difference': float(np.abs(difference).max()),
        'rms_pcm_difference': float(np.sqrt(np.mean(difference**2))),
        'unchanged_voice_first_20_seconds': True,
        'voice_event_frames': [frame_at(plan, e['start_tick']) for e in plan['voice_events']]}

for suffix in suffixes:
    assert digest(root/f'control.hiphop{suffix}') == digest(Path(f'renders/hiphop-diversity-20261018/after-4123.hiphop{suffix}'))
for name, style in cases[4:]:
    for suffix in suffixes:
        assert digest(root/f'{name}.{style}{suffix}') == digest(Path(f'renders/hiphop-diversity-20261018/{name}.{style}{suffix}'))
    report.setdefault('wasm', {})[style] = compare(root/f'{name}.{style}', root/f'wasm/mix.{style}')
report['unchanged_legacy_wavs'] = 25
report['cross_platform_identical_wavs'] = 40
protected = ('ai_improvisational_musician_master_spec_v1.md', 'renders/fixtures/synthetic-speech.wav',
             'renders/voice-20261017-221411/source-pcm.wav')
report['preserved_sha256'] = {p: digest(Path(p)) for p in protected}
assert report['preserved_sha256'] == json.loads(Path('docs/evidence/plan-import/report.json').read_text())['preserved_sha256']

review = root/'review'
review.mkdir()
levels = {n: loudness(root/f'{n}.hiphop.wav') for n in names}
target = min(-22., *(v['lufs']-v['true_peak_dbfs']-2 for v in levels.values()))
cards = []
labels = {'control': 'Control', 'tempo': 'Tempo changes', 'mix': 'Level and stereo movement', 'combined': 'Both changes'}
for name in names:
    gain = target-levels[name]['lufs']
    destination = review/f'{name}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-n', '-i', str(root/f'{name}.hiphop.wav'),
        '-af', f'volume={gain}dB', '-c:a', 'pcm_s16le', str(destination)], check=True)
    measured = loudness(destination)
    assert abs(measured['lufs']-target) <= .2 and measured['true_peak_dbfs'] <= -1.8
    report['matched_review'][name] = {'original': levels[name], 'gain_db': gain, 'matched': measured,
                                     'sha256': digest(destination)}
    cards.append(f'<section><h2>{labels[name]}</h2><p>Mix</p><audio controls preload="metadata" aria-label="{labels[name]} mix" src="{name}.wav"></audio>'
        f'<p>Voice alone · original level</p><audio controls preload="metadata" aria-label="{labels[name]} voice" src="../{name}.hiphop.vocals.wav"></audio></section>')
(review/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Djayvo tempo and mix movement</title>'
    '<style>body{max-width:760px;margin:40px auto;padding:0 20px;font:18px/1.5 system-ui;background:#151515;color:#eee}'
    'audio{width:100%}section{margin:32px 0}</style><h1>Djayvo tempo and mix movement</h1>'
    '<p>Listen from 0:10 for the quieter break and stereo movement, then from 0:20 for the tempo change and return. '
    'The tempo versions speed up to 108 BPM and then slow to 84 BPM. The original clean hooks stay intact.</p>'
    '<p>Private owner review. Mixes are loudness matched; isolated voices retain their original level. '
    'These are labeled demonstrations, not blinded quality results. Musical quality remains unrated.</p>'+''.join(cards)+
    '<script>document.addEventListener("play",e=>{document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>')
report.update(human_listening='NOT RUN', production_quality='PARTIAL', cloud_calls=0)
(evidence/'measurements.json').write_text(json.dumps(report, indent=2)+'\n')
print('PASS: 40 exact M5/Linux WAVs; 25 unchanged legacy WAVs; voice preservation; four matched private mixes')
