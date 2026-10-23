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
            (work/'result.json').write_text(json.dumps({'plan':{'title':'Fixture'},'fit':{'accepted':True}}))
        class Response:
            status=200
            def __enter__(self):return self
            def __exit__(self,*args):pass
        class Opener:
            def open(self,request,**kwargs):uploads.append(request);return Response()
        with patch.object(worker,'execute',side_effect=execute),patch('urllib.request.build_opener',return_value=Opener()):
            result=worker.handler({'input':self.job})
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

    def test_timeout_kills_descendants_and_waits(self):
        from subprocess import TimeoutExpired
        with tempfile.TemporaryDirectory() as folder,patch.object(worker.subprocess,'Popen') as popen,patch.object(worker.os,'killpg') as kill:
            popen.return_value.pid=1234;popen.return_value.wait.side_effect=[TimeoutExpired('fixture',1),0]
            with self.assertRaisesRegex(worker.GenerationFailure,'worker-timeout'):worker.execute(Path(folder),1)
            kill.assert_called_once_with(1234,worker.signal.SIGKILL)
            self.assertTrue(popen.call_args.kwargs['start_new_session'])
            self.assertEqual(popen.call_args.args[0][0],str(ROOT/'build-style-training/upstream/.venv/bin/python'))

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
