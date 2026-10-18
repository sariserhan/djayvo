#!/usr/bin/env python3
"""Freeze a local consent ledger, render three seeds and prepare blinded packets.

This prepares evidence; it never supplies human ratings or passes musical quality.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
from inspect_wav import inspect
from prepare_listening import prepare
from verify_export import verify_export

SEEDS = (4123, 4124, 4125)
STYLES = ('hiphop', 'reggae', 'experimental')
KINDS = ('speech', 'syllabic_speech', 'laughter', 'claps', 'noise', 'silence', 'synthetic_control')
REPO = Path(__file__).resolve().parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_source(path):
    with path.open('rb') as stream:
        data = stream.read(32*1024*1024+1)
    if not 44 <= len(data) <= 32*1024*1024:
        raise ValueError('source must be a WAV no larger than 32 MiB')
    return data


def load_manifest(path):
    path = Path(path).resolve()
    if path.stat().st_size > 1024*1024:
        raise ValueError('manifest exceeds 1 MiB')
    manifest = json.loads(path.read_text())
    if not isinstance(manifest, dict) or manifest.get('schema_version') != '1.0-evaluation':
        raise ValueError('expected 1.0-evaluation manifest')
    clips = manifest.get('clips')
    if not isinstance(clips, list) or not 1 <= len(clips) <= 50:
        raise ValueError('supply 1–50 clips; small sets remain pilots')
    ids, hashes = set(), set()
    for clip in clips:
        if not isinstance(clip, dict):
            raise ValueError('invalid clip')
        for field in ('id', 'session_id'):
            if not isinstance(clip.get(field), str) or not re.fullmatch('[a-zA-Z0-9_-]{1,64}', clip[field]):
                raise ValueError('use opaque safe clip/session IDs')
        if clip.get('kind') not in KINDS or not isinstance(clip.get('path'), str):
            raise ValueError('invalid source kind/path')
        if clip.get('source_kind') not in ('recorded', 'synthetic') or (clip['kind']=='synthetic_control' and clip['source_kind']!='synthetic'):
            raise ValueError('explicit recorded/synthetic provenance required')
        if clip['kind'] in ('speech', 'syllabic_speech') and (not isinstance(clip.get('speaker_id'), str) or not re.fullmatch('[a-zA-Z0-9_-]{1,64}', clip['speaker_id'])):
            raise ValueError('speech requires an opaque speaker ID')
        consent = clip.get('consent')
        if (not isinstance(consent, dict) or consent.get('local_processing') is not True or
                consent.get('review_scope') not in ('owner_only', 'independent_reviewers') or
                not isinstance(consent.get('evidence'), str) or not 1 <= len(consent['evidence'].strip()) <= 2000):
            raise ValueError('explicit local consent, review scope and permission evidence required')
        source = (path.parent/clip['path']).resolve()
        if source.suffix.lower() != '.wav' or digest(read_source(source)) != clip.get('sha256'):
            raise ValueError('source WAV/hash mismatch')
        if clip['id'] in ids or clip['sha256'] in hashes:
            raise ValueError('duplicate clip ID or source hash; repeats are not independent clips')
        ids.add(clip['id']); hashes.add(clip['sha256'])
        clip['path'] = str(source)
    return manifest


def readiness(clips):
    real = [c for c in clips if c['source_kind'] == 'recorded']
    speech = [c for c in real if c['kind'] in ('speech', 'syllabic_speech')]
    missing = []
    if len(real) < 20: missing.append('at least 20 cleared non-synthetic source clips')
    if len(speech) < 10: missing.append('at least 10 speech/syllabic clips')
    if len({c['speaker_id'] for c in speech}) < 2: missing.append('multiple speech speakers')
    if len({c['session_id'] for c in speech}) < 2: missing.append('multiple speech sessions')
    for kind in ('laughter', 'claps', 'noise', 'silence'):
        if not any(c['kind'] == kind for c in real): missing.append(kind+' coverage')
    if any(c['consent']['review_scope'] != 'independent_reviewers' for c in real):
        missing.append('permission for independent listening review')
    return {'status': 'PARTIAL' if missing else 'PASS', 'real_clips': len(real),
            'speech_clips': len(speech), 'missing': missing,
            'note': 'Ledger declarations only; consent authenticity and reviewer independence require human verification.'}


def run_batch(manifest_path, output, renderer):
    manifest = load_manifest(manifest_path)
    output, renderer = Path(output).absolute(), Path(renderer).resolve()
    if not renderer.is_file(): raise ValueError('renderer missing')
    engine_hash = digest(renderer.read_bytes())
    rubric = (REPO/'docs/evaluation-protocol.md').read_bytes()
    try:
        commit = subprocess.check_output(['git', '-C', str(REPO), 'rev-parse', 'HEAD'], text=True, stderr=subprocess.PIPE).strip()
    except (OSError, subprocess.CalledProcessError):
        commit = None  # Source archives/minimal build containers may not have Git.
    engine_sources = [REPO/'CMakeLists.txt', *sorted((REPO/'core').rglob('*.cpp')),
                      *sorted((REPO/'core').rglob('*.h')), *sorted((REPO/'tools/cli').glob('*.cpp'))]
    freeze = {'schema_version': '1.0-evaluation', 'created_utc': datetime.now(timezone.utc).isoformat(),
              'repository_commit': commit, 'renderer_sha256': engine_hash, 'rubric_sha256': digest(rubric),
              'engine_source_sha256': digest(b''.join(str(p.relative_to(REPO)).encode()+b'\0'+p.read_bytes()+b'\0' for p in engine_sources)),
              'seeds': list(SEEDS), 'sample_rate': 48000, 'block_size': 512,
              'technical_rules': {'duration_seconds': [20, 40], 'maximum_peak_dbfs': -1,
                                  'full_scale_samples': 0, 'last_100ms_peak': 0},
              'reviewer_assignment': 'NOT RUN', 'training_authorized': False, 'distribution_authorized': False,
              'preparation_code_sha256': {p: digest((REPO/p).read_bytes()) for p in
                  ('scripts/prepare_evaluation.py', 'scripts/prepare_listening.py', 'scripts/verify_export.py', 'scripts/inspect_wav.py')},
              'dataset': manifest}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.mkdir()  # Never reuse even an empty existing directory.
    (output/'rubric.md').write_bytes(rubric)
    (output/'freeze.json').write_text(json.dumps(freeze, indent=2)+'\n')
    (output/'sources').mkdir()
    for clip in manifest['clips']:
        data = read_source(Path(clip['path']))
        if digest(data) != clip['sha256']: raise ValueError('source changed since preflight')
        (output/'sources'/f"{clip['id']}.wav").write_bytes(data)
    records = []
    for clip in manifest['clips']:
        source = output/'sources'/f"{clip['id']}.wav"
        for seed in SEEDS:
            folder = output/clip['id']/str(seed); folder.mkdir(parents=True)
            row = {'clip_id': clip['id'], 'kind': clip['kind'], 'source_kind': clip['source_kind'], 'seed': seed,
                   'review_scope': clip['consent']['review_scope'], 'styles': {}, 'baseline': 'NOT RUN', 'packet': 'NOT RUN'}
            records.append(row)
            for style in ('all', 'baseline'):
                prefix = folder/('remix' if style == 'all' else 'control')
                try:
                    if digest(renderer.read_bytes()) != engine_hash: raise ValueError('renderer changed during batch')
                    command = [str(renderer), '--input', str(source), '--synthetic-fixture' if clip['source_kind']=='synthetic' else '--consent',
                               '--output', str(prefix), '--style', style, '--seed', str(seed), '--sample-rate', '48000', '--block-size', '512']
                    run = subprocess.run(command, capture_output=True, text=True, timeout=180)
                    (folder/f'{style}.log').write_text(run.stdout+run.stderr)
                    if clip['kind'] == 'silence':
                        row['expected_rejection'] = 'PASS' if run.returncode == 1 and 'silent' in run.stderr.lower() else 'FAIL'
                        row['rejection_reason'] = run.stderr.strip()
                        break
                    if run.returncode: raise ValueError(f'render exit {run.returncode}; see {style}.log')
                    selected = STYLES if style == 'all' else ('baseline',)
                    if verify_export(prefix, selected)['source_sha256'] != clip['sha256']:
                        raise ValueError('rendered source differs from frozen source hash')
                    for name in selected:
                        metrics = inspect(Path(str(prefix)+f'.{name}.wav'))
                        passed = (20 <= metrics['duration_seconds'] <= 40 and metrics['peak_dbfs'] <= -1 and
                                  metrics['full_scale_samples'] == 0 and metrics['last_100ms_peak'] == 0)
                        item = {'status': 'PASS' if passed else 'FAIL', 'metrics': metrics}
                        if name == 'baseline': row['baseline'] = item
                        else: row['styles'][name] = item
                except (ValueError, OSError, subprocess.SubprocessError) as error:
                    item = {'status': 'FAIL', 'error': str(error)}
                    if style == 'all': row['styles'] = {name: item for name in STYLES}
                    else: row['baseline'] = item
            if clip['kind'] != 'silence' and all(row['styles'].get(s, {}).get('status') == 'PASS' for s in STYLES) and isinstance(row['baseline'], dict) and row['baseline']['status'] == 'PASS':
                try:
                    key = prepare(folder/'remix', folder/'blinded', source, seed, folder/'control')
                    row['packet'] = 'PASS'; row['block_id'] = key['block_id']
                except (ValueError, OSError) as error:
                    row['packet'] = 'FAIL'; row['packet_error'] = str(error)
    eligible = [r for r in records if r['kind'] != 'silence' and r['source_kind'] == 'recorded']
    usable = {s: {'accepted': sum(r['styles'].get(s, {}).get('status') == 'PASS' for r in eligible),
                  'attempted': len(eligible)} for s in STYLES}
    passed = all(r.get('expected_rejection') == 'PASS' if r['kind'] == 'silence' else r['packet'] == 'PASS' for r in records)
    report = {'status': 'PASS' if passed else 'FAIL', 'scope': 'technical batch preparation only',
              'dataset_readiness': readiness(manifest['clips']), 'per_style_technical_counts': usable,
              'preregistration': 'PARTIAL', 'human_listening': 'NOT RUN', 'formal_quality': 'NOT RUN',
              'freeze_sha256': digest((output/'freeze.json').read_bytes()), 'records': records}
    (output/'report.json').write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
    (output/'README.txt').write_text('Keep this entire folder private. Sources, consent ledger, keys and raw style exports are organizer-only.\n'
        'Only a block\'s blinded/listener folder is a review packet; respect its review_scope in report.json.\n'
        'Owner-only permission does not authorize giving it to independent reviewers.\n'
        'Copy blank forms separately for each real reviewer. Never overwrite prior responses.\n'
        'Do not change the frozen rubric after collecting observations. No listener ratings are generated.\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--renderer', type=Path, default=Path('build-mac/djayvo_remix'))
    args = parser.parse_args()
    try:
        result = run_batch(args.manifest, args.output, args.renderer)
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        raise SystemExit('FAIL: '+str(error))
    print(result['status']+': technical batch preparation; '+str(args.output/'report.json'))
    print(result['dataset_readiness']['status']+': dataset readiness; human listening/formal quality NOT RUN')
    raise SystemExit(0 if result['status'] == 'PASS' else 1)
