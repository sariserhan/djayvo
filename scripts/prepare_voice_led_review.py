#!/usr/bin/env python3
"""Private, local voice-led audition using the completed musician trial."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile

import numpy as np
from arrange_voice_research import RATE, arrange, digest, read_crops, read_pcm
from inspect_wav import inspect
from review_cloud_music import loudness

CASES = (
    ('hiphop', 'Hip-hop · phrase and reply', 'instrumental-first'),
    ('funk', 'Funk · chopped pickup', 'fragment-pickup'),
    ('bass-b', 'Bass · delayed voice entrance', 'late-hook'),
)


def prepare(source, score, trial, output, consent):
    if not consent:
        raise ValueError('Explicit local voice-processing consent is required')
    source, score, trial, output = map(Path, (source, score, trial, output))
    src = read_pcm(source, (2, 5))
    read_crops(score, source, len(src))
    comparison = trial / 'comparison.json'
    rows = json.loads(comparison.read_text())['cases']
    selected = []
    protected = {str(p): digest(p) for p in (source, score, comparison)}
    for name, title, scene in CASES:
        matches = [r for r in rows if r['mode'] == 'epoch10' and r['name'] == name]
        if len(matches) != 1:
            raise ValueError('Missing or ambiguous trained backing')
        row = matches[0]
        if row['file'] != f'epoch10-{name}.wav' or digest(trial / row['file']) != row['sha256']:
            raise ValueError('Backing provenance mismatch')
        protected[str(trial / row['file'])] = row['sha256']
        selected.append((row, title, scene))
    output.mkdir(parents=True, exist_ok=False)
    (output / '.partial').write_text('Do not use without complete.json.\n')
    review = output / 'review'
    review.mkdir()
    cards, reports = [], []
    for index, (row, title, scene) in enumerate(selected, 1):
        folder, bed = output / row['name'], trial / row['file']
        plan = arrange(source, score, bed, folder, row['bpm'], row['seed'], scene, consent=True)
        mix, backing, voice = (read_pcm(folder / f'{s}.wav', (30, 30)) for s in ('mix', 'backing', 'voice'))
        clean = next(e for e in plan['events'] if e['clean'])
        edge, start = plan['voice_edge_fade_frames'], clean['start_frame']
        expected = src[edge:-edge] * plan['source_gain'] * plan['shared_master_gain']
        clean_error = float(np.max(np.abs(voice[start+edge:start+len(src)-edge] - expected)))
        stem_error = float(np.max(np.abs(mix - backing - voice)))
        assert clean_error <= .5/32768 + 1e-12 and stem_error <= 1/32768 + 1e-12
        assert np.all(mix[-1] == 0) and any(not e['clean'] for e in plan['events'])
        previous_end = 0
        for event in plan['events']:
            crop = next(c for c in plan['clips'] if c['id'] == event['clip_id'])
            assert event['start_frame'] >= previous_end
            previous_end = event['start_frame'] + crop['end_frame'] - crop['start_frame']
        technical = {s: inspect(folder / f'{s}.wav') for s in ('mix', 'backing', 'voice')}
        assert all(m['full_scale_samples'] == 0 for m in technical.values())
        origins = {'voice': folder / 'mix.wav', 'music': bed}
        levels = {kind: loudness(path) for kind, path in origins.items()}
        target = min(-22., *(r['lufs'] - r['true_peak_dbfs'] - 2 for r in levels.values()))
        players, matched = [], {}
        for kind, path in origins.items():
            dest = review / f'{index}-{kind}.wav'
            subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(path),
                            '-af', f"volume={target-levels[kind]['lufs']}dB", '-c:a', 'pcm_s16le', str(dest)],
                           check=True, timeout=30)
            measured = loudness(dest)
            assert abs(measured['lufs'] - target) <= .2 and measured['true_peak_dbfs'] <= -1.8
            matched[kind] = {**measured, 'sha256': digest(dest)}
            label = 'With your voice' if kind == 'voice' else 'Music only'
            players.append(f'<p>{label}</p><audio controls preload="metadata" aria-label="{title}: {label}" src="{dest.name}"></audio>'
                           f'<a href="{dest.name}" download>Download {label.lower()}</a>')
        hook_seconds = clean['start_frame'] / RATE
        cards.append(f'<section><h2>{index}. {title}</h2><p>The full recording starts at {hook_seconds:.1f}s; its original leading silence is preserved.</p>'
                     + ''.join(players) + '</section>')
        reports.append({'case': row['name'], 'plan': plan, 'measurements': technical, 'matched': matched,
                        'clean_hook_maximum_pcm_error': clean_error, 'stem_reconstruction_maximum_pcm_error': stem_error})
    # Verify actual rendering repeatability, not only event generation.
    row, _, scene = selected[0]
    with tempfile.TemporaryDirectory(prefix='jamloom-voice-led-') as temp:
        repeated = arrange(source, score, trial / row['file'], Path(temp) / 'repeat', row['bpm'], row['seed'], scene, consent=True)
        assert repeated['events'] == reports[0]['plan']['events']
        assert repeated['artifacts'] == reports[0]['plan']['artifacts']
    assert all(digest(Path(p)) == h for p, h in protected.items())
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jamloom · hear your voice in the music</title><style>
body{font:18px/1.6 system-ui;background:#111b20;color:#e9f0eb;max-width:1050px;margin:32px auto;padding:0 20px}
h1{line-height:1.15}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:20px}
section{padding:20px;background:#213039;border-radius:12px}h2{font-size:22px}audio{width:100%}a{color:#b5efac}
:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style>
<h1>Hear your voice in the music.</h1><p>Start with Hip-hop. Press “With your voice”, then compare “Music only”.
Each clip is 30 seconds. Playback loudness is matched, and only one clip plays at a time.</p>
<p>Your real recording appears as a full phrase and shorter chops, with pauses for the instruments.
The bass track uses the earlier Group 2; the rejected Group 1 is excluded.</p>
<p>Listen for clear words, natural entrances and whether the music answers your voice.
Tell me the track and timestamp if anything sounds awkward.</p><main>''' + ''.join(cards) + '''</main>
<script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
    assert page.count('<audio ') == 6 and 'autoplay' not in page
    (review / 'index.html').write_text(page)
    report = {'technical': 'PASS', 'processing': 'local', 'backing': 'epoch10, latest checkpoint; not a quality winner',
              'protected_sha256': protected, 'cases': reports, 'deterministic_rerender': 'PASS',
              'human_listening': 'NOT RUN', 'beat_and_word_alignment': 'NOT RUN',
              'limitations': 'Existing heuristic source crops and requested tempo; no verified words, beats, new singing or learned call-and-response.'}
    (output / 'complete.json').write_text(json.dumps(report, indent=2) + '\n')
    (output / '.partial').unlink()
    print('PASS: three voice-led renders, six matched listening files, clean-hook/stem/repeatability checks')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('source', 'score', 'trial', 'output'):
        parser.add_argument('--' + name, required=True, type=Path)
    parser.add_argument('--consent', action='store_true')
    args = parser.parse_args()
    prepare(args.source, args.score, args.trial, args.output, args.consent)
