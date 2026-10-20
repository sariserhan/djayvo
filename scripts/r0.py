#!/usr/bin/env python3
"""Local R0 planning/evaluation adapter. All sound is rendered by the existing C++ engine."""
import argparse
import array
import csv
import datetime
import hashlib
import itertools
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import wave

from jsonschema import Draft202012Validator, ValidationError
from referencing import Registry, Resource
from inspect_wav import inspect
from prepare_listening import prepare
from verify_export import verify_export

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = 'renders/fixtures/synthetic-speech.wav'
FIXTURE_HASH = 'c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e'
STYLES = ('hiphop', 'reggae', 'experimental')
MANIFESTS = {'piano': 'acoustic-v1', 'bass': 'acoustic-v1', 'drums': 'acoustic-v1',
             'guitar': 'guitar-v1', 'organ': 'sustained-v1', 'pad': 'sustained-v1', 'lead': 'sustained-v1'}


def digest(path):
    result = hashlib.sha256()
    with Path(path).open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def load(path):
    path = Path(path)
    if not path.is_file() or path.is_symlink() or path.stat().st_size > 4 * 1024 * 1024:
        raise ValueError('expected regular JSON file of at most 4 MiB')
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('duplicate JSON key')
            result[key] = value
        return result
    def invalid(_):
        raise ValueError('nonfinite JSON number')
    return json.loads(path.read_text(), object_pairs_hook=pairs, parse_constant=invalid)


def save(path, value):
    with Path(path).open('x') as f:
        f.write(json.dumps(value, indent=2, allow_nan=False) + '\n')


def local(path):
    value = ROOT / path
    if Path(path).is_absolute() or '..' in Path(path).parts:
        raise ValueError('asset must use a repository-relative path')
    if any(p.is_symlink() for p in (value, *value.parents)):
        raise ValueError('symlink assets are not accepted')
    if not value.is_file() or not value.resolve().is_relative_to(ROOT):
        raise ValueError('missing or escaped local asset')
    return value


def schema_validate(value, filename):
    native = load(ROOT / 'schemas/remix-plan.schema.json')
    registry = Registry().with_resource(native['$id'], Resource.from_contents(native))
    schema = load(ROOT / filename)
    Draft202012Validator.check_schema(schema)
    Draft202012Validator(schema, registry=registry).validate(value)


def evidence(path):
    return {'path': path, 'sha256': digest(local(path))}


def validate_dataset(manifest, use='evaluation'):
    schema_validate(manifest, 'datasets/manifest.schema.json')
    if use != 'evaluation':
        raise ValueError('R0 authorizes evaluation only; training/distribution ingestion is disabled')
    ids, hashes, splits = set(), set(), {}
    for record in manifest['records']:
        if record['id'] in ids or record['asset']['sha256'] in hashes:
            raise ValueError('duplicate record or source content')
        ids.add(record['id']); hashes.add(record['asset']['sha256'])
        if (record['allowed_uses'] != ['evaluation'] or record['training_opt_in'] or record['withdrawn'] or
                datetime.date.fromisoformat(record['retention']['expires_on']) < datetime.date.today()):
            raise ValueError('missing, withdrawn, expired or out-of-scope authorization')
        if local(record['asset']['path']).stat().st_size > 32 * 1024 * 1024:
            raise ValueError('source exceeds 32 MiB ingestion budget')
        for field in ('asset', 'authorization'):
            item = record[field]
            if digest(local(item['path'])) != item['sha256']:
                raise ValueError('asset or authorization evidence hash mismatch')
        # R0 admits only the retained non-person fixture and reproducible project signals.
        if record['origin'] == 'preserved_synthetic_fixture':
            if (record['asset']['sha256'] != FIXTURE_HASH or
                    record['authorization'] != evidence('assets/manifests/m0-remix.json')):
                raise ValueError('unrecognized preserved fixture provenance')
        else:
            if record['authorization'] != evidence('scripts/r0.py'):
                raise ValueError('unrecognized original signal generator')
            expected = signal_bytes(record['id'])
            with wave.open(str(local(record['asset']['path'])), 'rb') as f:
                if f.getparams()[:4] != (1, 2, 48000, 144000) or f.readframes(144000) != expected:
                    raise ValueError('original signal does not match its declared generator')
        with wave.open(str(local(record['asset']['path'])), 'rb') as f:
            if f.getsampwidth() != 2 or f.getnchannels() not in (1, 2) or not 2 <= f.getnframes()/f.getframerate() <= 5:
                raise ValueError('R0 source must be 2..5 seconds of mono/stereo PCM16')
        for field in ('source_group', 'session_group', 'speaker_group', 'performer_group'):
            group = record[field]
            if group is None:
                continue
            key = (field, group)
            if key in splits and splits[key] != record['split']:
                raise ValueError('source/session/speaker/performer leaks across splits')
            splits[key] = record['split']
    return {r['id']: r for r in manifest['records']}


def signal_bytes(name):
    names = ('r0_pulses', 'r0_glide', 'r0_double_hits', 'r0_contour')
    if name not in names:
        raise ValueError('unknown original synthetic signal')
    index = names.index(name)
    samples = array.array('h')
    for frame in range(144000):
        t = frame / 48000
        beat = (t * (3 + index)) % 1
        envelope = math.exp(-beat * (12 + index * 3)) * min(1, t * 200, (3-t) * 100)
        phase = 2 * math.pi * ((110 + index*55)*t + (35*t*t if index == 1 else 0))
        samples.append(round(10000 * envelope * (math.sin(phase) + .2*math.sin(phase*2)) / 1.2))
    if sys.byteorder != 'little':
        samples.byteswap()
    return samples.tobytes()


def fixtures(output):
    output = Path(output).resolve()
    output.relative_to(ROOT)
    output.mkdir(parents=True, exist_ok=False)
    if digest(local(FIXTURE)) != FIXTURE_HASH:
        raise ValueError('supplied fixture changed; do not regenerate it')
    records = []
    for name in ('r0_phrase', 'r0_pulses', 'r0_glide', 'r0_double_hits', 'r0_contour'):
        original = name != 'r0_phrase'
        path = output / (name + '.wav') if original else local(FIXTURE)
        if original:
            with wave.open(str(path), 'wb') as f:
                f.setparams((1, 2, 48000, 0, 'NONE', 'not compressed'))
                f.writeframes(signal_bytes(name))
        records.append({'id':name,'asset':evidence(str(path.relative_to(ROOT))),
            'origin':'original_r0_signal' if original else 'preserved_synthetic_fixture',
            'rights_owner':'Jamloom project original test material; outbound license unselected',
            'allowed_uses':['evaluation'],'training_opt_in':False,'identifiable_people':False,
            'voice_consent':'not_applicable_nonperson',
            'authorization':evidence('scripts/r0.py' if original else 'assets/manifests/m0-remix.json'),
            'withdrawn':False,'retention':{'expires_on':'2027-10-20','deletion':'delete_asset_and_descendants_rebuild_if_used'},
            'split':'test','source_group':name,'session_group':name,'speaker_group':None,'performer_group':None,
            'restrictions':'local_R0_evaluation_only_no_training_or_distribution'})
    manifest = {'schema_version':'1.0-r0-dataset','records':records}
    validate_dataset(manifest)
    save(output/'manifest.json', manifest)
    return manifest


def patches(execution):
    result = {}
    for track in execution['tracks']:
        instrument = track['instrument']
        electronic = track.get('sound') == 'electronic'
        patch = instrument + (':electronic' if electronic else ':default')
        manifest = 'electronic-v2' if electronic else MANIFESTS[instrument]
        result[patch] = {'patch':patch,'license_manifest':evidence(f'assets/manifests/{manifest}.json'),
                        'midi_range':[40,79] if instrument=='guitar' else [21,108],
                        'articulations':['normal','muted'] if instrument=='guitar' else ['normal']}
    return list(result.values())


def envelope(execution, record, manifest_path, renderer):
    with wave.open(str(local(record['asset']['path'])), 'rb') as f:
        channels, frames = f.getnchannels(), f.getnframes()
    instruments = patches(execution)
    return {'schema_version':'1.0-r0',
        'session':{'id':f"r0_{execution['strategy']}_{execution['seed']}",'dataset_record_id':record['id'],
                   'dataset_sha256':digest(manifest_path),'controller_priority':'offline_exclusive',
                   'fallback':'reject_before_playback','context_confidence':0},
        'source_audio':{'local_asset':record['asset']['path'],'channels':channels,'start_frame':0,'end_frame':frames},
        'instruments':instruments,'execution':execution,
        'constraints':{'instrument_voices':128,'source_voices':16,'render_timeout_seconds':120,'max_events':10000,
                       'max_effects':5,'source_seconds':[2,5],'output_seconds':[20,40],
                       'allowed_patches':[p['patch'] for p in instruments]},
        'provenance':{'planner':'existing_cpp_rules/r0-1','policy':'r0-local-synthetic-evaluation-1',
                      'engine_sha256':digest(renderer),'implementation_sha256':digest(__file__),
                      'export_format':'PCM16_stereo_WAV','training':False}}


def validate_plan(plan, manifest_path, renderer):
    schema_validate(plan, 'schemas/performance_plan.schema.json')
    records = validate_dataset(load(manifest_path))
    session, execution = plan['session'], plan['execution']
    if session['dataset_sha256'] != digest(manifest_path) or session['dataset_record_id'] not in records:
        raise ValueError('plan ledger is missing or changed')
    record = records[session['dataset_record_id']]
    if (execution['source_asset_id'] != 'sha256:'+record['asset']['sha256'] or
            execution['source']['sha256'] != record['asset']['sha256'] or execution['source']['kind'] != 'synthetic' or
            plan['source_audio']['local_asset'] != record['asset']['path']):
        raise ValueError('plan source is not authorized by this ledger')
    with wave.open(str(local(record['asset']['path'])), 'rb') as f:
        if (plan['source_audio']['channels'] != f.getnchannels() or plan['source_audio']['end_frame'] != f.getnframes() or
                execution['source']['original_rate'] != f.getframerate() or execution['source']['original_frames'] != f.getnframes()):
            raise ValueError('source metadata does not match WAV')
    if plan['instruments'] != patches(execution) or plan['constraints']['allowed_patches'] != [p['patch'] for p in patches(execution)]:
        raise ValueError('patch/range/license manifest is not approved')
    if plan['provenance']['engine_sha256'] != digest(renderer) or plan['provenance']['implementation_sha256'] != digest(__file__):
        raise ValueError('engine or policy implementation changed; regenerate and review the plan')
    if sum(len(t['events']) for t in execution['tracks']) + len(execution['voice_events']) > 10000:
        raise ValueError('event work budget exceeded')
    return execution  # Native import performs the remaining scheduling/voice/tail checks before rendering.


def run_engine(renderer, source, prefix, style, seed=4123, block=512, plan=None, stems=False):
    command = [str(Path(renderer).resolve()), '--input',str(source),'--synthetic-fixture','--output',str(prefix),
               '--style',style,'--seed',str(seed),'--sample-rate','48000','--block-size',str(block)]
    if stems:
        command += ['--stems']
    if plan:
        command += ['--plan',str(plan)]
    start = time.perf_counter()
    result = subprocess.run(command, capture_output=True, text=True, timeout=120)
    if result.returncode:
        raise ValueError('native validation/render failed: ' + result.stderr.strip())
    verify_export(prefix, STYLES if style == 'all' else (style,))
    return time.perf_counter()-start


def replay(plan, manifest, renderer, output, block=113):
    execution = validate_plan(plan, manifest, renderer)
    if execution['sample_rate'] != 48000:
        raise ValueError('R0 adapter policy requires 48000 Hz')
    with tempfile.TemporaryDirectory(prefix='jamloom-r0-plan-') as temp:
        path = Path(temp)/'execution.json'
        save(path, execution)
        return run_engine(renderer, local(plan['source_audio']['local_asset']), output,
                          execution['strategy'], execution['seed'], block, path)


def describe(plan):
    p = plan['execution']
    # Compare actual musical decisions; seeds and plan IDs cannot count as novelty.
    return {'strategy':p['strategy'],'tempo_bpm':p['tempo_milli_bpm']/1000,'bars':p['target_bars'],'key':p['key'],
            'sections':p['sections'],'patches':[x['patch'] for x in plan['instruments']],
            'notes':[[t['instrument'],t.get('sound','default'),e['start_tick'],e['duration_ticks'],e['note'],e['velocity']]
                     for t in p['tracks'] for e in t['events']],
            'voice_events':p['voice_events'],'mix':p['mix']}


def compare(a, b):
    left, right = describe(a), describe(b)
    fields = [k for k in left if left[k] != right[k]]
    x, y = {tuple(n) for n in left['notes']}, {tuple(n) for n in right['notes']}
    return {'changed_fields':fields,'note_event_jaccard_distance':1-len(x&y)/max(1,len(x|y)),
            'meaningful_structural_variation':len(set(fields)&{'notes','voice_events','sections','patches','mix'}) >= 3,
            'perceptual_originality':'NOT RUN','copyright_novelty':'NOT RUN'}


def evaluate(output, manifest_path, renderer):
    records = validate_dataset(load(manifest_path))
    record = records['r0_phrase']
    source = local(record['asset']['path'])
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    elapsed = run_engine(renderer, source, output/'rules', 'all', stems=True)
    run_engine(renderer, source, output/'control', 'baseline')
    plans, results = [], {}
    for style in STYLES:
        execution = load(output/f'rules.{style}.score.json')
        plan = envelope(execution, record, manifest_path, renderer)
        validate_plan(plan, manifest_path, renderer)
        save(output/f'{style}.plan.json', plan)
        replay_seconds = replay(plan, manifest_path, renderer, output/f'replay-{style}')
        original, replayed = output/f'rules.{style}.wav', output/f'replay-{style}.{style}.wav'
        stats = inspect(replayed)
        if stats['first_nonzero_frame'] is None or stats['full_scale_samples'] or not 20 <= stats['duration_seconds'] <= 40:
            raise ValueError('invalid/silent/clipped WAV')
        if stats['peak_dbfs'] > execution['mix']['master_target_peak_dbfs'] + .01:
            raise ValueError('sample peak exceeds declared ceiling')
        exact_pcm = original.read_bytes() == replayed.read_bytes()
        exact_events = (output/f'rules.{style}.events.tsv').read_bytes() == (output/f'replay-{style}.{style}.events.tsv').read_bytes()
        if not exact_pcm or not exact_events:
            raise ValueError('native replay is not deterministic across block sizes')
        plans.append(plan)
        results[style] = {'status':'PASS','wav':stats,'exact_pcm':exact_pcm,'max_pcm_difference':0,'rms_pcm_difference':0,
                          'event_frame_agreement':exact_events,'render_seconds':replay_seconds,
                          'offline_render_realtime_factor':replay_seconds/stats['duration_seconds'],
                          'time_to_first_audible_result':'NOT RUN: offline full-file export, not streaming',
                          'human_recognizability':'NOT RUN'}
    comparisons = {f'{STYLES[i]}_vs_{STYLES[j]}':compare(plans[i],plans[j]) for i,j in itertools.combinations(range(3),2)}
    if not all(c['meaningful_structural_variation'] for c in comparisons.values()):
        raise ValueError('candidates do not vary in at least three structural dimensions')
    prepare(output/'rules',output/'review',source,baseline_prefix=output/'control')
    with (output/'review/listener/extended-ratings.csv').open('x', newline='') as f:
        csv.writer(f).writerow(['listener_id','code','variation_1_5','transitions_1_5','mix_quality_1_5','awkward_timestamp','notes'])
    report = {'schema_version':'1.0-r0-evaluation','status':'PASS','source_sha256':record['asset']['sha256'],
              'candidate_batch_seconds':elapsed,'renders':results,'comparisons':comparisons,
              'human_quality':'NOT RUN','human_sample_size':0,'confidence_intervals':None,'effect_sizes':None,
              'third_party_training':'NOT RUN; ingestion disabled','model_training':'NOT RUN',
              'cost_paid_services_usd':0,'scope':'one preserved synthetic phrase, three strategies; no quality/generalization claim'}
    save(output/'evaluation.json', report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command',required=True)
    p = sub.add_parser('fixtures'); p.add_argument('--output',type=Path,required=True)
    p = sub.add_parser('dataset'); p.add_argument('manifest',type=Path); p.add_argument('--use',default='evaluation')
    for name in ('evaluate','replay','validate'):
        p = sub.add_parser(name); p.add_argument('--manifest',type=Path,required=True)
        p.add_argument('--renderer',type=Path,default=ROOT/'build-mac/jamloom_remix')
        if name != 'evaluate': p.add_argument('plan',type=Path)
        if name != 'validate': p.add_argument('--output',type=Path,required=True)
    p = sub.add_parser('inspect'); p.add_argument('plan',type=Path)
    p = sub.add_parser('diff'); p.add_argument('left',type=Path); p.add_argument('right',type=Path)
    args = parser.parse_args()
    if args.command == 'fixtures': result = fixtures(args.output)
    elif args.command == 'dataset': result = {'status':'PASS','records':len(validate_dataset(load(args.manifest),args.use))}
    elif args.command == 'evaluate': result = evaluate(args.output,args.manifest,args.renderer)
    elif args.command == 'replay': result = {'status':'PASS','seconds':replay(load(args.plan),args.manifest,args.renderer,args.output)}
    elif args.command == 'validate':
        with tempfile.TemporaryDirectory(prefix='jamloom-r0-validate-') as temp:
            replay(load(args.plan),args.manifest,args.renderer,Path(temp)/'validated')
        result = {'status':'PASS','checks':'schema, ledger, actual native import and render'}
    elif args.command == 'inspect':
        plan = load(args.plan); schema_validate(plan,'schemas/performance_plan.schema.json'); result = describe(plan)
        result['note_count'] = len(result.pop('notes'))
        result['voice_event_count'] = len(result.pop('voice_events'))
        result['approval'] = 'Inspection only; use validate with the actual source ledger and renderer'
    else:
        left, right = load(args.left), load(args.right)
        for plan in (left,right): schema_validate(plan,'schemas/performance_plan.schema.json')
        result = compare(left,right)
    print(json.dumps(result,indent=2,allow_nan=False))


if __name__ == '__main__':
    try:
        main()
    except ValidationError as error:
        sys.exit('FAIL: schema violation at /' + '/'.join(map(str, error.absolute_path)))
    except (ValueError, OSError, subprocess.TimeoutExpired) as error:
        sys.exit('FAIL: '+str(error))
