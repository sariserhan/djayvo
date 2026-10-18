import hashlib
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import wave

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import check_style_overlap as overlap


class WaveformOverlap(unittest.TestCase):
    def test_calibration_and_direct_agreement(self):
        self.assertEqual(overlap.calibration()['status'], 'PASS')

    def test_decoded_audio_and_corruption(self):
        rng = np.random.default_rng(7)
        source = rng.integers(-5000, 5000, 30 * overlap.RATE, dtype=np.int16)
        target = rng.integers(-5000, 5000, len(source), dtype=np.int16)
        offset = 7 * overlap.RATE + 1000
        target[offset:offset + 4 * overlap.RATE] = -source[:4 * overlap.RATE]
        with tempfile.TemporaryDirectory() as directory:
            decoded = []
            for name, data in [('source', source), ('target', target)]:
                path = Path(directory) / f'{name}.wav'
                with wave.open(str(path), 'wb') as wav:
                    wav.setparams((1, 2, overlap.RATE, 0, 'NONE', 'not compressed'))
                    wav.writeframes(data.astype('<i2').tobytes())
                sha = overlap.digest(path)
                decoded.append(overlap.decode(path, sha))
                with self.assertRaisesRegex(ValueError, 'Checksum mismatch'):
                    overlap.decode(path, '0' * 64)
            result = overlap.best_match(decoded[0][overlap.RATE:3 * overlap.RATE], decoded[1])
            self.assertGreater(result['correlation'], .999999)
            self.assertEqual(result['target_seconds'], 8.25)
            invalid = Path(directory) / 'invalid.wav'
            invalid.write_bytes(b'not audio')
            with self.assertRaises(subprocess.CalledProcessError):
                overlap.decode(invalid, overlap.digest(invalid))

    def test_existing_evidence_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'evidence.json'
            path.write_text('existing evidence\n')
            before = hashlib.sha256(path.read_bytes()).hexdigest()
            result = subprocess.run([sys.executable, str(Path(overlap.__file__)), '--output', str(path)],
                                    capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('Output exists', result.stderr)
            self.assertEqual(overlap.digest(path), before)


if __name__ == '__main__':
    unittest.main()
