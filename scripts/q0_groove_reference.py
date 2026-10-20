#!/usr/bin/env python3
"""Descriptive GMD audit only: no profile fitting, training or audio downloads."""
import argparse
import collections
import csv
import io
from pathlib import Path
import statistics
import zipfile

import mido
from q0_audit import digest, write

EXPECTED = '651cbc524ffb891be1a3e46d89dc82a1cecb09a57c748c7b45b844c4841dcc1e'


def measure(data):
    midi = mido.MidiFile(file=io.BytesIO(data))
    tempos = {m.tempo for t in midi.tracks for m in t if m.type == 'set_tempo'}
    signatures = {(m.numerator, m.denominator) for t in midi.tracks for m in t
                  if m.type == 'time_signature'}
    if len(tempos) > 1 or signatures - {(4, 4)}:
        return None
    tempo, tick, hits = next(iter(tempos), 500000), 0, []
    for message in mido.merge_tracks(midi.tracks):
        tick += message.time
        if message.type == 'note_on' and message.velocity:
            grid = midi.ticks_per_beat / 4
            residual = tick - round(tick/grid)*grid
            hits.append((message.note, message.velocity,
                         residual * tempo / midi.ticks_per_beat / 1000))
    return hits


def run(archive, output):
    if digest(archive) != EXPECTED:
        raise ValueError('GMD official archive checksum mismatch')
    if output.exists():
        raise ValueError('Choose a fresh report path')
    groups, split_counts, skipped = collections.defaultdict(list), collections.Counter(), []
    with zipfile.ZipFile(archive) as zipped:
        rows = list(csv.DictReader(io.StringIO(zipped.read('groove/info.csv').decode())))
        for row in rows:
            hits = measure(zipped.read('groove/'+row['midi_filename']))
            if hits is None:
                skipped.append(row['id']); continue
            split_counts[row['split']] += 1
            # Keep official splits distinct, even for this non-training analysis.
            groups[(row['split'], row['style'].split('/')[0])].extend(hits)
    summaries = []
    for (split, style), hits in sorted(groups.items()):
        if not hits:
            continue
        velocities, offsets = [h[1] for h in hits], [h[2] for h in hits]
        summaries.append({'split': split, 'style': style, 'hits': len(hits),
            'velocity_min': min(velocities), 'velocity_max': max(velocities),
            'velocity_stddev': statistics.pstdev(velocities),
            'nearest_sixteenth_offset_mean_ms': statistics.mean(offsets),
            'nearest_sixteenth_offset_stddev_ms': statistics.pstdev(offsets),
            'within_1ms_of_grid_fraction': sum(abs(x) <= 1 for x in offsets)/len(offsets)})
    write(output, {'status': 'PASS', 'archive_sha256': EXPECTED,
        'license': 'CC-BY-4.0', 'source': 'https://magenta.tensorflow.org/datasets/groove',
        'attribution': 'Groove MIDI Dataset, Google Magenta; Gillick et al., 2019.',
        'files_in_metadata': len(rows), 'analyzed_files_by_official_split': dict(split_counts),
        'skipped_variable_tempo_or_non_4_4': skipped, 'groups': summaries,
        'training': False, 'expression_profile_fitted': False,
        'limitations': 'Nearest-grid residuals mix swing, intentional subdivisions and timing. '
            'They are not a recommended jitter distribution. This is descriptive analysis; '
            'no train/validation/test recombination, no acoustic instrument realism claim.'})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    run(args.archive, args.output)
