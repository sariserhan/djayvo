import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import prepare_musician_candidates as candidates


class MusicianCandidateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.ledger = self.root / 'permission.json'
        self.output = self.root / 'new'
        self.data = {'training_permission': 'owner_confirmed', 'sources': []}
        for name in candidates.NAMES:
            path = self.root / name
            path.write_bytes(name.encode())
            self.data['sources'].append({'filename': name, 'sha256': candidates.digest(path)})

    def run_prepare(self):
        self.ledger.write_text(json.dumps(self.data))
        return candidates.prepare(self.ledger, self.root, self.output)

    def test_windows_stay_inside_source_with_margins(self):
        for duration, count in ((114.410667, 3), (143.798875, 4), (155.316479, 4), (79.656979, 2)):
            starts = candidates.windows(duration)
            self.assertEqual(len(starts), count)
            self.assertGreaterEqual(starts[0], 5)
            self.assertLessEqual(starts[-1] + 30, duration - 5)
            self.assertTrue(all(b >= a + 30 for a, b in zip(starts, starts[1:])))
        for duration in (0, 59.9, 601, float('nan'), float('inf')):
            with self.assertRaises(ValueError):
                candidates.windows(duration)

    def test_permission_before_decoding(self):
        self.data['training_permission'] = None
        with patch.object(candidates.subprocess, 'check_output') as probe:
            with self.assertRaisesRegex(ValueError, 'permission'):
                self.run_prepare()
            probe.assert_not_called()
        self.assertFalse(self.output.exists())

    def test_exact_scope_rejects_duplicate_and_path(self):
        for name in ('../f.mp3', 'down.mp3', 'djayvo-my-voice.m4a'):
            self.data['sources'][0]['filename'] = name
            with self.assertRaisesRegex(ValueError, 'exactly'):
                self.run_prepare()
        self.assertFalse(self.output.exists())

    def test_changed_source_or_symlink_rejected(self):
        source = self.root / 'f.mp3'
        source.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'differs'):
            self.run_prepare()
        source.unlink()
        source.symlink_to(self.root / 'down.mp3')
        with self.assertRaisesRegex(ValueError, 'differs'):
            self.run_prepare()

    def test_existing_output_preserved(self):
        self.output.mkdir()
        marker = self.output / 'recording.wav'
        marker.write_bytes(b'preserved')
        with self.assertRaisesRegex(ValueError, 'fresh'):
            self.run_prepare()
        self.assertEqual(marker.read_bytes(), b'preserved')

    def test_failure_does_not_publish_preparation_or_archive(self):
        with patch.object(candidates.subprocess, 'check_output', return_value='{"format":{"duration":114.4}}'), \
             patch.object(candidates, 'extract', side_effect=ValueError('decode failed')):
            with self.assertRaisesRegex(ValueError, 'decode failed'):
                self.run_prepare()
        self.assertFalse((self.output / 'preparation.json').exists())
        self.assertFalse((self.output / 'musician-review-candidates.tar.gz').exists())


if __name__ == '__main__':
    unittest.main()
