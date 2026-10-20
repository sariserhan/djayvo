#!/usr/bin/env python3
"""Verify retained Linux exports and the permission-filtered listening packet."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'scripts'))
from compare_portability import compare
from q0_audit import digest, inputs
from q0_independent_packet import reviewable
from q0_listening_results import summarize
from q0_measure_comparisons import timing
from verify_export import verify_export

evidence = Path(__file__).parent
linux = ROOT/'renders/arrangement-linux/q0-performance-20261020'
trial = ROOT/'renders/q0-performance-20261020'
review = ROOT/'renders/q0-independent-review-20261020'
assert not (linux/'INCOMPLETE').exists() and not (review/'INCOMPLETE').exists()
report = json.loads((evidence/'linux-report.json').read_text())
for name, sha in report['files_sha256'].items():
    assert digest(linux/name) == sha, name
native = json.loads((trial/'report.json').read_text())
for row in native['records']:
    ident, style = row['id'], row['style']
    prefix = linux/(ident+'.'+style)
    verify_export(linux/ident, (style,))
    result = compare(trial/ident/('E.'+style), prefix)
    assert result['byte_identical_wav']
    timing(json.loads((trial/ident/'E.plan.json').read_text()), Path(str(prefix)+'.events.tsv'))
rights = inputs()
expected = {r['id'] for r in rights if reviewable(r)}
prepared = json.loads((review/'report.json').read_text())
assert {r['id'] for r in prepared['records']} == expected
assert 'owner-speech' not in expected
summary = summarize(review, [])
assert summary['status'] == 'NOT RUN' and summary['candidate_ratings'] == 0
packet = json.loads((review/'listener/packet.json').read_text())
assert len(packet['audio_sha256']) == 24
allowed = set(packet['audio_sha256']) | {'index.html', 'review.css', 'review.js', 'ATTRIBUTION.txt', 'packet.json'}
assert {p.name for p in (review/'listener').iterdir()} == allowed
for name, sha in packet['audio_sha256'].items():
    assert digest(trial/'listener'/name) == sha
assert 'owner-speech' not in (review/'listener/index.html').read_text()
print('PASS: five exact Linux/Mac exports and timings; four permitted review sources; 24 unchanged WAVs; zero human ratings')
