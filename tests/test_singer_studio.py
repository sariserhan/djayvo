import json
from pathlib import Path
import sys
import tempfile
import subprocess
import unittest
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import singer_studio as studio
from arrange_voice_research import RATE, digest, write_pcm, read_pcm
from singing_response import CODE_REVISION, WEIGHT_REVISION, variants


class StudioFlow(unittest.TestCase):
    def test_quiet_overrun_is_trimmed_without_changing_original(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            for seconds in (2,5,5.001,5.22,6,15):
                with self.subTest(seconds=seconds):
                    source=root/f'{seconds}.wav';work=root/str(seconds);work.mkdir()
                    samples=np.zeros((round(seconds*RATE),2))
                    start=RATE//2;stop=min(len(samples),start+4*RATE)
                    samples[start:stop]=np.sin(np.arange(stop-start)[:,None]*2*np.pi*180/RATE)*.1
                    write_pcm(source,samples);before=digest(source)
                    pcm,report=studio.prepare_source(source,work)
                    self.assertEqual(before,digest(source))
                    self.assertEqual(before,digest(work/'original-recording'))
                    self.assertTrue(2*RATE<=len(pcm)<=5*RATE)
                    a,b=report['kept_frames']
                    self.assertLessEqual(a,start);self.assertGreaterEqual(b,stop)
                    np.testing.assert_array_equal(pcm,read_pcm(work/'decoded.wav',(2,15))[a:b])
                    self.assertEqual(report['edge_quiet_removed'],seconds>5)

    def test_invalid_duration_and_silence_have_specific_errors(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            for name,seconds,amplitude,message in [('short',1.9,.1,'1.90 seconds'),
                    ('long',6,.1,'sound exceeds 5 seconds'),('limit',16,.1,'longer than 15'),
                    ('quiet',3,0,'silent or unreadable')]:
                source=root/f'{name}.wav';work=root/name;work.mkdir()
                samples=amplitude*np.sin(np.arange(round(seconds*RATE))[:,None]*2*np.pi*180/RATE)
                write_pcm(source,np.repeat(samples,2,axis=1))
                with self.assertRaisesRegex(studio.StudioError,message):studio.prepare_source(source,work)

    def test_model_failure_does_not_blame_recording_duration(self):
        with tempfile.TemporaryDirectory() as d,patch.object(studio,'OUTPUT',Path(d)/'jobs'):
            source=Path(d)/'source.wav'
            write_pcm(source,np.repeat((.1*np.sin(np.arange(3*RATE)*.1))[:,None],2,axis=1))
            real_run=studio.subprocess.run
            def run(args,**kwargs):
                if args[0]=='ffmpeg':return real_run(args,**kwargs)
                raise subprocess.CalledProcessError(1,args,stderr='private detail')
            with patch.object(studio.subprocess,'run',side_effect=run):
                with self.assertRaisesRegex(studio.StudioError,'Writing the lyrics failed') as error:
                    studio.make_reply(str(source),'hello there','female','reggae',True)
            self.assertNotIn('2–5',str(error.exception));self.assertNotIn('private detail',str(error.exception))
            failure=json.loads(next(studio.OUTPUT.glob('*/failure.json')).read_text())
            self.assertEqual(failure['stage'],'Writing the lyrics')

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
                if args[1].endswith('separate_singer.py'):
                    dest.mkdir()
                    hashes={}
                    for name in ('vocals','drums'):
                        np.save(dest/f'{name}.npy',np.tile(samples*.2,(10,1)).astype('float32'),allow_pickle=False)
                        hashes[name]=digest(dest/f'{name}.npy')
                    (dest/'complete.json').write_text(json.dumps({'technical':'PASS',
                        'source_sha256':digest(Path(args[args.index('--input')+1])),'stems':hashes}))
                elif args[2] == 'draft':
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
            self.assertIn('no sample was inserted', status)
            self.assertEqual(digest(Path(singer)),digest(Path(exchange)))
            self.assertIn('question', lyrics)
            self.assertEqual(digest(source), original_hash)
            self.assertEqual(len(calls), 3)
            self.assertTrue(all(kw['timeout'] == 600 for _, kw in calls))
            self.assertFalse(list(studio.OUTPUT.rglob('.partial')))


if __name__ == '__main__':
    unittest.main()
