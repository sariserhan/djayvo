#!/usr/bin/env python3
"""Make a local level-matched review page; refuses to overwrite an existing review."""
from pathlib import Path
import html
import json
import re
import subprocess
import wave

out = Path('renders/voice-arrangement-v2/review')
if out.exists():
    raise SystemExit('Review exists; preserve it and choose a new review location in this snapshot.')
out.mkdir()
styles = ('hiphop', 'reggae', 'experimental')
clips = []
for style in styles:
    clips.extend([(f'{style}-previous', f'{style}: previous acoustic mix', Path(f'renders/voice-acoustic-v1/remix.{style}.wav'), 0, None),
                  (f'{style}-new', f'{style}: new arrangement', Path(f'renders/voice-arrangement-v2/remix.{style}.wav'), 0, None)])
for seed in (4124, 4125):
    for style in styles:
        clips.append((f'{style}-{seed}', f'{style}: alternate {seed}', Path(f'renders/voice-arrangement-v2/seed{seed}.{style}.wav'), 0, None))
clips.extend([
    ('reference-down', 'Down: 0:18–1:02', Path.home()/'Downloads/down.mp3', 18, 44),
    ('reference-question', 'Question: 0:46–1:30', Path.home()/'Downloads/question.mp3', 46, 44),
    ('reference-blood', 'Blood Club: 3:20–4:10', Path.home()/'Downloads/blood_club.mp3', 200, 50),
])

def measure(source, filters=''):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(source), '-af', filters+'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    text = p.stderr[p.stderr.rfind('Summary:'):]
    return {k: float(re.search(pattern, text).group(1)) for k, pattern in (
        ('lufs', r'I:\s+([-\d.]+) LUFS'), ('true_peak_dbfs', r'Peak:\s+([-\d.]+) dBFS'))}

measurements, cards = [], []
for name, label, source, start, duration in clips:
    trim = f'atrim=start={start}'+(f':duration={duration}' if duration else '')+',asetpts=PTS-STARTPTS,'
    before = measure(source, trim)
    gain = -25-before['lufs']
    path = out/f'{name}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-n', '-i', str(source), '-af', trim+f'volume={gain}dB',
                    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', str(path)], check=True)
    after = measure(path)
    assert abs(after['lufs']+25) <= .2 and after['true_peak_dbfs'] < -1, (name, after)
    with wave.open(str(path)) as f:
        assert f.getnchannels()==2 and f.getsampwidth()==2 and f.getnframes()>0
    measurements.append({'file':path.name, 'source':source.name, 'start_seconds':start,
                         'duration_seconds':duration, 'gain_db':gain, **after})
    cards.append(f'<article><h2>{html.escape(label)}</h2><audio controls preload="metadata" aria-label="{html.escape(label)}" src="{path.name}"></audio><a href="{path.name}" download>Save WAV</a></article>')
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Djayvo · arrangement review</title><style>
body{font:17px/1.55 system-ui,sans-serif;max-width:1000px;margin:40px auto;padding:0 24px;background:#f4f1eb;color:#242c29}
h1{font-size:38px;line-height:1.1}h2{font-size:18px;margin-top:0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
article{background:white;padding:22px;border-radius:12px;border:1px solid #d8ddd6}audio{width:100%;margin:12px 0}a{color:#175b46}p{max-width:760px}a:focus-visible,audio:focus-visible{outline:3px solid #147c5b}
@media(max-width:620px){.grid{grid-template-columns:1fr}}
</style><h1>Djayvo arrangement review</h1><p>Your voice, with new breaks, returns and instrument treatment. Compare each previous/new pair first, then try the alternate openings and reference passages. Playback levels are matched to approximately −25 LUFS.</p>
<p>Listen for natural instrument sound, a clear speech phrase, groove, and whether the return feels earned. Note any awkward timestamp. Technical checks passed; musical quality still needs your judgment. Nothing plays automatically or leaves this computer.</p>
<p><a href="../blind-pilot/listener/">Optional blind comparison with the fixed-loop baseline</a></p><main class="grid">'''+''.join(cards)+'''</main><script>
document.addEventListener('play',event=>{if(event.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(audio=>{if(audio!==event.target)audio.pause()})},true)
</script></html>'''
(out/'index.html').write_text(page)
(out/'measurements.json').write_text(json.dumps(measurements, indent=2, allow_nan=False)+'\n')
assert page.count('<audio ') == 15 and all((out/f'{name}.wav').is_file() for name, *_ in clips)
Path('docs/evidence/arrangement-review/audition-measurements.json').write_text(json.dumps(measurements, indent=2, allow_nan=False)+'\n')
print('PASS: 15 decoded, level-matched WAVs and local review page; listening NOT RUN')
