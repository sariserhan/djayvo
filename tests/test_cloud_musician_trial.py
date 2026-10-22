import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import cloud_musician_trial as trial


class InputTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.rows = []
        for name in sorted(trial.EXPECTED):
            path = self.root / name
            path.write_bytes(name.encode())
            self.rows.append({'file': name, 'source': name.split('-')[0], 'sha256': trial.shared.digest(path)})
        manifest = self.root / 'manifest.json'
        manifest.write_text(json.dumps({'clips': self.rows}))
        self.addCleanup(patch.stopall)
        patch.object(trial, 'INPUT', self.root).start()
        patch.object(trial, 'MANIFEST_SHA', trial.shared.digest(manifest)).start()
        wav = patch.object(trial.wave, 'open').start().return_value.__enter__.return_value
        for name, value in [('getframerate', 48000), ('getnchannels', 2), ('getsampwidth', 2), ('getnframes', 1440000)]:
            getattr(wav, name).return_value = value

    def test_manifest_and_audio_tampering_rejected(self):
        self.assertEqual(len(trial.checked_inputs()), 13)
        (self.root / self.rows[0]['file']).write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'hash'):
            trial.checked_inputs()
        (self.root / 'manifest.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'manifest'):
            trial.checked_inputs()

    def test_foreign_inputs_rejected(self):
        (self.root / 'private-voice.wav').touch()
        with self.assertRaisesRegex(ValueError, 'Unexpected'):
            trial.checked_inputs()

    def test_selection_requires_distinct_supported_sources_and_no_guessed_labels(self):
        names = ['down-01.wav', 'down-02.wav', 'f-01.wav', 'f-02.wav']
        samples = [{'filename': name, 'audio_path': str(self.root / name),
            'review_status': 'provisional_machine_review', 'caption': 'Music with rhythmic bass and drum patterns.',
            'lyrics': '', 'bpm': None, 'keyscale': '', 'is_instrumental': None} for name in names]
        def check(rows):
            (self.root / 'accepted.json').write_text(json.dumps({'samples': rows}))
            return trial.accepted()
        self.assertEqual(len(check(samples)), 4)
        for invalid in (samples[:3], samples[:3] + [samples[0]],
                        [{**s, 'audio_path': '/private.wav'} for s in samples],
                        [{**s, 'bpm': 120} for s in samples]):
            with self.assertRaises(ValueError):
                check(invalid)
        one_source = [{**samples[0], 'filename': f'down-{i:02}.wav',
                       'audio_path': str(self.root / f'down-{i:02}.wav')} for i in range(1, 5)]
        with self.assertRaisesRegex(ValueError, 'two source'):
            check(one_source)


if __name__ == '__main__':
    unittest.main()
