"""Verify four controlled piano experiments and prepare private matched A/B audio."""
from pathlib import Path
import csv
import hashlib
import json
import random
import subprocess
import sys

sys.path.insert(0, 'scripts')
from compare_portability import compare
from inspect_wav import inspect
from prepare_voice_transforms import frame_at
from review_cloud_music import difference, loudness
from verify_export import verify_export

root = Path('renders/phrase-articulation-20261019')
evidence = Path('docs/evidence/phrase-articulation')
linux = Path('renders/arrangement-linux/phrase-articulation-20261019')
review = root/'review'
review.mkdir()

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

report = {'cases': {}, 'source_preserved': {}, 'default_engine_preserved': {}, 'review': []}
originals = {}
for seed in range(4123, 4127):
    folder = root/f'seed-{seed}'
    control = json.loads((folder/'control.call_response.score.json').read_text())
    candidate = json.loads((folder/'candidate.call_response.score.json').read_text())
    changes = json.loads((folder/'articulation.json').read_text())['changes']
    altered = {row['start_tick']: row for row in changes}
    restored = json.loads(json.dumps(candidate))
    for track in restored['tracks']:
        if track['instrument'] == 'piano':
            for note in track['events']:
                if note['start_tick'] in altered:
                    row = altered[note['start_tick']]
                    assert note['duration_ticks'] == row['after_ticks']
                    assert frame_at(candidate, note['start_tick']+note['duration_ticks']) == row['end_frame']
                    note['duration_ticks'] = row['before_ticks']
    assert restored == control
    for name in ('control', 'candidate'):
        prefix = folder/f'{name}.call_response'
        verify_export(folder/name)
        compare(linux/f'seed-{seed}'/f'{name}.call_response', prefix)
        for wav in folder.glob(f'{name}.call_response*.wav'):
            assert digest(wav) == digest(linux/f'seed-{seed}'/wav.name)
            if name == 'control':
                previous = Path('renders/analysis-offset-20261019/after')/wav.name.replace('control', f'owner-{seed}', 1)
                assert digest(wav) == digest(previous)
        for stem in ('', '.piano'):
            path = folder/f'{name}.call_response{stem}.wav'
            stats = inspect(path)
            assert not stats['full_scale_samples'] and stats['peak_dbfs'] <= -1 and stats['last_100ms_peak'] == 0
            originals[seed, name, stem] = (path, loudness(path), stats)
    for stem in ('bass', 'drums', 'vocals'):
        assert digest(folder/f'control.call_response.{stem}.wav') == digest(folder/f'candidate.call_response.{stem}.wav')
    events = []
    for name in ('control', 'candidate'):
        with (folder/f'{name}.call_response.events.tsv').open() as f:
            events.append(list(csv.DictReader(f, delimiter='\t')))
    retained = lambda rows: [r for r in rows if r['kind'] == 'on' or r['instrument'] != 'piano']
    assert retained(events[0]) == retained(events[1])
    report['cases'][seed] = {'changed_note_durations': len(changes), 'changes': changes,
        'note_on_and_nonpiano_event_frames': 'exact', 'mac_linux_event_frames_and_pcm': 'exact',
        'mix_difference': difference(folder/'control.call_response.wav', folder/'candidate.call_response.wav'),
        'piano_difference': difference(folder/'control.call_response.piano.wav', folder/'candidate.call_response.piano.wav')}

allocation = {}
ordering = ['control', 'candidate']*2
random.Random(51020).shuffle(ordering)
cards = []
targets = {stem: min(-22 if not stem else -25, *(value['lufs']-value['true_peak_dbfs']-2
            for (_, _, s), (_, value, _) in originals.items() if s == stem)) for stem in ('', '.piano')}
for number, seed in enumerate(range(4123, 4127), 1):
    first = ordering[number-1]
    modes = [first, 'candidate' if first == 'control' else 'control']
    players = []
    for letter, mode in zip('AB', modes):
        for stem in ('', '.piano'):
            original, level, stats = originals[seed, mode, stem]
            filename = f'pair-{number}-{letter}{stem}.wav'
            gain = targets[stem]-level['lufs']
            subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(original),
                            '-af', f'volume={gain}dB', '-map_metadata', '-1', '-c:a', 'pcm_s16le', str(review/filename)],
                           check=True, timeout=60)
            measured = loudness(review/filename)
            assert abs(measured['lufs']-targets[stem]) <= .2 and measured['true_peak_dbfs'] <= -1.8
            allocation[filename] = str(original)
            report['review'].append({'file': filename, 'sha256': digest(review/filename),
                                    'gain_db': gain, 'target_lufs': targets[stem], 'matched': measured})
            label = f'Pair {number}, version {letter}, '+('piano only' if stem else 'full mix')
            players.append(f'<p>{label}</p><audio controls preload="metadata" aria-label="{label}" src="{filename}"></audio>')
    cards.append(f'<section><h2>Pair {number}</h2>'+''.join(players)+'</section>')
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Djayvo phrase articulation</title><style>body{font:18px/1.6 system-ui;max-width:800px;margin:32px auto;padding:0 24px;background:#111b20;color:#e9f0eb}section{padding:22px;background:#213039;border-radius:12px;margin:24px 0}audio{width:100%}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style>
<h1>Which piano response feels more musical?</h1><p>Four private comparisons from your recording. Each pair keeps the same notes, groove and voice, with different piano note lengths. Labels conceal the versions; both are matched in loudness.</p>
<p>Compare around 10–15 seconds and 27–32 seconds. Does one answer flow more naturally, or feel too drawn out? Piano-only players make the difference easier to hear. Full mixes and piano stems use separate matching levels. Tell us the pair, A/B or neither, and any awkward timestamp.</p>
<p>Research only. No model was trained and the studio default has not changed.</p>'''+''.join(cards)+'''
<script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
assert page.count('<audio ') == 16
(review/'index.html').write_text(page)
(root/'blind-key-private.json').write_text(json.dumps(allocation, indent=2)+'\n')
for path, sha in json.loads(Path('docs/evidence/analysis-offset/preservation-before.json').read_text()).items():
    assert digest(Path(path)) == sha
    report['source_preserved'][path] = sha
for path, sha in json.loads(Path('docs/evidence/analysis-offset/final-build.json').read_text()).items():
    if path.startswith(('core/', 'build-mac/', 'build-web/')):
        assert digest(Path(path)) == sha
        report['default_engine_preserved'][path] = sha
report.update(technical='PASS', matched_review_files=16, exact_mac_linux_wavs=40,
              human_listening='NOT RUN', promotion='NOT RUN', source_response_learning='NOT RUN')
(evidence/'measurements.json').write_text(json.dumps(report, indent=2)+'\n')
print('PASS: four pairs, 40 exact Mac/Linux WAVs, 16 matched listening files; default engine preserved')
