"""Verify the frozen song, Downloads copies and loopback audio byte ranges."""
import hashlib
import json
from pathlib import Path
import subprocess
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
SONG = ROOT / 'renders/night-current-20261020/song-v1'
report = json.loads((SONG / 'song.json').read_text())
for name, expected in report['files_sha256'].items():
    assert hashlib.sha256((SONG / name).read_bytes()).hexdigest() == expected, name
audio = []
for name in ('Night Current.wav', 'Night Current.mp3'):
    path = SONG / name
    assert path.read_bytes() == (Path.home() / 'Downloads' / ('Jamloom - ' + name)).read_bytes()
    raw = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path),
                                   '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'])
    pcm = np.frombuffer(raw, '<f4').reshape(-1, 2)
    assert np.isfinite(pcm).all() and np.max(np.abs(pcm)) < 1
    assert abs(len(pcm) / 48000 - report['duration_seconds']) < .01
    audio.append({'file': name, 'duration': len(pcm) / 48000,
                  'max_abs_sample': float(np.max(np.abs(pcm))),
                  'full_scale_samples': int(np.sum(np.abs(pcm) >= 1)),
                  'tail_50ms_peak': float(np.max(np.abs(pcm[-2400:]))),
                  'download_verified': True})
data = (SONG / 'Night Current.mp3').read_bytes()
url = 'http://127.0.0.1:4212/Night%20Current.mp3'
for value, start, end in [('bytes=0-99', 0, 100), ('bytes=-100', len(data)-100, len(data)),
                          (f'bytes={len(data)-100}-', len(data)-100, len(data))]:
    with urlopen(Request(url, headers={'Range': value})) as response:
        assert response.status == 206 and response.read() == data[start:end]
        assert response.headers['Content-Range'] == f'bytes {start}-{end-1}/{len(data)}'
for value in ('bytes=-0', 'bytes=100-1', f'bytes={len(data)}-', 'bytes=0-1,3-4'):
    try:
        urlopen(Request(url, headers={'Range': value}))
        raise AssertionError('Invalid range accepted')
    except HTTPError as error:
        assert error.code == 416
result = {'technical': 'PASS', 'audio': audio, 'ranges': 'PASS', 'listening': 'NOT RUN'}
(Path(__file__).parent / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
