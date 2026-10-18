"""Audit the static build for expected files and bundled notices, not release approval."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def verify():
    bundle = ROOT / 'dist/web'
    expected = {p.name for pattern in ('*.html', '*.css', '*.js') for p in (ROOT / 'apps/web').glob(pattern)}
    expected |= {'engine/djayvo_web.mjs', 'engine/djayvo_web.wasm',
                 'licenses/VSCO-2-CE-LICENSE.txt', 'licenses/VCSL-LICENSE.txt', 'licenses/EMSCRIPTEN-LICENSE.txt'}
    actual = {str(p.relative_to(bundle)) for p in bundle.rglob('*') if p.is_file()}
    assert actual == expected, f'Unexpected or missing public files: {actual ^ expected}'
    assert not any(p.is_symlink() for p in bundle.rglob('*')), 'Bundle must not link outside itself'
    for name in expected:
        if '/' not in name:
            assert (bundle / name).read_bytes() == (ROOT / 'apps/web' / name).read_bytes(), f'Stale file: {name}'
    wasm = (bundle / 'engine/djayvo_web.wasm').read_bytes()
    assert wasm[:4] == b'\0asm'
    assert len(wasm) < 16 * 1024 * 1024
    for notice in (ROOT / 'assets/licenses').glob('*.txt'):
        assert (bundle / 'licenses' / notice.name).read_bytes() == notice.read_bytes()
    notices = (bundle / 'licenses/EMSCRIPTEN-LICENSE.txt').read_text()
    for name in ('libc/musl', 'libcxx/', 'libcxxabi/', 'libunwind/', 'compiler-rt/'):
        assert name in notices, f'Missing runtime notice: {name}'
    return {'gate': 'PASS', 'file_count': len(actual), 'bytes': sum((bundle / p).stat().st_size for p in actual),
            'private_audio_and_test_files_absent': 'PASS', 'license_notices': 'PASS',
            'wasm_sha256': hashlib.sha256(wasm).hexdigest(), 'wasm_bytes': len(wasm),
            'files': {p: hashlib.sha256((bundle / p).read_bytes()).hexdigest() for p in sorted(actual)},
            'public_release': 'NOT RUN'}


if __name__ == '__main__':
    print(json.dumps(verify(), indent=2))
