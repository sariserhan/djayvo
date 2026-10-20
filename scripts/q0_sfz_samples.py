#!/usr/bin/env python3
"""Create local SFZ probes from existing hash-pinned CC0 samples; never download assets."""
import argparse
from pathlib import Path
import json
import shutil
import subprocess

from q0_audit import ROOT, digest, inspect, loudness, level_match, write


def compare_probes(output, native):
    review = output/'listener'
    if review.exists():
        raise ValueError('Probe listening packet already exists')
    review.mkdir(); (review/'INCOMPLETE').touch()
    rows, players = [], []
    for instrument in ('piano','bass','drums','guitar'):
        for gate in ('short','long'):
            name = f'{instrument}-{gate}'
            paths = {'native': native/(name+'.wav'), 'sfz': output/(name+'.wav')}
            levels = {arm: loudness(path) for arm, path in paths.items()}
            target = min(-23., *(float(v['input_i'])-2-float(v['input_tp']) for v in levels.values()))
            players.append(f'<h2>{name}</h2>')
            for arm, path in paths.items():
                target_path = review/f'{name}-{arm}.wav'
                gain, matched = level_match(path,target_path,target,levels[arm])
                rows.append({'file':target_path.name,'sha256':digest(target_path),
                    'target_lufs':target,'gain_db':gain,'matched':matched})
                players.append(f'<p>{arm}</p><audio controls preload="none" src="{target_path.name}"></audio>')
    (review/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Q0 sample playback comparison</title>'
        '<style>body{font:18px/1.5 system-ui;max-width:850px;margin:auto;padding:24px}audio{width:100%}</style>'
        '<h1>Same notes, different sample playback</h1><p>Level-matched pairs; labeled diagnostic, not a blind preference study. '
        'Native uses the compact prepared sample bank; SFZ uses the original CC0 recordings and one-shot drums. '
        'Playback, envelope and velocity response all differ. Neither is assumed better. '
        'Notes at 0, 2, 4, 6 seconds; velocities 40, 75, 110, 110. Guitar’s last note is muted. '
        'Pause each player before starting another.</p><p>Samples: Versilian Studios / VCSL contributors; '
        'Brian Wood / Karoryfer Lecolds. CC0-1.0.</p>'+''.join(players)+'</html>')
    write(review/'measurements.json', {'technical':'PASS','human_preference':'NOT RUN','records':rows})
    (review/'INCOMPLETE').unlink()


def run(output, renderer):
    if output.exists():
        raise ValueError('Choose a fresh output directory')
    output.mkdir(parents=True); (output/'INCOMPLETE').touch()
    samples = output/'samples'; samples.mkdir()
    manifests = [(ROOT/'assets/manifests/acoustic-v1.json', ROOT/'renders/acoustic-source'),
                 (ROOT/'assets/manifests/guitar-v1.json', ROOT/'renders/guitar-source')]
    entries = []
    for path, cache in manifests:
        manifest = json.loads(path.read_text())
        if manifest['license'] != 'CC0-1.0':
            raise ValueError('Unexpected sample license')
        for entry in manifest['samples']:
            source = cache/(entry['id']+'.wav')
            if digest(source) != entry['sha256']:
                raise ValueError('Changed sample: '+str(source))
            shutil.copyfile(source, samples/source.name)
            entries.append(entry)
    rows = []
    for instrument, pitch, release in [('piano',60,.3),('bass',40,.16),('drums',46,.18),('guitar',60,.12)]:
        bank = [e for e in entries if e['instrument'] == instrument]
        roots = sorted({e['root_midi'] for e in bank})
        lines = ['// Local CC0 diagnostic; raw stereo/rate/dynamics preserved.',
                 '<global> ampeg_attack=0.001 ampeg_release='+str(release)]
        for entry in bank:
            root, muted = entry['root_midi'], entry.get('muted', False)
            layers = sorted({e.get('velocity_max',127) for e in bank if e.get('muted',False) == muted})
            maximum = entry.get('velocity_max',127); index = layers.index(maximum)
            minimum = 1 if index == 0 else layers[index-1]+1
            ri = roots.index(root)
            low = 0 if ri == 0 else (roots[ri-1]+root)//2+1
            high = 127 if ri == len(roots)-1 else (root+roots[ri+1])//2
            takes = sorted({e.get('take',0) for e in bank if e['root_midi']==root
                            and e.get('muted',False)==muted and e.get('velocity_max',127)==maximum})
            key = f'key={root}' if instrument == 'drums' else f'lokey={low} hikey={high} pitch_keycenter={root}'
            control = ('locc20=64 hicc20=127' if muted else 'locc20=0 hicc20=63') if instrument=='guitar' else ''
            mode = 'one_shot' if instrument=='drums' else 'no_loop'
            lines.append(f'<region> {key} lovel={minimum} hivel={maximum} loop_mode={mode} '
                f'seq_length={len(takes)} seq_position={takes.index(entry.get("take",0))+1} '
                f'{control} sample=samples/{entry["id"]}.wav')
        sfz = output/(instrument+'.sfz'); sfz.write_text('\n'.join(lines)+'\n')
        for gate in ('short','long'):
            wav = output/f'{instrument}-{gate}.wav'
            subprocess.run([str(renderer.resolve()), str(sfz), str(wav), str(pitch), gate], check=True, timeout=60)
            rows.append({'file': wav.name, 'sfz_sha256': digest(sfz),
                'audio': inspect(wav), 'loudness': loudness(wav)})
    write(output/'report.json', {'status': 'PASS', 'human_realism': 'NOT RUN', 'records': rows,
        'source_samples': [{'id': e['id'], 'sha256': e['sha256']} for e in entries],
        'license': 'CC0-1.0; credited Versilian Studios / VCSL contributors and Brian Wood / Karoryfer.',
        'limitations': 'Different playback engine, sample preparation, envelope and velocity response. '
            'Instrument feasibility diagnostic only, NOT a controlled instruments-only full-mix arm. '
            'Existing bass/drum single velocity layer remains; no invented recorded articulations.'})
    compare_probes(output, ROOT/'renders/q0-instrument-probes-20261020')
    (output/'INCOMPLETE').unlink()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('renderer', type=Path)
    args = parser.parse_args()
    run(args.output.resolve(), args.renderer.resolve())
