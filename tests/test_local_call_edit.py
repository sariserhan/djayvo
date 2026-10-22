import json
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from local_call_edit import add_call, blend_patch, edit, replace_vocal
from singing_response import source_conditioning


class LocalCallEdit(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        t=np.arange(30*RATE)/RATE
        self.song=np.repeat((.12*np.sin(2*np.pi*110*t))[:,None],2,axis=1)
        self.vocals=np.zeros_like(self.song,dtype=np.float32)
        self.vocals[5*RATE:7*RATE]=self.song[5*RATE:7*RATE]*.7
        self.song_dir=self.root/'song';(self.song_dir/'stems').mkdir(parents=True)
        write_pcm(self.song_dir/'singer.wav',self.song)
        self.song=read_pcm(self.song_dir/'singer.wav',(30,30))
        h=digest(self.song_dir/'singer.wav')
        (self.song_dir/'complete.json').write_text(json.dumps({'technical':'PASS','audio_sha256':h}))
        np.save(self.song_dir/'stems/vocals.npy',self.vocals)
        (self.song_dir/'stems/complete.json').write_text(json.dumps({'technical':'PASS','source_sha256':h,
            'stems':{'vocals':digest(self.song_dir/'stems/vocals.npy')}}))
        self.hook=self.root/'hook.wav';write_pcm(self.hook,self.song[:2*RATE])

    def tearDown(self):self.temp.cleanup()

    def test_repair_cannot_touch_outside_the_window_or_create_edge_steps(self):
        a,b=RATE,4*RATE
        generated=self.song*.8
        generated[:a]=.6;generated[b:]=-.6
        actual,gain=blend_patch(self.song,generated,a,b)
        np.testing.assert_array_equal(actual[:a],self.song[:a])
        np.testing.assert_array_equal(actual[b:],self.song[b:])
        np.testing.assert_array_equal(actual[[a,b-1]],self.song[[a,b-1]])
        self.assertAlmostEqual(gain,1.25)
        with self.assertRaises(ValueError):blend_patch(self.song,generated,-1,b)
        with self.assertRaises(ValueError):blend_patch(self.song,generated,a,a+RATE)
        with self.assertRaises(ValueError):blend_patch(self.song,np.zeros_like(self.song),a,b)

    def test_call_rejects_singing_and_bounds(self):
        hook=read_pcm(self.hook,(2,2))
        for start in (-1,29*RATE,5*RATE):
            with self.assertRaises(ValueError):add_call(self.song,hook,start,self.vocals)
        mixed,voice,event=add_call(self.song,hook,10*RATE,self.vocals)
        self.assertEqual(event['rate'],1)
        self.assertEqual(event['transpose_semitones'],0)
        self.assertLess(np.max(np.abs(mixed)),.98)
        np.testing.assert_array_equal(mixed[:10*RATE],self.song[:10*RATE])
        self.assertGreater(np.max(np.abs(voice)),0)

    def test_gap_edit_preserves_pcm_original_and_consent(self):
        out=self.root/'out'
        with self.assertRaises(ValueError):edit(self.song_dir,self.hook,out,10,False)
        self.assertFalse(out.exists())
        r=edit(self.song_dir,self.hook,out,10,True)
        self.assertEqual(r['outside_region_max_pcm_error'],0)
        self.assertEqual(r['unchanged_seconds'],28)
        self.assertEqual(digest(out/'music.wav'),digest(self.song_dir/'singer.wav'))
        self.assertFalse((out/'.partial').exists())
        with self.assertRaises(FileExistsError):edit(self.song_dir,self.hook,out,10,True)
        (self.song_dir/'stems/vocals.npy').write_bytes(b'changed')
        with self.assertRaises(ValueError):edit(self.song_dir,self.hook,self.root/'tampered',10,True)

    def test_repaint_configuration_is_bounded_and_instrumental(self):
        c={'audio':str(self.song_dir/'singer.wav'),'sha256':digest(self.song_dir/'singer.wav'),
           'bpm':84,'strength':.5,'instrumental':True,'direction':'Keep the backing, leave space.',
           'repaint':[1,4]}
        path=self.root/'config.json';path.write_text(json.dumps(c));source_conditioning(path)
        for span in ([0,30],[-1,4],[1,2],[1,float('nan')],[True,4],[],None):
            path.write_text(json.dumps({**c,'repaint':span}))
            with self.assertRaises(ValueError):source_conditioning(path)
        path.write_text(json.dumps({**c,'instrumental':False}))
        with self.assertRaises(ValueError):source_conditioning(path)

    def test_repaired_edit_binds_to_original_and_keeps_the_singer_in_place(self):
        import shutil
        repair=self.root/'repair';shutil.copytree(self.song_dir,repair)
        path=repair/'complete.json';r=json.loads(path.read_text())
        r.update(task_type='repaint',source_conditioning={'sha256':digest(self.song_dir/'singer.wav'),
            'instrumental':True,'repaint':[1,4]})
        path.write_text(json.dumps(r))
        result=edit(self.song_dir,self.hook,self.root/'edited',1.5,True,repair)
        self.assertEqual(result['mode'],'localized-repair')
        self.assertEqual(result['unchanged_seconds'],27)
        self.assertFalse(result['singer_moved'])
        original=read_pcm(self.song_dir/'singer.wav',(30,30))
        actual=read_pcm(self.root/'edited/performance.wav',(30,30))
        np.testing.assert_array_equal(actual[5*RATE:7*RATE],original[5*RATE:7*RATE])
        r['source_conditioning']['sha256']='wrong';path.write_text(json.dumps(r))
        with self.assertRaises(ValueError):edit(self.song_dir,self.hook,self.root/'wrong',1.5,True,repair)

    def test_vocal_replacement_is_local_and_preserves_the_real_call(self):
        a,b=round(4.8*RATE),round(7.2*RATE)
        music,remaining=replace_vocal(self.song,self.vocals,a,b)
        self.assertEqual(np.max(np.abs(remaining[5*RATE:7*RATE])),0)
        np.testing.assert_array_equal(music[:a],self.song[:a])
        np.testing.assert_array_equal(music[b:],self.song[b:])
        result=edit(self.song_dir,self.hook,self.root/'replacement',5,True,replace_region=[4.8,7.2])
        self.assertEqual(result['mode'],'vocal-replacement')
        self.assertEqual(result['outside_region_max_pcm_error'],0)
        self.assertAlmostEqual(result['unchanged_seconds'],27.6)
        self.assertLessEqual(result['source_identity_max_pcm_error'],.5/32768+1e-12)
        with self.assertRaises(ValueError):replace_vocal(self.song,self.vocals,0,30*RATE)
        with self.assertRaises(ValueError):edit(self.song_dir,self.hook,self.root/'outside',8,True,replace_region=[4.8,7.2])


if __name__=='__main__':unittest.main()
