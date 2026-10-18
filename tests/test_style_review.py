import array
import hashlib
import json
import math
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import review_style_trial as review


class ReviewFlow(unittest.TestCase):
    def test_verified_pairs_matching_and_preservation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            results = root / 'results'
            results.mkdir()
            (root / 'docs/evidence/style-training').mkdir(parents=True)
            cases = []
            for mode, frequency in [('base', 220), ('adapter', 330)]:
                samples = array.array('h', (int(6000 * math.sin(2 * math.pi * frequency * i / 48000))
                                           for i in range(48000)))
                stereo = array.array('h', (sample for value in samples for sample in (value, value)))
                if sys.byteorder != 'little':
                    stereo.byteswap()
                for name in ('bass-a', 'bass-b', 'funk', 'hiphop'):
                    path = results / f'{mode}-{name}.wav'
                    with wave.open(str(path), 'wb') as wav:
                        wav.setparams((2, 2, 48000, 0, 'NONE', 'not compressed'))
                        for _ in range(30):
                            wav.writeframes(stereo.tobytes())
                    cases.append({'mode': mode, 'name': name, 'file': path.name,
                                  'caption': '<synthetic & test>', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
            repeated = results / 'base-repeat-bass-a.wav'
            repeated.write_bytes((results / 'base-bass-a.wav').read_bytes())
            report = {'cases': cases, 'repeat_control': {'file': repeated.name,
                      'sha256': hashlib.sha256(repeated.read_bytes()).hexdigest()}}
            (results / 'comparison.json').write_text(json.dumps(report))
            previous = Path.cwd()
            try:
                os.chdir(root)
                with patch.object(review, 'ROOT', results):
                    review.main()
                    page = (root / 'review/index.html').read_text()
                    self.assertEqual(page.count('<audio '), 8)
                    self.assertIn('&lt;synthetic &amp; test&gt;', page)
                    self.assertNotIn('base-bass', page)
                    self.assertNotIn('adapter-bass', page)
                    measured = json.loads((root / 'docs/evidence/style-training/output-measurements.json').read_text())
                    self.assertEqual(measured['human_listening'], 'NOT RUN')
                    self.assertTrue(all(abs(row['lufs'] - measured['target_lufs']) <= .2 for row in measured['review']))
                    with self.assertRaises(FileExistsError):
                        review.main()
                    repeated.write_bytes((results / 'adapter-bass-a.wav').read_bytes())
                    report['repeat_control']['sha256'] = hashlib.sha256(repeated.read_bytes()).hexdigest()
                    (results / 'comparison.json').write_text(json.dumps(report))
                    with self.assertRaisesRegex(ValueError, 'Base repeat differs'):
                        review.main()
                    path = results / cases[0]['file']
                    path.write_bytes(b'corrupt')
                    with self.assertRaisesRegex(ValueError, 'checksum'):
                        review.main()
            finally:
                os.chdir(previous)


if __name__ == '__main__':
    unittest.main()
