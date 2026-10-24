"""Local reproduction of hosted settings; no paid requests or audio playback."""
import json
import os
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
os.environ.update(JAMLOOM_VOCAL_IDENTITY_ENABLED='true', HF_HUB_OFFLINE='1')
import singer_studio as studio
from singing_response import digest

source = ROOT / 'renders/improvise-finish-20261023/sources/cloud-normalized.wav'
expected = 'df73ac9b98746572ce751973b7d6025d99d6ee816f9ff71942a16c889ae393ea'
assert digest(source) == expected
out = ROOT / sys.argv[1]
out.mkdir(exist_ok=False)
rows = []
for genre, duration in [('reggae', 30), ('edm', 40)]:
    studio.OUTPUT = out / genre
    started = time.monotonic()
    try:
        song, audio, _, _, _ = studio.make_reply(str(source), '', 'female', genre, True, duration)
        report = json.loads(Path(audio).with_name('complete.json').read_text())
        singer = json.loads(Path(song).with_name('complete.json').read_text())
        assert report['original_recording_sha256'] == digest(source) == expected
        assert report['sample_used'] and report['events'] and report['outside_region_max_pcm_error'] == 0
        assert report['peak'] < .98 and report['artifacts']['performance'] == digest(audio)
        assert singer['vocal_identity']['id'] and singer['case']['duration'] == duration
        row = {'genre': genre, 'technical': 'PASS', 'audio': str(Path(audio).relative_to(ROOT)),
               'audio_sha256': digest(audio), 'identity': singer['vocal_identity']['id'],
               'duration': duration, 'source_sha256': expected}
    except Exception as error:
        failures = list(studio.OUTPUT.glob('*/failure.json'))
        row = {'genre': genre, 'technical': 'FAIL', 'error_type': type(error).__name__,
               'failure': json.loads(failures[-1].read_text()) if failures else None}
    row['elapsed_seconds'] = round(time.monotonic() - started, 2)
    rows.append(row)
    (out / 'results.json').write_text(json.dumps(rows, indent=2) + '\n')
    print(json.dumps(row), flush=True)
assert all(row['technical'] == 'PASS' for row in rows)
