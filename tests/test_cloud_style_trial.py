import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('style_trial', Path(__file__).resolve().parents[1] / 'scripts/cloud_style_trial.py')
trial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trial)


class InputScope(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.patch = patch.object(trial, 'INPUT', self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.rows = []
        for source in 'xy':
            for n in range(1, 7):
                name = f'{source}-{n:02d}'
                p = self.root / (name + '.wav')
                p.write_bytes(name.encode())
                self.rows.append({'id': name, 'file': p.name, 'source_id': source,
                                  'split': 'train_candidate', 'sha256': trial.digest(p)})

    def run_check(self):
        (self.root / 'manifest.json').write_text(json.dumps(self.rows))
        return trial.checked_inputs()

    def test_exact_approved_manifest(self):
        self.assertEqual(len(self.run_check()), 12)

    def test_holdout_refused(self):
        self.rows[0]['source_id'] = 'z'
        with self.assertRaisesRegex(ValueError, 'Holdout'):
            self.run_check()

    def test_path_escape_refused(self):
        self.rows[0]['file'] = '../secret.wav'
        with self.assertRaisesRegex(ValueError, 'filename'):
            self.run_check()

    def test_changed_audio_refused(self):
        (self.root / 'x-01.wav').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'hash'):
            self.run_check()

    def test_duplicate_refused(self):
        self.rows[1] = self.rows[0]
        with self.assertRaisesRegex(ValueError, 'distinct'):
            self.run_check()


if __name__ == '__main__':
    unittest.main()
