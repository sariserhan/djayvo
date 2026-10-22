import json
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from arrange_voice_research import RATE, digest, write_pcm
from assemble_sung_response import assemble


class SungAssembly(unittest.TestCase):
    def test_real_source_is_separate_and_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); singer = root / 'singer'; singer.mkdir()
            source = root / 'source.wav'; score = root / 'score.json'
            wave = np.sin(np.arange(RATE*3)*2*np.pi*180/RATE)*.12
            wave[:RATE//2] = 0; wave[-RATE//2:] = 0
            write_pcm(source, np.repeat(wave[:, None], 2, axis=1))
            write_pcm(singer/'singer.wav', np.repeat((np.sin(np.arange(RATE*30)*2*np.pi*220/RATE)*.1)[:, None], 2, axis=1))
            score.write_text(json.dumps({'source': {'sha256': digest(source), 'kind': 'recorded',
                'consent_confirmed': True, 'processed_frames': RATE*3}, 'sample_rate': RATE,
                'voice_clips': [{'id': 0, 'start_frame': 0, 'end_frame': RATE*3}]}))
            receipt = {'technical': 'PASS', 'case': {'bpm': 84, 'source_repetitions': 2},
                       'audio_sha256': digest(singer/'singer.wav')}
            (singer/'complete.json').write_text(json.dumps(receipt))
            with self.assertRaises(ValueError): assemble(source, score, singer, root/'denied')
            self.assertFalse((root/'denied').exists())
            result = assemble(source, score, singer, root/'out', True)
            self.assertEqual(result['source_singer_overlap_frames'], 0)
            self.assertLessEqual(result['source_identity_max_pcm_error'], .5/32768+1e-12)
            self.assertEqual(len(result['source_starts_frames']), 2)
            again = assemble(source, score, singer, root/'repeat', True)
            self.assertEqual(result['sha256'], again['sha256'])
            with self.assertRaises(FileExistsError): assemble(source, score, singer, root/'out', True)
            self.assertEqual(digest(root/'out/performance.wav'), result['sha256'])
            receipt['case']['source_repetitions'] = 3
            (singer/'complete.json').write_text(json.dumps(receipt))
            with self.assertRaises(ValueError): assemble(source, score, singer, root/'too-many', True)
            receipt['case']['source_repetitions'] = 1
            (singer/'complete.json').write_text(json.dumps(receipt))
            (singer/'singer.wav').write_bytes(b'tampered')
            with self.assertRaises(ValueError): assemble(source, score, singer, root/'bad', True)
            self.assertFalse((root/'bad').exists())


if __name__ == '__main__':
    unittest.main()
