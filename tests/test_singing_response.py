import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from singing_response import CODE_REVISION, WEIGHT_REVISION, STYLES, STYLE_LABELS, VOCAL_PROFILES, choose_vocal_profile, vocal_description, generated_vocal_reference, digest, caption, load_plan, validate_plan, variants
from assemble_sung_response import PATTERNS


class SingingPlans(unittest.TestCase):
    def test_reference_research_requires_bound_unconditioned_synthetic_audio(self):
        with tempfile.TemporaryDirectory() as folder,patch('singing_response.ROOT',Path(folder).resolve()),patch('arrange_voice_research.read_pcm') as pcm:
            root=Path(folder).resolve()/'renders'/'original';root.mkdir(parents=True)
            (root/'singer.wav').write_bytes(b'fixture bytes; decoder is mocked')
            receipt={'technical':'PASS','model_code':CODE_REVISION,'weights':WEIGHT_REVISION,'source_conditioning':None,'trained_adapter':False,'case':{'duration':30,'voice':'male'},'audio_sha256':digest(root/'singer.wav')}
            (root/'complete.json').write_text(json.dumps(receipt))
            result=generated_vocal_reference(root);self.assertEqual(result['sha256'],receipt['audio_sha256']);pcm.assert_called_once_with(root/'singer.wav',(30,30))
            for field,value in [('audio_sha256','wrong'),('weights','unverified'),('source_conditioning',{'audio':'private'}),('vocal_reference',{'audio':'another'}),('trained_adapter',True)]:
                (root/'complete.json').write_text(json.dumps({**receipt,field:value}))
                with self.assertRaises(ValueError):generated_vocal_reference(root)
            with self.assertRaises(ValueError):generated_vocal_reference(Path(folder)/'private')

    def test_vocal_cast_varies_without_changing_language_or_requested_gender(self):
        selected={choose_vocal_profile(seed) for seed in range(100)}
        self.assertEqual(selected,set(VOCAL_PROFILES))
        for voice in ('female','male'):
            for seed in range(100):
                profile=choose_vocal_profile(seed,voice)
                self.assertEqual(VOCAL_PROFILES[profile][0],voice)
                self.assertEqual(profile,choose_vocal_profile(seed,voice))
        for c in variants(42):
            description=caption(c)
            self.assertLess(len(description),512)
            self.assertIn(VOCAL_PROFILES[c['vocal_profile']][1],description)
            self.assertIn('no robotic effects',description)
            self.assertIn('no speech narration',description)
        for profile in ('celebrity',[], 'female-alto'):
            with self.assertRaises(ValueError):vocal_description({'voice':'male','vocal_profile':profile})
        with self.assertRaises(ValueError):choose_vocal_profile(True)
        legacy={'genre':'jazz','voice':'female'}
        self.assertIn('adult female soul singer',caption(legacy))

    def plan(self):
        cases = variants(42)[:4]
        for c in cases:
            c['lyrics'] = '[Verse]\nYou have a question, I wanna know\nLet it out and let the rhythm flow'
        return {'schema': 'jamloom-sung-response-1', 'model_code': CODE_REVISION,
                'weights': WEIGHT_REVISION, 'phrase': 'I have a question', 'cases': cases}

    def test_voices_and_styles_are_independent_and_repeatable(self):
        cases = variants(42)
        self.assertEqual(cases, variants(42))
        self.assertEqual({(c['genre'], c['voice']) for c in cases},
                         {(genre,voice) for genre in STYLES for voice in ('male','female')})
        self.assertEqual(len(STYLES),23)
        self.assertEqual(set(STYLE_LABELS),set(STYLES))
        self.assertEqual(set(PATTERNS),set(STYLES))
        self.assertTrue({'EDM','DJ','Lo-fi','Jazz','Blues','Rap','Chill','Indie','Techno','Synthwave','Country'} <= set(STYLE_LABELS.values()))
        self.assertTrue(all(60 <= bpm <= 180 for bpm,_ in STYLES.values()))
        self.assertTrue(all(tuple(sorted(p)) == p and 0 <= min(p) < max(p) <= 5.5 for p in PATTERNS.values()))
        self.assertEqual(len({c['seed'] for c in cases}), 46)
        self.assertEqual({c['source_repetitions'] for c in cases}, {1, 2})
        self.assertTrue(all('singer' in caption(c) and 'no speech narration' in caption(c) for c in cases))
        for c in cases:
            c['lyrics']=self.plan()['cases'][0]['lyrics']
            p=self.plan();p['cases']=[c];validate_plan(p)

    def test_rap_delivery_differs_from_sung_hiphop(self):
        rap = caption({'genre':'rap','voice':'female'})
        hiphop = caption({'genre':'hiphop','voice':'female'})
        self.assertIn('rhythmic rap verses',rap)
        self.assertIn('short sung hook',rap)
        self.assertNotIn('connected legato phrases',rap)
        self.assertIn('connected legato phrases',hiphop)
        self.assertIn('no robotic effects',rap)

    def test_invalid_or_unbounded_plan_rejected(self):
        validate_plan(self.plan())
        for value in (None, [], 'invalid'):
            with self.assertRaises(ValueError): validate_plan(value)
            p = self.plan(); p['cases'] = [value]
            with self.assertRaises(ValueError): validate_plan(p)
        for field, value in [('id', '../outside'), ('voice', 'celebrity'), ('genre', 'unknown'),
                             ('seed', True), ('duration', float('nan')), ('bpm', 0),
                             ('source_repetitions', True), ('lyrics', '[Instrumental]'),
                             ('lyrics', 'word ' * 86), ('lyrics', 'bad\x00text')]:
            with self.subTest(field=field, value=value):
                p = self.plan(); p['cases'][0][field] = value
                with self.assertRaises(ValueError): validate_plan(p)
        p = self.plan(); p['cases'].append(copy.deepcopy(p['cases'][0]))
        with self.assertRaises(ValueError): validate_plan(p)
        for value in ('', 'x'*32001, None):
            p = self.plan(); p['phrase'] = value
            with self.assertRaises(ValueError): validate_plan(p)

    def test_revision_and_size_checks(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'plan.json'
            p.write_text(json.dumps(self.plan()))
            self.assertEqual(load_plan(p), self.plan())
            value = self.plan(); value['weights'] = 'main'
            with self.assertRaises(ValueError): validate_plan(value)
            p.write_text(' ' * 262145)
            with self.assertRaises(ValueError): load_plan(p)


if __name__ == '__main__':
    unittest.main()
