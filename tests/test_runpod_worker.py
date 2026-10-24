import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import wave

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
spec = importlib.util.spec_from_file_location('runpod_worker', ROOT/'services/runpod/handler.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)
ORIGIN = 'https://'+'a'*32+'.r2.cloudflarestorage.com'
URL = ORIGIN+'/jamloom-audio/uploads/11111111-1111-4111-8111-111111111111.wav?X-Amz-Signature=fixture'


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'JAMLOOM_R2_ORIGIN': ORIGIN, 'JAMLOOM_R2_BUCKET': 'jamloom-audio'})
        self.env.start();self.addCleanup(self.env.stop)
        self.job = {'id': 'a'*32, 'product': 'music-dna', 'timeout_seconds': 900, 'output_url': URL,
                    'payload': {'profile': {'references': ['Favorite — Artist'], 'referenceMetadata': [{'reference': 'Favorite — Artist', 'genre': 'Soul'}]}, 'seed': 4}}

    def test_worker_build_context_includes_every_explicit_copy_source(self):
        import fnmatch, shlex
        rules=(ROOT/'services/runpod/Dockerfile.dockerignore').read_text().splitlines()
        for line in (ROOT/'services/runpod/Dockerfile').read_text().splitlines():
            if not line.startswith('COPY '):continue
            for source in shlex.split(line)[1:-1]:
                included=True
                for rule in rules:
                    if not rule or rule.startswith('#'):continue
                    pattern=rule.lstrip('!').rstrip('/')
                    if fnmatch.fnmatch(source,pattern) or source.startswith(pattern+'/'):
                        included=rule.startswith('!')
                self.assertTrue(included,source+' excluded from the worker build')
                self.assertTrue((ROOT/source).exists(),source+' missing')

    def test_whole_playlist_input_is_not_cut_to_twenty(self):
        job=copy.deepcopy(self.job)
        refs=[f'Günden Güne {i} — Sanatçı' for i in range(5000)]
        job['payload']['profile']={'references':refs,'referenceMetadata':[{'reference':r,'genre':'Rock'} for r in refs]}
        self.assertEqual(len(worker.validate(job)['payload']['profile']['references']),5000)
        job['payload']['profile']['references'].append('Too many')
        with self.assertRaises(ValueError):worker.validate(job)

    def test_cached_song_descriptions_are_supported_and_bounded(self):
        job=copy.deepcopy(self.job);job['payload']['track_profiles']=[{'version':1,'model_revision':'fixture','reference':'Favorite — Artist'}]
        self.assertEqual(worker.validate(job),job)
        for value in ({},[{}]*5001,[{'oversize':'x'*(12*1024*1024)}]):
            job['payload']['track_profiles']=value
            with self.assertRaises(ValueError):worker.validate(job)

    def test_storage_boundary_blocks_external_hosts_redirects_and_private_paths(self):
        self.assertEqual(worker.validate(self.job), self.job)
        for url in ['http://127.0.0.1/a', URL.replace('.com/', '.com.evil/'), URL.replace('/uploads/', '/music-dna/private/'),
                    URL.replace('https://', 'http://'), URL+'#fragment', URL.split('?')[0], URL.replace('/uploads/', '/uploads/../')]:
            with self.subTest(url=url), self.assertRaises(ValueError):worker.storage_url(url)
        with self.assertRaises(ValueError):worker.NoRedirect().redirect_request(None,None,None,None,None,None)

    def test_feedback_is_bounded_and_supported_without_raw_recordings(self):
        value={**self.job,'payload':{**self.job['payload'],'feedback':[{'rating':'dislike','tags':['too_slow']}]}}
        self.assertEqual(worker.validate(value),value)
        for feedback in ({},[{}]*13,[{'value':'x'*17000}]):
            value['payload']['feedback']=feedback
            with self.assertRaises(ValueError):worker.validate(value)

    def test_invalid_jobs_cannot_start_inference(self):
        for field,value in [('timeout_seconds',901),('timeout_seconds',True),('id','../a'),('product','arbitrary'),('payload',None)]:
            job={**self.job,field:value}
            with patch.object(worker,'execute') as execute, self.assertRaises(RuntimeError):worker.handler({'input':job})
            execute.assert_not_called()
        job={**self.job,'product':'improvise','payload':{'consent':False,'genre':'jazz','voice':'male'}}
        with self.assertRaises(ValueError):worker.validate(job)

    def test_only_validated_audio_is_uploaded_and_temporary_files_are_removed(self):
        paths=[];uploads=[]
        def execute(work,timeout):
            paths.append(work)
            with wave.open(str(work/'audio.wav'),'wb') as wav:
                wav.setparams((2,2,48000,0,'NONE','not compressed'))
                wav.writeframes(b'\0\0'*2*48000*120)
            (work/'result.json').write_text(json.dumps({'plan':{'title':'Fixture','favorites':['Public favorite']*20000},'fit':{'accepted':True}}))
        class Response:
            status=200
            def __enter__(self):return self
            def __exit__(self,*args):pass
        class Opener:
            def open(self,request,**kwargs):uploads.append(request);return Response()
        with patch.object(worker,'execute',side_effect=execute),patch('urllib.request.build_opener',return_value=Opener()):
            result=worker.handler({'input':self.job})
        self.assertEqual(len(result['plan']['favorites']),20000)
        self.assertGreater(len(json.dumps(result)),262144)
        self.assertEqual(result['audio_bytes'],23040044)
        self.assertEqual(result['audio_sha256'],hashlib.sha256(uploads[0].data).hexdigest())
        self.assertFalse(paths[0].exists())
        self.assertNotIn('output_url',json.dumps(result))
        def failed(work,timeout):
            paths.append(work);raise RuntimeError('private draft and signed secret')
        with patch.object(worker,'execute',side_effect=failed),patch('urllib.request.build_opener') as network:
            with self.assertRaisesRegex(RuntimeError,'^Jamloom generation failed; no completed song was accepted.$'):
                worker.handler({'input':self.job})
            network.assert_not_called()
        self.assertFalse(paths[-1].exists())

    def test_variable_lengths_and_invalid_requests(self):
        for product,seconds in [('music-dna',100),('music-dna',140),('improvise',30),('improvise',45)]:
            job=copy.deepcopy(self.job);job['product']=product
            if product=='improvise':
                job['payload']={'voice':'male','genre':'jazz','consent':True}
                job['source']={'url':URL.replace('11111111-1111','22222222-1111'),'bytes':44,'sha256':'a'*64}
            job['payload']['duration_seconds']=seconds
            def execute(work,timeout):
                with wave.open(str(work/'audio.wav'),'wb') as wav:
                    wav.setparams((2,2,48000,0,'NONE','not compressed'));wav.writeframes(b'\0\0'*2*48000*seconds)
                (work/'result.json').write_text('{}')
            class Response:
                status=200
                def __enter__(self):return self
                def __exit__(self,*args):pass
            class Opener:
                def open(self,*args,**kwargs):return Response()
            with patch.object(worker,'download'),patch.object(worker,'execute',side_effect=execute),patch('urllib.request.build_opener',return_value=Opener()):
                result=worker.handler({'input':job})
                self.assertEqual(result['seconds'],seconds);self.assertEqual(result['audio_bytes'],seconds*192000+44)
            for invalid in (True,0,141,46 if product=='improvise' else 99):
                job['payload']['duration_seconds']=invalid
                with self.assertRaises(ValueError):worker.validate(job)

    def test_source_receipt_is_verified(self):
        class Response(io.BytesIO):pass
        class Opener:
            def open(self,*args,**kwargs):return Response(b'wrong')
        with tempfile.TemporaryDirectory() as folder,patch('urllib.request.build_opener',return_value=Opener()):
            with self.assertRaises(ValueError):worker.download({'url':URL,'bytes':4,'sha256':'a'*64},Path(folder)/'input')

    def test_failure_diagnostics_expose_source_location_without_private_content(self):
        with tempfile.TemporaryDirectory() as folder:
            work=Path(folder)
            (work/'planner.log').write_text('File "/private/customer/scripts/music_dna_song.py", line 123\nValueError: private lyrics https://secret.invalid\n')
            self.assertEqual(worker.failure_location(work),'planner@music_dna_song.py:123')
            (work/'singer.log').write_text('private transcript without a traceback')
            self.assertEqual(worker.failure_location(work),'singer@unavailable')
            (work/'failure.json').write_text(json.dumps({'stage':'checking','returncode':-9}))
            self.assertEqual(worker.failure_location(work),'checking-exit--9')
            (work/'status.json').write_text(json.dumps({'state':'rejected'}))
            self.assertEqual(worker.failure_location(work),'style-rejected')
            (work/'fit.json').write_text(json.dumps({'matching_windows':2,'private':'lyrics must not leak'}))
            self.assertEqual(worker.failure_location(work),'style-rejected:matched-2-of-4')
            (work/'status.json').unlink();(work/'failure.json').write_text(json.dumps({'stage':'checking','reason':'timeout'}))
            self.assertEqual(worker.failure_location(work),'checking-timeout')

    def test_improvise_failure_reports_inner_stage_without_private_content(self):
        with tempfile.TemporaryDirectory() as folder:
            work=Path(folder);job=work/'improvise'/'job';job.mkdir(parents=True)
            (work/'private.log').write_text('File "/private/scripts/singer_studio.py", line 223\n')
            (job/'failure.json').write_text(json.dumps({'stage':'Writing the lyrics','error_type':'CalledProcessError'}))
            (job/'draft-private.log').write_text('File "/private/customer/scripts/singing_response.py", line 311\nValueError: private words https://secret.invalid\n')
            self.assertEqual(worker.failure_location(work),'improvise-lyrics@singing_response.py:311')
            (job/'draft-private.log').unlink()
            self.assertEqual(worker.failure_location(work),'improvise-lyrics')
            (job/'failure.json').write_text(json.dumps({'stage':'Blending your sound into the song'}))
            self.assertEqual(worker.failure_location(work),'improvise-arrangement')
            (job/'failure.json').write_text(json.dumps({'stage':'private words https://secret.invalid'}))
            self.assertEqual(worker.failure_location(work),'private@singer_studio.py:223')

    def test_timeout_kills_descendants_and_waits(self):
        from subprocess import TimeoutExpired
        with tempfile.TemporaryDirectory() as folder,patch.object(worker.subprocess,'Popen') as popen,patch.object(worker.os,'killpg') as kill:
            popen.return_value.pid=1234;popen.return_value.wait.side_effect=[TimeoutExpired('fixture',1),0]
            with self.assertRaisesRegex(worker.GenerationFailure,'worker-timeout'):worker.execute(Path(folder),1)
            kill.assert_called_once_with(1234,worker.signal.SIGKILL)
            self.assertTrue(popen.call_args.kwargs['start_new_session'])
            self.assertEqual(popen.call_args.args[0][0],str(ROOT/'build-style-training/upstream/.venv/bin/python'))

    def test_identity_wrapper_preserves_child_location_without_private_text(self):
        with tempfile.TemporaryDirectory() as folder:
            work=Path(folder);job=work/'improvise'/'job';job.mkdir(parents=True)
            (job/'failure.json').write_text(json.dumps({'stage':'Generating the singer and music'}))
            log=job/'render-private.log'
            log.write_text('Traceback (most recent call last):\n  File "/private/customer/convert_voice.py", line 88\nValueError: PRIVATE recording details\nTraceback (most recent call last):\n  File "/app/scripts/vocal_identity.py", line 142\nRuntimeError: Singer identity conversion failed\n')
            self.assertEqual(worker.failure_location(work),'improvise-singing@convert_voice.py:88')
            log.write_text('Traceback (most recent call last):\n  File "/app/scripts/vocal_identity.py", line 142\nRuntimeError: Singer identity conversion failed\n')
            self.assertEqual(worker.failure_location(work),'improvise-singing@vocal_identity.py:142')

    def test_cuda_planner_keeps_greedy_language_selection_and_bounds_output(self):
        from singing_response import planner_functions,inference_device
        from types import SimpleNamespace
        options=[]
        class Inputs(dict):
            def to(self,device):self.device=device;return self
        inputs=Inputs(input_ids=SimpleNamespace(shape=(1,3)))
        tokenizer=SimpleNamespace(__call__=lambda *args,**kw:inputs)
        class Tokenizer:
            def __call__(self,*args,**kw):return inputs
            def decode(self,tokens,**kw):return 'result'
        model=SimpleNamespace(generate=lambda **kw:options.append(kw) or [[0,1,2,3]])
        import contextlib
        torch=SimpleNamespace(manual_seed=lambda seed:None,inference_mode=contextlib.nullcontext)
        with patch.dict(os.environ,{'JAMLOOM_INFERENCE_DEVICE':'cuda'}),patch.dict(sys.modules,{'torch':torch}):
            seed,generate,sampler=planner_functions()
            generate(model,Tokenizer(),prompt='private',max_tokens=1500,sampler=sampler(temp=0))
            self.assertFalse(options[-1]['do_sample']);self.assertNotIn('temperature',options[-1])
            generate(model,Tokenizer(),prompt='private',max_tokens=4000,sampler=sampler(temp=.75,top_p=.9))
            self.assertEqual(options[-1]['temperature'],.75);self.assertEqual(options[-1]['max_new_tokens'],4000)
        with patch.dict(os.environ,{'JAMLOOM_INFERENCE_DEVICE':'cpu'}),self.assertRaises(ValueError):inference_device()


if __name__ == '__main__':unittest.main()
