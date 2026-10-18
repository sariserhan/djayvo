from pathlib import Path
import subprocess, re, json

out = Path('renders/reference-analysis/listening')
out.mkdir(exist_ok=True)
clips = [
    ('down-018-062', Path.home()/'Downloads/down.mp3', 18, 44),
    ('question-046-090', Path.home()/'Downloads/question.mp3', 46, 44),
    *[(f'djayvo-{style}', Path(f'renders/voice-acoustic-v1/remix.{style}.wav'), 0, None)
      for style in ('hiphop', 'reggae', 'experimental')],
]

def measure(args, filters=''):
    result = subprocess.run(['ffmpeg', '-hide_banner', *args, '-af', filters + 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    summary = result.stderr[result.stderr.rfind('Summary:'):]
    return {name: float(re.search(pattern, summary).group(1)) for name, pattern in (
        ('lufs', r'I:\s+([-\d.]+) LUFS'), ('true_peak_dbfs', r'Peak:\s+([-\d.]+) dBFS'))}

report = []
for name, source, start, duration in clips:
    trim = f'atrim=start={start}' + (f':duration={duration}' if duration is not None else '') + ',asetpts=PTS-STARTPTS,'
    args = ['-i', str(source)]
    before = measure(args, trim)
    gain = -25 - before['lufs']
    path = out/f'{name}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-n', *args, '-af', trim + f'volume={gain}dB', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', str(path)], check=True)
    after = measure(['-i', str(path)])
    assert abs(after['lufs'] + 25) <= .2, (name, after)
    assert after['true_peak_dbfs'] < -1, (name, after)
    report.append({'file':path.name, 'source':source.name, 'start_seconds':start, 'duration_seconds':duration,
                   'constant_gain_db':round(gain,2), **after})
(out/'measurements.json').write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
print(json.dumps(report, indent=2))
