import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from singing_response import CODE_REVISION, WEIGHT_REVISION, STYLES, STYLE_LABELS, caption, load_plan, validate_plan, variants
from assemble_sung_response import PATTERNS


class SingingPlans(unittest.TestCase):
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
        for value in ('', 'x'*241, None):
            p = self.plan(); p['phrase'] = value
            with self.assertRaises(ValueError): validate_plan(p)

    def test_revision_and_size_checks(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'plan.json'
            p.write_text(json.dumps(self.plan()))
            self.assertEqual(load_plan(p), self.plan())
            value = self.plan(); value['weights'] = 'main'
            with self.assertRaises(ValueError): validate_plan(value)
            p.write_text(' ' * 32769)
            with self.assertRaises(ValueError): load_plan(p)


if __name__ == '__main__':
    unittest.main()
