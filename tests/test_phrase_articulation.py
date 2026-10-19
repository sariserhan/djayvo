"""Controlled research checks; these do not rate musical quality."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import wave

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from phrase_articulation import articulate, prepare


def control():
    return {'strategy': 'call_response', 'sample_rate': 48000, 'time_signature': [4, 4],
            'ticks_per_quarter': 960, 'tempo_milli_bpm': 120000, 'target_bars': 16, 'seed': 4123,
            'tracks': [{'instrument': 'piano', 'events': [
                {'start_tick': bar*3840+offset, 'duration_ticks': 320, 'note': 72, 'velocity': 80}
                for bar in (5, 13) for offset in (0, 240, 960, 3360, 4320)]},
                {'instrument': 'bass', 'events': [{'start_tick': 0, 'duration_ticks': 960, 'note': 36}]}],
            'voice_clips': [{'id': 0, 'start_frame': 0, 'end_frame': 144000}],
            'voice_events': [{'start_tick': 0, 'clip_id': 0, 'clean': True, 'rate': 1}]}


class Articulation(unittest.TestCase):
    def test_only_response_durations_change_with_space_and_harmonic_boundaries(self):
        original = control()
        saved = copy.deepcopy(original)
        candidate, changes = articulate(original)
        self.assertEqual(original, saved)
        self.assertEqual(articulate(original), (candidate, changes))
        self.assertEqual([r['after_ticks'] for r in changes[:5]], [120, 480, 1440, 360, 1440])
        for row, old, new in zip(changes, original['tracks'][0]['events'], candidate['tracks'][0]['events']):
            self.assertEqual({**new, 'duration_ticks': 320}, old)
            self.assertLessEqual(new['start_tick']+new['duration_ticks'], (new['start_tick']//3840+1)*3840)
            self.assertGreater(row['end_frame'], row['start_frame'])
        candidate['tracks'][0] = original['tracks'][0]
        self.assertEqual(candidate, original)

    def test_rhythm_changes_articulation(self):
        short = control()
        longer = control()
        longer['tracks'][0]['events'][1]['start_tick'] += 240
        self.assertGreater(articulate(longer)[1][0]['after_ticks'], articulate(short)[1][0]['after_ticks'])

    def test_rejects_wrong_form_duplicate_attacks_and_already_modified_score(self):
        for key, value in [('strategy', 'club'), ('target_bars', 12), ('time_signature', [3, 4]),
                           ('tempo_milli_bpm', 0), ('tempo_changes', [{'start_tick': 960}])]:
            plan = control(); plan[key] = value
            with self.assertRaises(ValueError): articulate(plan)
        plan = control(); plan['tracks'][0]['events'][1]['start_tick'] = 5*3840
        with self.assertRaises(ValueError): articulate(plan)
        plan = articulate(control())[0]
        with self.assertRaises(ValueError): articulate(plan)

    def test_voice_and_eighty_ms_margin_protected(self):
        for tick in (5*3840, 5*3840+240):
            plan = control(); plan['voice_events'][0]['start_tick'] = tick
            with self.assertRaises(ValueError): articulate(plan)
        plan = control(); plan['voice_events'][0]['echo_ticks'] = 480
        with self.assertRaises(ValueError): articulate(plan)

    def test_consent_provenance_existing_outputs_and_failure_marker(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); source, score, out = (root/p for p in ('source.wav', 'score.json', 'out'))
            pcm = (3000*np.sin(np.arange(144000)*2*np.pi*220/48000)).astype('<i2')
            with wave.open(str(source), 'wb') as f:
                f.setparams((1, 2, 48000, 144000, 'NONE', 'not compressed')); f.writeframes(pcm.tobytes())
            plan = control()
            plan['source'] = {'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                              'kind': 'recorded', 'consent_confirmed': True, 'processed_frames': 144000}
            score.write_text(json.dumps(plan))
            with self.assertRaises(ValueError): prepare(Path('unused'), source, score, out)
            self.assertFalse(out.exists())
            plan['source']['sha256'] = 'wrong'; score.write_text(json.dumps(plan))
            with self.assertRaises(ValueError): prepare(Path('unused'), source, score, out, True)
            self.assertFalse(out.exists())
            plan['source']['sha256'] = hashlib.sha256(source.read_bytes()).hexdigest(); score.write_text(json.dumps(plan))
            with patch('phrase_articulation.subprocess.run', side_effect=OSError('test renderer failure')):
                with self.assertRaises(OSError): prepare(Path('unused'), source, score, out, True)
            self.assertTrue((out/'.partial').exists())
            self.assertFalse((out/'articulation.json').exists())
            with self.assertRaises(ValueError): prepare(Path('unused'), source, score, out, True)


if __name__ == '__main__':
    unittest.main()
