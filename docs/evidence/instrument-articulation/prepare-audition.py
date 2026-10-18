#!/usr/bin/env python3
"""Snapshot reproduction for the local v3/v4 comparison; originals stay untouched."""
from pathlib import Path
import html
import json
import re
import subprocess

out = Path('renders/voice-articulation-v4/review')
out.mkdir()  # Refuse to overwrite an earlier audition.
styles = ('hiphop', 'reggae', 'experimental')
clips = []
for style in styles:
    clips += [(f'{style}-previous', f'{style}: previous', Path(f'renders/voice-boundaries-v3/remix.{style}.wav')),
              (f'{style}-new', f'{style}: recorded instrument dynamics', Path(f'renders/voice-articulation-v4/remix.{style}.wav'))]
for seed in (4124, 4125):
    clips += [(f'{style}-{seed}', f'{style}: seed {seed}', Path(f'renders/voice-articulation-v4/seed{seed}.{style}.wav')) for style in styles]

for stem in ('piano', 'drums'):
    clips += [(f'{stem}-previous', f'{stem}: previous isolated stem', Path(f'renders/voice-boundaries-v3/remix.hiphop.{stem}.wav')),
              (f'{stem}-new', f'{stem}: new isolated stem', Path(f'renders/voice-articulation-v4/remix.hiphop.{stem}.wav'))]

def measure(path):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    summary = result.stderr[result.stderr.rfind('Summary:'):]
    return {key: float(re.search(pattern, summary).group(1)) for key, pattern in (
        ('lufs', r'I:\s+([-\d.]+) LUFS'), ('true_peak_dbfs', r'Peak:\s+([-\d.]+) dBFS'))}

measurements, cards = [], []
for name, label, source in clips:
    gain = -25 - measure(source)['lufs']
    path = out / f'{name}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-n', '-i', str(source), '-af', f'volume={gain}dB', '-c:a', 'pcm_s16le', str(path)], check=True)
    result = measure(path)
    assert abs(result['lufs'] + 25) <= .2 and result['true_peak_dbfs'] < -1
    measurements.append({'file': path.name, 'gain_db': gain, **result})
    cards.append(f'<article><h2>{html.escape(label)}</h2><audio controls preload="metadata" aria-label="{html.escape(label)}" src="{path.name}"></audio><a href="{path.name}" download>Save WAV</a></article>')
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Djayvo · instrument comparison</title><style>
body{font:17px/1.55 system-ui,sans-serif;max-width:1000px;margin:40px auto;padding:0 24px;background:#f4f1eb;color:#242c29}
h1{font-size:38px;line-height:1.1}h2{font-size:18px;margin-top:0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
article{background:white;padding:22px;border-radius:12px;border:1px solid #d8ddd6}audio{width:100%;margin:12px 0}a{color:#175b46}a:focus-visible,audio:focus-visible{outline:3px solid #147c5b}
@media(max-width:620px){.grid{grid-template-columns:1fr}}
</style><h1>Djayvo instrument comparison</h1><p>Compare the instrument sound in each previous/new pair. Does the piano feel more expressive? Do repeated drum hits sound less mechanical? The arrangement and vocal stems are unchanged. Playback is matched to approximately −25 LUFS.</p>
<p>The six alternate mixes below use different openings. The final four players isolate the hip-hop piano and drums; each is level-matched independently. Note the style, seed and timestamp of anything you want changed. Musical quality needs your listening judgment.</p>
<p><a href="../../voice-arrangement-v2/review/index.html">Earlier arrangement and reference review</a></p><main class="grid">'''+''.join(cards)+'''</main><script>
document.addEventListener('play',event=>{if(event.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(audio=>{if(audio!==event.target)audio.pause()})},true)
</script></html>'''
assert len(measurements) == 16 and page.count('<audio ') == 16
(out / 'index.html').write_text(page)
Path('docs/evidence/instrument-articulation/audition-measurements.json').write_text(json.dumps(measurements, indent=2)+'\n')
print('PASS: 16 matched local audition WAVs; listening NOT RUN')
