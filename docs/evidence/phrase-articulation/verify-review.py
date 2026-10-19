"""Check private review delivery and actual HTTP audio decoding; no listening claim."""
import json
from pathlib import Path
import subprocess
from urllib.error import HTTPError
from urllib.request import Request, urlopen

base = 'http://127.0.0.1:4196'
with urlopen(base + '/review/', timeout=10) as response:
    page = response.read().decode()
    assert response.status == 200 and 'text/html' in response.headers['Content-Type']
assert page.count('<audio ') == 16
assert all(name not in page for name in ('control.call_response', 'candidate.call_response', 'blind-key'))
decoded = []
for number in range(1, 5):
    for letter in ('A', 'B', 'A.piano', 'B.piano'):
        name = f'pair-{number}-{letter}.wav'
        url = base + '/review/' + name
        with urlopen(Request(url, headers={'Range': 'bytes=0-43'}), timeout=10) as response:
            data = response.read()
            assert response.status == 206 and len(data) == 44 and data[:4] == b'RIFF'
        subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', url, '-f', 'null', '-'],
                       check=True, timeout=30)
        decoded.append(name)
for path, method, code in [('/blind-key-private.json', 'GET', 404), ('/seed-4123/control.json', 'GET', 404),
                           ('/env.local', 'GET', 404), ('/review/%2e%2e/env.local', 'GET', 404),
                           ('/review/', 'POST', 405)]:
    try:
        urlopen(Request(base + path, method=method), timeout=10)
        raise AssertionError('Unexpected route exposed')
    except HTTPError as error:
        assert error.code == code
report = {'http_delivery_and_audio_decode': 'PASS', 'range_requests': 'PASS', 'private_routes': 'PASS',
          'decoded_files': decoded, 'rendered_browser_interaction': 'NOT RUN',
          'browser_limit': 'Browser plugin listed, but its required Node REPL execution tool and tool discovery are unavailable in this session.',
          'human_listening': 'NOT RUN'}
Path('docs/evidence/phrase-articulation/review-delivery.json').write_text(json.dumps(report, indent=2) + '\n')
print('PASS: sixteen HTTP-decoded WAVs, ranges, concealed HTML labels and restricted routes')
