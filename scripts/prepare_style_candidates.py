#!/usr/bin/env python3
"""Prepare local review candidates, never an automatically accepted training set."""
import argparse
from array import array
import csv
import hashlib
import json
import math
from pathlib import Path
import subprocess
import wave


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def windows(duration):
    if not math.isfinite(duration) or not 190 <= duration <= 3600:
        raise ValueError('Expected a 190–3600 second reference recording')
    # shortcut: evenly spaced windows need content review before musical cropping.
    return [round(5 + n * (duration - 40) / 5, 3) for n in range(6)]


def extract(path, start, destination):
    # These references decode above full scale; attenuate before PCM16 conversion.
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(path),
                    '-ss', str(start), '-t', '30', '-map', '0:a:0', '-vn',
                    '-map_metadata', '-1', '-ar', '48000', '-ac', '2',
                    '-af', 'volume=-6dB', '-c:a', 'pcm_s16le', str(destination)],
                   check=True, timeout=120)
    with wave.open(str(destination), 'rb') as wav:
        if (wav.getframerate(), wav.getnchannels(), wav.getsampwidth(), wav.getnframes()) != (48000, 2, 2, 1440000):
            raise ValueError('Unexpected candidate WAV format or length')
        pcm = array('h', wav.readframes(wav.getnframes()))
        import sys
        if sys.byteorder != 'little':
            pcm.byteswap()
        if min(pcm) <= -32768 or max(pcm) >= 32767:
            raise ValueError('Candidate still reaches full scale after headroom attenuation')


def prepare(ledger_path, source_dir, output):
    if output.exists():
        raise ValueError('Output must be a fresh directory')
    ledger = json.loads(ledger_path.read_text())
    if ledger.get('training_permission') != 'owner_confirmed':
        raise ValueError('Missing owner-confirmed training permission')
    sources = ledger['sources']
    if [s['id'] for s in sources] != ['x', 'y', 'z']:
        raise ValueError('This pilot requires exactly x, y, z')
    inventory = []
    for source, split in zip(sources, ['train_candidate', 'train_candidate', 'holdout_candidate']):
        if source['filename'] != source['id'] + '.mp3' or source['split'] != split:
            raise ValueError('Unexpected source filename or split')
        path = source_dir / source['filename']
        if digest(path) != source['sha256']:
            raise ValueError('Source differs from permission ledger: ' + source['id'])
        probe = json.loads(subprocess.check_output([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'json', str(path)], text=True, timeout=60))
        duration = float(probe['format']['duration'])
        inventory.append((source, path, duration, windows(duration)))
    output.mkdir(parents=True)
    rows = []
    for source, path, duration, starts in inventory:
        for n, start in enumerate(starts):
            name = f"{source['id']}-{n + 1:02d}"
            destination = output / (name + '.wav')
            extract(path, start, destination)
            rows.append({'id': name, 'file': destination.name, 'sha256': digest(destination),
                         'source_id': source['id'], 'source_sha256': source['sha256'],
                         'source_duration_seconds': duration, 'start_seconds': start,
                         'duration_seconds': 30, 'gain_db': -6, 'split': source['split'],
                         'review_status': 'NOT RUN', 'training_eligible': False})
        if digest(path) != source['sha256']:
            raise ValueError('Source changed during preparation')
    with (output / 'review.csv').open('x', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=['id', 'split', 'decision', 'caption',
            'vocal_content', 'lyrics', 'bpm', 'key', 'session_id', 'notes'])
        writer.writeheader()
        writer.writerows({'id': row['id'], 'split': row['split'], 'decision': 'pending'} for row in rows)
    report = {'preparation': 'PASS', 'training': 'NOT RUN', 'human_content_review': 'NOT RUN',
              'independent_holdout': 'NOT RUN', 'permission_ledger_sha256': digest(ledger_path),
              'script_sha256': digest(Path(__file__)), 'accepted_training_examples': 0,
              'candidate_seconds': len(rows) * 30, 'candidates': rows}
    (output / 'candidates.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ledger', type=Path, required=True)
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report = prepare(args.ledger, args.source_dir, args.output)
    print(json.dumps({'preparation': report['preparation'], 'candidates': len(report['candidates']),
                      'accepted_training_examples': 0, 'training': 'NOT RUN'}))
