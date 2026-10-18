#!/usr/bin/env python3
"""Verify the single-owner pilot without creating any listening observations."""
import csv
import hashlib
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path('scripts').resolve()))
from compare_portability import compare
from verify_export import verify_export

out = Path('docs/evidence/evaluation-preparation')
root = Path('renders/evaluation-owner-v6-final')
batch = json.loads((root/'report.json').read_text())
freeze = json.loads((root/'freeze.json').read_text())
assert batch['status'] == 'PASS' and batch['formal_quality'] == batch['human_listening'] == 'NOT RUN'
assert batch['dataset_readiness']['status'] == 'PARTIAL'
assert batch['dataset_readiness']['real_clips'] == batch['dataset_readiness']['speech_clips'] == 1
assert len(batch['records']) == 3 and freeze['seeds'] == [4123, 4124, 4125]
assert freeze['reviewer_assignment'] == 'NOT RUN'
assert hashlib.sha256(Path('build-mac/djayvo_remix').read_bytes()).hexdigest() == freeze['renderer_sha256']
assert freeze['renderer_sha256'] == json.loads(Path('docs/evidence/workflow-hardening/benchmark.json').read_text())['renderer_sha256']
assert hashlib.sha256((root/'freeze.json').read_bytes()).hexdigest() == batch['freeze_sha256']
assert hashlib.sha256((root/'rubric.md').read_bytes()).hexdigest() == freeze['rubric_sha256']
for path, expected in freeze['preparation_code_sha256'].items():
    assert hashlib.sha256(Path(path).read_bytes()).hexdigest() == expected
comparisons, codes, artifacts = {}, set(), {}
for row in batch['records']:
    assert row['packet'] == 'PASS' and row['review_scope'] == 'owner_only'
    folder = root/row['clip_id']/str(row['seed'])
    for name in ('remix', 'control'):
        record = verify_export(folder/name)
        for item in record['artifacts']:
            artifacts[str(Path(row['clip_id'])/str(row['seed'])/(name+item['suffix']))] = item['sha256']
    key = json.loads((folder/'blinded/organizer-key.json').read_text())
    assert key['block_id'] == row['block_id'] and key['render_seed'] == row['seed']
    assert len(key['codes']) == 4 and not codes.intersection(key['codes'])
    codes.update(key['codes'])
    for code, item in key['codes'].items():
        assert hashlib.sha256((folder/'blinded/listener'/f'{code}.wav').read_bytes()).hexdigest() == item['sha256']
    for file, count, fixed in [('responses.csv', 4, ('clip_id','block_id','code')),
                               ('pairs.csv', 3, ('clip_id','block_id','left_code','right_code'))]:
        with (folder/'blinded/listener'/file).open() as stream: rows = list(csv.DictReader(stream))
        assert len(rows) == count
        assert all(r['block_id'] == row['block_id'] and all(not v for k,v in r.items() if k not in fixed) for r in rows)
    old = 'remix' if row['seed'] == 4123 else f"seed{row['seed']}"
    for style in ('hiphop', 'reggae', 'experimental'):
        comparisons[f"{row['seed']}-{style}"] = compare(Path(f'renders/voice-articulation-v4/{old}.{style}'), folder/f'remix.{style}')
assert len(codes) == 12 and len(artifacts) == 48
for log in ('release.log', 'linux-release.log', 'sanitizer.log'):
    text = (out/log).read_text()
    assert '8/8' in text and '100% tests passed' in text
hashes = {'ai_improvisational_musician_master_spec_v1.md': '389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2',
          'renders/fixtures/synthetic-speech.wav': 'c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e',
          'renders/voice-20261017-221411/source-pcm.wav': '7b23204717e1f114ebb25821ba4847416af336278fc0ee22275481d330950427'}
for path, expected in hashes.items():
    assert hashlib.sha256(Path(path).read_bytes()).hexdigest() == expected
report = {'gates': {'m5_release': 'PASS', 'm5_sanitizers': 'PASS', 'linux_arm64_release': 'PASS',
    'frozen_batch_preparation': 'PASS', 'consent_integrity_and_preservation': 'PASS', 'distinct_reproducible_blocks': 'PASS',
    'owner_technical_pilot': 'PASS', 'retained_v4_audio_and_events': 'PASS',
    'diverse_dataset': 'PARTIAL', 'preregistration': 'PARTIAL', 'formal_human_listening': 'NOT RUN',
    'formal_quality': 'NOT RUN', 'hosted_ci': 'NOT RUN', 'physical_intel': 'NOT RUN', 'ai_iphone_live_release': 'NOT RUN'},
    'owner_confirmed_no_additional_clips': True, 'independent_sources': 1, 'render_seeds': 3,
    'candidate_masters': 9, 'baseline_masters': 3, 'blinded_packets': 3, 'unique_answer_codes': 12,
    'human_rating_rows_completed': 0, 'per_style_technical_counts': batch['per_style_technical_counts'],
    'dataset_readiness': batch['dataset_readiness'], 'freeze_sha256': batch['freeze_sha256'],
    'renderer_sha256': freeze['renderer_sha256'], 'engine_source_sha256': freeze['engine_source_sha256'],
    'engine_repository_commit_at_preparation': freeze['repository_commit'], 'rubric_sha256': freeze['rubric_sha256'],
    'preparation_code_sha256': freeze['preparation_code_sha256'],
    'previous_v4_comparisons': comparisons, 'export_artifact_sha256': artifacts, 'protected_sha256': hashes,
    'environment': json.loads(Path('docs/evidence/workflow-hardening/environment.json').read_text())}
(out/'report.json').write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
print(json.dumps({'gates': report['gates'], 'sources': 1, 'candidate_masters': 9, 'baseline_masters': 3, 'unique_answer_codes': 12}, indent=2))
