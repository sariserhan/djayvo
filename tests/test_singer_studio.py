import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import singer_studio as studio
from arrange_voice_research import RATE, digest, write_pcm
from singing_response import CODE_REVISION, WEIGHT_REVISION, variants


class StudioFlow(unittest.TestCase):
    def test_permission_and_selection_checked_before_creating_job(self):
        with tempfile.TemporaryDirectory() as d, patch.object(studio, 'OUTPUT', Path(d)/'jobs'):
            for args in [(None, 'hello', 'male', 'reggae', False),
                         (None, 'hello', 'unknown', 'reggae', True),
                         (None, '', 'male', 'reggae', True)]:
                with self.assertRaises(ValueError): studio.make_reply(*args)
            self.assertFalse(studio.OUTPUT.exists())

    def test_pipeline_keeps_source_and_singer_distinct(self):
        with tempfile.TemporaryDirectory() as d, patch.object(studio, 'OUTPUT', Path(d)/'jobs'):
            source = Path(d)/'source.wav'
            samples = np.repeat((.1*np.sin(np.arange(3*RATE)*2*np.pi*180/RATE))[:, None], 2, axis=1)
            write_pcm(source, samples); original_hash = digest(source)
            real_run = studio.subprocess.run
            calls = []
            def run(args, **kwargs):
                if args[0] == 'ffmpeg': return real_run(args, **kwargs)
                calls.append((args, kwargs))
                dest = Path(args[args.index('--output')+1])
                if args[2] == 'draft':
                    seed = int(args[args.index('--seed')+1])
                    c = next(c for c in variants(seed) if c['id'] == 'reggae-female')
                    c['lyrics'] = '[Verse]\nYou have a question and I want to know\nLet your question flow'
                    dest.write_text(json.dumps({'schema': 'jamloom-sung-response-1', 'model_code': CODE_REVISION,
                        'weights': WEIGHT_REVISION, 'phrase': 'I have a question', 'cases': [c]}))
                else:
                    plan = Path(args[args.index('--plan')+1]); dest.mkdir()
                    c = json.loads(plan.read_text())['cases'][0]
                    write_pcm(dest/'singer.wav', np.tile(samples, (10, 1)))
                    (dest/'complete.json').write_text(json.dumps({'technical': 'PASS', 'case': c,
                        'audio_sha256': digest(dest/'singer.wav'), 'plan_sha256': digest(plan)}))
            with patch.object(studio.subprocess, 'run', side_effect=run):
                singer, exchange, lyrics, status = studio.make_reply(str(source), 'I have a question', 'female', 'reggae', True)
            self.assertNotEqual(singer, exchange)
            self.assertTrue(Path(singer).is_file() and Path(exchange).is_file())
            self.assertIn('Female · Reggae', status)
            self.assertIn('question', lyrics)
            self.assertEqual(digest(source), original_hash)
            self.assertEqual(len(calls), 2)
            self.assertTrue(all(kw['timeout'] == 600 for _, kw in calls))
            self.assertFalse(list(studio.OUTPUT.rglob('.partial')))


if __name__ == '__main__':
    unittest.main()
