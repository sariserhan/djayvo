import sys
from importlib.util import find_spec
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from check_dna_audio import POLICY, assess, score_windows, apply_style_review
from dna_direction import direction_for

class DnaAudio(unittest.TestCase):
    @unittest.skipUnless(find_spec('numpy') and find_spec('torch'),'Audio-array checks require the inference environment')
    def test_audio_passages_reject_short_or_nonfinite_samples_before_inference(self):
        import numpy as np
        good=np.zeros(480000,dtype=np.float32)
        bad=good.copy();bad[0]=np.nan
        for windows in ([],[good]*3,[good,good,good,good[:-1]],[good,good,good,bad]):
            with self.assertRaises(ValueError):score_windows(windows,None)

    def test_broad_mismatch_and_nonfinite_evidence_fail_closed(self):
        ids = [d['id'] for d in POLICY['directions']] + ['soft-ballad','speech']
        row = [.3]*len(ids);row[ids.index('heavy-rock')] = .55
        self.assertTrue(assess([row]*4, 'heavy-rock')['accepted'])
        self.assertFalse(assess([row]*4, 'pop')['accepted'])
        parent = row.copy();parent[ids.index('rock')] = .7
        self.assertTrue(assess([parent]*4, 'heavy-rock')['accepted'])
        parent[ids.index('heavy-rock')] = .35;parent[ids.index('pop')] = .6
        self.assertFalse(assess([parent]*4, 'heavy-rock')['accepted'])
        bad = row.copy();bad[ids.index('soft-ballad')] = .7
        self.assertFalse(assess([row,row,bad,bad], 'heavy-rock')['accepted'])
        self.assertFalse(assess([[.1]*len(ids)]*4, 'heavy-rock')['accepted'])
        for scores in ([], [[float('nan')]*len(ids)]*4, [[.3]]*4):
            with self.assertRaises(ValueError):assess(scores, 'heavy-rock')

    def test_explicit_human_style_review_only_applies_to_identical_audio_and_style(self):
        import json
        root=Path(__file__).resolve().parents[1]
        reviewed=json.loads((root/'assets/manifests/dna-style-reviews.json').read_text())['reviews'][0]
        owner=json.loads((root/'docs/evidence/song-validation/owner-listening.json').read_text())['germanJazzBackingReview']
        self.assertEqual(reviewed['audio_sha256'],owner['audioSha256'])
        self.assertEqual(reviewed['statement'],owner['statement'])
        report={'accepted':False,'target':'jazz','audio_sha256':reviewed['audio_sha256'],'limit':'Automated check','matching_windows':0}
        result=apply_style_review(report)
        self.assertTrue(result['accepted']);self.assertFalse(result['automated_accepted']);self.assertEqual(result['matching_windows'],0)
        for changed in ({'target':'rock'},{'audio_sha256':'0'*64}):
            self.assertFalse(apply_style_review({**report,**changed})['accepted'])

    def test_catalogue_direction_uses_whole_list_and_not_order(self):
        refs = [{'reference': str(i), 'catalogue_genre': genre} for i,genre in enumerate(['Alternative','Hard Rock','Metal'])]
        result = direction_for(refs)
        self.assertEqual(result['id'], 'heavy-rock')
        self.assertEqual(direction_for(list(reversed(refs))), result)
        self.assertEqual(direction_for([{'reference':'x','catalogue_genre':'Rhythm and Blues'}])['id'], 'soul')
        self.assertEqual(direction_for([{'reference':'x','catalogue_genre':'Reggaeton'}])['id'], 'reggaeton')
        for genre,target in [('Dubstep','dance'),('Hardcore Dance','dance'),('Hard Rock','heavy-rock'),('Post-hardcore','heavy-rock'),('Dub','reggae')]:
            self.assertEqual(direction_for([{'reference':'x','catalogue_genre':genre}])['id'],target)
        with self.assertRaises(ValueError):direction_for([{'reference':'Unknown'}])

if __name__ == '__main__':unittest.main()
