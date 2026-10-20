#!/usr/bin/env python3
"""Measure and copy existing native probes into a fresh local listening directory."""
import argparse
from array import array
import math
from pathlib import Path
import shutil
import sys
import wave

from q0_audit import digest, loudness, write


def decay(path):
    with wave.open(str(path)) as wav:
        if wav.getsampwidth() != 2 or wav.getnchannels() != 2:
            raise ValueError('Expected PCM16 stereo probe')
        rate = wav.getframerate()
        wav.setpos(4*rate)
        pcm = array('h', wav.readframes(2*rate))
    if sys.byteorder != 'little':
        pcm.byteswap()
    energy = [(pcm[i]**2 + pcm[i+1]**2)/(2*32768**2) for i in range(0,len(pcm),2)]
    if not sum(energy):
        raise ValueError('Silent probe')
    return {'third_note_tail_energy_after_320ms_fraction': sum(energy[round(.32*rate):])/sum(energy),
        'third_note_rms_dbfs_windows': {f'{lo}-{hi}s': 10*math.log10(max(1e-12,
            sum(energy[round(lo*rate):round(hi*rate)])/(round(hi*rate)-round(lo*rate))))
            for lo, hi in [(0,.1),(.32,.6),(.6,1.)]}}


def run(probes, output):
    if output.exists():
        raise ValueError('Choose a fresh probe review directory')
    files = sorted(probes.glob('*.wav'))
    if len(files) != 14:
        raise ValueError('Expected 14 probes')
    output.mkdir(parents=True)
    rows, players = [], []
    for path in files:
        shutil.copyfile(path, output/path.name)
        rows.append({'file': path.name, 'sha256': digest(path), 'loudness': loudness(path), **decay(path)})
        players.append(f'<h2>{path.stem}</h2><audio controls preload="none" src="{path.name}"></audio>')
    write(output/'measurements.json', {'human_realism': 'NOT RUN', 'records': rows})
    (output/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Q0 instrument probes</title>'
        '<style>body{font:18px/1.5 system-ui;max-width:850px;margin:auto;padding:24px}audio{width:100%}</style>'
        '<h1>Unchanged instrument probes</h1><p>Four notes at 0, 2, 4, 6 seconds; velocities 40, 75, 110, 110. '
        'Short gates 125 ms; long gates 1.5 s. Guitar’s last note is muted. Drums use open hi-hat. '
        'Raw diagnostic audio, not loudness-matched preference trials. Pause each player before starting another.</p>'+
        ''.join(players)+'</html>')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('probes', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    run(args.probes, args.output)
