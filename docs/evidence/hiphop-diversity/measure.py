"""Run from repo root with .venv-analysis/bin/python after the documented renders."""
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
from review_cloud_music import loudness
from verify_export import verify_export

root = Path('renders/hiphop-diversity-20261018')
linux = Path('renders/arrangement-linux/hiphop-diversity-20261018')
evidence = Path('docs/evidence/hiphop-diversity')
schema = json.loads(Path('schemas/remix-plan.schema.json').read_text())
suffixes = ['.wav', '.piano.wav', '.bass.wav', '.drums.wav', '.vocals.wav']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pcm(path):
    with wave.open(str(path)) as f:
        assert f.getsampwidth() == 2 and f.getnchannels() == 2 and f.getframerate() == 48000
        return np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').astype(np.float64) / 32768


def body(plan):
    # Exclude voice, intro, velocities and sample takes from the novelty measurement.
    return [(t['instrument'], e['start_tick'], e['duration_ticks'], e['note'])
            for t in plan['tracks'] for e in t['events'] if 7680 <= e['start_tick'] < 23040]


report = {'portability': {}, 'owner_changes': {}, 'waveforms': {}, 'matched_review': {}}
before_shapes, after_shapes = set(), set()
for seed in range(4123, 4127):
    name = f'after-{seed}'
    before = json.loads((root / f'before-{seed}.hiphop.score.json').read_text())
    after = json.loads((root / f'{name}.hiphop.score.json').read_text())
    before_shapes.add(json.dumps(body(before)))
    after_shapes.add(json.dumps(body(after)))
    assert before['voice_events'] == after['voice_events'] and before['voice_clips'] == after['voice_clips']
    assert digest(root / f'before-{seed}.hiphop.vocals.wav') == digest(root / f'{name}.hiphop.vocals.wav')
    difference = pcm(root / f'{name}.hiphop.wav') - pcm(root / f'before-{seed}.hiphop.wav')
    report['owner_changes'][str(seed)] = {'maximum_pcm_difference': float(np.abs(difference).max()),
        'rms_pcm_difference': float(np.sqrt(np.mean(difference**2))), 'voice_plan_and_pcm_identical': True}
assert len(before_shapes) == 1 and len(after_shapes) == 4
report['four_seed_instrumental_body_shapes'] = {'before': 1, 'after': 4,
    'meaning': 'different note pitches/timing/duration, not a perceptual-quality score'}

cases = [(f'after-{s}', 'hiphop') for s in range(4123, 4127)] + [
    ('fixture', s) for s in ('hiphop', 'reggae', 'experimental')] + [('club', 'club'), ('baseline', 'baseline')]
for name, style in cases:
    verify_export(root / name)
    verify_export(linux / name)
    prefix = f'{name}.{style}'
    report['portability'][prefix] = compare(linux / prefix, root / prefix)
    jsonschema.validate(json.loads((root / f'{prefix}.score.json').read_text()), schema)
    for suffix in suffixes:
        path = root / f'{prefix}{suffix}'
        assert digest(path) == digest(linux / path.name)
        data = pcm(path)
        peak = float(np.abs(data).max())
        assert peak < 10**(-1/20) and np.all(data[-9600:] == 0)
        report['waveforms'][path.name] = {'sha256': digest(path), 'frames': len(data)//2, 'sample_peak': peak,
                                         'full_scale_samples': 0, 'final_100ms_silent': True}

for name, style, old in [('fixture', s, f'renders/vocal-echo-smoke-20261018/remix.{s}') for s in ('reggae', 'experimental')] + [
    ('club', 'club', 'renders/vocal-echo-smoke-20261018/club.club'), ('baseline', 'baseline', str(root/'before-baseline.baseline'))]:
    for suffix in suffixes:
        assert digest(root/f'{name}.{style}{suffix}') == digest(Path(old+suffix))
    assert (root/f'{name}.{style}.score.json').read_bytes() == Path(old+'.score.json').read_bytes()
    assert (root/f'{name}.{style}.events.tsv').read_bytes() == Path(old+'.events.tsv').read_bytes()
report['unchanged_styles'] = {'status': 'PASS', 'styles': ['reggae', 'experimental', 'club', 'baseline'], 'identical_wavs': 20}
for style in ('hiphop', 'reggae', 'experimental', 'club'):
    report.setdefault('wasm', {})[style] = compare(root/f'{"club" if style=="club" else "fixture"}.{style}', root/f'wasm/mix.{style}')

protected = ('ai_improvisational_musician_master_spec_v1.md', 'renders/fixtures/synthetic-speech.wav',
             'renders/voice-20261017-221411/source-pcm.wav')
report['preserved_sha256'] = {p: digest(Path(p)) for p in protected}
assert report['preserved_sha256'] == json.loads(Path('docs/evidence/plan-import/report.json').read_text())['preserved_sha256']

# Fresh, matched private listening copies. A failed attempt never overwrites prior audio.
review = root/'review'
review.mkdir()
levels = {f'{version}-{seed}': loudness(root/f'{version}-{seed}.hiphop.wav')
          for seed in range(4123, 4127) for version in ('before', 'after')}
target = min(-22., *(v['lufs'] - v['true_peak_dbfs'] - 2 for v in levels.values()))
cards = []
for seed in range(4123, 4127):
    players = []
    for version in ('before', 'after'):
        name = f'{version}-{seed}'
        destination = review/f'{name}.wav'
        gain = target-levels[name]['lufs']
        subprocess.run(['ffmpeg', '-v', 'error', '-n', '-i', str(root/f'{name}.hiphop.wav'),
                        '-af', f'volume={gain}dB', '-c:a', 'pcm_s16le', str(destination)], check=True)
        measured = loudness(destination)
        assert abs(measured['lufs']-target) <= .2 and measured['true_peak_dbfs'] <= -1.8
        report['matched_review'][name] = {'original': levels[name], 'gain_db': gain, 'matched': measured,
                                          'sha256': digest(destination)}
        players.append(f'<p>{version.title()}</p><audio controls preload="metadata" aria-label="{version} seed {seed}" src="{name}.wav"></audio>')
    cards.append(f'<section><h2>Hip-hop · seed {seed}</h2>'+''.join(players)+'</section>')
(review/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Djayvo hip-hop variety</title>'
    '<style>body{max-width:760px;margin:40px auto;padding:0 20px;font:18px/1.5 system-ui;background:#151515;color:#eee}'
    'audio{width:100%}section{margin:32px 0}</style><h1>Djayvo hip-hop variety</h1>'
    '<p>Four seeds, before and after. Listen from 0:05 for chords, bass and drums, and from 0:20 for the return. '
    'Voice placement stays unchanged. Compare the After versions with each other, too.</p>'
    '<p>Private owner review. Loudness matched; versions are labeled, not blinded. '
    'Musical quality and perceived variety have not been rated.</p>'+''.join(cards)+
    '<script>document.addEventListener("play",e=>{document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>')
report.update(cross_platform_identical_wavs=45, human_listening='NOT RUN', production_quality='PARTIAL', cloud_calls=0)
(evidence/'measurements.json').write_text(json.dumps(report, indent=2)+'\n')
print('PASS: 45 cross-platform WAVs, unchanged voice and other styles, matched private review; listening NOT RUN')
