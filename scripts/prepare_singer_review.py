#!/usr/bin/env python3
"""Build the private two-voice listening page from verified singer renders."""
import argparse
import html
import json
from pathlib import Path
import subprocess
import sys

from arrange_voice_research import digest
from assemble_sung_response import assemble
from review_cloud_music import loudness
from singing_response import load_plan, STYLE_LABELS


def prepare(plan_path, results, source, score, output, consent):
    if not consent:
        raise ValueError('Local source-processing consent required')
    plan = load_plan(plan_path)
    for c in plan['cases']:
        root = results / c['id']
        receipt = json.loads((root / 'complete.json').read_text())
        if receipt.get('model_code') != plan['model_code'] or receipt.get('weights') != plan['weights'] or receipt['case'] != c or receipt['audio_sha256'] != digest(root / 'singer.wav'):
            raise ValueError('Singer does not match this reply plan')
    output.mkdir(parents=True, exist_ok=False)
    (output / '.partial').touch()
    review = output / 'review'; review.mkdir()
    rows, cards = [], []
    for c in plan['cases']:
        root = results / c['id']
        folder = output / c['id']
        if not (root/'stems/complete.json').exists():
            subprocess.run([sys.executable, str(Path(__file__).parent/'separate_singer.py'), '--input', str(root/'singer.wav'),
                            '--output', str(root/'stems')],check=True,timeout=600)
        joined = assemble(source, score, root, folder, True)
        origins = {'exchange': folder / 'performance.wav', 'singer': root / 'singer.wav'}
        levels = {kind: loudness(path) for kind, path in origins.items()}
        target = min(-20., *(v['lufs'] - v['true_peak_dbfs'] - 2 for v in levels.values()))
        players, measured = [], {}
        for kind, path in origins.items():
            dest = review / f"{c['id']}-{kind}.wav"
            subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(path), '-af',
                            f"volume={target-levels[kind]['lufs']}dB", '-c:a', 'pcm_s16le', str(dest)], check=True, timeout=30)
            m = loudness(dest)
            assert abs(m['lufs']-target) <= .2 and m['true_peak_dbfs'] <= -1.8
            label = 'Singer before sample arrangement' if kind == 'singer' else 'Your sound inside the song'
            players.append(f'<p>{label}</p><audio controls preload="metadata" aria-label="{c["id"]}: {label}" src="{dest.name}"></audio>'
                           f'<a href="{dest.name}" download>Download</a>')
            measured[kind] = {**m, 'sha256': digest(dest)}
        cards.append(f'<section><h2>{c["voice"].title()} · {STYLE_LABELS[c["genre"]]}</h2>' + ''.join(players)
                     + f'<p>Music from the start. A recognizable hook and {len(joined["events"])-1} rhythmic fragments, with room in the singer and band.</p>'
                     + f'<details><summary>Intended lyrics</summary><pre>{html.escape(c["lyrics"])}</pre></details></section>')
        rows.append({'case': c['id'], 'render_plan_sha256':json.loads((root/'complete.json').read_text())['plan_sha256'], 'assembly': joined, 'matched': measured})
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jamloom · the musician answers</title><style>
body{font:18px/1.6 system-ui;background:#111b20;color:#e9f0eb;max-width:1100px;margin:32px auto;padding:0 20px}
h1{line-height:1.15}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px}
section{padding:22px;background:#213039;border-radius:12px}audio{width:100%}a{color:#b5efac}pre{white-space:pre-wrap;font:inherit}
:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style>
<h1>Your sound becomes the hook.</h1><p>Play “Your sound inside the song” first. The original phrase becomes part of the rhythm,
returns in shorter pieces and trades places with the singer. Nothing plays automatically.</p>
<p>Listen for a recognizable source, a coherent groove and a natural exchange. Then compare with the singer before sample arrangement.
These new arrangements still need your listening judgment.</p><main>''' + ''.join(cards) + '''</main>
<script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
    assert page.count('<audio ') == 2*len(rows) and 'autoplay' not in page
    (review / 'index.html').write_text(page)
    report = {'technical': 'PASS', 'plan_sha256': digest(plan_path), 'cases': rows, 'human_listening': 'NOT RUN'}
    (output / 'complete.json').write_text(json.dumps(report, indent=2)+'\n')
    (output / '.partial').unlink()
    return report


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('plan', 'results', 'source', 'score', 'output'):
        p.add_argument('--'+name, type=Path, required=True)
    p.add_argument('--consent', action='store_true')
    a = p.parse_args()
    prepare(a.plan, a.results, a.source, a.score, a.output, a.consent)
