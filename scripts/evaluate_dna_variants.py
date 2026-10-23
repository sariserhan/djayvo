#!/usr/bin/env python3
"""Render two distinct local seeds from one saved plan; never infer listening quality."""
import argparse
import copy
import fcntl
import json
from pathlib import Path
import subprocess
import sys
from singing_response import digest, load_plan, VOCAL_PROFILES, validate_plan, generated_vocal_reference
from music_dna_song import performance_caption

ROOT = Path(__file__).resolve().parents[1]


def prepare(source, work, seed, vocal_profile=None):
    if type(seed) is not int or not 0 <= seed < 2**32:
        raise ValueError('Invalid seed')
    plan = copy.deepcopy(load_plan(source/'plan.json'))
    if plan['schema'] != 'jamloom-dna-song-1' or len(plan['cases']) != 1:
        raise ValueError('Expected one Music DNA song')
    request = json.loads((source/'input.json').read_text())
    if plan.get('input_sha256') != digest(source/'input.json') or request['direction'] != plan['direction']:
        raise ValueError('Original plan does not match its request')
    work.mkdir(parents=True, exist_ok=False)
    request['seed'] = seed
    (work/'input.json').write_text(json.dumps(request, ensure_ascii=False))
    plan.pop('seed', None)  # The singer reads the case seed, never a top-level research label.
    plan['cases'][0].pop('singer_reference', None)
    plan['cases'][0]['seed'] = seed
    if vocal_profile is not None:
        if vocal_profile not in VOCAL_PROFILES:raise ValueError('Unknown vocal profile')
        case=plan['cases'][0];case['vocal_profile']=vocal_profile;case['voice']=VOCAL_PROFILES[vocal_profile][0]
        case['id']=f"{case['genre']}-{case['voice']}"
        case['song_caption']=performance_caption(plan['direction'],case,plan.get('production_sound',''),plan.get('musical_traits'),guidance=plan.get('sound_guidance'))
        plan['title']+=' · '+vocal_profile.replace('-',' ')
        validate_plan(plan)
    plan['input_sha256'] = digest(work/'input.json')
    (work/'plan.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2)+'\n')
    return plan


def verify(work, seed, seen):
    plan = load_plan(work/'plan.json')
    receipt = json.loads((work/'singer/complete.json').read_text())
    sha = digest(work/'singer/singer.wav')
    if receipt['case'] != plan['cases'][0] or receipt['case']['seed'] != seed or receipt['plan_sha256'] != digest(work/'plan.json') or receipt['audio_sha256'] != sha:
        raise ValueError('Requested seed, actual singer case or output receipt differs')
    if sha in seen:
        raise ValueError('Duplicate audio is not an independent take')
    seen.add(sha)
    return sha


def evaluate(source, output, seed, voices=False, reference_singers=None, reference_vocals=False):
    if not 0 <= seed < 2**32-1:
        raise ValueError('Two seeds must fit the singer range')
    if reference_singers is not None and (voices or not 2 <= len(reference_singers) <= 8):
        raise ValueError('Compare two to eight references separately from caption-only voices')
    if reference_vocals and not reference_singers:raise ValueError('Isolated vocals require explicit references')
    output.mkdir(parents=True, exist_ok=False)
    rows, seen = [], set()
    with (ROOT/'renders/.music-dna-singer.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        takes=[(seed,profile,None) for profile in ('female-alto','female-soprano','male-bass','male-tenor')] if voices else [(seed,None,None),(seed+1,None,None)]
        if reference_singers:
            takes=[(seed,'female-alto' if generated_vocal_reference(path)['voice']=='female' else 'male-bass',path) for path in reference_singers]
        for index,(selected,profile,reference) in enumerate(takes):
            work = output/(f'reference-{index+1}' if reference else profile or str(selected))
            plan = prepare(source, work, selected, profile)
            if reference:
                plan['title']=plan['title'].split(' · ')[0]+f' · {output.name.replace("-", " ")} · voice {index+1}'
                (work/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
            with (work/'run.log').open('w') as log:
                subprocess.run([sys.executable, str(ROOT/'scripts/singing_response.py'), 'sing', '--runtime', str(ROOT/'build-style-training/upstream'), '--plan', str(work/'plan.json'), '--output', str(work/'singer'), '--case', plan['cases'][0]['id'],*(['--reference-singer',str(reference)] if reference else []),*(['--reference-vocals'] if reference_vocals else [])], stdout=log, stderr=subprocess.STDOUT, check=True, timeout=900)
            sha = verify(work, selected, seen)
            with (work/'check.log').open('w') as log:
                subprocess.run([sys.executable, str(ROOT/'scripts/check_dna_audio.py'), '--work', str(work)], stdout=log, stderr=subprocess.STDOUT, check=True, timeout=180)
            fit = json.loads((work/'fit.json').read_text())
            rows.append({'seed':selected, 'audio_sha256':sha, 'accepted':fit['accepted'], 'matching_windows':fit['matching_windows'], 'scores':fit['scores'], 'listening':'NOT RUN'})
            if reference:rows[-1]['vocal_reference']=json.loads((work/'singer/complete.json').read_text())['vocal_reference']
            if voices or reference_singers:
                from evaluate_music_coverage import publish
                rows[-1]['vocal_profile']=profile
                rows[-1]['published']=publish(work,{'product':'music-dna'})
            (output/'report.json').write_text(json.dumps(rows, indent=2)+'\n')
            print(json.dumps(rows[-1]), flush=True)
    return rows


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', required=True, type=Path)
    p.add_argument('--output', required=True, type=Path)
    p.add_argument('--seed', required=True, type=int)
    p.add_argument('--voices',action='store_true',help='Compare four vocal characters on identical lyrics, style and seed; publish each verified take')
    p.add_argument('--reference-singers',nargs='+',type=Path,help='Compare two to eight receipt-bound synthetic vocal references locally and publish verified takes')
    p.add_argument('--reference-vocals',action='store_true',help='Compare isolated vocals from the same pinned references')
    args = p.parse_args()
    evaluate(args.source.resolve(), args.output.resolve(), args.seed,args.voices,args.reference_singers,args.reference_vocals)
