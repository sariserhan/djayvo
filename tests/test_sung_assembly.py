import json
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from arrange_voice_research import RATE, digest, write_pcm
from assemble_sung_response import assemble, beat_grid, source_crops


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
            stems=singer/'stems';stems.mkdir();hashes={}
            for name in ('vocals','drums'):
                samples=np.zeros((RATE*30,2),dtype='float32')
                if name=='drums':
                    for start in range(0,len(samples)-480,RATE//2):samples[start:start+480]=.1
                np.save(stems/f'{name}.npy',samples,allow_pickle=False);hashes[name]=digest(stems/f'{name}.npy')
            (stems/'complete.json').write_text(json.dumps({'technical':'PASS','source_sha256':receipt['audio_sha256'],'stems':hashes}))
            with self.assertRaises(ValueError): assemble(source, score, singer, root/'denied')
            self.assertFalse((root/'denied').exists())
            result = assemble(source, score, singer, root/'out', True)
            self.assertEqual(result['source_singer_overlap_frames'], 0)
            self.assertLessEqual(result['source_identity_max_pcm_error'], .5/32768+1e-12)
            self.assertGreaterEqual(len(result['source_starts_frames']), 4)
            self.assertEqual(result['frames'],30*RATE)
            self.assertGreater(result['music_present_during_clean_hook_rms'],.01)
            self.assertTrue(any(e['start_frame']>RATE*15 and not e['clean'] for e in result['events']))
            self.assertTrue(any(abs(e['rate']-1)>.01 for e in result['events']))
            for prior,event in zip(result['events'],result['events'][1:]):
                self.assertLessEqual(prior['end_frame'],event['start_frame'])
            again = assemble(source, score, singer, root/'repeat', True)
            self.assertEqual(result['sha256'], again['sha256'])
            stem_receipt=(stems/'complete.json').read_text()
            (stems/'complete.json').write_text(stem_receipt.replace(receipt['audio_sha256'],'wrong-source'))
            with self.assertRaises(ValueError):assemble(source,score,singer,root/'wrong-stems',True)
            self.assertFalse((root/'wrong-stems').exists())
            (stems/'complete.json').write_text(stem_receipt)
            metadata=json.loads(stem_receipt);metadata['stems']['vocals']='tampered'
            (stems/'complete.json').write_text(json.dumps(metadata))
            with self.assertRaises(ValueError):assemble(source,score,singer,root/'tampered-stems',True)
            self.assertFalse((root/'tampered-stems').exists())
            (stems/'complete.json').write_text(stem_receipt)
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

    def test_estimated_grid_follows_actual_pulses_and_crops_stay_bounded(self):
        drums=np.zeros((RATE*12,2))
        for start in range(RATE//5,len(drums)-480,RATE//2):drums[start:start+480]=.5
        grid=beat_grid(drums,124)
        self.assertLess(abs(grid['bpm']-120),1)
        self.assertGreater(grid['confidence'],.5)
        self.assertEqual(beat_grid(drums*0,100)['method'],'requested tempo fallback')
        source=drums[:RATE*4]
        clips=source_crops(source,[])
        self.assertTrue(all(0<=c['start_frame']<c['end_frame']<=len(source) for c in clips))


if __name__ == '__main__':
    unittest.main()
