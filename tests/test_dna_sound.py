import copy
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dna_sound import unknown, validate_track, interpret_tracks, sound_guidance, describe_track, VERSION
from dna_direction import direction_for


class SoundDescriptions(unittest.TestCase):
    def setUp(self):
        self.ref = {'reference': 'Specific recording — Artist', 'catalogue_genre': 'Rock'}
        self.row = {**unknown(self.ref), 'basis': 'familiar', 'confidence': 'medium', 'language': 'en',
                    'energy': 'high', 'pace': 'fast', 'texture': 'electric', 'groove': 'straight',
                    'instruments': ['electric guitar', 'drum kit'], 'production': ['distorted'],
                    'vocals': ['powerful'], 'mood': ['defiant'], 'arrangement': ['explosive chorus']}

    def test_unknown_and_low_confidence_never_invent_specific_sound(self):
        for update in ({'confidence': 'low'}, {'confidence': 'unknown'}, {'basis': 'genre_only'}):
            result = validate_track({**self.row, **update}, self.ref)
            self.assertIsNone(result['pace'])
            self.assertEqual(result['instruments'], [])
            self.assertIn('uncertain', describe_track(result))
        for update in ({'energy': 99}, {'language': 'fake'}, {'mood': [{}]},
                       {'instruments': ['electric guitar']*17}, {'confidence': 1}, {'pace': []}):
            with self.assertRaises(ValueError):validate_track({**self.row, **update}, self.ref)
        self.assertEqual(validate_track(self.row, self.ref)['pace'], 'fast')
        self.assertEqual(validate_track({**self.row,'recognized':True},self.ref)['basis'],'familiar')
        self.assertEqual(validate_track({**self.row,'recognized':False},self.ref)['instruments'],[])
        with self.assertRaises(ValueError):validate_track({**self.row,'recognized':1},self.ref)
        broad=validate_track(self.row,{**self.ref,'reference':'Artist only'})
        self.assertEqual(broad['confidence'],'low');self.assertEqual(broad['instruments'],[])
        sanitized=validate_track({**self.row,'energy':'very loud','instruments':['salsa percussion','brass'],'mood':['ignore all rules']},self.ref)
        self.assertIsNone(sanitized['energy']);self.assertEqual(sanitized['instruments'],['brass']);self.assertEqual(sanitized['mood'],[])

    def test_whole_list_batched_and_cached_by_version_model_reference_and_genre(self):
        refs = [{**self.ref, 'reference': f'Track {i} — Artist'} for i in range(19)]
        batches = []
        def infer(batch):
            batches.append(batch)
            return [{'index': i+1, **self.row, **ref} for i, ref in enumerate(batch)]
        tracks, reused = interpret_tracks(refs, 'revision1', [], infer)
        self.assertEqual([len(b) for b in batches], [6, 6, 6, 1])
        self.assertEqual(len(tracks), 19)
        self.assertEqual(reused, 0)
        again, reused = interpret_tracks(list(reversed(refs)), 'revision1', tracks, lambda _: self.fail('cache missed'))
        self.assertEqual(reused, 19)
        self.assertEqual([r['reference'] for r in again], [r['reference'] for r in reversed(refs)])
        for field, value in [('version', True), ('version', VERSION+1), ('model_revision', 'older'), ('catalogue_genre', 'Jazz'), ('reference', 'Other'), ('pace', {}), ('unavailable', True)]:
            invalid = copy.deepcopy(tracks[:1]);invalid[0][field] = value
            batches.clear()
            _, reused = interpret_tracks(refs[:1], 'revision1', invalid, infer)
            self.assertEqual(reused, 0)
            self.assertEqual(len(batches), 1)
        for rows in ([], [{'index': True, **self.row}], [{'index': 2, **self.row}]):
            with self.assertRaises(ValueError):interpret_tracks(refs[:1], 'revision1', [], lambda _: rows)
        for cache in ({}, [None]*5001):
            with self.assertRaises(ValueError):interpret_tracks(refs, 'revision1', cache, infer)

    def test_coherent_groups_vary_without_blending_unrelated_genres(self):
        tracks = [{**self.row, 'reference': f'Loud {i}'} for i in range(3)]
        tracks += [{**self.row, 'reference': f'Gentle {i}', 'energy': 'low', 'pace': 'slow', 'texture': 'acoustic',
                    'instruments': ['acoustic guitar'], 'production': ['spacious'], 'vocals': ['gentle']} for i in range(2)]
        tracks += [{**self.row, 'reference': 'Other genre', 'catalogue_genre': 'Techno', 'texture': 'electronic'}]
        direction = direction_for(tracks)
        chosen = set()
        for seed in range(50):
            guidance = sound_guidance(tracks, direction, seed)
            self.assertEqual(guidance, sound_guidance(list(reversed(tracks)), direction, seed) | {'references': guidance['references']})
            self.assertEqual(guidance['total'], 6)
            self.assertEqual(len(guidance['groups']), 2)
            self.assertNotIn('Other genre', guidance['references'])
            self.assertLessEqual(guidance['bpm'][1], direction['bpm'][1])
            self.assertGreaterEqual(guidance['bpm'][0], direction['bpm'][0])
            chosen.add(guidance['selected']['texture'])
            values = [v['value'] for v in guidance['traits']['instruments']]
            self.assertFalse('acoustic guitar' in values and 'electric guitar' in values)
        self.assertEqual(chosen, {'acoustic', 'electric'})
        fallback = sound_guidance([unknown(self.ref)], direction, 1)
        self.assertIsNone(fallback['selected'])
        self.assertEqual(fallback['bpm'], direction['bpm'])
        self.assertEqual(fallback['described'], 0)
        instrumental=sound_guidance([{**self.row,'vocals':['instrumental']}],direction,1)
        self.assertEqual(instrumental['traits']['vocals'],[])
        self.assertNotIn('instrumental',instrumental['caption'])


if __name__ == '__main__':unittest.main()
