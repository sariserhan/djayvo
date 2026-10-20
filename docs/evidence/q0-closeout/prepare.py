#!/usr/bin/env python3
"""Prepare fresh form-only review copies; preserve frozen audio and packet IDs."""
import json
import os
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'scripts'))
from q0_audit import digest, write
from q0_listening_results import summarize

rows = []
for original, updated in (
    ('q0-performance-20261020', 'q0-performance-form-v2-20261020'),
    ('q0-independent-review-20261020', 'q0-independent-form-v2-20261020'),
):
    source, target = ROOT/'renders'/original, ROOT/'renders'/updated
    before = summarize(source, [])
    files = [p for p in (source/'listener').iterdir() if p.is_file()]
    files += [source/'report.json', source/'organizer-key.json']
    frozen = {str(p.relative_to(source)): digest(p) for p in files}
    target.mkdir()
    (target/'INCOMPLETE').touch()
    (target/'listener').mkdir()
    for path in files:
        destination = target/path.relative_to(source)
        if path.suffix == '.wav':
            # Audio is immutable; hard links avoid duplicating hundreds of MB.
            os.link(path, destination)
        else:
            shutil.copyfile(path, destination)
    shutil.copyfile(ROOT/'scripts/q0-review.js', target/'listener/review.js')
    for name, sha in frozen.items():
        assert digest(source/name) == sha, name
        if name != 'listener/review.js':
            assert digest(target/name) == sha, name
    (target/'INCOMPLETE').unlink()
    after = summarize(target, [])
    assert before == after and after['candidate_ratings'] == 0
    write(target/'listening-results.json', after)
    rows.append({'original': original, 'updated': updated,
        'packet_id': after['packet_id'], 'original_sha256': frozen,
        'updated_review_js_sha256': digest(target/'listener/review.js'),
        'audio_changed': False, 'human_quality': 'NOT RUN'})
write(Path(__file__).parent/'review-packets.json', {
    'status': 'PASS', 'only_changed_asset': 'listener/review.js', 'packets': rows})
print('PASS: two fresh form revisions; 54 unchanged hard-linked WAVs; packet IDs and privacy scopes preserved; zero ratings')
