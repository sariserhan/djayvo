import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from local_call_edit import add_call, blend_patch, edit, replace_vocal, arrange, rank_options, read_history, arrangement_options
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
        (self.song_dir/'complete.json').write_text(json.dumps({'technical':'PASS','audio_sha256':h,'case':{'bpm':90}}))
        np.save(self.song_dir/'stems/vocals.npy',self.vocals)
        np.save(self.song_dir/'stems/drums.npy',np.zeros_like(self.vocals))
        (self.song_dir/'stems/complete.json').write_text(json.dumps({'technical':'PASS','source_sha256':h,
            'stems':{name:digest(self.song_dir/f'stems/{name}.npy') for name in ('vocals','drums')}}))
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

    def test_variety_does_not_force_alternation_and_is_reproducible(self):
        options=[{'mode':m,'fingerprint':f'{m}:{i}'} for m in ('existing-gap','vocal-replacement') for i in range(3)]
        history=[];modes=[];seen=[]
        for seed in range(40):
            order=rank_options(options,history,seed)
            self.assertEqual(order,rank_options(options,history,seed))
            selected=order[0];fp=selected['fingerprint']
            if history:self.assertNotEqual(fp,history[-1])
            history=([*history,fp])[-12:];modes.append(selected['mode']);seen.append(fp)
        self.assertEqual(len(set(seen)),6)
        for mode in ('existing-gap','vocal-replacement'):
            self.assertIn((mode,mode),list(zip(modes,modes[1:])))
        self.assertEqual(rank_options(options[:1],[options[0]['fingerprint']],1),options[:1])

    def test_automatic_edit_records_only_successful_choices(self):
        history=self.root/'history.json'
        first=arrange(self.hook,self.song_dir,self.root/'automatic',history,42,True)
        self.assertTrue(first['sample_used']);self.assertEqual(first['outside_region_max_pcm_error'],0)
        self.assertEqual(read_history(history),[first['arrangement_fingerprint']])
        before=history.read_bytes()
        with patch('local_call_edit.add_call',side_effect=ValueError('clash')):
            fallback=arrange(self.hook,self.song_dir,self.root/'fallback',history,43,True)
        self.assertFalse(fallback['sample_used'])
        self.assertEqual(fallback['arrangement_status'],'NO_SAFE_PLACEMENT')
        self.assertEqual(history.read_bytes(),before)
        self.assertEqual(digest(self.root/'fallback/performance.wav'),digest(self.song_dir/'singer.wav'))
        with self.assertRaises(ValueError):arrange(self.hook,self.song_dir,self.root/'no-consent',history,44)
        self.assertFalse((self.root/'no-consent').exists())
        for content in ('broken','{}','"string"','[]'*9000):
            history.write_text(content);self.assertEqual(read_history(history),[])

    def test_replacement_uses_isolated_phrases_and_leaves_a_reply(self):
        vocals=self.vocals.copy()
        vocals[12*RATE:14*RATE]=self.song[12*RATE:14*RATE]*.7
        grid={'bpm':90,'offset_frames':0,'confidence':0}
        hook=read_pcm(self.hook,(2,2))
        options=arrangement_options(self.song,vocals,hook,grid)
        replacements=[c for c in options if c['replace_region']]
        self.assertTrue(replacements)
        self.assertEqual(replacements[0]['replace_region'],[4.88,7.12])
        self.assertTrue(all(c['call_at']<12 for c in options))
        with patch('local_call_edit.rank_options',return_value=replacements), \
             patch('local_call_edit.stem',side_effect=lambda folder,name,receipt,shape: vocals if name=='vocals' else np.zeros_like(vocals)):
            # Persist matching stem evidence before the real edit validates it again.
            np.save(self.song_dir/'stems/vocals.npy',vocals)
            path=self.song_dir/'stems/complete.json';report=json.loads(path.read_text())
            report['stems']['vocals']=digest(self.song_dir/'stems/vocals.npy');path.write_text(json.dumps(report))
            result=arrange(self.hook,self.song_dir,self.root/'automatic-b',self.root/'history.json',7,True)
        self.assertEqual(result['mode'],'vocal-replacement')
        self.assertFalse(result['singer_moved']);self.assertEqual(result['outside_region_max_pcm_error'],0)


if __name__=='__main__':unittest.main()
