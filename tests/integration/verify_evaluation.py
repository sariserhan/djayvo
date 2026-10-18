#!/usr/bin/env python3
"""Exercise batch preparation with original procedural controls, never human scores."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import wave
sys.path.insert(0, str(Path(__file__).resolve().parents[2]/'scripts'))
from make_fixture import make_signal
from prepare_evaluation import load_manifest, readiness, run_batch


def rejects(action):
    try: action()
    except (ValueError, OSError): return
    raise AssertionError('invalid evaluation input accepted')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--renderer', type=Path, required=True)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='djayvo-evaluation-') as folder:
        root = Path(folder); source = root/'source.wav'; make_signal(source, 8000)
        silence = root/'silence.wav'
        with wave.open(str(silence), 'wb') as audio:
            audio.setparams((1, 2, 8000, 0, 'NONE', 'not compressed'));audio.writeframes(bytes(48000))
        manifest = {'schema_version': '1.0-evaluation', 'clips': [
            {'id': name, 'path': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
             'kind': kind, 'source_kind': 'synthetic', 'session_id': 'test-session',
             'consent': {'local_processing': True, 'review_scope': 'owner_only', 'evidence': 'Original procedural test fixture; not a human recording.'}}
            for name, path, kind in [('signal', source, 'synthetic_control'), ('silence', silence, 'silence')]]}
        path = root/'manifest.json'
        def save(value): path.write_text(json.dumps(value))
        save(manifest)
        for field, value in [('id', '../escape'), ('sha256', '0'*64), ('kind', 'unknown')]:
            bad = copy.deepcopy(manifest);bad['clips'][0][field] = value;save(bad)
            rejects(lambda: load_manifest(path))
        bad = copy.deepcopy(manifest);bad['clips'][0]['consent']['local_processing'] = False;save(bad)
        rejects(lambda: run_batch(path, root/'denied', args.renderer));assert not (root/'denied').exists()
        bad = copy.deepcopy(manifest);bad['clips'].append(bad['clips'][0]);save(bad)
        rejects(lambda: load_manifest(path))
        bad = copy.deepcopy(manifest);bad['clips'][0].update(kind='speech', speaker_id=None);save(bad)
        rejects(lambda: load_manifest(path))
        for license_info in ({}, {'id': 'CC-BY-4.0', 'url': 'javascript:bad', 'attribution': 'Test'},
                             {'id': 'CC-BY-4.0', 'url': 'https://creativecommons.org/licenses/by/4.0/', 'attribution': ' '}):
            bad = copy.deepcopy(manifest);bad['clips'][0]['license'] = license_info;save(bad)
            rejects(lambda: load_manifest(path))
        manifest['clips'][0]['license'] = {'id': 'CC-BY-4.0',
            'url': 'https://creativecommons.org/licenses/by/4.0/',
            'attribution': 'Test attribution for original procedural fixture; no third-party audio.'}
        save(manifest)
        report = run_batch(path, root/'batch', args.renderer)
        assert report['status'] == 'PASS' and report['formal_quality'] == 'NOT RUN'
        assert report['dataset_readiness']['status'] == 'PARTIAL'
        assert report['dataset_readiness']['real_clips'] == 0, 'synthetic controls counted as real source diversity'
        assert all(v == {'accepted': 0, 'attempted': 0} for v in report['per_style_technical_counts'].values())
        assert len(report['records']) == 6
        signals = [r for r in report['records'] if r['kind'] == 'synthetic_control']
        assert len({r['block_id'] for r in signals}) == 3 and all(r['packet'] == 'PASS' for r in signals)
        for row in signals:
            notice = root/'batch/signal'/str(row['seed'])/'blinded/listener/ATTRIBUTION.txt'
            assert manifest['clips'][0]['license']['attribution'] in notice.read_text()
        assert all(r['expected_rejection'] == 'PASS' for r in report['records'] if r['kind'] == 'silence')
        frozen = (root/'batch/freeze.json').read_bytes()
        rejects(lambda: run_batch(path, root/'batch', args.renderer))
        assert (root/'batch/freeze.json').read_bytes() == frozen
        empty = root/'empty';empty.mkdir();rejects(lambda: run_batch(path, empty, args.renderer))
        # Corrupt WAVs are recorded as failures and cannot silently disappear from attempts.
        corrupt = root/'corrupt.wav';corrupt.write_bytes(b'bad WAV '*20)
        bad = copy.deepcopy(manifest);bad['clips'] = [dict(bad['clips'][0], path='corrupt.wav',
            sha256=hashlib.sha256(corrupt.read_bytes()).hexdigest(), kind='noise', source_kind='recorded')];save(bad)
        failed = run_batch(path, root/'failed', args.renderer)
        assert failed['status'] == 'FAIL' and failed['formal_quality'] == 'NOT RUN'
        assert all(v == {'accepted': 0, 'attempted': 3} for v in failed['per_style_technical_counts'].values())
        assert all(r['packet'] == 'NOT RUN' for r in failed['records'])
        assert readiness([])['status'] == 'PARTIAL'
    print('PASS: frozen batch, three seeds, unique blocks, consent/hash/path/duplicate rejection, no overwrite, silence controls, retained failures and honest gates')
    print('NOT RUN: human listening; fixtures are original procedural test data')


if __name__ == '__main__': main()
