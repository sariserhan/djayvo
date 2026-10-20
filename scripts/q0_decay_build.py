#!/usr/bin/env python3
"""Build an isolated native decay candidate; never edit the production core."""
import argparse
import difflib
from pathlib import Path
import shutil
import subprocess

from q0_audit import ROOT, digest, write


def build(output):
    if output.exists():
        raise ValueError('Choose a fresh experiment build directory')
    output.mkdir(parents=True)
    (output/'INCOMPLETE').touch()
    source = output/'source'
    source.mkdir()
    shutil.copyfile(ROOT/'CMakeLists.txt', source/'CMakeLists.txt')
    for folder in ('core', 'tools/cli'):
        shutil.copytree(ROOT/folder, source/folder)
    voice = source/'core/instruments/voice.cpp'
    before = voice.read_text()
    old = 'instrument==Instrument::guitar?0.12:instrument==Instrument::pad?0.8'
    new = 'instrument==Instrument::guitar?0.12:instrument==Instrument::drums?1.0:instrument==Instrument::pad?0.8'
    if before.count(old) != 1:
        raise ValueError('Unexpected release implementation; audit before rebuilding')
    after = before.replace(old, new)
    voice.write_text(after)
    (output/'decay.patch').write_text(''.join(difflib.unified_diff(
        before.splitlines(True), after.splitlines(True),
        fromfile='a/core/instruments/voice.cpp', tofile='b/core/instruments/voice.cpp')))
    hashes = {str(p.relative_to(source)): digest(p) for p in sorted(source.rglob('*')) if p.is_file()}
    subprocess.run(['cmake', '-S', str(source), '-B', str(output/'build'),
                    '-DCMAKE_BUILD_TYPE=Release', '-DBUILD_TESTING=ON'], check=True)
    subprocess.run(['cmake', '--build', str(output/'build'), '--target',
                    'jamloom_remix', 'jamloom_tests', 'jamloom_remix_tests',
                    'jamloom_live_tests', '-j', '4'], check=True)
    changed = [name for name, sha in hashes.items() if digest(ROOT/name) != sha]
    if changed != ['core/instruments/voice.cpp']:
        raise ValueError('Unexpected source differences')
    write(output/'build-manifest.json', {'schema_version': '1.0-q0-decay',
        'changed_sources': changed, 'source_sha256': hashes,
        'renderer_sha256': digest(output/'build/jamloom_remix'),
        'hypothesis': 'A longer drum release avoids prematurely gating recorded decay.',
        'limits': 'Same recorded samples and mixer. No new velocity layers or cymbal choke groups. Not a realism claim.'})
    (output/'INCOMPLETE').unlink()


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=Path, required=True)
    build(p.parse_args().output.resolve())
