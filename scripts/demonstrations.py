#!/usr/bin/env python3
"""R1 local, offline edit capture. Exports are evaluation material, never training approval."""
import argparse
import copy
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import uuid
import wave

from r0 import ROOT, FIXTURE_HASH, digest, load, local, patches, schema_validate
from inspect_wav import inspect
from verify_export import verify_export
from jsonschema import ValidationError


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()


def fingerprint(value):
    return hashlib.sha256(encoded(value)).hexdigest()


def policy_digest():
    paths = ('scripts/demonstrations.py', 'scripts/r0.py', 'scripts/verify_export.py',
             'scripts/inspect_wav.py', 'schemas/remix-plan.schema.json',
             'schemas/demonstration-action.schema.json', 'schemas/demonstration-trace.schema.json',
             'datasets/demonstration-ledger.schema.json')
    return fingerprint({p: digest(ROOT/p) for p in paths})


def publish(path, data):
    """Publish complete bytes exclusively; an existing recording/trace is never overwritten."""
    path = Path(path).absolute()
    if any(p.is_symlink() for p in (path, *path.parents)):
        raise ValueError('symlink outputs are not accepted')
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.jamloom-', delete=False) as f:
        temp = Path(f.name)
        try:
            f.write(data); f.flush(); os.fsync(f.fileno())
            os.link(temp, path)
        finally:
            temp.unlink(missing_ok=True)


def write_json(path, value):
    data = json.dumps(value, indent=2, allow_nan=False).encode() + b'\n'
    if len(data) > 4 * 1024 * 1024:
        raise ValueError('trace exceeds 4 MiB budget')
    publish(path, data)


def reference(path):
    relative = str(Path(path).absolute().relative_to(ROOT))
    return {'path': relative, 'sha256': digest(local(relative))}


def checked(ref):
    path = local(ref['path'])
    if digest(path) != ref['sha256']:
        raise ValueError('changed source, rights evidence, engine or ledger')
    return path


def ledger(path):
    value = load(path)
    schema_validate(value, 'datasets/demonstration-ledger.schema.json')
    records, groups = {}, {}
    for record in value['records']:
        if record['id'] in records:
            raise ValueError('duplicate record ID')
        if record['withdrawn'] or dt.date.fromisoformat(record['expires_on']) < dt.date.today():
            raise ValueError('withdrawn or expired permission')
        if not record['permissions']['local_processing'] or not record['permissions']['evaluation']:
            raise ValueError('local processing and evaluation permission required')
        source = checked(record['asset'])
        if source.stat().st_size > 32 * 1024 * 1024:
            raise ValueError('source exceeds 32 MiB')
        with wave.open(str(source), 'rb') as f:
            if f.getsampwidth() != 2 or f.getnchannels() not in (1, 2) or not 2 <= f.getnframes()/f.getframerate() <= 5:
                raise ValueError('source must be 2..5 seconds mono/stereo PCM16')
        checked(record['authorization'])
        if record['origin'] == 'preserved_synthetic_fixture':
            if (record['asset']['sha256'] != FIXTURE_HASH or record['speakers'] or
                    record['permissions']['training'] or record['split'] != 'test' or
                    record['authorization'] != reference(ROOT/'assets/manifests/m0-remix.json')):
                raise ValueError('synthetic fixture is test-only, with pinned original provenance')
        elif record['reviewer_id'] is None or record['asset']['sha256'] == FIXTURE_HASH:
            raise ValueError('first-party evidence requires a reviewer and cannot relabel the synthetic fixture')
        if record['identifiable_speakers'] != len(record['speakers']):
            raise ValueError('every declared identifiable speaker requires consent')
        speaker_ids = set()
        for speaker in record['speakers']:
            if speaker['id'] in speaker_ids:
                raise ValueError('duplicate speaker consent')
            speaker_ids.add(speaker['id'])
            checked(speaker['authorization'])
            if (not speaker['local_processing'] or not speaker['evaluation'] or
                    (record['permissions']['training'] and not speaker['training'])):
                raise ValueError('speaker permissions do not cover declared use')
        keys = [('asset', record['asset']['sha256'])]
        keys += [(field, record[field]) for field in ('source_group', 'session_group', 'phrase_group', 'performer_group')]
        keys += [('speaker', s) for s in speaker_ids]
        for key in keys:
            if key in groups and groups[key] != record['split']:
                raise ValueError('source/session/phrase/speaker/performer split leakage')
            groups[key] = record['split']
        records[record['id']] = record
    return records


def apply_action(plan, action):
    # The action schema is validated as part of every complete trace, and at the CLI boundary.
    schema_validate({'action': action}, 'schemas/demonstration-action.schema.json')
    result = copy.deepcopy(plan)
    kind, value = action['kind'], action['value']
    if kind == 'candidate':
        result = copy.deepcopy(value)
    elif kind == 'mix':
        result['mix'] = copy.deepcopy(value)
    else:
        if kind == 'note':
            if action['track'] >= len(result['tracks']):
                raise ValueError('track index outside plan')
            collection = result['tracks'][action['track']]['events']
        else:
            collection = result[{'track': 'tracks', 'slice': 'voice_clips', 'vocal': 'voice_events'}[kind]]
        index = action['index']
        if index > len(collection) or (index == len(collection) and value is None):
            raise ValueError('action index outside collection')
        if value is None:
            del collection[index]
        elif index == len(collection):
            collection.append(copy.deepcopy(value))
        else:
            collection[index] = copy.deepcopy(value)
    if result['source'] != plan['source'] or result['analysis'] != plan['analysis']:
        raise ValueError('edits cannot relabel source or analyzer observations')
    schema_validate(result, 'schemas/remix-plan.schema.json')
    if result == plan:
        raise ValueError('no-op is not a demonstration')
    return result


def render(plan, record, renderer, output, block=512):
    schema_validate(plan, 'schemas/remix-plan.schema.json')
    if sum(len(t['events']) for t in plan['tracks']) + len(plan['voice_events']) > 10000:
        raise ValueError('10,000-event work budget exceeded')
    if plan['source']['sha256'] != record['asset']['sha256']:
        raise ValueError('plan does not belong to authorized source')
    synthetic = record['origin'] == 'preserved_synthetic_fixture'
    if plan['source']['kind'] != ('synthetic' if synthetic else 'recorded'):
        raise ValueError('source kind differs from ledger')
    licenses = patches(plan)
    with tempfile.TemporaryDirectory(prefix='jamloom-demonstration-plan-') as folder:
        path = Path(folder).resolve()/'plan.json'
        write_json(path, plan)
        command = [str(renderer), '--input', str(checked(record['asset'])),
                   '--synthetic-fixture' if synthetic else '--consent', '--plan', str(path),
                   '--style', plan['strategy'], '--seed', str(plan['seed']),
                   '--sample-rate', str(plan['sample_rate']), '--block-size', str(block), '--output', str(output)]
        result = subprocess.run(command, capture_output=True, text=True, timeout=120, umask=0o077)
        if result.returncode:
            raise ValueError('native validation/render failed: ' + result.stderr.strip())
    verify_export(output, (plan['strategy'],))
    prefix = str(output) + '.' + plan['strategy']
    stats = inspect(Path(prefix + '.wav'))
    stats.pop('file')  # Temporary render paths are not part of deterministic audio evidence.
    if (load(prefix+'.report.json')['nonfinite_samples'] or stats['first_nonzero_frame'] is None or
            stats['full_scale_samples'] or stats['peak_dbfs'] > -1):
        raise ValueError('silent or clipped demonstration')
    return {'wav_sha256': digest(prefix+'.wav'), 'events_sha256': digest(prefix+'.events.tsv'),
            'instruments': licenses, 'wav': stats}


def proof(plan, record, renderer):
    with tempfile.TemporaryDirectory(prefix='jamloom-demonstration-check-') as folder:
        return render(plan, record, renderer, Path(folder)/'audio')


def read_trace(path):
    trace = load(path)
    schema_validate(trace, 'schemas/demonstration-trace.schema.json')
    if trace['implementation_sha256'] != policy_digest():
        raise ValueError('capture implementation changed; review/migrate the trace explicitly')
    current = ledger(local(trace['ledger']['path']))  # Recheck withdrawal before frozen-ledger comparison.
    checked(trace['ledger'])
    renderer = checked(trace['renderer'])
    record = current[trace['record_id']]
    if trace['actor']['performer_group'] != record['performer_group']:
        raise ValueError('performer differs from rights ledger')
    if record['origin'] == 'preserved_synthetic_fixture' and trace['actor']['kind'] != 'automated_test':
        raise ValueError('fixture demonstrations cannot be labeled human expertise')
    plan, states = trace['initial_plan'], []
    if trace['initial_render']['instruments'] != patches(plan):
        raise ValueError('instrument provenance changed')
    prior_time = dt.datetime.fromisoformat(trace['started_at'])
    for i, step in enumerate(trace['steps']):
        before = {**trace, 'steps': trace['steps'][:i]}
        when = dt.datetime.fromisoformat(step['captured_at'])
        if step['sequence'] != i + 1 or step['previous_sha256'] != fingerprint(before) or when < prior_time:
            raise ValueError('broken, reordered or nonmonotonic trace')
        next_plan = apply_action(plan, step['action'])
        if step['plan_sha256'] != fingerprint(next_plan) or step['render']['instruments'] != patches(next_plan):
            raise ValueError('changed plan or instrument provenance')
        states.append((plan, step, next_plan))
        plan, prior_time = next_plan, when
    return trace, record, renderer, plan, states


def start(args):
    records = ledger(args.ledger)
    record = records[args.record]
    if record['origin'] == 'preserved_synthetic_fixture' and args.actor != 'automated_test':
        raise ValueError('synthetic regression is not a human demonstration')
    initial = load(args.plan)
    renderer = Path(args.renderer).absolute()
    trace = {'schema_version': '1.0-demonstration', 'session_id': str(uuid.uuid4()),
             'started_at': dt.datetime.now(dt.timezone.utc).isoformat(),
             'actor': {'kind': args.actor, 'performer_group': record['performer_group']},
             'ledger': reference(args.ledger), 'record_id': args.record,
             'renderer': reference(renderer), 'implementation_sha256': policy_digest(),
             'initial_plan': initial, 'initial_render': proof(initial, record, renderer), 'steps': []}
    schema_validate(trace, 'schemas/demonstration-trace.schema.json')
    write_json(args.output, trace)
    return {'status': 'PASS', 'steps': 0, 'training_authorized': False}


def edit(args):
    trace, record, renderer, plan, _ = read_trace(args.trace)
    if len(trace['steps']) >= 128:
        raise ValueError('128-edit session budget reached')
    action = load(args.action)
    plan = apply_action(plan, action)
    result = proof(plan, record, renderer)  # Reject before committing any edit.
    step = {'sequence': len(trace['steps'])+1, 'captured_at': dt.datetime.now(dt.timezone.utc).isoformat(),
            'previous_sha256': fingerprint(trace), 'action': action,
            'plan_sha256': fingerprint(plan), 'render': result}
    trace['steps'].append(step)
    schema_validate(trace, 'schemas/demonstration-trace.schema.json')
    write_json(args.output, trace)
    return {'status': 'PASS', 'steps': len(trace['steps']), 'training_authorized': False}


def audited(path, output=None, block=512):
    trace, record, renderer, plan, states = read_trace(path)
    actual = render(plan, record, renderer, output, block) if output else proof(plan, record, renderer)
    expected = trace['steps'][-1]['render'] if trace['steps'] else trace['initial_render']
    if actual != expected:
        raise ValueError('replay differs from captured render')
    return trace, record, plan, states, actual


def examples(paths):
    rows, groups, seen, size = [], {}, set(), 0
    if not 1 <= len(paths) <= 128:
        raise ValueError('batch must contain 1..128 traces')
    for path in paths:
        trace, record, final, states, _ = audited(path)
        if trace['session_id'] in seen:
            raise ValueError('duplicate session/revision in dataset')
        seen.add(trace['session_id'])
        keys = [('asset', record['asset']['sha256'])]
        keys += [(k, record[k]) for k in ('source_group', 'session_group', 'phrase_group', 'performer_group')]
        keys += [('speaker', s['id']) for s in record['speakers']]
        for plan in [trace['initial_plan'], *[s[2] for s in states]]:
            keys.append(('arrangement', fingerprint({k: plan[k] for k in
                         ('tracks', 'voice_events', 'voice_clips', 'sections', 'tempo_milli_bpm', 'key')})))
        for key in keys:
            if key in groups and groups[key] != record['split']:
                raise ValueError('cross-ledger split leakage')
            groups[key] = record['split']
        for before, step, after in states:
            row = {'schema_version': '1.0-demonstration-example', 'purpose': 'evaluation_only',
                         'training_authorized': False, 'human_review': 'NOT RUN',
                         'supervision': trace['actor']['kind'], 'trace': reference(path),
                         'session_id': trace['session_id'], 'sequence': step['sequence'],
                         'source_sha256': record['asset']['sha256'], 'split': record['split'],
                         'strata': record['strata'], 'ledger': trace['ledger'],
                         'state': before, 'action': step['action'], 'next_state': after,
                         'outcome': step['render']}
            size += len(encoded(row)) + 1
            if size > 64 * 1024 * 1024:
                raise ValueError('dataset exceeds 64 MiB batch budget')
            rows.append(row)
    if not rows:
        raise ValueError('no accepted actions to export')
    return rows, {'status': 'PASS', 'examples': len(rows), 'sessions': len(seen),
            'human_expert_examples': 0, 'training_authorized': False,
            'splits': sorted({r['split'] for r in rows})}


def export(paths, output):
    rows, summary = examples(paths)
    data = b''.join(encoded(row)+b'\n' for row in rows)
    if len(data) > 64 * 1024 * 1024:
        raise ValueError('dataset exceeds 64 MiB batch budget')
    publish(output, data)
    return summary


def check_export(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 64 * 1024 * 1024:
        raise ValueError('expected regular dataset of at most 64 MiB')
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('duplicate JSON key in dataset')
            result[key] = value
        return result
    rows = [json.loads(line, object_pairs_hook=pairs) for line in path.read_text().splitlines()]
    if not rows or len(rows) > 16384 or any(not isinstance(row, dict) for row in rows):
        raise ValueError('invalid dataset rows')
    paths = list(dict.fromkeys(str(checked(row['trace'])) for row in rows))
    expected, summary = examples(paths)
    if encoded(rows) != encoded(expected):
        raise ValueError('dataset changed or no longer matches current authorized traces')
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    create = commands.add_parser('start')
    for name in ('plan', 'ledger', 'record', 'renderer', 'output'):
        create.add_argument('--'+name, required=True)
    create.add_argument('--actor', choices=['human', 'automated_test'], required=True)
    change = commands.add_parser('edit')
    for name in ('trace', 'action', 'output'):
        change.add_argument('--'+name, required=True)
    audit = commands.add_parser('audit'); audit.add_argument('trace')
    replay = commands.add_parser('render'); replay.add_argument('trace')
    replay.add_argument('--output', required=True)
    replay.add_argument('--block-size', type=int, default=512, choices=range(1, 4097))
    batch = commands.add_parser('export'); batch.add_argument('traces', nargs='+')
    batch.add_argument('--output', required=True)
    check = commands.add_parser('check-export'); check.add_argument('dataset')
    args = parser.parse_args()
    try:
        if args.command == 'start': result = start(args)
        elif args.command == 'edit': result = edit(args)
        elif args.command == 'export': result = export(args.traces, args.output)
        elif args.command == 'check-export': result = check_export(args.dataset)
        else:
            trace, _, _, _, rendered = audited(args.trace, getattr(args, 'output', None), getattr(args, 'block_size', 512))
            result = {'status': 'PASS', 'steps': len(trace['steps']), 'render': rendered, 'training_authorized': False}
        print(json.dumps(result, indent=2))
    except ValidationError:
        parser.exit(1, 'FAIL: schema validation rejected the document\n')
    except (ValueError, KeyError, TypeError, OSError, subprocess.TimeoutExpired) as error:
        parser.exit(1, f'FAIL: {error}\n')


if __name__ == '__main__':
    main()
