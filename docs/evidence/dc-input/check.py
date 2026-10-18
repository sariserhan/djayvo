"""Fresh local regression renders; never regenerates the supplied speech fixture."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
from compare_portability import compare
from verify_export import verify_export

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--renderer', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--reference', type=Path)
parser.add_argument('--legacy', action='store_true', help='Capture before-fix outputs; do not assert the new rejection')
args = parser.parse_args()
renderer = args.renderer.resolve()
args.output.mkdir(parents=True, exist_ok=False)
styles = ('hiphop', 'reggae', 'experimental', 'club', 'funk', 'call_response', 'hybrid', 'baseline')
sources = {'fixture': ('renders/fixtures/synthetic-speech.wav', '--synthetic-fixture'),
           'owner': ('renders/voice-20261017-221411/source-pcm.wav', '--consent')}
report = {'renders': {}, 'controls': {}, 'human_listening': 'NOT RUN'}
for label, (relative, permission) in sources.items():
    source = ROOT / relative
    for style in styles:
        prefix = args.output / f'{label}-{style}'
        subprocess.run([str(renderer), '--input', str(source), permission, '--output', str(prefix),
                        '--style', style, '--seed', '4123'], check=True, capture_output=True, timeout=120)
        verify_export(prefix)
        record = {'export': 'PASS', 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest()}
        if args.reference:
            record['comparison'] = compare(Path(f'{args.reference / f"{label}-{style}"}.{style}'), Path(f'{prefix}.{style}'))
            assert record['comparison']['byte_identical_wav'], 'Expected unchanged accepted-source PCM'
        report['renders'][f'{label}-{style}'] = record
for rate in (8000, 44100, 192000):
    for level in (-32768, -16384, 16384, 32767):
        name = f'constant-{rate}-{level}'
        source = args.output / f'{name}.wav'
        with wave.open(str(source), 'wb') as writer:
            writer.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
            writer.writeframes(struct.pack('<h', level) * rate * 3)
        prefix = args.output / f'{name}-result'
        result = subprocess.run([str(renderer), '--input', str(source), '--synthetic-fixture',
                                 '--output', str(prefix), '--style', 'all'], capture_output=True, text=True, timeout=120)
        rejected = result.returncode != 0 and 'silent or too quiet' in result.stderr
        report['controls'][name] = {'status': 'PASS' if rejected else 'FAIL', 'rejected': rejected}
        if not args.legacy:
            assert rejected, result.stdout + result.stderr
            assert not list(args.output.glob(f'{name}-result*')), 'Rejected input published files'
report['status'] = 'PASS' if all(c['rejected'] for c in report['controls'].values()) else 'FAIL'
(args.output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'renders': len(report['renders']), 'controls': len(report['controls']), 'output': str(args.output)}))
