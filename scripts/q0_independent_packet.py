#!/usr/bin/env python3
"""Prepare only already-cleared Q0 audio for independent review; never publish it."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil

from q0_audit import digest, inputs, write
from q0_listening_results import summarize


def reviewable(record):
    permission = record.get('consent')
    return (isinstance(permission, dict) and permission.get('local_processing') is True and
            permission.get('review_scope') == 'independent_reviewers' and
            record.get('license', {}).get('id') in ('CC0-1.0', 'CC-BY-4.0') and
            bool(record.get('license', {}).get('attribution')))


def prepare(trial, output):
    if output.exists():
        raise ValueError('Choose a fresh directory; preserve existing packets and responses')
    # Reuse packet/key/hash validation before copying any audio.
    summarize(trial, [])
    rights = {r['id']: r for r in inputs()}
    report = json.loads((trial/'report.json').read_text())
    key = json.loads((trial/'organizer-key.json').read_text())
    packet = json.loads((trial/'listener/packet.json').read_text())
    selected = [r for r in report['records'] if reviewable(rights[r['id']])]
    if not selected:
        raise ValueError('No inputs have verified independent-review scope')
    ids = {r['id'] for r in selected}
    document = (trial/'listener/index.html').read_text()
    sections = list(re.finditer(r'<section><h2>([A-Za-z0-9_-]+)</h2>.*?</section>', document, re.S))
    if [m.group(1) for m in sections] != [r['id'] for r in report['records']]:
        raise ValueError('Unexpected review layout; cannot safely remove excluded sections')
    for match in reversed(sections):
        if match.group(1) not in ids:
            document = document[:match.start()]+document[match.end():]
    old = 'Private owner-only use; do not share this packet. Nothing is uploaded.'
    if document.count(old) != 1:
        raise ValueError('Unexpected packet permission notice')
    document = document.replace(old, 'Cleared recordings for independent listening review. '
        'No private owner recording is included. Nothing is uploaded.')
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    listener = output/'listener'; listener.mkdir()
    chosen_keys, audio, permissions = {}, {}, []
    for row in selected:
        ident = row['id']
        names = [ident+'-source.wav']
        if packet['audio_sha256'][names[0]] != rights[ident]['sha256']:
            raise ValueError('Source identity does not match reviewed permissions')
        for i in range(len(row['arms'])):
            code = ident+'-'+str(i+1)
            chosen_keys[code] = key[code]
            names.append(code+'.wav')
        for name in names:
            shutil.copyfile(trial/'listener'/name, listener/name)
            audio[name] = digest(listener/name)
            if audio[name] != packet['audio_sha256'][name]:
                raise ValueError('Copied audio differs from frozen listening packet')
        permissions.append({k: rights[ident][k] for k in ('id', 'sha256', 'license', 'consent')})
    for name in ('review.js', 'review.css'):
        shutil.copyfile(trial/'listener'/name, listener/name)
    (listener/'index.html').write_text(document)
    (listener/'ATTRIBUTION.txt').write_text('\n\n'.join(r['license']['attribution'] for r in permissions)+'\n')
    identity = hashlib.sha256(json.dumps(audio, sort_keys=True).encode()).hexdigest()
    write(listener/'packet.json', {'packet_id': identity, 'audio_sha256': audio})
    write(output/'organizer-key.json', chosen_keys)
    write(output/'report.json', {'technical': 'PASS', 'packet_id': identity,
        'parent_packet_id': packet['packet_id'], 'records': selected, 'permissions': permissions,
        'review_scope': 'independent_reviewers', 'audio_reused_unchanged': True,
        'excluded_sources': [r['id'] for r in report['records'] if r['id'] not in ids],
        'human_quality': 'NOT RUN', 'published': False})
    assert set(p.name for p in listener.glob('*.wav')) == set(audio)
    for excluded in set(rights)-ids:
        assert excluded not in document and not any(p.name.startswith(excluded+'-') for p in listener.iterdir())
    (output/'INCOMPLETE').unlink()
    write(output/'listening-results.json', summarize(output, []))
    print(f'PASS: {len(selected)} licensed sources, {len(audio)} unchanged WAVs; no owner voice, uploads or listening results')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--trial', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.trial.resolve(), args.output.resolve())
