import importlib.util
import json
from pathlib import Path
import tempfile
import subprocess
import wave
from array import array
import unittest

spec = importlib.util.spec_from_file_location('candidates', Path(__file__).resolve().parents[1] / 'scripts/prepare_style_candidates.py')
candidates = importlib.util.module_from_spec(spec)
spec.loader.exec_module(candidates)


class CandidateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.ledger = self.root / 'permissions.json'
        self.output = self.root / 'output'
        self.data = {'training_permission': 'owner_confirmed', 'sources': [
            {'id': name, 'filename': name + '.mp3', 'sha256': '0' * 64,
             'split': 'holdout_candidate' if name == 'z' else 'train_candidate'} for name in 'xyz']}

    def reject(self, message):
        self.ledger.write_text(json.dumps(self.data))
        with self.assertRaisesRegex(ValueError, message):
            candidates.prepare(self.ledger, self.root, self.output)
        self.assertFalse(self.output.exists())

    def test_nonoverlapping_bounded_windows(self):
        for duration in (190, 625.408, 667.179, 764.651, 3600):
            starts = candidates.windows(duration)
            self.assertEqual(len(starts), 6)
            self.assertTrue(all(a + 30 <= b for a, b in zip(starts, starts[1:])))
            self.assertGreaterEqual(starts[0], 0)
            self.assertLessEqual(starts[-1] + 30, duration)

    def test_invalid_duration(self):
        for duration in (0, 189, 3601, float('nan'), float('inf')):
            with self.assertRaises(ValueError):
                candidates.windows(duration)

    def test_missing_permission(self):
        self.data['training_permission'] = None
        self.reject('permission')

    def test_changed_source(self):
        (self.root / 'x.mp3').write_bytes(b'changed')
        self.reject('differs')

    def test_path_escape(self):
        self.data['sources'][0]['filename'] = '../x.mp3'
        self.reject('filename')

    def test_split_change(self):
        self.data['sources'][0]['split'] = 'holdout_candidate'
        self.reject('split')

    def test_preserve_existing_output(self):
        self.output.mkdir()
        marker = self.output / 'recording.wav'
        marker.write_bytes(b'preserve')
        with self.assertRaisesRegex(ValueError, 'fresh'):
            candidates.prepare(self.ledger, self.root, self.output)
        self.assertEqual(marker.read_bytes(), b'preserve')

    def test_float_overshoot_is_attenuated_before_pcm_conversion(self):
        source = self.root / 'overshoot.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                        'aevalsrc=1.5*sin(2*PI*440*t):s=48000:d=30',
                        '-c:a', 'pcm_f32le', str(source)], check=True)
        output = self.root / 'headroom.wav'
        candidates.extract(source, 0, output)
        with wave.open(str(output), 'rb') as wav:
            pcm = array('h', wav.readframes(wav.getnframes()))
        self.assertLess(max(pcm), 26000)
        self.assertGreater(max(pcm), 17000)


if __name__ == '__main__':
    unittest.main()
