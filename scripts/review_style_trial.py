#!/usr/bin/env python3
"""Verify retrieved adapter outputs and make private, matched A/B listening pairs."""
import hashlib
import html
import json
from pathlib import Path
import random
import subprocess
from review_cloud_music import difference, loudness
from inspect_wav import inspect

ROOT = Path('renders/style-training-20261018/results')


def main():
    report = json.loads((ROOT / 'comparison.json').read_text())
    cases = report['cases']
    if len(cases) != 8 or {(c['mode'], c['name']) for c in cases} != {
        (mode, name) for mode in ('base', 'adapter') for name in ('bass-a', 'bass-b', 'funk', 'hiphop')
    }:
        raise ValueError('Expected four complete base/adapter pairs')
    original = {}
    for case in cases:
        if case['file'] != case['mode'] + '-' + case['name'] + '.wav':
            raise ValueError('Unexpected output path')
        path = ROOT / case['file']
        if hashlib.sha256(path.read_bytes()).hexdigest() != case['sha256']:
            raise ValueError('Transfer checksum mismatch')
        stats = inspect(path)
        if stats['full_scale_samples'] or stats['duration_seconds'] != 30:
            raise ValueError('Clipped or truncated output')
        original[case['file']] = loudness(path)
    target = min(-22, *(v['lufs'] - v['true_peak_dbfs'] - 2 for v in original.values()))
    review = ROOT.parent / 'review'
    review.mkdir()  # Preserve earlier listening files and blind allocation.
    rng = random.Random(51018)
    measurements, allocation, cards, differences = [], {}, [], {}
    for number, name in enumerate(('bass-a', 'bass-b', 'funk', 'hiphop'), 1):
        modes = ['base', 'adapter']
        rng.shuffle(modes)
        players = []
        for letter, mode in zip('AB', modes):
            filename = f'{mode}-{name}.wav'
            blind = f'pair-{number}-{letter}.wav'
            gain = target - original[filename]['lufs']
            subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(ROOT / filename),
                            '-af', f'volume={gain}dB', '-c:a', 'pcm_s16le', str(review / blind)], check=True, timeout=60)
            measured = loudness(review / blind)
            if abs(measured['lufs'] - target) > .2 or measured['true_peak_dbfs'] > -1.8:
                raise ValueError('Review loudness/peak mismatch')
            allocation[blind] = filename
            measurements.append({'file': blind, 'gain_db': gain, **measured})
            players.append(f'<p>Version {letter}</p><audio controls preload="metadata" aria-label="Pair {number} version {letter}" src="{blind}"></audio>')
        caption = next(c['caption'] for c in cases if c['name'] == name)
        cards.append(f'<article><h2>Pair {number}</h2><p>{html.escape(caption)}</p>{"".join(players)}</article>')
        delta = difference(ROOT / f'base-{name}.wav', ROOT / f'adapter-{name}.wav')
        if delta['maximum_pcm_difference'] == 0:
            raise ValueError('Adapter did not change output')
        differences[name] = delta
    (ROOT.parent / 'blind-key-private.json').write_text(json.dumps(allocation, indent=2) + '\n')
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Djayvo adapter trial</title><style>body{font:18px/1.6 system-ui;max-width:1000px;margin:32px auto;padding:0 24px;background:#111b20;color:#e9f0eb}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:20px}article{padding:22px;background:#213039;border-radius:12px}audio{width:100%}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style>
<h1>Which version feels more musical?</h1><p>Four matched comparisons from the approved reference-training experiment.
Each pair uses the same musical brief and seed. A/B labels conceal which model made each take.</p>
<p>Compare sound, groove, development, transitions and ending. Tell us the pair and preferred version,
or say neither. These are instrumental model sketches, not source-preserving voice remixes.</p><main>''' + ''.join(cards) + '''</main><script>
document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)
</script></html>'''
    if page.count('<audio ') != 8:
        raise ValueError('Incomplete listening page')
    (review / 'index.html').write_text(page)
    result = {'technical': 'PASS', 'target_lufs': target, 'original': original,
              'review': measurements, 'differences': differences, 'human_listening': 'NOT RUN',
              'event_frame_agreement': 'NOT RUN: audio model emits no engine event trace'}
    Path('docs/evidence/style-training/output-measurements.json').write_text(json.dumps(result, indent=2) + '\n')
    print('PASS: eight retrieved WAVs, four changed pairs, loudness-matched review; listening NOT RUN')


if __name__ == '__main__':
    main()
