#!/usr/bin/env python3
"""Freeze five authorized local inputs and audit the unchanged renderer for Q0."""
import argparse
import collections
import hashlib
import html
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import wave

from inspect_wav import inspect
from verify_export import verify_export

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, value):
    Path(path).write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def loudness(path):
    result = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', str(path),
        '-af', 'loudnorm=I=-23:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True, check=True, timeout=60)
    measured, _ = json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])
    # No loudness processing is written; retain the filter's measured INPUT values.
    return {k: measured[k] for k in ('input_i', 'input_tp', 'input_lra', 'input_thresh')}


def level_match(source, destination, target, initial_level):
    if destination.exists():
        raise ValueError('Refusing to replace listening audio')
    gain = target-float(initial_level['input_i'])
    with tempfile.TemporaryDirectory(prefix='jamloom-q0-level-') as directory:
        for attempt in range(5):
            candidate = Path(directory)/f'{attempt}.wav'
            subprocess.run(['ffmpeg','-nostdin','-loglevel','error','-n','-i',str(source),
                '-af',f'volume={gain:.8f}dB','-c:a','pcm_s16le',str(candidate)],check=True,timeout=60)
            measured = loudness(candidate)
            error = target-float(measured['input_i'])
            if abs(error) <= .15 and float(measured['input_tp']) <= -1.9:
                with candidate.open('rb') as src, destination.open('xb') as dst:
                    shutil.copyfileobj(src,dst)
                return gain, measured
            # R128's absolute gate can admit quieter tails after amplification.
            # Reapply a single corrected gain to the original, never to the PCM16 intermediate.
            gain += error
    raise ValueError('Loudness match or true-peak ceiling failed; no listening file published')


def event_metrics(plan):
    q = plan['ticks_per_quarter']
    tracks = []
    for track in plan['tracks']:
        notes = track['events']
        beats = collections.Counter(n['start_tick'] // (q * 4) for n in notes)
        tracks.append({'instrument': track['instrument'], 'notes': len(notes),
            'velocity_values': sorted(set(n['velocity'] for n in notes)),
            'duration_values_ticks': sorted(set(n['duration_ticks'] for n in notes)),
            'sixteenth_grid_attacks': sum(n['start_tick'] % (q // 4) == 0 for n in notes),
            'notes_per_bar': dict(sorted(beats.items()))})
    kick = {n['start_tick'] for t in plan['tracks'] if t['instrument'] == 'drums'
            for n in t['events'] if n['note'] == 36}
    bass = [n['start_tick'] for t in plan['tracks'] if t['instrument'] == 'bass' for n in t['events']]
    return {'tempo_milli_bpm': plan['tempo_milli_bpm'], 'tracks': tracks,
        'bass_attacks': len(bass), 'bass_exactly_on_kick': sum(t in kick for t in bass),
        'nearest_kick_distances_ticks': [min(abs(t-k) for k in kick) for t in bass] if kick else [],
        'voice_events': plan['voice_events'], 'voice_clips': plan['voice_clips'],
        'sections': plan['sections'],
        'interpretation': 'Descriptors, not scores of musicality or proof that syncopation is wrong.'}


def inputs():
    ledger = json.loads((ROOT/'renders/licensed-evaluation-20261018/manifest-final.json').read_text())
    ids = ['ls-2277-149896-0026', 'ls-2035-147960-0013', 'ls-2086-149220-0047', 'commons-laughter']
    selected = []
    for identifier in ids:
        row = next(r for r in ledger['clips'] if r['id'] == identifier)
        if (row['consent']['local_processing'] is not True or
                row['license']['id'] not in ('CC-BY-4.0', 'CC0-1.0') or
                digest(row['path']) != row['sha256']):
            raise ValueError('Missing authorization or changed source: ' + identifier)
        selected.append(row)
    owner = ROOT/'renders/voice-20261017-221411'
    provenance = json.loads((owner/'source-provenance.json').read_text())
    conversion = json.loads((owner/'pcm-conversion.json').read_text())
    if (digest(owner/'source-pcm.wav') != conversion['wav_sha256'] or
            provenance.get('scope') != 'Local analysis, remixing, and private audition; no upload or training.' or
            not provenance.get('consent')):
        raise ValueError('Owner source or authorization changed')
    return [{'id': 'owner-speech', 'kind': 'conversational_speech', 'path': str(owner/'source-pcm.wav'),
        'sha256': conversion['wav_sha256'], 'consent': provenance['consent'],
        'scope': provenance['scope'], 'review_scope': 'owner_only'}, *selected]


def run(output, renderer, rows=None, selection=None):
    rows = inputs() if rows is None else rows
    if output.exists():
        raise ValueError('Choose a new directory; never replace baseline plans or ratings')
    output.mkdir(parents=True)
    (output/'INCOMPLETE').write_text('Do not accept until audit.json exists and this marker is removed.\n')
    frozen = {'schema_version': '1.0-q0-audit', 'source_commit': subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'renderer_sha256': digest(renderer), 'inputs': rows,
        'selection': selection or 'Owner conversational speech, first three pinned licensed utterances, and pinned laughter; chosen before rendering.',
        'scope': 'Local owner audition only for the combined packet; no training, upload or redistribution.',
        'training_authorized': False, 'styles': [['hiphop', 'reggae', 'experimental', 'hiphop', 'experimental'][i % 5] for i in range(len(rows))],
        'seed': 4123, 'planned_comparisons': ['A existing', 'B instruments only', 'C expression only',
            'D instruments plus expression', 'E composition plus D'],
        'quality_benchmarks_changed': False, 'human_quality': 'NOT RUN'}
    write(output/'freeze.json', frozen)
    results, sections = [], []
    for row, style in zip(rows, frozen['styles']):
        folder = output/row['id']; folder.mkdir()
        shutil.copyfile(row['path'], folder/'source.wav')
        prefix = folder/'A'
        command = [str(renderer.resolve()), '--input', str(folder/'source.wav'), '--consent',
                   '--style', style, '--seed', '4123', '--stems', '--output', str(prefix)]
        subprocess.run(command, check=True, timeout=120)
        verify_export(prefix, (style,))
        plan = json.loads((folder/f'A.{style}.score.json').read_text())
        audio = []
        for path in sorted(folder.glob('A.*.wav')):
            measurement = inspect(path); measurement['ebu_r128'] = loudness(path)
            audio.append(measurement)
        result = {'id': row['id'], 'style': style, 'source_sha256': digest(folder/'source.wav'),
            'plan_sha256': digest(folder/f'A.{style}.score.json'), 'events': event_metrics(plan),
            'audio': audio, 'command': command, 'human_diagnosis': 'NOT RUN'}
        write(folder/'audit.json', result); results.append(result)
        players = [('Original', 'source.wav'), *[(p.name, p.name) for p in sorted(folder.glob('A.*.wav'))]]
        sections.append('<section><h2>'+html.escape(row['id'])+'</h2>'+''.join(
            '<p>'+html.escape(label)+'</p><audio controls preload="none" src="'+html.escape(row['id']+'/'+name, quote=True)+'"></audio>'
            for label, name in players)+'</section>')
    write(output/'audit.json', {'technical': 'PASS', 'human_quality': 'NOT RUN', 'records': results})
    credits = '\n\n'.join(r.get('license', {}).get('attribution', r.get('scope', '')) for r in rows)
    (output/'ATTRIBUTION.txt').write_text(credits+'\n')
    (output/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom Q0 baseline audit</title>'
        '<style>body{font:18px/1.5 system-ui;max-width:850px;margin:32px auto;padding:20px;background:#10171b;color:#eee}'
        'audio{width:100%}section{border-top:1px solid #555;margin-top:30px}a{color:#8de4e6}</style>'
        '<h1>Q0: hear each part separately</h1><p>Unchanged engine. Local owner-only audit; no quality improvement claimed. '
        'Pause one player before starting another. Identify the component and timestamp of an unnatural sound.</p>'
        '<a href="ATTRIBUTION.txt">Source permissions and credits</a>'+''.join(sections)+'</html>')
    (output/'INCOMPLETE').unlink()
    print(f'PASS: {len(rows)} frozen baselines and stems. Human diagnosis NOT RUN:', output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--renderer', type=Path, default=ROOT/'build-mac/jamloom_remix')
    args = parser.parse_args()
    run(args.output.resolve(), args.renderer)
