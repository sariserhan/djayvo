#!/usr/bin/env python3
"""Execute Q0's same imported E plans in an isolated Node/WebAssembly CLI."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

from compare_portability import compare
from q0_audit import ROOT, digest, inputs, write
from q0_measure_comparisons import timing


def run(trial, build, sdk, output):
    if output.exists() or (trial/'INCOMPLETE').exists() or (build/'INCOMPLETE').exists():
        raise ValueError('Choose fresh output and complete native artifacts')
    report = json.loads((trial/'report.json').read_text())
    manifest = json.loads((build/'build-manifest.json').read_text())
    development = report.get('version') == '1.0-q0-development'
    identity_matches = (report.get('renderer_sha256') == manifest['renderer_sha256'] if development
                        else report['instrument_build'] == manifest)
    if not identity_matches:
        raise ValueError('Native build identity differs')
    prefix = 'candidate' if development else 'E'
    for name, sha in manifest['source_sha256'].items():
        if digest(build/'source'/name) != sha:
            raise ValueError('Isolated source changed')
    rights = {r['id']: r['sha256'] for r in inputs()}
    source = build/'source'
    listing = re.search(r'add_library\(jamloom_core STATIC(.*?)\)', (source/'CMakeLists.txt').read_text(), re.S)
    files = listing.group(1).split()
    if not files or any(not re.fullmatch(r'core/[A-Za-z0-9_/]+\.cpp', f) for f in files):
        raise ValueError('Unexpected core source list')
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    env = {**os.environ, 'EM_CONFIG': str(sdk/'.emscripten')}
    compiler = sdk/'upstream/emscripten/em++'
    version = subprocess.check_output([str(compiler), '--version'], env=env, text=True)
    if ' 6.0.1 ' not in version.splitlines()[0]:
        raise ValueError('Expected pinned Emscripten 6.0.1')
    binary = output/'jamloom_remix.js'
    command = [str(compiler), '-std=c++17', '-O3', '-fexceptions', '-fno-fast-math',
        '-I'+str(source/'core/include'), '-I'+str(source/'tools/cli'), str(ROOT/'experiments/q0/plan_render.cpp'),
        str(source/'tools/cli/plan_import.cpp'), *[str(source/f) for f in files],
        '-sENVIRONMENT=node', '-sNODERAWFS=1', '-sALLOW_MEMORY_GROWTH=1',
        '-sSTACK_SIZE=2097152', '-o', str(binary)]
    subprocess.run(command, env=env, check=True, timeout=600)
    node = shutil.which('node')
    if not node:
        raise ValueError('Node is required')
    rows = []
    for record in report['records']:
        ident, style = record['id'], record['style']
        wav = ROOT/'renders/q0-baseline-v2-20261020'/ident/'source.wav'
        if digest(wav) != rights[ident]:
            raise ValueError('Source authorization/hash mismatch')
        plan_path = trial/ident/(prefix+'.plan.json')
        candidate = output/(ident+'.'+style)
        subprocess.run([node, str(binary), str(wav), str(plan_path), style,
            str(candidate), '--consent'], check=True, timeout=120)
        row = compare(trial/ident/(prefix+'.'+style), candidate)
        row.update(id=ident, timing=timing(json.loads(plan_path.read_text()),
            Path(str(candidate)+'.events.tsv')))
        rows.append(row)
    write(output/'report.json', {'status': 'PASS', 'execution': 'WebAssembly CLI in Node on Apple M5; not AudioWorklet or Linux',
        'compiler': version, 'node': subprocess.check_output([node, '--version'], text=True).strip(),
        'build_command': command, 'probe_sha256': digest(ROOT/'experiments/q0/plan_render.cpp'),
        'native_source_manifest': manifest, 'comparisons': rows,
        'tolerances': {'maximum_pcm_error': .001, 'rms_pcm_error': .0001},
        'files_sha256': {p.name: digest(p) for p in sorted(output.iterdir()) if p.is_file() and p.name != 'INCOMPLETE'},
        'human_quality': 'NOT RUN'})
    (output/'INCOMPLETE').unlink()
    print('PASS: five same-plan native/WebAssembly comparisons using existing waveform tolerances')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--trial', type=Path, required=True)
    parser.add_argument('--build', type=Path, default=ROOT/'build-q0-decay-20261020')
    parser.add_argument('--sdk', type=Path, default=ROOT/'build-web-tools/emsdk')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    run(args.trial.resolve(), args.build.resolve(), args.sdk.resolve(), args.output.resolve())
