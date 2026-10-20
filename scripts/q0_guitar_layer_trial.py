#!/usr/bin/env python3
"""Isolated guitar dynamics experiments using local pinned assets only."""
import argparse
import csv
import difflib
import json
import math
from pathlib import Path
import random
import subprocess

from q0_audit import ROOT, digest, level_match, loudness, write


def run(output, single_layer=False):
    if output.exists():
        raise ValueError('Choose a fresh output directory')
    preservation = json.loads((ROOT/'docs/evidence/q0-phrase-form/preservation.json').read_text())
    for name, expected in preservation.items():
        if digest(ROOT/name) != expected:
            raise ValueError('Frozen specifications or binary changed')
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    lib = ROOT/'build-mac/libjamloom_core.a'
    flags = ['clang++', '-std=c++17', '-O3', '-DNDEBUG', '-fno-fast-math',
             '-Wall', '-Wextra', '-Wpedantic', '-I'+str(ROOT/'core/include'),
             '-I'+str(ROOT/'core/instruments')]
    probe = ROOT/'scripts/q0_layer_probe.cpp'

    def execute(arm, obj=None):
        binary = output/(arm+'-probe')
        subprocess.run([*flags, str(probe), *([str(obj)] if obj else []), str(lib),
                        '-o', str(binary)], check=True)
        with (output/(arm+'.csv')).open('x') as log:
            subprocess.run([str(binary), str(output/arm)], check=True, stdout=log, timeout=120)
        with (output/(arm+'.csv')).open() as log:
            return list(csv.DictReader(log))

    baseline = execute('baseline')
    calibration = {}
    if not single_layer:
        for pitch in range(40, 77, 3):
            for take in (0, 1):
                row = next(r for r in baseline if r['instrument']=='guitar' and
                           int(r['rate'])==48000 and int(r['pitch'])==pitch and int(r['take'])==take)
                # Match the two layers at their boundary; keep the velocity power law.
                gain = float(row['rms_after'])/float(row['rms_before'])*(84/85)**1.45
                if not 0 < gain <= 1:
                    raise ValueError('Calibration must attenuate only')
                calibration[pitch, take] = gain
    table = '' if single_layer else ',\n'.join(
        '        {'+', '.join(f'{calibration[p,t]:.17g}' for t in (0, 1))+'}' for p in range(40, 77, 3))
    voice_path = ROOT/'core/instruments/voice.cpp'
    before = voice_path.read_text()
    marker = '    // shortcut: discrete recorded layers; assess boundary jumps before adding crossfades.'
    if before.count(marker) != 1:
        raise ValueError('Unexpected voice implementation')
    patch = '''    // Q0 experiment: align 500 ms layer energy, attenuating the soft guitar only.
    if (instrument_==Instrument::guitar && !e.muted && e.velocity<=84) {
        static constexpr double layer_gain[13][2] = {
TABLE
        };
        velocity_*=layer_gain[(sample.root_midi-40)/3][sample.take];
    }
'''.replace('TABLE', table)
    if single_layer:
        selection = '(muted?127:velocity<=84?84:127)'
        if before.count(selection) != 1:
            raise ValueError('Unexpected guitar layer selection')
        after = before.replace(selection, '(muted?127:84)')
    else:
        after = before.replace(marker, patch+marker)
    (output/'voice.cpp').write_text(after)
    (output/'candidate.patch').write_text(''.join(difflib.unified_diff(
        before.splitlines(True), after.splitlines(True), fromfile='a/core/instruments/voice.cpp',
        tofile='b/core/instruments/voice.cpp')))
    obj = output/'voice.o'
    subprocess.run([*flags, '-c', str(output/'voice.cpp'), '-o', str(obj)], check=True)
    candidate = execute('candidate', obj)
    replay = execute('replay', obj)
    if candidate != replay:
        raise ValueError('Repeated measurements differ')
    changes = []
    for a, b in zip(baseline, candidate):
        if {k:a[k] for k in ('instrument','rate','pitch','take','boundary')} != {
                k:b[k] for k in ('instrument','rate','pitch','take','boundary')}:
            raise ValueError('Probe conditions differ')
        if a['instrument']=='piano' and a != b:
            raise ValueError('Piano changed')
        if a['instrument']=='guitar':
            preserved = 'rms_before' if single_layer else 'rms_after'
            if a[preserved] != b[preserved]:
                raise ValueError('Preserved guitar layer changed')
            if abs(float(b['delta_db'])) >= abs(float(a['delta_db'])):
                raise ValueError('Layer step did not shrink')
            if single_layer and not 0 < float(b['delta_db']) < 1:
                raise ValueError('Expected a positive sub-dB velocity step')
            if not single_layer and b['rate']=='48000' and int(b['pitch']) in range(40, 77, 3):
                expected = 20*1.45*math.log10(85/84)
                if abs(float(b['delta_db'])-expected) > 1e-5:
                    raise ValueError('Sample-root calibration differs from its target')
            changes.append({k:b[k] for k in ('rate','pitch','take','delta_db','attack_delta_db','one_second_delta_db')})
    for path in sorted((output/'candidate').glob('*.wav')):
        if digest(path) != digest(output/'replay'/path.name):
            raise ValueError('Audio replay differs')
        if ('piano' in path.name or 'muted' in path.name) and digest(path) != digest(output/'baseline'/path.name):
            raise ValueError('Unaffected articulation changed')
        if single_layer:
            from q0_measure_comparisons import pcm
            _, baseline_pcm = pcm(output/'baseline'/path.name)
            _, candidate_pcm = pcm(path)
            if baseline_pcm[:5*48000*2] != candidate_pcm[:5*48000*2]:
                raise ValueError('Soft notes changed')
    with (output/'native-tests.log').open('x') as log:
        for name in ('tests', 'remix_tests', 'live_tests'):
            binary = output/name
            subprocess.run([*flags, str(ROOT/f'core/tests/{name}.cpp'), str(obj), str(lib),
                            '-o', str(binary)], check=True, stdout=log, stderr=log)
            subprocess.run([str(binary)], check=True, stdout=log, stderr=log, timeout=120)
    listener = output/'listener'; listener.mkdir()
    keys, levels, sections = {}, [], []
    for path in sorted((output/'baseline').glob('guitar-*.wav')):
        if 'muted' in path.name:
            continue
        paths = {'baseline': path, 'candidate': output/'candidate'/path.name}
        raw = {arm:loudness(p) for arm,p in paths.items()}
        target = min(-23., *(float(m['input_i'])-2-float(m['input_tp']) for m in raw.values()))
        order = list(paths); random.Random('layers-'+path.stem).shuffle(order)
        players = []
        for number, arm in enumerate(order, 1):
            code = path.stem+'-'+str(number)
            gain, matched = level_match(paths[arm], listener/(code+'.wav'), target, raw[arm])
            keys[code] = arm
            levels.append({'code': code, 'target_lufs': target, 'gain_db': gain, 'matched': matched})
            players.append(f'<p>Candidate {number}</p><audio controls preload="none" src="{code}.wav"></audio>')
        sections.append('<section><h2>'+path.stem+'</h2>'+''.join(players)+'</section>')
    (listener/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom guitar dynamics diagnostic</title>'
        '<style>body{font:18px/1.5 system-ui;max-width:850px;margin:auto;padding:24px;background:#10171b;color:#eee}'
        'audio{width:100%}section{border-top:1px solid #555;margin-top:24px}</style><h1>Guitar dynamics diagnostic</h1>'
        '<p>Eight notes, one every 1.25 seconds: velocities 70, 80, 83, 84, 85, 86, 95, 110. Same pitch and take per pair. '
        'Compare the fourth and fifth notes (3.75 and 5 seconds). Whole sequences are loudness-matched; individual notes are not. '
        'These isolated probes do not establish musical quality. No ratings are collected or uploaded.</p>'
        '<p>Samples: Brian Wood / Karoryfer Lecolds, Black and Green Guitars, CC0. Existing pinned bank; no new assets.</p>'+
        ''.join(sections)+'<script>document.addEventListener("play",e=>document.querySelectorAll("audio").forEach('
        'a=>{if(a!==e.target)a.pause()}),true)</script></html>')
    write(output/'organizer-key.json', keys)
    audio = {p.name:digest(p) for p in sorted(listener.glob('*.wav'))}
    write(listener/'packet.json', {'audio_sha256': audio, 'human_quality': 'NOT RUN'})
    write(output/'report.json', {'version': '1.0-q0-guitar-single-layer' if single_layer else '1.0-q0-guitar-layer', 'human_quality': 'NOT RUN',
        'calibration_window_ms': None if single_layer else 500,
        'method': 'Use the existing medium recorded layer at all unmuted guitar velocities; retain gain/tone response' if single_layer else
                  'Attenuate soft layer at each sampled root/take; preserve forte and muted samples',
        'gain': [] if single_layer else [{'root':p,'take':t,'amplitude':g,'db':20*math.log10(g)} for (p,t),g in calibration.items()],
        'candidate_boundaries': changes, 'matching': levels, 'replay': 'PASS',
        'preserved_components': ['piano','muted guitar', 'soft guitar' if single_layer else 'forte guitar'],
        'component_preservation': 'PASS', 'production_changed': False,
        **({'piano_forte_and_muted_preservation':'PASS'} if not single_layer else {}),
        'files_sha256': {str(p.relative_to(output)):digest(p) for p in sorted(output.rglob('*'))
                         if p.is_file() and p.name != 'INCOMPLETE'},
        'preserved_sha256': preservation, 'voice_source_sha256': digest(voice_path),
        'limits': 'The single-layer candidate removes the separate recorded forte timbre. Gain/filter response is not a substitute for all articulations; listening required.' if single_layer else
                  '500 ms RMS calibration is not perceived loudness, articulation realism or musical acceptance. '
                  'Transposed notes and other time windows are evaluation conditions, not calibration targets.'})
    (output/'INCOMPLETE').unlink()
    print('PASS: isolated build, 552 boundary pairs per build, eight exact probe replays, three native test groups. Listening NOT RUN.')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--single-layer', action='store_true', help='Preserve soft notes; use their recorded layer at higher velocities')
    args = p.parse_args()
    run(args.output.resolve(), args.single_layer)
