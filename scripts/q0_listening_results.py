#!/usr/bin/env python3
"""Validate packet-bound Q0 listening forms; never infer votes or pass quality."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from q0_audit import digest
from summarize_listening import estimate

DIMENSIONS = ('musicality', 'realism', 'groove', 'creativity', 'recognizability', 'enjoyment')


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key')
        result[key] = value
    return result


def summarize(trial, responses):
    if (trial/'INCOMPLETE').exists():
        raise ValueError('Incomplete trial')
    packet = json.loads((trial/'listener/packet.json').read_text())
    report = json.loads((trial/'report.json').read_text())
    keys = json.loads((trial/'organizer-key.json').read_text())
    identity = hashlib.sha256(json.dumps(packet['audio_sha256'], sort_keys=True).encode()).hexdigest()
    if identity != packet['packet_id'] or identity != report['packet_id']:
        raise ValueError('Packet identity mismatch')
    for name, sha in packet['audio_sha256'].items():
        if not re.fullmatch(r'[A-Za-z0-9_-]+\.wav', name) or digest(trial/'listener'/name) != sha:
            raise ValueError('Audio changed or unsafe filename')
    codes = {}
    for row in report['records']:
        arms = set(row['arms'])
        found = []
        for i in range(len(arms)):
            code = row['id']+'-'+str(i+1)
            value = keys[code]
            if value['sha256'] != packet['audio_sha256'][code+'.wav']:
                raise ValueError('Organizer key hash mismatch')
            codes[code] = (row['id'], value['arm'])
            found.append(value['arm'])
        if set(found) != arms or len(set(found)) != len(found):
            raise ValueError('Missing or duplicate condition')
    if set(codes) != set(keys):
        raise ValueError('Unexpected organizer code')
    accepted, comments, sources, seen = {}, [], [], set()
    allowed = {'reviewer', 'listened'} | {c+'/'+f for c in codes for f in (*DIMENSIONS, 'notes')}
    for path in responses:
        with path.open('rb') as stream:
            data = stream.read(1024*1024+1)
        if len(data) > 1024*1024:
            raise ValueError('Response exceeds 1 MiB')
        response = json.loads(data, object_pairs_hook=unique_object)
        if (set(response) != {'schema_version', 'packet_id', 'ratings'} or
                response['schema_version'] != '1.0-q0-listening' or response['packet_id'] != identity):
            raise ValueError('Response schema or packet mismatch')
        ratings = response['ratings']
        if not isinstance(ratings, dict) or not set(ratings) <= allowed:
            raise ValueError('Unknown response field')
        reviewer = ratings.get('reviewer', '')
        if (not isinstance(reviewer, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', reviewer) or
                reviewer.startswith('UI_FIXTURE') or ratings.get('listened') != 'yes'):
            raise ValueError('Opaque reviewer code and actual listening attestation required')
        if any(not isinstance(value, str) for value in ratings.values()):
            raise ValueError('Expected form strings')
        for code, (source, arm) in codes.items():
            values = [ratings.get(code+'/'+dimension, '') for dimension in DIMENSIONS]
            notes = ratings.get(code+'/notes', '')
            if len(notes) > 2000:
                raise ValueError('Notes exceed 2000 characters')
            if not any(values) and not notes:
                continue
            key = (reviewer, source, arm)
            if key in seen:
                raise ValueError('Duplicate reviewer/source/condition')
            seen.add(key)
            if any(values):
                if any(value not in ('1', '2', '3', '4', '5') for value in values):
                    raise ValueError('Complete all six ratings for a heard candidate; leave unheard candidates blank')
                accepted[key] = dict(zip(DIMENSIONS, map(int, values)))
            if notes:
                comments.append({'reviewer': reviewer, 'source': source, 'arm': arm, 'notes': notes})
        sources.append({'name': path.name, 'sha256': hashlib.sha256(data).hexdigest()})
    coverage, comparisons = {}, {}
    for row in report['records']:
        source, arms = row['id'], set(row['arms'])
        listeners = {r for r, s, _ in accepted if s == source}
        coverage[source] = {'reviewer_codes': len(listeners),
            'complete_five_condition_codes': sum(all((r, source, a) in accepted for a in arms) for r in listeners)}
    for arm in sorted({a for _, a in codes.values()}-{'A'}):
        by_source = {}
        for (reviewer, source, candidate), scores in accepted.items():
            control = accepted.get((reviewer, source, 'A'))
            if candidate != arm or control is None:
                continue
            for dimension in DIMENSIONS:
                by_source.setdefault(source, {}).setdefault(dimension, []).append(scores[dimension]-control[dimension])
        comparisons[arm] = {'paired_source_clips': len(by_source),
            'candidate_minus_A': {d: estimate([sum(v[d])/len(v[d]) for v in by_source.values()])
                                  for d in DIMENSIONS}}
    return {'status': 'PARTIAL' if accepted or comments else 'NOT RUN', 'packet_id': identity,
        'submitted_files': sources, 'candidate_ratings': len(accepted), 'comments': comments,
        'coverage': coverage, 'comparisons': comparisons, 'formal_quality': 'NOT RUN',
        'reviewer_independence': 'NOT RUN', 'benchmarks_changed': False,
        'limits': 'Descriptive paired differences averaged within source before bootstrap. Reviewer codes do not prove independent people. '
                  'No interval for one source. Ratings are not forced preferences or a professional-quality verdict.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--trial', type=Path, required=True)
    parser.add_argument('--response', type=Path, action='append', default=[])
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = summarize(args.trial, args.response)
    with args.output.open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False); stream.write('\n')
    print(f"{result['status']}: {result['candidate_ratings']} candidate ratings; formal quality NOT RUN")
