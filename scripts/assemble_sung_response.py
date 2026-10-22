#!/usr/bin/env python3
"""Keep the user's real sample separate from the generated singer's reply."""
import argparse
import json
import math
from pathlib import Path

import numpy as np
from arrange_voice_research import RATE, digest, read_crops, read_pcm, write_pcm


def assemble(source, score, singer_dir, output, consent=False):
    if not consent:
        raise ValueError('Local source-processing consent required')
    source, score, singer_dir, output = map(Path, (source, score, singer_dir, output))
    receipt = json.loads((singer_dir / 'complete.json').read_text())
    c = receipt['case']
    if receipt.get('technical') != 'PASS' or digest(singer_dir / 'singer.wav') != receipt['audio_sha256']:
        raise ValueError('Singing output provenance mismatch')
    bpm, count = c.get('bpm'), c.get('source_repetitions')
    if not isinstance(bpm, (int, float)) or not math.isfinite(bpm) or not 60 <= bpm <= 160 or type(count) is not int or count not in (1, 2):
        raise ValueError('Invalid source timing budget')
    original = read_pcm(source, (2, 5))
    read_crops(score, source, len(original))
    singer = read_pcm(singer_dir / 'singer.wav', (30, 30))
    protected = {str(p): digest(p) for p in (source, score, singer_dir / 'singer.wav', singer_dir / 'complete.json')}
    # shortcut: amplitude trim is not word alignment; preserve padding and review consonants by ear.
    active = np.flatnonzero(np.max(np.abs(original), axis=1) > np.max(np.abs(original)) * .02)
    begin, end = max(0, int(active[0])-RATE//10), min(len(original), int(active[-1])+RATE//10+1)
    part = original[begin:end].copy()
    edge = min(RATE//100, len(part)//2)
    fade = np.sin(np.linspace(0, np.pi/2, edge))**2
    part[:edge] *= fade[:, None]; part[-edge:] *= fade[::-1, None]
    gain = min(.18 / np.sqrt(np.mean(part**2)), .7 / np.max(np.abs(part)))
    part *= gain
    beat = RATE * 60 / bpm
    spacing = math.ceil((len(part) + RATE*.15) / beat) * beat
    starts = [round(i*spacing) for i in range(count)]
    singer_start = round(math.ceil((starts[-1]+len(part)+RATE*.1)/(4*beat))*4*beat)
    mix = np.zeros((singer_start+len(singer), 2))
    for start in starts:
        mix[start:start+len(part)] += part
    singer[:RATE//100] *= fade[:, None]
    singer[-RATE//4:] *= np.cos(np.linspace(0, np.pi/2, RATE//4))[:, None]**2
    singer[-1] = 0
    mix[singer_start:] += singer
    shared_gain = min(1., 10**(-2/20)/np.max(np.abs(mix)))
    mix *= shared_gain
    output.mkdir(parents=True, exist_ok=False)
    (output / '.partial').touch()
    write_pcm(output / 'performance.wav', mix)
    actual = read_pcm(output / 'performance.wav', (30, 45))
    error = float(np.max(np.abs(actual[edge:len(part)-edge]-original[begin+edge:end-edge]*gain*shared_gain)))
    assert error <= .5/32768+1e-12 and np.all(actual[-1] == 0)
    assert all(digest(Path(p)) == h for p, h in protected.items())
    report = {'technical': 'PASS', 'source_sha256': digest(source), 'singer_sha256': receipt['audio_sha256'],
              'source_crop_frames': [begin, end], 'source_starts_frames': starts, 'source_gain': float(gain),
              'singer_start_frame': singer_start, 'sample_rate': RATE, 'frames': len(mix),
              'source_identity_max_pcm_error': error, 'source_singer_overlap_frames': 0,
              'master_gain': float(shared_gain), 'sha256': digest(output / 'performance.wav'),
              'listening': 'NOT RUN', 'note': 'Source-only pickup followed by generated singer and band; bar grid is requested tempo, not verified beat alignment.'}
    (output / 'complete.json').write_text(json.dumps(report, indent=2)+'\n')
    (output / '.partial').unlink()
    return report


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('source', 'score', 'singer-dir', 'output'):
        p.add_argument('--'+name, type=Path, required=True)
    p.add_argument('--consent', action='store_true')
    a = p.parse_args()
    assemble(a.source, a.score, a.singer_dir, a.output, a.consent)
