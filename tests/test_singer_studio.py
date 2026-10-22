import json
from pathlib import Path
import sys
import tempfile
import subprocess
import unittest
import wave
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import singer_studio as studio
from arrange_voice_research import RATE, digest, write_pcm, read_pcm
from singing_response import CODE_REVISION, WEIGHT_REVISION, variants


class StudioFlow(unittest.TestCase):
    def test_short_long_and_quiet_recordings_are_preserved(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            for seconds in (.1,1.9,5,5.22,6,60,300):
                with self.subTest(seconds=seconds):
                    source=root/f'{seconds}.wav';work=root/str(seconds);work.mkdir()
                    with wave.open(str(source),'wb') as audio:
                        audio.setparams((1,2,16000,0,'NONE','not compressed'))
                        audio.writeframes(bytes(round(seconds*16000)*2))
                    before=studio.file_digest(source)
                    report=studio.prepare_source(source,work)
                    self.assertEqual(before,studio.file_digest(source))
                    self.assertEqual(before,studio.file_digest(work/'original-recording'))
                    self.assertAlmostEqual(report['decoded_seconds'],seconds,places=3)
                    self.assertTrue(report['original_preserved'])
            source=root/'too-long.wav'
            with wave.open(str(source),'wb') as audio:
                audio.setparams((1,2,16000,0,'NONE','not compressed'));audio.writeframes(bytes(301*16000*2))
            work=root/'limit';work.mkdir()
            with self.assertRaisesRegex(studio.StudioError,'up to 5 minutes'):studio.prepare_source(source,work)

    def test_sample_choice_is_optional_and_preserves_selected_phrase(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);source=root/'input.wav'
            samples=np.repeat((.1*np.sin(np.arange(12*RATE)*.1))[:,None],2,axis=1)
            write_pcm(source,samples);studio.prepare_source(source,root)
            speech={'phrases':[{'start_seconds':6.,'end_seconds':7.,'text':'A question?'}]}
            self.assertIsNone(studio.sample_candidate(root,speech,'acousticpop',12))
            self.assertIsNone(studio.sample_candidate(root,{'phrases':[]},'reggae',12))
            result=studio.sample_candidate(root,speech,'reggae',12)
            self.assertIsNotNone(result)
            pcm=read_pcm(result[0],(2,5))
            self.assertEqual(len(pcm),2*RATE)
            self.assertTrue(np.all(pcm[round(1.08*RATE)+10:]==0))
            meta=json.loads(result[1].read_text());self.assertEqual(meta['original_seconds'],[5.96,7.04])

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
                         (None, 'x'*32001, 'male', 'reggae', True)]:
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
                singer, exchange, lyrics, status, meaning = studio.make_reply(str(source), 'I have a question', 'female', 'reggae', True)
            self.assertEqual(meaning,'I have a question')
            self.assertNotEqual(singer, exchange)
            self.assertTrue(Path(singer).is_file() and Path(exchange).is_file())
            self.assertIn('Female · Reggae', status)
            self.assertIn('without replaying your recording', status)
            self.assertEqual(digest(Path(singer)),digest(Path(exchange)))
            self.assertIn('question', lyrics)
            self.assertEqual(digest(source), original_hash)
            self.assertEqual(len(calls), 2)
            self.assertTrue(all(kw['timeout'] == 600 for _, kw in calls))
            self.assertFalse(list(studio.OUTPUT.rglob('.partial')))
            with patch.object(studio.subprocess,'run',side_effect=run), \
                 patch.object(studio,'sample_candidate',return_value=(source,source)), \
                 patch.object(studio,'assemble',side_effect=ValueError('Invalid optional sample')):
                singer,exchange,_,status,_=studio.make_reply(str(source),'I have a question','female','reggae',True)
            self.assertEqual(digest(Path(singer)),digest(Path(exchange)))
            self.assertIn('without replaying your recording',status)
            self.assertTrue(list(studio.OUTPUT.glob('*/sample-skipped.json')))


if __name__ == '__main__':
    unittest.main()
