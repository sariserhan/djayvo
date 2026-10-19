#!/usr/bin/env python3
"""Prepare the owner-selected Blood Club pilot locally; never rent or train."""
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


def prepare(source, ledger_path, output):
    if output.exists():
        raise ValueError('Output must be a fresh directory')
    ledger = json.loads(ledger_path.read_text())
    if ledger.get('training_permission') != 'owner_confirmed' or ledger.get('source_id') != 'blood_club':
        raise ValueError('Missing Blood Club training permission')
    if source.name != 'blood_club.mp3' or digest(source) != ledger.get('source_sha256'):
        raise ValueError('Source differs from permission ledger')
    duration = float(json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(source)
    ], text=True, timeout=60))['format']['duration'])
    if not math.isfinite(duration) or not 630 <= duration < 660:
        raise ValueError('Expected the complete 10:34 Blood Club reference')
    output.mkdir(parents=True)
    train = output / 'train-input'
    holdout = output / 'same-session-holdout'
    train.mkdir(); holdout.mkdir()
    rows, samples = [], []
    # shortcut: chronological windows are not verified phrase/beat boundaries.
    for index in list(range(16)) + list(range(17, 21)):
        split = 'train' if index < 16 else 'same_session_holdout'
        name = f'blood-{index + 1:02d}.wav'
        path = (train if split == 'train' else holdout) / name
        extract(source, index * 30, path)
        with wave.open(str(path), 'rb') as wav:
            if (wav.getframerate(), wav.getnchannels(), wav.getsampwidth(), wav.getnframes()) != (48000, 2, 2, 1440000):
                raise ValueError('Invalid training WAV format')
            raw = wav.readframes(wav.getnframes())
            if len(raw) != 5760000:
                raise ValueError('Truncated training WAV')
        pcm = np.frombuffer(raw, dtype='<i2').reshape(-1, 2).astype(np.float64) / 32768
        peak = float(np.abs(pcm).max())
        signal_rms = float(np.sqrt(np.mean(np.var(pcm, axis=0))))
        if np.any(pcm <= -1) or np.any(pcm >= 32767 / 32768) or signal_rms < .0005:
            raise ValueError('Clipped, silent or constant training window')
        row = {'file': name, 'sha256': digest(path), 'split': split, 'source_id': 'blood_club',
               'source_sha256': ledger['source_sha256'], 'session_group': 'blood_club_source_file',
               'start_seconds': index * 30, 'duration_seconds': 30, 'decode_gain_db': -6,
               'sample_rate': 48000, 'peak': peak, 'centered_rms': signal_rms,
               'full_scale_samples': 0, 'human_content_review': 'NOT RUN'}
        rows.append(row)
        if split == 'train':
            samples.append({'filename': name, 'audio_path': '/workspace/blood-input/' + name,
                            'sha256': row['sha256'], 'caption': 'Music with rhythmic bass and drum patterns.',
                            'lyrics': '', 'is_instrumental': None, 'duration': 30, 'bpm': None,
                            'keyscale': '', 'timesignature': '', 'review_status': 'unreviewed_owner_selected_reference'})
    if digest(source) != ledger['source_sha256']:
        raise ValueError('Source changed during preparation')
    manifest = {'metadata': {'genre_ratio': 0, 'human_content_review': 'NOT RUN',
                'scope': 'Research candidate only; no paired phrase/response annotations',
                'caption_source': 'Broad conditioning only; no inferred lyrics, tempo, key or performer identity'},
                'samples': samples}
    (train / 'dataset.json').write_text(json.dumps(manifest, indent=2) + '\n')
    train_rows = [r for r in rows if r['split'] == 'train']
    (train / 'manifest.json').write_text(json.dumps(train_rows, indent=2) + '\n')
    with (output / 'review.csv').open('x', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=['file', 'split', 'decision', 'input_phrase_start',
            'input_phrase_end', 'response_start', 'response_end', 'caption', 'vocal_content', 'notes'])
        writer.writeheader()
        writer.writerows({'file': r['file'], 'split': r['split'], 'decision': 'pending'} for r in rows)
    archive = output / 'blood-training-input.tar.gz'
    expected = {r['file'] for r in train_rows} | {'manifest.json', 'dataset.json'}
    with tarfile.open(archive, 'x:gz') as tar:
        for name in sorted(expected):
            tar.add(train / name, arcname=name, recursive=False)
    with tarfile.open(archive, 'r:gz') as tar:
        members = tar.getmembers()
        if {m.name for m in members} != expected or len(members) != 18 or not all(m.isfile() for m in members):
            raise ValueError('Unexpected upload archive scope')
    report = {'preparation': 'PASS', 'training': 'NOT RUN', 'cloud_upload': 'NOT RUN',
              'source_duration_seconds': duration, 'train_candidate_seconds': 480,
              'same_session_holdout_seconds': 120, 'excluded_gap_seconds': [480, 510],
              'excluded_tail_seconds': [630, duration], 'independent_holdout': 'NOT RUN',
              'verified_phrase_response_pairs': 0, 'human_content_review': 'NOT RUN',
              'permission_ledger_sha256': digest(ledger_path), 'script_sha256': digest(Path(__file__)),
              'archive_sha256': digest(archive), 'archive_members': sorted(expected), 'clips': rows}
    (output / 'preparation.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--ledger', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report = prepare(args.source, args.ledger, args.output)
    print(json.dumps({k: v for k, v in report.items() if k not in ('clips', 'archive_members')}, indent=2))
