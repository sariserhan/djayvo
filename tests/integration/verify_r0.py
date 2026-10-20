#!/usr/bin/env python3
"""R0 negative-boundary and replay tests; requires a completed local R0 example run."""
import argparse
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts'))
import r0
from jsonschema import ValidationError

parser = argparse.ArgumentParser()
parser.add_argument('--examples',type=Path,default=ROOT/'renders/r0-final-evaluation')
parser.add_argument('--manifest',type=Path,default=ROOT/'renders/r0-final-fixtures/manifest.json')
parser.add_argument('--renderer',type=Path,default=ROOT/'build-jamloom/jamloom_remix')
args, remaining = parser.parse_known_args()

class R0(unittest.TestCase):
    def setUp(self):
        self.manifest = r0.load(args.manifest)
        self.plan = r0.load(args.examples/'hiphop.plan.json')

    def test_five_original_records(self):
        self.assertEqual(5,len(r0.validate_dataset(self.manifest)))

    def test_fail_closed_rights(self):
        mutations = [lambda r:r.update(training_opt_in=True),lambda r:r.update(withdrawn=True),
            lambda r:r.update(allowed_uses=['training']),lambda r:r.pop('voice_consent'),
            lambda r:r.update(identifiable_people=True),lambda r:r.update(origin='youtube'),
            lambda r:r['retention'].update(expires_on='2020-01-01'),
            lambda r:r['asset'].update(sha256='0'*64),lambda r:r['authorization'].update(sha256='0'*64),
            lambda r:r['asset'].update(path='../private.wav'),lambda r:r.update(voice_consent='assumed')]
        for mutation in mutations:
            value = copy.deepcopy(self.manifest)
            mutation(value['records'][0])
            with self.subTest(mutation=mutations.index(mutation)), self.assertRaises((ValueError,ValidationError)):
                r0.validate_dataset(value)
        with self.assertRaises(ValueError): r0.validate_dataset(self.manifest,'training')
        with self.assertRaises(ValueError): r0.validate_dataset(self.manifest,'distribution')

    def test_duplicate_and_split_leakage(self):
        self.manifest['records'].append(copy.deepcopy(self.manifest['records'][0]))
        with self.assertRaises(ValueError): r0.validate_dataset(self.manifest)
        self.manifest['records'].pop()
        self.manifest['records'][1]['session_group'] = self.manifest['records'][0]['session_group']
        self.manifest['records'][1]['split'] = 'train'
        with self.assertRaises(ValueError): r0.validate_dataset(self.manifest)

    def test_synthetic_claim_requires_matching_signal(self):
        self.manifest['records'][1]['id'] = 'r0_glide'
        with self.assertRaises(ValueError): r0.validate_dataset(self.manifest)

    def test_json_duplicate_nonfinite_unknown(self):
        with tempfile.TemporaryDirectory() as d:
            for value in ('{"x":1,"x":2}','{"x":NaN}'):
                path=Path(d)/'bad.json'; path.write_text(value)
                with self.assertRaises(ValueError): r0.load(path)
        self.plan['unexpected'] = True
        with self.assertRaises(ValidationError): r0.validate_plan(self.plan,args.manifest,args.renderer)

    def test_plan_policy_mutations(self):
        mutations = [lambda p:p.update(schema_version='99'),lambda p:p['session'].update(dataset_sha256='0'*64),
            lambda p:p['execution'].update(source_asset_id='sha256:'+'0'*64),
            lambda p:p['source_audio'].update(channels=2),lambda p:p['instruments'][0].update(midi_range=[0,127]),
            lambda p:p['instruments'][0]['license_manifest'].update(sha256='0'*64),
            lambda p:p['constraints'].update(instrument_voices=999),
            lambda p:p['provenance'].update(engine_sha256='0'*64),
            lambda p:p['session'].update(controller_priority='ai_override'),
            lambda p:p['execution']['tracks'][0].update(instrument='external_sample')]
        for i, mutation in enumerate(mutations):
            value=copy.deepcopy(self.plan); mutation(value)
            with self.subTest(case=i), self.assertRaises((ValueError,ValidationError,KeyError)):
                r0.validate_plan(value,args.manifest,args.renderer)

    def test_native_rejects_unschedulable_and_conflicting_actions(self):
        def conflicts(p):
            t=p['execution']['tracks'][0]
            point={'start_tick':0,'gain_db':t['gain_db'],'pan':t['pan']}
            t['automation']=[point,point]
            p['execution']['schema_version']='1.7-remix'
        mutations=[lambda p:p['execution']['voice_clips'][0].update(end_frame=9999999),
                   lambda p:p['execution']['voice_events'][0].update(start_tick=9999999),
                   lambda p:p['execution']['tracks'][0]['events'][0].update(duration_ticks=999999),
                   lambda p:p['execution']['tracks'][0].update(events=[p['execution']['tracks'][0]['events'][0]]*129),
                   conflicts]
        for i, mutation in enumerate(mutations):
            value=copy.deepcopy(self.plan); mutation(value)
            with tempfile.TemporaryDirectory() as d, self.subTest(case=i):
                prefix=Path(d)/'rejected'
                with self.assertRaises((ValueError,ValidationError)):
                    r0.replay(value,args.manifest,args.renderer,prefix)
                self.assertFalse(Path(str(prefix)+'.complete.json').exists())

    def test_structural_not_seed_novelty(self):
        other=copy.deepcopy(self.plan)
        other['execution']['seed']+=1
        self.assertFalse(r0.compare(self.plan,other)['meaningful_structural_variation'])
        for style in ('reggae','experimental'):
            self.assertTrue(r0.compare(self.plan,r0.load(args.examples/f'{style}.plan.json'))['meaningful_structural_variation'])

    def test_three_verified_native_replays(self):
        report=r0.load(args.examples/'evaluation.json')
        self.assertEqual(0,report['human_sample_size'])
        for style in r0.STYLES:
            r0.validate_plan(r0.load(args.examples/f'{style}.plan.json'),args.manifest,args.renderer)
            self.assertTrue(report['renders'][style]['exact_pcm'])
            self.assertTrue(report['renders'][style]['event_frame_agreement'])
            r0.verify_export(args.examples/f'replay-{style}',(style,))

    def test_absolute_event_frames_and_order(self):
        import csv
        from fractions import Fraction
        for style in r0.STYLES:
            execution = r0.load(args.examples/f'{style}.plan.json')['execution']
            self.assertFalse(execution.get('tempo_changes'))
            expected, note_id = [], 0
            for track in execution['tracks']:
                for event in track['events']:
                    for kind, tick in (('on', event['start_tick']), ('off', event['start_tick']+event['duration_ticks'])):
                        exact = Fraction(tick*execution['sample_rate']*60000, 960*execution['tempo_milli_bpm'])
                        frame = (exact.numerator*2+exact.denominator)//(2*exact.denominator)
                        expected.append((frame, kind, note_id, track['instrument'], event['note']))
                    note_id += 1
            expected.sort(key=lambda e:(e[0], e[1]=='on', e[2]))
            with (args.examples/f'rules.{style}.events.tsv').open() as f:
                actual=[(int(r['frame']),r['kind'],int(r['id']),r['instrument'],int(r['pitch']))
                        for r in csv.DictReader(f,delimiter='\t')]
            self.assertEqual(expected,actual)

    def test_taxonomy_examples(self):
        taxonomy=r0.load(ROOT/'techniques.yaml') # JSON is a strict YAML 1.2 subset.
        self.assertGreaterEqual(len(taxonomy['techniques']),30)
        self.assertEqual(len(taxonomy['techniques']),len({t['id'] for t in taxonomy['techniques']}))
        for row in taxonomy['techniques']:
            for field in ('parameters','use_when','failure_modes','engine_actions','audio_examples'):
                self.assertTrue(row[field])
            for example in row['audio_examples']:
                path=r0.local(example['path'])
                import wave
                with wave.open(str(path),'rb') as f:
                    self.assertTrue(0 <= example['start_seconds'] < example['end_seconds'] <= f.getnframes()/f.getframerate())

if __name__=='__main__':
    unittest.main(argv=[sys.argv[0],*remaining],verbosity=2)
