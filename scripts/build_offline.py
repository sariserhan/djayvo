#!/usr/bin/env python3
"""Generate the bounded public-asset list for a standalone or /studio/ build."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INSTALL_ASSETS = {'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'}


def worker_source(bundle):
    names = {p.name for pattern in ('*.html', '*.css', '*.js') for p in (ROOT / 'apps/web').glob(pattern)}
    names |= INSTALL_ASSETS
    names |= {'engine/jamloom_web.mjs', 'engine/jamloom_web.wasm', 'engine/jamloom_live.wasm',
              'licenses/VSCO-2-CE-LICENSE.txt', 'licenses/VCSL-LICENSE.txt',
              'licenses/BLACK-AND-GREEN-GUITARS-CC0.txt', 'licenses/EMSCRIPTEN-LICENSE.txt'}
    actual = {p.relative_to(bundle).as_posix() for p in bundle.rglob('*') if p.is_file()}
    if actual - {'service-worker.js'} != names or any(p.is_symlink() for p in bundle.rglob('*')):
        raise ValueError('Offline bundle must contain only audited public assets, without symlinks')
    assets = {}
    for name in sorted(names):
        data = (bundle / name).read_bytes()
        if not 0 < len(data) <= 16 * 1024 * 1024:
            raise ValueError('Offline asset exceeds size limits')
        assets[name] = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
    if sum(asset['bytes'] for asset in assets.values()) > 32 * 1024 * 1024:
        raise ValueError('Offline bundle exceeds 32 MiB')
    template = (ROOT / 'scripts/service-worker.js').read_text()
    manifest = json.dumps(assets, sort_keys=True, separators=(',', ':'))
    version = hashlib.sha256((template + manifest).encode()).hexdigest()
    return template.replace('__JAMLOOM_ASSETS__', manifest).replace('__JAMLOOM_VERSION__', version)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bundle', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    expected = worker_source(args.bundle)
    target = args.bundle / 'service-worker.js'
    if args.check:
        if target.read_text() != expected:
            raise SystemExit('Offline worker is stale or contains unexpected assets')
    else:
        target.write_text(expected)
