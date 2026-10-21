"""Validate retained browser mini-sets; signal checks do not establish musical quality."""
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
rows = []
for browser in ('chromium', 'webkit'):
    path = ROOT / 'build-academy-completion' / (browser + '-mini-set')
    receipt = json.loads(path.with_name(browser + '-set.json').read_text())
    assert hashlib.sha256(path.read_bytes()).hexdigest() == receipt['sha256']
    assert receipt['seconds'] >= 120 and receipt['gaps'] == 0
    result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '2',
                             '-ar', '48000', '-f', 'f32le', '-'], capture_output=True, check=True)
    pcm = array.array('f', result.stdout)
    if sys.byteorder != 'little':
        pcm.byteswap()
    assert pcm and all(math.isfinite(v) for v in pcm)
    seconds = len(pcm) / 96000
    assert abs(seconds - receipt['seconds']) < .5
    peak = max(abs(v) for v in pcm)
    assert .001 < peak < 1
    longest = run = 0
    for left, right in zip(pcm[::2], pcm[1::2]):
        run = run + 1 if max(abs(left), abs(right)) < .0005 else 0
        longest = max(longest, run)
    assert longest / 48000 < .2, 'Unexpected silent interval in recorded set'
    rows.append(dict(browser=browser,sha256=receipt['sha256'],seconds=seconds,
                     peak_dbfs=20*math.log10(peak),longest_quiet_ms=longest/48,
                     timestamp_gaps=receipt['gaps'],bytes=receipt['bytes'],
                     technical='PASS',human_listening='NOT RUN'))
output = ROOT / 'docs/evidence/academy-completion/recorded-sets.json'
output.write_text(json.dumps(rows, indent=2) + '\n')
print(json.dumps(rows, indent=2))
