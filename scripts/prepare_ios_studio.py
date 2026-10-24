#!/usr/bin/env python3
"""Package the audited shared performance console for the native iOS app."""
from pathlib import Path
import shutil
from verify_web_bundle import verify

ROOT = Path(__file__).resolve().parents[1]

def prepare():
    verify()
    target = ROOT / 'build-ios-studio/Studio'
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(ROOT / 'dist/web', target)
    for path in (ROOT / 'apps/ios/Studio').iterdir():
        if path.is_file():
            shutil.copy2(path, target / path.name)
    page = target / 'dj.html'
    html = page.read_text()
    needle = '<script type="module" src="./dj.js"></script>'
    assert html.count(needle) == 1
    html = html.replace(needle, '<link rel="stylesheet" href="./mobile-studio.css"><script src="./mobile-boot.js"></script>' + needle)
    page.write_text(html)
    print('Prepared audited native DJ studio.')

if __name__ == '__main__':
    prepare()
