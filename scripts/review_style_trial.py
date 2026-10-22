#!/usr/bin/env python3
"""Verify retrieved adapter outputs and make private, matched A/B listening pairs."""
import hashlib
import argparse
import html
import json
from pathlib import Path
import random
import subprocess
from review_cloud_music import difference, loudness
from inspect_wav import inspect

ROOT = Path('renders/style-training-20261018/results')


def main(blood=False, musician=False):
    three_way = blood or musician
    modes_all = ('base', 'epoch5', 'epoch10') if musician else ('base', 'step80', 'step160') if blood else ('base', 'adapter')
    evidence = Path('docs/evidence/musician-training' if musician else 'docs/evidence/blood-training' if blood else 'docs/evidence/style-training')
    report = json.loads((ROOT / 'comparison.json').read_text())
    cases = report['cases']
    if len(cases) != 4 * len(modes_all) or {(c['mode'], c['name']) for c in cases} != {
        (mode, name) for mode in modes_all for name in ('bass-a', 'bass-b', 'funk', 'hiphop')
    }:
        raise ValueError('Expected four complete comparison groups')
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
    repeat = report['repeat_control']
    repeated = ROOT / 'base-repeat-bass-a.wav'
    if repeat['file'] != repeated.name or hashlib.sha256(repeated.read_bytes()).hexdigest() != repeat['sha256']:
        raise ValueError('Repeat control transfer checksum mismatch')
    repeat_delta = difference(ROOT / 'base-bass-a.wav', repeated)
    if repeat_delta['maximum_pcm_difference'] != 0:
        raise ValueError('Base repeat differs; adapter attribution needs investigation')
    target = min(-22, *(v['lufs'] - v['true_peak_dbfs'] - 2 for v in original.values()))
    review = ROOT.parent / 'review'
    review.mkdir()  # Preserve earlier listening files and blind allocation.
    rng = random.Random(51018)
    measurements, allocation, cards, differences = [], {}, [], {}
    for number, name in enumerate(('bass-a', 'bass-b', 'funk', 'hiphop'), 1):
        modes = list(modes_all)
        rng.shuffle(modes)
        players = []
        for letter, mode in zip('ABC', modes):
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
            players.append(f'<p>Version {letter}</p><audio controls preload="metadata" aria-label="Group {number} version {letter}" src="{blind}"></audio>')
        caption = next(c['caption'] for c in cases if c['name'] == name)
        cards.append(f'<article><h2>Group {number}</h2><p>{html.escape(caption)}</p>{"".join(players)}</article>')
        for mode in modes_all[1:]:
            delta = difference(ROOT / f'base-{name}.wav', ROOT / f'{mode}-{name}.wav')
            if delta['maximum_pcm_difference'] == 0:
                raise ValueError('Adapter did not change output')
            differences[f'{name}-{mode}' if three_way else name] = delta
        if three_way:
            delta = difference(ROOT / f'{modes_all[1]}-{name}.wav', ROOT / f'{modes_all[2]}-{name}.wav')
            if delta['maximum_pcm_difference'] == 0:
                raise ValueError('Checkpoints produced identical audio')
            differences[f'{name}-{modes_all[1]}-vs-{modes_all[2]}'] = delta
    (ROOT.parent / 'blind-key-private.json').write_text(json.dumps(allocation, indent=2) + '\n')
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jamloom adapter trial</title><style>body{font:18px/1.6 system-ui;max-width:1000px;margin:32px auto;padding:0 24px;background:#111b20;color:#e9f0eb}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:20px}article{padding:22px;background:#213039;border-radius:12px}audio{width:100%}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style>
<h1>Which version feels more musical?</h1><p>Four matched comparisons from the approved reference-training experiment.
Each group uses the same musical brief and seed. Letter labels conceal which model made each take.</p>
<p>Compare sound, groove, development, transitions and ending. Tell us the group and preferred version,
or say neither. These are instrumental model sketches, not source-preserving voice remixes.</p><main>''' + ''.join(cards) + '''</main><script>
document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)
</script></html>'''
    if page.count('<audio ') != len(cases):
        raise ValueError('Incomplete listening page')
    (review / 'index.html').write_text(page)
    result = {'technical': 'PASS', 'base_repeat': repeat_delta, 'target_lufs': target, 'original': original,
              'review': measurements, 'differences': differences, 'human_listening': 'NOT RUN',
              'event_frame_agreement': 'NOT RUN: audio model emits no engine event trace'}
    (evidence / 'output-measurements.json').write_text(json.dumps(result, indent=2) + '\n')
    print(f'PASS: {len(cases)} retrieved WAVs, four comparison groups, loudness-matched review; listening NOT RUN')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    profile = parser.add_mutually_exclusive_group()
    profile.add_argument('--blood', action='store_true')
    profile.add_argument('--musician', action='store_true')
    args = parser.parse_args()
    if args.blood:
        ROOT = Path('renders/blood-training-20261019/results')
    if args.musician:
        ROOT = Path('renders/musician-training-20261021/results')
    main(args.blood, args.musician)
