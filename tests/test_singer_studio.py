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
    def test_only_a_confident_complete_final_word_can_be_repeated(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);source=root/'input.wav'
            write_pcm(source,np.repeat((.1*np.sin(np.arange(2*RATE)*.1))[:,None],2,axis=1))
            for i,confidence in enumerate((.9,.4,float('nan'))):
                work=root/str(i);work.mkdir();studio.prepare_source(source,work)
                speech={'source_rate':16000,'transcript':'A short phrase','phrases':[{'text':'A short phrase','start_seconds':0,'end_seconds':2}],
                        'words':[{'start_frame':22400,'end_frame':31360,'confidence':confidence}]}
                _,score=studio.sample_candidate(work,speech,'reggae',2)
                metadata=json.loads(score.read_text())
                if confidence==.9:self.assertEqual(metadata['rhythm_word_frames'],[65280,96000])
                else:self.assertIsNone(metadata['rhythm_word_frames'])

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

    def test_sample_choice_supports_sounds_and_preserves_selected_phrase(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);source=root/'input.wav'
            samples=np.repeat((.1*np.sin(np.arange(12*RATE)*.1))[:,None],2,axis=1)
            write_pcm(source,samples);studio.prepare_source(source,root)
            speech={'phrases':[{'start_seconds':6.,'end_seconds':7.,'text':'A question?'}]}
            self.assertIsNotNone(studio.sample_candidate(root,{'phrases':[]},'reggae',12))
            (root/'source.wav').unlink()
            result=studio.sample_candidate(root,speech,'acousticpop',12)
            self.assertIsNotNone(result)
            pcm=read_pcm(result[0],(.35,5))
            self.assertAlmostEqual(len(pcm)/RATE,1.08)
            meta=json.loads(result[1].read_text());self.assertEqual(meta['original_seconds'],[5.96,7.04])

    def test_long_segment_can_supply_different_intact_pause_bounded_clauses(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);source=root/'input.wav'
            write_pcm(source,np.repeat((.1*np.sin(np.arange(6*RATE)*.1))[:,None],2,axis=1))
            speech={'source_rate':16000,'phrases':[{'start_seconds':1.,'end_seconds':5.,'text':'One idea, another idea.'}],
                    'words':[{'start_frame':a*16000,'end_frame':b*16000} for a,b in [(1,2),(3,5)]]}
            crops=set()
            for seed in range(8):
                work=root/str(seed);work.mkdir();studio.prepare_source(source,work)
                _,score=studio.sample_candidate(work,speech,'country',6,seed)
                crops.add(tuple(json.loads(score.read_text())['original_seconds']))
            self.assertTrue({(.96,2.04),(2.96,5.04)}.issubset(crops))
            self.assertTrue(crops.issubset({(.96,2.04),(2.96,5.04),(.96,5.04)}))

    def test_whole_recording_and_silent_input(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);source=root/'short.wav'
            write_pcm(source,np.repeat((.1*np.sin(np.arange(RATE)*.1))[:,None],2,axis=1))
            studio.prepare_source(source,root)
            _,score=studio.sample_candidate(root,{},'jazz',1)
            self.assertEqual(json.loads(score.read_text())['selection'],'whole-recording')
            silent=root/'silent';silent.mkdir();write_pcm(source,np.zeros((RATE,2)))
            studio.prepare_source(source,silent)
            self.assertIsNone(studio.sample_candidate(silent,{},'jazz',1))
            with patch.object(studio,'OUTPUT',root/'jobs'),patch.object(studio,'understand',return_value={'transcript':''}):
                with self.assertRaisesRegex(studio.StudioError,'No clear sound'):
                    studio.make_reply(str(source),'a sound','male','jazz',True)
            self.assertFalse(list((root/'jobs').glob('*/reply.json')))

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
                        pcm=read_pcm(Path(args[args.index('--input')+1]),(30,45))
                        stem=np.zeros_like(pcm,dtype='float32')
                        if name=='vocals':stem[8*RATE:10*RATE]=pcm[8*RATE:10*RATE]*.2
                        np.save(dest/f'{name}.npy',stem,allow_pickle=False)
                        hashes[name]=digest(dest/f'{name}.npy')
                    (dest/'complete.json').write_text(json.dumps({'technical':'PASS',
                        'source_sha256':digest(Path(args[args.index('--input')+1])),'stems':hashes}))
                elif args[2] == 'draft':
                    seed = int(args[args.index('--seed')+1])
                    c = next(c for c in variants(seed) if c['id'] == 'reggae-female')
                    c['duration']=int(args[args.index('--duration')+1])
                    c['lyrics'] = '[Verse]\nYou have a question and I want to know\nLet your question flow'
                    dest.write_text(json.dumps({'schema': 'jamloom-sung-response-1', 'model_code': CODE_REVISION,
                        'weights': WEIGHT_REVISION, 'phrase': 'I have a question', 'cases': [c]}))
                else:
                    plan = Path(args[args.index('--plan')+1]); dest.mkdir()
                    c = json.loads(plan.read_text())['cases'][0]
                    write_pcm(dest/'singer.wav', np.tile(samples, (15, 1))[:c['duration']*RATE])
                    (dest/'complete.json').write_text(json.dumps({'technical': 'PASS', 'case': c,
                        'audio_sha256': digest(dest/'singer.wav'), 'plan_sha256': digest(plan)}))
            with patch.object(studio.subprocess, 'run', side_effect=run), patch.object(studio,'understand',return_value={}):
                singer, exchange, lyrics, status, meaning = studio.make_reply(str(source), 'I have a question', 'female', 'reggae', True)
            self.assertEqual(meaning,'I have a question')
            self.assertNotEqual(singer, exchange)
            self.assertTrue(Path(singer).is_file() and Path(exchange).is_file())
            self.assertIn('Female · Reggae', status)
            self.assertIn('Your sound', status)
            self.assertNotEqual(digest(Path(singer)),digest(Path(exchange)))
            receipt=json.loads(Path(exchange).with_name('complete.json').read_text())
            self.assertTrue(receipt['sample_used'])
            self.assertTrue(receipt['events'])
            self.assertEqual(receipt['original_recording_sha256'],original_hash)
            self.assertIn('question', lyrics)
            self.assertEqual(digest(source), original_hash)
            self.assertEqual(len(calls), 3)
            self.assertTrue(all(kw['timeout'] == 600 for _, kw in calls))
            self.assertFalse(list(studio.OUTPUT.rglob('.partial')))
            actual_arrange=studio.arrange;attempts=[]
            def retry(*args,**kwargs):
                attempts.append(args[0])
                if len(attempts)==1:raise ValueError('First crop cannot fit')
                return actual_arrange(*args,**kwargs)
            with patch.object(studio.subprocess,'run',side_effect=run),patch.object(studio,'arrange',side_effect=retry),patch.object(studio,'understand',return_value={'transcript':'A question','phrases':[{'text':'A question','start_seconds':0.,'end_seconds':1.}]}):
                _,retried,_,_,_=studio.make_reply(str(source),'A question','female','reggae',True)
            self.assertGreaterEqual(len(attempts),2)
            self.assertTrue(Path(retried).is_file())
            self.assertNotEqual(attempts[0],attempts[1])
            with patch.object(studio.subprocess,'run',side_effect=run), \
                 patch.object(studio,'sample_candidate',return_value=(source,source)), \
                 patch.object(studio,'arrange',side_effect=ValueError('Invalid optional sample')), \
                 patch.object(studio,'understand',return_value={}):
                with self.assertRaisesRegex(studio.StudioError,'Could not blend your recording'):
                    studio.make_reply(str(source),'I have a question','female','reggae',True)
            self.assertTrue(list(studio.OUTPUT.glob('*/arrangement-rejected-3.json')))
            self.assertTrue(list(studio.OUTPUT.glob('*/failure.json')))


if __name__ == '__main__':
    unittest.main()
