import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from song_duration import LIMITS, choose_duration, validate_duration

class DurationTests(unittest.TestCase):
    def test_variety_bounds_and_reproducibility(self):
        for product,bounds in LIMITS.items():
            lengths=[choose_duration(product,seed) for seed in range(1000)]
            self.assertEqual(min(lengths),bounds['min'])
            self.assertEqual(max(lengths),bounds['max'])
            self.assertEqual(len(set(lengths)),bounds['max']-bounds['min']+1)
            self.assertEqual(lengths,[choose_duration(product,seed) for seed in range(1000)])
            for seconds in (bounds['min'],bounds['max'],bounds['legacy']):
                self.assertEqual(choose_duration(product,7,seconds),seconds)
            for seconds in (True,None,float('nan'),bounds['min']-1,bounds['max']+1):
                with self.assertRaises(ValueError):validate_duration(product,seconds)

    def test_style_windows_fit_shortest_and_longest_song(self):
        import numpy as np
        from unittest.mock import patch
        from check_dna_audio import score_audio
        for seconds in (100,140):
            mono=(.1*np.sin(np.arange(seconds*48000)*.02)).astype('float32')
            pcm=np.repeat(mono[:,None],2,axis=1)
            with patch('soundfile.read',return_value=(pcm,48000)),patch('check_dna_audio.score_windows',return_value='checked') as score:
                self.assertEqual(score_audio('fixture',auditor='fixture'),'checked')
                windows=score.call_args.args[0]
                self.assertEqual(len(windows),4)
                self.assertTrue(all(w.shape==(480000,) for w in windows))
                self.assertTrue(all(np.max(abs(w))>.09 for w in windows))
