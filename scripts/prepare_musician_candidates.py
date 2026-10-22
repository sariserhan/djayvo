#!/usr/bin/env python3
"""Prepare four owner-authorized references for review; no training or upload."""
import argparse
import csv
import json
import math
from pathlib import Path
import subprocess
import tarfile
import wave

import numpy as np
from prepare_style_candidates import digest, extract

NAMES = ('f.mp3', 'down.mp3', 'question.mp3', 'pipe.mp3')


def windows(duration):
    if not math.isfinite(duration) or not 60 <= duration <= 600:
        raise ValueError('Expected a 60–600 second reference')
    # shortcut: chronological crops need musical review before phrase-aligned training.
    return list(range(5, math.floor(duration - 35) + 1, 30))


def prepare(ledger_path, source_dir, output):
    if output.exists() or output.is_symlink():
        raise ValueError('Output must be a fresh directory')
    ledger = json.loads(ledger_path.read_text())
    if ledger.get('training_permission') != 'owner_confirmed':
        raise ValueError('Missing owner-confirmed training permission')
    sources = ledger['sources']
    if [row['filename'] for row in sources] != list(NAMES):
        raise ValueError('Expected exactly the four authorized references')
    inventory = []
    for row in sources:
        source = source_dir / row['filename']
        if source.is_symlink() or digest(source) != row['sha256']:
            raise ValueError('Source differs from permission ledger')
        duration = float(json.loads(subprocess.check_output([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'json', str(source)], text=True, timeout=60))['format']['duration'])
        inventory.append((row, source, duration, windows(duration)))
    output.mkdir(parents=True)
    clips_dir = output / 'candidates'
    clips_dir.mkdir()
    clips = []
    for row, source, duration, starts in inventory:
        for index, start in enumerate(starts, 1):
            name = f'{source.stem}-{index:02}.wav'
            path = clips_dir / name
            extract(source, start, path)
            with wave.open(str(path), 'rb') as wav:
                raw = wav.readframes(wav.getnframes())
            if len(raw) != 5760000:
                raise ValueError('Truncated candidate WAV')
            pcm = np.frombuffer(raw, dtype='<i2').reshape(-1, 2).astype(np.float64) / 32768
            rms = float(np.sqrt(np.mean(np.var(pcm, axis=0))))
            clips.append({'file': name, 'sha256': digest(path), 'source': source.name,
                'source_sha256': row['sha256'], 'source_duration_seconds': duration,
                'start_seconds': start, 'duration_seconds': 30, 'decode_gain_db': -6,
                'sample_rate': 48000, 'channels': 2, 'sample_peak': float(np.abs(pcm).max()),
                'centered_rms': rms, 'full_scale_samples': 0,
                'signal_status': 'review_low_energy' if rms < .0005 else 'PASS',
                'source_group': source.stem, 'independent_session_verified': False,
                'split': 'unassigned_candidate', 'human_content_review': 'NOT RUN',
                'training_eligible': False})
    for row, source, _, _ in inventory:
        if digest(source) != row['sha256']:
            raise ValueError('Source changed during preparation')
    manifest = {'purpose': 'Local review candidates; not an accepted training dataset',
                'permission_ledger_sha256': digest(ledger_path), 'clips': clips}
    (clips_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    with (output / 'review.csv').open('x', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=['file', 'decision', 'caption', 'vocal_content',
            'lyrics', 'bpm', 'key', 'session_id', 'curriculum_ids', 'phrase_boundaries', 'notes'])
        writer.writeheader()
        writer.writerows({'file': row['file'], 'decision': 'pending'} for row in clips)
    archive = output / 'musician-review-candidates.tar.gz'
    expected = {row['file'] for row in clips} | {'manifest.json'}
    with tarfile.open(archive, 'x:gz') as tar:
        for name in sorted(expected):
            tar.add(clips_dir / name, arcname=name, recursive=False)
    with tarfile.open(archive, 'r:gz') as tar:
        members = tar.getmembers()
        if len(members) != len(expected) or {m.name for m in members} != expected or not all(m.isfile() for m in members):
            raise ValueError('Unexpected archive contents')
        for row in clips:
            import hashlib
            with tar.extractfile(row['file']) as stream:
                if hashlib.file_digest(stream, 'sha256').hexdigest() != row['sha256']:
                    raise ValueError('Archive clip hash mismatch')
    report = {'preparation': 'PASS', 'candidate_count': len(clips),
        'candidate_seconds': len(clips) * 30, 'accepted_training_examples': 0,
        'source_count': len(sources), 'training': 'NOT RUN', 'cloud_upload': 'NOT RUN',
        'human_content_review': 'NOT RUN', 'independent_holdout': 'NOT RUN',
        'verified_action_pairs': 0, 'permission_ledger_sha256': digest(ledger_path),
        'script_sha256': digest(Path(__file__)), 'archive_sha256': digest(archive),
        'archive_members': sorted(expected), 'clips': clips}
    (output / 'preparation.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ledger', type=Path, required=True)
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = prepare(args.ledger, args.source_dir, args.output)
    print(json.dumps({k: v for k, v in result.items() if k not in ('clips', 'archive_members')}, indent=2))
