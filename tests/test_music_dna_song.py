import copy
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from music_dna_song import favorites, song_plan, parse_draft
from singing_response import caption


class MusicDnaSong(unittest.TestCase):
    def setUp(self):
        self.refs = favorites({'references': ['A — Artist One', 'B — Artist Two'],
                               'referenceMetadata': [{'reference': 'A — Artist One', 'genre': 'Soul'}]})
        self.data = {'title': 'A new day', 'summary': 'A warm, intimate direction, based partly on genre.',
                     'influences': [{'index': 1, 'basis': 'genre_only', 'description': 'Warm soul harmony'},
                                    {'index': 2, 'basis': 'unknown', 'description': 'Unknown recording'}],
                     'sound': 'Live brushed drums, warm piano and an expressive vocal crescendo',
                     'genre': 'soul', 'voice': 'female', 'bpm': 94,
                     'lyrics': '\n'.join('['+s+']\n'+'New days bring us closer to the light\n'*4
                                         for s in ['Verse 1', 'Chorus', 'Verse 2', 'Bridge', 'Chorus', 'Outro'])}

    def test_full_song_uses_traits_and_all_favorites_without_sampling(self):
        plan = song_plan(self.data, self.refs, 123)
        case = plan['cases'][0]
        self.assertEqual(case['duration'], 120)
        self.assertEqual(case['bpm'], 94)
        self.assertEqual([n['reference'] for n in plan['influences']], [r['reference'] for r in self.refs])
        self.assertIn(self.data['sound'], caption(case))
        self.assertNotIn('Artist One', caption(case))
        self.assertNotIn('source_audio', plan)

    def test_rejects_missing_evidence_unbounded_plans_and_unknown_only_lists(self):
        for field, value in [('influences', []), ('bpm', True), ('bpm', 190), ('voice', 'celebrity'),
                             ('sound', 'Clone Artist One'), ('lyrics', '[Instrumental]'),
                             ('lyrics', 'word '*110), ('lyrics', 'word '*400), ('title', '\x00bad')]:
            with self.subTest(field=field):
                data = copy.deepcopy(self.data);data[field] = value
                with self.assertRaises(ValueError):song_plan(data, self.refs, 1)
        for note in self.data['influences']:note['basis'] = 'unknown'
        with self.assertRaisesRegex(ValueError, 'Could not recognize'):song_plan(self.data, self.refs, 1)

    def test_metadata_must_belong_to_favorites_and_cannot_invent_genre(self):
        with self.assertRaises(ValueError):favorites({'references': ['hello'], 'referenceMetadata': [{'reference': 'other', 'genre': 'Jazz'}]})
        self.data['influences'][1]['basis'] = 'genre_only'
        with self.assertRaisesRegex(ValueError, 'needs a genre'):song_plan(self.data, self.refs, 1)
        for value in (None, {}, {'references': []}, {'references': ['x'*161]}):
            with self.assertRaises(ValueError):favorites(value)

    def test_formatting_recovery_and_styles_beyond_the_reply_catalogue(self):
        self.assertEqual(parse_draft('```json\n{"title":"Test"}\n```'), {'title': 'Test'})
        self.assertEqual(parse_draft('{"title":"Test"}"}'), {'title': 'Test'})
        with self.assertRaises(ValueError):parse_draft('{"title":"Test"} unrelated extra prose')
        with self.assertRaises(ValueError):parse_draft('{"title":')
        self.data['genre'] = 'electronic'
        self.assertEqual(song_plan(self.data, self.refs, 1)['cases'][0]['genre'], 'electronic')
        self.data['genre'] = '../../outside'
        with self.assertRaises(ValueError):song_plan(self.data, self.refs, 1)


if __name__ == '__main__':unittest.main()
