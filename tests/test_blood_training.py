import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from prepare_blood_training import prepare, digest


class BloodTrainingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'blood_club.mp3'
        self.source.write_bytes(b'local reference bytes')
        self.ledger = self.root / 'permission.json'
        self.data = {'training_permission': 'owner_confirmed', 'source_id': 'blood_club',
                     'source_sha256': digest(self.source)}
        self.output = self.root / 'fresh'

    def run_prepare(self):
        self.ledger.write_text(json.dumps(self.data))
        return prepare(self.source, self.ledger, self.output)

    def test_permission_and_source_hash_precede_any_decode(self):
        with patch('prepare_blood_training.subprocess.check_output') as probe:
            self.data['training_permission'] = None
            with self.assertRaisesRegex(ValueError, 'permission'):
                self.run_prepare()
            self.data['training_permission'] = 'owner_confirmed'
            self.source.write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'differs'):
                self.run_prepare()
            probe.assert_not_called()
        self.assertFalse(self.output.exists())

    def test_preserves_existing_output(self):
        self.output.mkdir()
        marker = self.output / 'recording.wav'
        marker.write_bytes(b'preserve')
        with self.assertRaisesRegex(ValueError, 'fresh'):
            self.run_prepare()
        self.assertEqual(marker.read_bytes(), b'preserve')

    def test_duration_bounds_before_extract(self):
        for duration in (0, 629.99, 660, float('nan'), float('inf')):
            with patch('prepare_blood_training.subprocess.check_output', return_value=json.dumps({'format': {'duration': duration}})):
                with self.assertRaisesRegex(ValueError, 'complete'):
                    self.run_prepare()
            self.assertFalse(self.output.exists())

    def test_decode_failure_never_publishes_ready_archive(self):
        with patch('prepare_blood_training.subprocess.check_output', return_value='{"format":{"duration":634.067313}}'), \
             patch('prepare_blood_training.extract', side_effect=ValueError('bad decode')):
            with self.assertRaisesRegex(ValueError, 'bad decode'):
                self.run_prepare()
        self.assertFalse((self.output / 'preparation.json').exists())
        self.assertFalse((self.output / 'blood-training-input.tar.gz').exists())
        self.assertEqual(digest(self.source), self.data['source_sha256'])


if __name__ == '__main__':
    unittest.main()
