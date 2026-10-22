#!/usr/bin/env python3
"""Build the private two-voice listening page from verified singer renders."""
import argparse
import html
import json
from pathlib import Path
import subprocess

from arrange_voice_research import digest
from assemble_sung_response import assemble
from review_cloud_music import loudness
from singing_response import load_plan


def prepare(plan_path, results, source, score, output, consent):
    if not consent:
        raise ValueError('Local source-processing consent required')
    plan = load_plan(plan_path)
    for c in plan['cases']:
        root = results / c['id']
        receipt = json.loads((root / 'complete.json').read_text())
        if receipt['plan_sha256'] != digest(plan_path) or receipt['case'] != c or receipt['audio_sha256'] != digest(root / 'singer.wav'):
            raise ValueError('Singer does not match this reply plan')
    output.mkdir(parents=True, exist_ok=False)
    (output / '.partial').touch()
    review = output / 'review'; review.mkdir()
    rows, cards = [], []
    for c in plan['cases']:
        root = results / c['id']
        folder = output / c['id']
        joined = assemble(source, score, root, folder, True)
        origins = {'singer': root / 'singer.wav', 'exchange': folder / 'performance.wav'}
        levels = {kind: loudness(path) for kind, path in origins.items()}
        target = min(-20., *(v['lufs'] - v['true_peak_dbfs'] - 2 for v in levels.values()))
        players, measured = [], {}
        for kind, path in origins.items():
            dest = review / f"{c['id']}-{kind}.wav"
            subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(path), '-af',
                            f"volume={target-levels[kind]['lufs']}dB", '-c:a', 'pcm_s16le', str(dest)], check=True, timeout=30)
            m = loudness(dest)
            assert abs(m['lufs']-target) <= .2 and m['true_peak_dbfs'] <= -1.8
            label = 'Hear the AI singer' if kind == 'singer' else 'User phrase → singer reply'
            players.append(f'<p>{label}</p><audio controls preload="metadata" aria-label="{c["id"]}: {label}" src="{dest.name}"></audio>'
                           f'<a href="{dest.name}" download>Download</a>')
            measured[kind] = {**m, 'sha256': digest(dest)}
        entry = joined['singer_start_frame'] / joined['sample_rate']
        cards.append(f'<section><h2>{c["voice"].title()} · {c["genre"].title()}</h2>' + ''.join(players)
                     + f'<p>In the full exchange, the singer starts at {entry:.1f}s, after the user sample.</p>'
                     + f'<details><summary>Intended lyrics</summary><pre>{html.escape(c["lyrics"])}</pre></details></section>')
        rows.append({'case': c['id'], 'assembly': joined, 'matched': measured})
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jamloom · the musician answers</title><style>
body{font:18px/1.6 system-ui;background:#111b20;color:#e9f0eb;max-width:1100px;margin:32px auto;padding:0 20px}
h1{line-height:1.15}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px}
section{padding:22px;background:#213039;border-radius:12px}audio{width:100%}a{color:#b5efac}pre{white-space:pre-wrap;font:inherit}
:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style>
<h1>The musician answers.</h1><p>Start with “Hear the AI singer”. These are newly generated sung replies, using a voice separate from the user.</p>
<p>Then try the full exchange: the real user phrase plays first, and the AI singer answers with a band.
The opening sample plays once or twice. Nothing plays automatically.</p>
<p>Requested voices: male and female. Styles: reggae and hip-hop. Listen for natural singing, clear words and a playful response.
These are AI-generated performances; voice accuracy and musical quality still need your judgment.</p><main>''' + ''.join(cards) + '''</main>
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
