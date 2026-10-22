import json
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from singing_response import source_conditioning
from source_led_response import prepare, answer_guide, answer_phrases, arrangement, assemble


class SourceLedStudy(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root/'source.wav'
        t = np.arange(6*RATE)/RATE
        write_pcm(self.source, np.repeat((.2*np.sin(2*np.pi*220*t))[:,None],2,axis=1))
        self.work = self.root/'study'

    def tearDown(self):
        self.temp.cleanup()

    def prepared(self):
        prepare(self.source,self.work,1.,3.,'I have a question',True)

    def generated(self, name, vocals):
        folder=self.work/name; (folder/'stems').mkdir(parents=True)
        t=np.arange(30*RATE)/RATE
        band=np.repeat((.08*np.sin(2*np.pi*110*t))[:,None],2,axis=1)
        write_pcm(folder/'singer.wav',band+vocals)
        h=digest(folder/'singer.wav')
        (folder/'complete.json').write_text(json.dumps({'technical':'PASS','audio_sha256':h}))
        np.save(folder/'stems/vocals.npy',vocals.astype(np.float32))
        np.save(folder/'stems/drums.npy',np.zeros_like(vocals,dtype=np.float32))
        (folder/'stems/complete.json').write_text(json.dumps({'technical':'PASS','source_sha256':h,
            'stems':{n:digest(folder/f'stems/{n}.npy') for n in ('vocals','drums')}}))

    def test_source_guide_precedes_music_and_preserves_crop(self):
        self.prepared()
        self.assertEqual(digest(self.source),digest(self.work/'original.wav'))
        np.testing.assert_array_equal(read_pcm(self.work/'hook.wav',(2,2)),read_pcm(self.source,(6,6))[RATE:3*RATE])
        c=source_conditioning(self.work/'band-conditioning.json')
        self.assertEqual(c['bpm'],90)
        self.assertTrue(c['instrumental'])
        self.assertEqual(arrangement(self.work)['calls'],[round(4*2/3*RATE),round(20*2/3*RATE)])
        with self.assertRaises(FileExistsError): self.prepared()

    def test_consent_bounds_and_tampering_fail_closed(self):
        with self.assertRaises(ValueError): prepare(self.source,self.work,1,3,'phrase',False)
        self.assertFalse(self.work.exists())
        for a,b in [(-1,2),(1,20),(2,2),(float('nan'),3),(1,1.5)]:
            with self.assertRaises(ValueError): prepare(self.source,self.work,a,b,'phrase',True)
        self.prepared()
        path=self.work/'band-conditioning.json'; good=json.loads(path.read_text())
        for field,value in [('bpm',float('nan')),('strength',True),('strength',.1),('instrumental',1),('sha256','bad')]:
            path.write_text(json.dumps({**good,field:value}))
            with self.assertRaises(ValueError): source_conditioning(path)
        path=self.work/'arrangement.json'; p=json.loads(path.read_text());p['calls']=[-1,100]
        path.write_text(json.dumps(p))
        with self.assertRaises(ValueError): arrangement(self.work)

    def test_complete_phrases_are_not_cut_to_fit(self):
        vocals=np.zeros((30*RATE,2))
        t=np.arange(3*RATE)/RATE
        part=np.repeat((.12*np.sin(2*np.pi*220*t))[:,None],2,axis=1)
        vocals[2*RATE:5*RATE]=part;vocals[10*RATE:13*RATE]=part
        events=answer_phrases(vocals,[(6*RATE,10*RATE),(18*RATE,22*RATE)])
        self.assertEqual(len(events),2)
        for event in events: self.assertGreater(event['end_frame']-event['start_frame'],3*RATE)
        with self.assertRaises(ValueError): answer_phrases(vocals,[(0,2*RATE)])
        with self.assertRaises(ValueError): answer_phrases(np.zeros_like(vocals),[(0,5*RATE)])

    def test_actual_pcm_assembly_source_and_singer_do_not_overlap(self):
        self.prepared()
        self.generated('band',np.zeros((30*RATE,2)))
        answer_guide(self.work)
        with self.assertRaises(FileExistsError): answer_guide(self.work)
        vocals=np.zeros((30*RATE,2))
        t=np.arange(3*RATE)/RATE
        part=np.repeat((.12*np.sin(2*np.pi*220*t))[:,None],2,axis=1)
        vocals[2*RATE:5*RATE]=part;vocals[10*RATE:13*RATE]=part
        self.generated('singer',vocals)
        assemble(self.work)
        report=json.loads((self.work/'complete.json').read_text())
        self.assertEqual(report['source_singer_scheduled_overlap_frames'],0)
        self.assertLessEqual(report['source_identity_max_pcm_error'],.5/32768)
        self.assertLessEqual(report['peak'],.84)
        user=read_pcm(self.work/'user.wav',(30,30));reply=read_pcm(self.work/'reply.wav',(30,30))
        self.assertFalse(np.any(np.any(user!=0,axis=1)&np.any(reply!=0,axis=1)))
        perf=read_pcm(self.work/'performance.wav',(30,30));music=read_pcm(self.work/'music.wav',(30,30))
        self.assertLessEqual(np.max(np.abs(perf-music-user)),1/32768)
        self.assertFalse((self.work/'.partial').exists())
        with self.assertRaises(FileExistsError): assemble(self.work)


if __name__ == '__main__': unittest.main()
