"""Verify rendered funk comparisons; run with .venv-analysis/bin/python."""
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

root = Path('renders/funk-20261018')
linux = Path('renders/arrangement-linux/funk-20261018')
evidence = Path('docs/evidence/funk')
schema = json.loads(Path('schemas/remix-plan.schema.json').read_text())
export_schema = json.loads(Path('schemas/export-completion.schema.json').read_text())
suffixes = ('.wav', '.piano.wav', '.bass.wav', '.drums.wav', '.vocals.wav')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pcm(path):
    with wave.open(str(path)) as f:
        assert (f.getsampwidth(), f.getframerate()) == (2, 48000)
        return np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').astype(np.float64).reshape(-1, f.getnchannels())/32768


report = {'portability': {}, 'waveforms': {}, 'owner_changes': {}, 'matched_review': {}}
cases = [(f'owner-{n}', 'funk') for n in range(4123,4127)] + [
    ('fixture', s) for s in ('hiphop', 'reggae', 'experimental')] + [(s,s) for s in ('club','funk','baseline')]
for name, style in cases:
    jsonschema.validate(verify_export(root/name), export_schema)
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

source = pcm(Path('renders/voice-20261017-221411/source-pcm.wav'))
control = pcm(root/'owner-4123.funk.wav')
shapes = set()
for seed in range(4123,4127):
    name=f'owner-{seed}'
    plan=json.loads((root/f'{name}.funk.score.json').read_text())
    data=pcm(root/f'{name}.funk.wav');vocals=pcm(root/f'{name}.funk.vocals.wav')
    hooks=[]
    for event in plan['voice_events']:
        if not event['clean']:continue
        clip=plan['voice_clips'][event['clip_id']]
        assert clip['start_frame']==0 and clip['end_frame']==len(source)
        begin=frame_at(plan,event['start_tick'])
        expected=source[240:-240]*plan['analysis']['normalization_gain']*10**(event['gain_db']/20)/np.sqrt(2)
        error=float(np.abs(vocals[begin+240:begin+len(source)-240]-expected).max())
        assert error <= 1/32768
        hooks.append({'start_frame':begin,'frames':len(source),'maximum_pcm_error':error})
    assert len(hooks)==2
    body=[(t['instrument'],e['start_tick'],e['duration_ticks'],e['note'])
          for t in plan['tracks'] for e in t['events'] if 7680<=e['start_tick']<23040]
    shapes.add(json.dumps(body))
    count=min(len(data),len(control));difference=data[:count]-control[:count]
    report['owner_changes'][name]={'frames':len(data),'tempo_milli_bpm':plan['tempo_milli_bpm'],
        'clean_hooks':hooks,'comparison':'same absolute common-prefix frames against seed 4123, no time alignment',
        'common_prefix_frames':count,'maximum_pcm_difference':float(np.abs(difference).max()),
        'rms_pcm_difference':float(np.sqrt(np.mean(difference**2)))}
assert len(shapes)==4
report['owner_distinct_instrumental_bodies']=4
for name,style in cases[4:]:
    if style!='baseline':report.setdefault('wasm',{})[style]=compare(root/f'{name}.{style}',root/f'wasm/mix.{style}')
    if style=='funk':continue
    old=Path('renders/hiphop-diversity-20261018')
    for suffix in (*suffixes,'.score.json','.events.tsv'):
        assert digest(root/f'{name}.{style}{suffix}')==digest(old/f'{name}.{style}{suffix}')
report['unchanged_legacy_wavs']=25
report['cross_platform_identical_wavs']=50
protected=('ai_improvisational_musician_master_spec_v1.md','renders/fixtures/synthetic-speech.wav',
           'renders/voice-20261017-221411/source-pcm.wav')
report['preserved_sha256']={p:digest(Path(p)) for p in protected}
assert report['preserved_sha256']==json.loads(Path('docs/evidence/timeline/measurements.json').read_text())['preserved_sha256']

review=root/'review';review.mkdir()
levels={n:loudness(root/f'owner-{n}.funk.wav') for n in range(4123,4127)}
target=min(-22.,*(v['lufs']-v['true_peak_dbfs']-2 for v in levels.values()))
cards=[]
for seed,level in levels.items():
    name=f'owner-{seed}';gain=target-level['lufs'];destination=review/f'{name}.wav'
    subprocess.run(['ffmpeg','-v','error','-n','-i',str(root/f'{name}.funk.wav'),'-af',f'volume={gain}dB',
                    '-c:a','pcm_s16le',str(destination)],check=True)
    measured=loudness(destination)
    assert abs(measured['lufs']-target)<=.2 and measured['true_peak_dbfs']<=-1.8
    report['matched_review'][name]={'original':level,'gain_db':gain,'matched':measured,'sha256':digest(destination)}
    cards.append(f'<section><h2>Funk · seed {seed}</h2><p>Mix</p><audio controls preload="metadata" aria-label="Seed {seed} mix" src="{name}.wav"></audio>'
        f'<p>Voice alone · original level</p><audio controls preload="metadata" aria-label="Seed {seed} voice" src="../{name}.funk.vocals.wav"></audio></section>')
(review/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Djayvo funk comparisons</title>'
    '<style>body{max-width:760px;margin:40px auto;padding:0 20px;font:18px/1.5 system-ui;background:#151515;color:#eee}'
    'audio{width:100%}section{margin:32px 0}</style><h1>Djayvo funk comparisons</h1>'
    '<p>Four seeds from your recording. Listen for bass and kick placement, short piano chords, '
    'quiet snare notes and the response after the break. Openings and tempos can differ.</p>'
    '<p>Private owner review. Mixes are loudness matched; voice-only players retain their original level. '
    'Musical quality and perceived variety have not been rated.</p>'+''.join(cards)+
    '<script>document.addEventListener("play",e=>{document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>')
report.update(human_listening='NOT RUN',production_quality='PARTIAL',cloud_calls=0)
(evidence/'measurements.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: 50 exact M5/Linux WAVs; 25 unchanged legacy WAVs/scores/events; five WASM styles; two clean hooks per owner mix')
