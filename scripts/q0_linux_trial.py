#!/usr/bin/env python3
"""Render the frozen Q0 E plans in the existing local Linux portability container."""
import argparse
import json
from pathlib import Path
import re
import subprocess

from compare_portability import compare
from q0_audit import ROOT, digest, inputs, write
from q0_measure_comparisons import timing
from verify_export import verify_export


def run(trial, output):
    mount = ROOT/'renders/arrangement-linux'
    if output.parent != mount or not re.fullmatch(r'[a-zA-Z0-9_-]+', output.name) or output.exists():
        raise ValueError('Use a fresh direct child of the existing arrangement-linux output mount')
    build = ROOT/'build-q0-decay-20261020'
    report = json.loads((trial/'report.json').read_text())
    manifest = json.loads((build/'build-manifest.json').read_text())
    development = report.get('version') == '1.0-q0-development'
    identity_matches = (report.get('renderer_sha256') == manifest['renderer_sha256'] if development
                        else report['instrument_build'] == manifest)
    if (trial/'INCOMPLETE').exists() or (build/'INCOMPLETE').exists() or not identity_matches:
        raise ValueError('Incomplete or changed native experiment')
    prefix = 'candidate' if development else 'E'
    for name, sha in manifest['source_sha256'].items():
        if digest(build/'source'/name) != sha:
            raise ValueError('Frozen source changed')
    rights = {r['id']: r['sha256'] for r in inputs()}
    container = ['docker', '--context', 'colima-djayvo', 'exec', 'djayvo-portability']
    mounts = json.loads(subprocess.check_output(
        ['docker', '--context', 'colima-djayvo', 'inspect', 'djayvo-portability',
         '--format', '{{json .Mounts}}'], text=True))
    expected = {('/src', str(ROOT), False), ('/out', str(mount), True)}
    if {(m['Destination'], m['Source'], m['RW']) for m in mounts} != expected:
        raise ValueError('Unexpected container mounts; repository must be read-only')
    target = '/tmp/jamloom-'+output.name
    subprocess.run([*container, 'test', '!', '-e', target], check=True)
    output.mkdir(); (output/'INCOMPLETE').touch()
    commands = []

    def execute(args, timeout=600):
        commands.append([*container, *args])
        result = subprocess.run(commands[-1], capture_output=True, text=True, timeout=timeout)
        with (output/'execution.log').open('a') as log:
            log.write(json.dumps(commands[-1])+'\n'+result.stdout+result.stderr)
        result.check_returncode()
        return result.stdout.strip()

    environment = {'execution': 'Local Colima Linux ARM64 VM on Apple M5; not physical Intel workstation',
        'kernel': execute(['uname', '-a']), 'os_release': execute(['cat', '/etc/os-release']),
        'compiler': execute(['g++', '--version']), 'cmake': execute(['cmake', '--version']),
        'python': execute(['python3', '--version'])}
    execute(['cmake', '-S', '/src/build-q0-decay-20261020/source', '-B', target,
             '-DCMAKE_BUILD_TYPE=Release', '-DBUILD_TESTING=ON'])
    execute(['cmake', '--build', target, '--target', 'jamloom_remix', 'jamloom_tests',
             'jamloom_remix_tests', 'jamloom_live_tests', '--parallel', '2'])
    execute(['ctest', '--test-dir', target, '--output-on-failure', '-R', '^(core|remix_core|live_instruments)$'])
    rows = []
    for record in report['records']:
        ident, style = record['id'], record['style']
        source = ROOT/'renders/q0-baseline-v2-20261020'/ident/'source.wav'
        if digest(source) != rights[ident]:
            raise ValueError('Source permission/hash changed')
        plan_path = trial/ident/(prefix+'.plan.json')
        plan = json.loads(plan_path.read_text())
        execute([target+'/jamloom_remix', '--input', '/src/'+str(source.relative_to(ROOT)),
            '--consent', '--plan', '/src/'+str(plan_path.relative_to(ROOT)),
            '--style', style, '--seed', str(plan['seed']),
            '--output', '/out/'+output.name+'/'+ident], timeout=120)
        verify_export(output/ident, (style,))
        candidate = output/(ident+'.'+style)
        rows.append({'id': ident, **compare(trial/ident/(prefix+'.'+style), candidate),
            'timing': timing(plan, Path(str(candidate)+'.events.tsv'))})
    write(output/'report.json', {'status': 'PASS', 'environment': environment,
        'build_source_manifest': manifest, 'commands': commands, 'comparisons': rows,
        'tolerances': {'maximum_pcm_error': .001, 'rms_pcm_error': .0001},
        'files_sha256': {p.name: digest(p) for p in sorted(output.iterdir()) if p.is_file() and p.name != 'INCOMPLETE'},
        'human_quality': 'NOT RUN'})
    (output/'INCOMPLETE').unlink()
    print('PASS: three Linux native test groups; five same-plan Linux/Mac waveform and event comparisons')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--trial', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    run(args.trial.resolve(), args.output.resolve())
