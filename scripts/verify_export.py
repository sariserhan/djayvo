#!/usr/bin/env python3
"""Verify a completed Djayvo export before consuming its files."""
import argparse
import hashlib
import json
from pathlib import Path
import re


def verify_export(prefix, required_styles=()):
    marker = Path(str(prefix)+'.complete.json')
    if marker.is_symlink() or not marker.is_file() or marker.stat().st_size > 65536:
        raise ValueError('missing/invalid export completion record')
    record = json.loads(marker.read_text())
    if (not isinstance(record, dict) or record.get('schema_version') != '1.0-export' or
            record.get('status') != 'complete' or not re.fullmatch('[0-9a-f]{64}', str(record.get('source_sha256', '')))):
        raise ValueError('invalid export completion metadata')
    artifacts = record.get('artifacts')
    if not isinstance(artifacts, list) or not 4 <= len(artifacts) <= 32:
        raise ValueError('invalid export artifact count')
    suffixes = set()
    for item in artifacts:
        if not isinstance(item, dict):
            raise ValueError('invalid export artifact')
        suffix = item.get('suffix', '')
        if (not isinstance(suffix, str) or not re.fullmatch(r'\.(hiphop|reggae|experimental|baseline)\.(wav|score\.json|report\.json|events\.tsv|piano\.wav|bass\.wav|drums\.wav|vocals\.wav)', suffix)
                or suffix in suffixes or type(item.get('bytes')) is not int or not 0 < item['bytes'] <= 64*1024*1024):
            raise ValueError('invalid/duplicate artifact path or size')
        suffixes.add(suffix)
        path = Path(str(prefix)+suffix)
        if path.is_symlink() or not path.is_file() or path.stat().st_size != item['bytes']:
            raise ValueError('missing/changed export artifact: '+suffix)
        digest = hashlib.sha256()
        with path.open('rb') as stream:
            for chunk in iter(lambda: stream.read(1024*1024), b''):
                digest.update(chunk)
        if digest.hexdigest() != item.get('sha256'):
            raise ValueError('export artifact hash mismatch: '+suffix)
    styles = {s.split('.')[1] for s in suffixes}
    if not set(required_styles) <= styles:
        raise ValueError('required strategies missing from complete export')
    for style in styles:
        basic = {f'.{style}.{ext}' for ext in ('wav', 'score.json', 'report.json', 'events.tsv')}
        stems = {f'.{style}.{stem}.wav' for stem in ('piano', 'bass', 'drums', 'vocals')}
        if not basic <= suffixes or (suffixes & stems and not stems <= suffixes):
            raise ValueError('incomplete strategy artifact set')
        score = json.loads(Path(str(prefix)+f'.{style}.score.json').read_text())
        if score.get('source_asset_id') != 'sha256:'+record['source_sha256']:
            raise ValueError('completion/source provenance mismatch')
    return record


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('prefix', type=Path)
    args = parser.parse_args()
    try:
        record = verify_export(args.prefix)
    except (ValueError, OSError) as error:
        raise SystemExit('FAIL: '+str(error))
    print(f"PASS: {len(record['artifacts'])} complete, unchanged export artifacts")
