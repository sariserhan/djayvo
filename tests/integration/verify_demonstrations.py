#!/usr/bin/env python3
"""R1 contracts and actual native edit/replay checks; synthetic tests, not expert data."""
import argparse
import copy
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scripts'))
import demonstrations as d
from jsonschema import ValidationError

parser = argparse.ArgumentParser()
parser.add_argument('--renderer', type=Path, default=ROOT/'build-jamloom/jamloom_remix')
args, remaining = parser.parse_known_args()


class Demonstrations(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='r1-test-', dir=ROOT/'renders')
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.ledger = d.load(ROOT/'datasets/examples/r1-ledger.json')
        self.ledger_path = self.folder/'ledger.json'
        d.write_json(self.ledger_path, self.ledger)
        self.plan = d.load(ROOT/'docs/evidence/r0/hiphop.plan.json')['execution']
        self.plan['schema_version'] = '1.7-remix'
        self.plan_path = self.folder/'plan.json'
        d.write_json(self.plan_path, self.plan)
        self.start_path = self.folder/'start.json'
        self.start_args = SimpleNamespace(plan=self.plan_path, ledger=self.ledger_path,
            record='r1_synthetic_test', renderer=args.renderer, actor='automated_test', output=self.start_path)

    def write_mutation(self, value, name='mutated.json'):
        path = self.folder/name
        path.write_bytes(d.encoded(value))
        return path

    def action(self, kind='note'):
        if kind == 'note':
            return dict(kind=kind, reason='Softer opening note', track=0, index=0,
                        value={**self.plan['tracks'][0]['events'][0], 'velocity': 45})
        if kind == 'track':
            value = copy.deepcopy(self.plan['tracks'][0])
            value['automation'] = [{'start_tick': 0, 'gain_db': value['gain_db'], 'pan': value['pan']},
                                   {'start_tick': 3840, 'gain_db': -14, 'pan': .1}]
            return dict(kind=kind, reason='Piano gain and pan ramp', index=0, value=value)
        if kind == 'slice':
            return dict(kind=kind, reason='Adjust chop end by one source frame', index=1,
                        value={**self.plan['voice_clips'][1], 'end_frame': self.plan['voice_clips'][1]['end_frame']+1})
        if kind == 'vocal':
            return dict(kind=kind, reason='Place chop toward center', index=1,
                        value={**self.plan['voice_events'][1], 'pan': .1})
        if kind == 'mix':
            return dict(kind=kind, reason='Reduce room', value={**self.plan['mix'], 'instrument_room_mix': .1})
        return dict(kind='candidate', reason='Choose offbeat arrangement',
                    value=d.load(ROOT/'docs/evidence/r0/reggae.plan.json')['execution'])

    def edited(self, action=None):
        d.start(self.start_args)
        action_path = self.folder/'action.json'
        d.write_json(action_path, action or self.action())
        output = self.folder/'edited.json'
        d.edit(SimpleNamespace(trace=self.start_path, action=action_path, output=output))
        return output

    def test_real_edit_replay_and_dataset(self):
        path = self.edited()
        before = d.load(self.start_path)['initial_render']
        trace, record, plan, states, after = d.audited(path, self.folder/'replay', 113)
        self.assertNotEqual(before['wav_sha256'], after['wav_sha256'])
        self.assertEqual(1, len(states))
        self.assertEqual(0, after['wav']['full_scale_samples'])
        self.assertEqual(0o600, (self.folder/'replay.hiphop.wav').stat().st_mode & 0o777)
        dataset = self.folder/'examples.jsonl'
        result = d.export([path], dataset)
        self.assertEqual(1, result['examples'])
        self.assertFalse(result['training_authorized'])
        self.assertEqual(result, d.check_export(dataset))
        self.assertEqual('automated_test', trace['actor']['kind'])

    def test_all_six_action_kinds_native_render(self):
        record = self.ledger['records'][0]
        for kind in ('note', 'track', 'slice', 'vocal', 'mix', 'candidate'):
            with self.subTest(kind=kind):
                plan = d.apply_action(self.plan, self.action(kind))
                rendered = d.proof(plan, record, args.renderer)
                self.assertIsNotNone(rendered['wav']['first_nonzero_frame'])

    def test_insert_remove_and_unknown_noop_actions(self):
        action = self.action()
        action['index'] = len(self.plan['tracks'][0]['events'])
        appended = d.apply_action(self.plan, action)
        action['value'] = None
        self.assertEqual(self.plan, d.apply_action(appended, action))
        bad = [dict(self.action(), track=-1), dict(self.action(), index=10000),
               dict(self.action(), kind='shell'), dict(self.action(), surprise=True),
               dict(self.action(), value=self.plan['tracks'][0]['events'][0])]
        for action in bad:
            with self.assertRaises((ValueError, ValidationError)):
                d.apply_action(self.plan, action)

    def test_native_invalid_edit_never_commits(self):
        d.start(self.start_args)
        action = self.action()
        action['value']['start_tick'] = 999999
        action_path = self.write_mutation(action)
        output = self.folder/'rejected.json'
        with self.assertRaises(ValueError):
            d.edit(SimpleNamespace(trace=self.start_path, action=action_path, output=output))
        self.assertFalse(output.exists())
        self.assertEqual([], d.load(self.start_path)['steps'])

    def test_rights_rejections(self):
        mutations = [lambda r:r.update(withdrawn=True), lambda r:r.update(expires_on='2020-01-01'),
            lambda r:r['permissions'].update(training=True), lambda r:r['permissions'].update(evaluation=False),
            lambda r:r['permissions'].update(local_processing=False), lambda r:r.update(origin='downloaded_video'),
            lambda r:r.update(identifiable_speakers=1), lambda r:r['asset'].update(sha256='0'*64),
            lambda r:r['authorization'].update(sha256='0'*64), lambda r:r['asset'].update(path='../outside.wav'),
            lambda r:r.update(origin='first_party_recording', reviewer_id='asserted-reviewer'),
            lambda r:r.update(split='train')]
        for i, mutate in enumerate(mutations):
            value = copy.deepcopy(self.ledger); mutate(value['records'][0])
            with self.subTest(case=i), self.assertRaises((ValueError, ValidationError)):
                d.ledger(self.write_mutation(value))

    def test_first_party_speaker_permissions_and_group_splits(self):
        # Test declarations only; these deterministic signals are never exported as human expertise.
        originals = d.load(ROOT/'datasets/examples/r0-manifest.json')['records'][1:3]
        records = []
        for i, source in enumerate(originals):
            record = copy.deepcopy(self.ledger['records'][0])
            record.update(id=f'boundary_{i}', asset=source['asset'], origin='first_party_recording',
                          reviewer_id='test-reviewer', split=('train','dev')[i])
            record.update({k:f'{k}_{i}' for k in ('source_group','session_group','phrase_group','performer_group')})
            record['speakers'] = [{'id':f'person_{i}', 'authorization':record['authorization'],
                                   'local_processing':True,'evaluation':True,'training':False}]
            record['identifiable_speakers'] = 1
            records.append(record)
        value = {'schema_version': self.ledger['schema_version'], 'records':records}
        self.assertEqual(2, len(d.ledger(self.write_mutation(value))))
        for field in ('source_group','session_group','phrase_group','performer_group','asset','speakers'):
            changed = copy.deepcopy(value)
            changed['records'][1][field] = changed['records'][0][field]
            with self.subTest(field=field), self.assertRaises(ValueError):
                d.ledger(self.write_mutation(changed))
        value['records'][0]['permissions']['training'] = True
        with self.assertRaises(ValueError): d.ledger(self.write_mutation(value))

    def test_withdrawal_invalidates_existing_export(self):
        path = self.edited(); output = self.folder/'examples.jsonl'
        d.export([path], output)
        self.ledger['records'][0]['withdrawn'] = True
        self.ledger_path.write_bytes(d.encoded(self.ledger))
        with self.assertRaisesRegex(ValueError, 'withdrawn'):
            d.check_export(output)

    def test_trace_corruption_and_provenance_rejected(self):
        path = self.edited(); original = d.load(path)
        mutations = [lambda t:t.update(implementation_sha256='0'*64),
            lambda t:t['renderer'].update(sha256='0'*64), lambda t:t['ledger'].update(sha256='0'*64),
            lambda t:t['steps'][0].update(previous_sha256='0'*64),
            lambda t:t['steps'][0].update(plan_sha256='0'*64), lambda t:t['steps'][0].update(sequence=2),
            lambda t:t['steps'][0].update(captured_at='2000-01-01T00:00:00+00:00'),
            lambda t:t['actor'].update(kind='human'), lambda t:t['actor'].update(performer_group='someone_else'),
            lambda t:t['initial_render']['instruments'][0]['license_manifest'].update(sha256='0'*64)]
        for mutate in mutations:
            value = copy.deepcopy(original); mutate(value)
            with self.assertRaises(ValueError): d.read_trace(self.write_mutation(value))

    def test_mismatched_audio_receipt_rejected(self):
        path = self.edited(); value = d.load(path)
        value['steps'][-1]['render']['wav_sha256'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'replay differs'):
            d.audited(self.write_mutation(value))

    def test_export_tampering_duplicate_session_and_empty(self):
        path = self.edited(); output = self.folder/'examples.jsonl'
        with self.assertRaises(ValueError): d.export([path, path], output)
        self.assertFalse(output.exists())
        with self.assertRaises(ValueError): d.export([self.start_path], output)
        d.export([path], output)
        row = __import__('json').loads(output.read_text()); row['training_authorized'] = True
        output.write_bytes(d.encoded(row)+b'\n')
        with self.assertRaises(ValueError): d.check_export(output)

    def test_cross_ledger_arrangement_leakage(self):
        path = self.edited()
        a = d.audited(path); b = copy.deepcopy(a)
        b[0]['session_id'] = 'different-session'; b[1]['split'] = 'dev'
        b[1]['asset']['sha256'] = '0'*64
        for k in ('source_group','session_group','phrase_group','performer_group'): b[1][k] += '_other'
        with patch.object(d, 'audited', side_effect=[a,b]), self.assertRaisesRegex(ValueError, 'split leakage'):
            d.export([path,path], self.folder/'leaked.jsonl')

    def test_source_metadata_immutable(self):
        action = self.action('candidate'); action['value']['analysis']['pitch_hz'] += 1
        with self.assertRaises(ValueError): d.apply_action(self.plan, action)
        action = self.action('candidate'); action['value']['source']['consent_confirmed'] = True
        with self.assertRaises(ValueError): d.apply_action(self.plan, action)

    def test_jsonl_duplicate_keys_and_schema_types(self):
        path = self.edited(); output = self.folder/'examples.jsonl'
        d.export([path], output)
        original = output.read_text()
        output.write_text(original.replace('"training_authorized":false',
                                          '"training_authorized":true,"training_authorized":false'))
        with self.assertRaisesRegex(ValueError, 'duplicate JSON key'): d.check_export(output)
        output.write_text(original.replace('"training_authorized":false', '"training_authorized":0'))
        with self.assertRaises(ValueError): d.check_export(output)

    def test_exclusive_atomic_and_private_files(self):
        path = self.folder/'keep.json'; d.write_json(path, {'keep':True})
        original = path.read_bytes()
        with self.assertRaises(FileExistsError): d.write_json(path, {'replace':True})
        self.assertEqual(original, path.read_bytes())
        self.assertEqual(0o600, path.stat().st_mode & 0o777)
        symlink = self.folder/'link'; symlink.symlink_to(path)
        with self.assertRaises(ValueError): d.write_json(symlink, {})
        self.assertEqual([], list(self.folder.glob('.jamloom-*')))


if __name__ == '__main__':
    unittest.main(argv=[sys.argv[0]]+remaining)
