"""Check the new input gate against every frozen recorded source, without rewriting packets."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
from verify_export import verify_export

output = ROOT / 'renders/dc-input-trt3t1ta/cohort'
output.mkdir(exist_ok=False)
manifest = json.loads((ROOT / 'renders/licensed-evaluation-20261018/manifest-final.json').read_text())
records = {}
for clip in manifest['clips']:
    if clip['source_kind'] != 'recorded':
        continue
    assert clip['consent']['local_processing'] is True
    source = Path(clip['path'])
    assert hashlib.sha256(source.read_bytes()).hexdigest() == clip['sha256']
    prefix = output / clip['id']
    subprocess.run([str(ROOT / 'build-mac/djayvo_remix'), '--input', str(source), '--consent',
                    '--style', 'hiphop', '--seed', '4123', '--output', str(prefix)], check=True, capture_output=True, timeout=120)
    verify_export(prefix)
    reference = ROOT / 'renders/licensed-evaluation-validated-20261018' / clip['id'] / '4123' / 'remix'
    hashes = {}
    for suffix in ['.hiphop.wav', '.hiphop.score.json', '.hiphop.events.tsv']:
        before = hashlib.sha256(Path(f'{reference}{suffix}').read_bytes()).hexdigest()
        after = hashlib.sha256(Path(f'{prefix}{suffix}').read_bytes()).hexdigest()
        assert after == before, f'Frozen accepted output changed: {clip["id"]}{suffix}'
        hashes[suffix] = after
    records[clip['id']] = {'status': 'PASS', 'source_sha256': clip['sha256'], 'unchanged_artifact_sha256': hashes}
assert len(records) == 23
(output / 'report.json').write_text(json.dumps({'status': 'PASS', 'scope': '23 recorded sources, hip-hop, seed 4123; existing packets untouched', 'records': records, 'human_listening': 'NOT RUN'}, indent=2) + '\n')
print('PASS: all 23 frozen recorded sources accepted; WAVs, scores and event traces unchanged')
