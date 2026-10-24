import json
from pathlib import Path
import sys
import tempfile
import subprocess
import unittest
from unittest.mock import patch

import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from local_call_edit import add_call, blend_patch, edit, replace_vocal, arrange, rank_options, read_history, arrangement_options, mix_calls, performance_options, match_call_tone, fit_call_rhythm
from source_led_response import faded
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

    def test_rhythm_preserves_pitch_and_repeats_only_the_original_word(self):
        t=np.arange(2*RATE)/RATE
        hook=faded(np.repeat((.1*np.sin(2*np.pi*180*t))[:,None],2,axis=1));saved=hook.copy()
        for ratio in (.8,1.,1.25):
            pcm=fit_call_rhythm(hook,{'duration_ratio':ratio})
            self.assertEqual(len(pcm),round(len(hook)*ratio))
            hz=np.fft.rfftfreq(len(pcm),1/RATE)[np.argmax(abs(np.fft.rfft(pcm[:,0])))]
            self.assertLess(abs(hz-180),2)
        repeat=round(2.5*RATE);word=[round(1.5*RATE),2*RATE]
        pcm=fit_call_rhythm(hook,{'duration_ratio':1.1,'word_frames':word,'repeat_offset_frames':repeat})
        np.testing.assert_array_equal(pcm[repeat:],faded(hook[word[0]:word[1]])*.72)
        np.testing.assert_array_equal(hook,saved)
        for recipe in ({'duration_ratio':float('nan')},{'duration_ratio':.79},
                       {'duration_ratio':True},{'duration_ratio':1,'repeat_offset_frames':repeat},
                       {'duration_ratio':1,'word_frames':[-1,RATE],'repeat_offset_frames':repeat},
                       {'duration_ratio':1,'word_frames':word,'repeat_offset_frames':RATE}):
            with self.assertRaises(ValueError):fit_call_rhythm(hook,recipe)
        with patch('local_call_edit.subprocess.run',return_value=subprocess.CompletedProcess([],0,stdout=b'broken')):
            with self.assertRaises(ValueError):fit_call_rhythm(hook,{'duration_ratio':1})

    def test_automatic_rhythm_is_source_bound_and_unavailable_transform_falls_back(self):
        score=self.root/'source.json'
        metadata={'sample_rate':RATE,'source':{'sha256':digest(self.hook),'processed_frames':2*RATE},
                  'rhythm_word_frames':[round(1.5*RATE),2*RATE]}
        score.write_text(json.dumps(metadata))
        grid={'bpm':120.,'offset_frames':0,'confidence':1.}
        prefer=lambda options,history,seed:sorted(options,key=lambda c:c.get('treatment')!='word-reply')
        with patch('local_call_edit.beat_grid',return_value=grid),patch('local_call_edit.rank_options',side_effect=prefer):
            result=arrange(self.hook,self.song_dir,self.root/'rhythm',self.root/'history',42,True,score)
        self.assertEqual(result['pattern'],'word-reply')
        self.assertEqual(result['source_rhythm']['input_sha256'],digest(self.hook))
        self.assertEqual(result['source_sha256'],digest(self.hook))
        self.assertEqual(result['outside_region_max_pcm_error'],0)
        self.assertLess(result['peak'],.98)
        with patch('local_call_edit.beat_grid',return_value=grid),\
                patch('local_call_edit.fit_call_rhythm',side_effect=subprocess.CalledProcessError(1,'ffmpeg')):
            fallback=arrange(self.hook,self.song_dir,self.root/'plain',self.root/'history',43,True,score)
        self.assertNotIn('source_rhythm',fallback);self.assertEqual(fallback['rhythm_fallback'],'CalledProcessError')
        for change in ({'source':{'sha256':'wrong','processed_frames':2*RATE}}, {'rhythm_word_frames':[0,3*RATE]}):
            score.write_text(json.dumps({**metadata,**change}))
            with self.assertRaises(ValueError):arrange(self.hook,self.song_dir,self.root/'invalid',self.root/'history',44,True,score)
        self.assertFalse((self.root/'invalid').exists())

    def test_longest_improvise_preserves_music_outside_the_call(self):
        song=np.tile(self.song,(2,1))[:45*RATE]
        write_pcm(self.song_dir/'singer.wav',song)
        sha=digest(self.song_dir/'singer.wav')
        (self.song_dir/'complete.json').write_text(json.dumps({'technical':'PASS','audio_sha256':sha,'case':{'bpm':90,'duration':45}}))
        vocals=np.zeros_like(song,dtype=np.float32)
        np.save(self.song_dir/'stems/vocals.npy',vocals)
        (self.song_dir/'stems/complete.json').write_text(json.dumps({'technical':'PASS','source_sha256':sha,'stems':{'vocals':digest(self.song_dir/'stems/vocals.npy')}}))
        output=self.root/'long-edit'
        edit(self.song_dir,self.hook,output,38,True)
        actual=read_pcm(output/'performance.wav',(45,45))
        original=read_pcm(self.song_dir/'singer.wav',(45,45))
        np.testing.assert_array_equal(actual[:38*RATE],original[:38*RATE])
        np.testing.assert_array_equal(actual[40*RATE:],original[40*RATE:])

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

    def test_tone_processing_keeps_pitch_length_and_source_while_reducing_rumble(self):
        time=np.arange(2*RATE)/RATE
        signal=.05*np.sin(2*np.pi*180*time)+.03*np.sin(2*np.pi*25*time)
        source=np.repeat(signal[:,None],2,axis=1);before=source.copy()
        reference=np.repeat((.08*np.sin(2*np.pi*180*time))[:,None],2,axis=1)
        processed,report=match_call_tone(source,reference)
        np.testing.assert_array_equal(source,before);self.assertEqual(processed.shape,source.shape)
        spectrum=np.abs(np.fft.rfft(processed[:,0]));frequencies=np.fft.rfftfreq(len(processed),1/RATE)
        self.assertEqual(frequencies[np.argmax(spectrum)],180)
        self.assertLess(spectrum[np.argmin(abs(frequencies-25))]/spectrum[np.argmin(abs(frequencies-180))],.2)
        self.assertTrue(all(abs(db)<=6 for db in report['eq_db']))
        self.assertEqual(report['pitch_shift_semitones'],0);self.assertEqual(report['formant_shift_semitones'],0)
        self.assertLessEqual(report['max_compression_db'],9);self.assertLessEqual(report['room_wet'],.06)
        self.assertFalse(np.array_equal(processed,source));self.assertTrue(np.isfinite(processed).all())
        for scale in (.001,.005,.01):
            try:
                quiet,_=match_call_tone(source*scale,reference)
                self.assertTrue(np.isfinite(quiet).all())
            except ValueError:pass
        for bad in (source*np.nan,np.zeros_like(source),source[:,0],source[:1]):
            with self.assertRaises(ValueError):match_call_tone(bad,reference)

    def test_level_tracks_local_music_and_compression_smooths_loud_syllables(self):
        hook=read_pcm(self.hook,(2,2));hook[len(hook)//2:]*=.15
        processed,report=match_call_tone(hook,np.zeros_like(hook))
        def contrast(pcm):
            return np.sqrt(np.mean(pcm[RATE//4:RATE*3//4]**2))/np.sqrt(np.mean(pcm[RATE*5//4:RATE*7//4]**2))
        self.assertLess(contrast(processed),contrast(hook));self.assertGreater(report['max_compression_db'],0)
        events=[]
        for volume in (.5,1):
            mixed,voice,event=add_call(self.song*volume,hook,10*RATE,np.zeros_like(self.song))
            events.append(event);self.assertLess(np.max(np.abs(mixed)),.98)
            self.assertAlmostEqual(event['processed_active_rms'],event['target_lead_rms'],places=6)
        self.assertAlmostEqual(events[1]['target_lead_rms']/events[0]['target_lead_rms'],2)

    def test_tone_matching_reduces_a_nasal_recording_without_changing_its_pitch(self):
        t=np.arange(2*RATE)/RATE
        low=np.sin(2*np.pi*200*t);nasal=np.sin(2*np.pi*1600*t)
        source=np.repeat((.04*low+.12*nasal)[:,None],2,axis=1)
        reference=np.repeat((.08*low+.02*nasal)[:,None],2,axis=1)
        processed,report=match_call_tone(source,reference)
        def ratio(pcm):
            spectrum=np.abs(np.fft.rfft(pcm[:,0]))
            return spectrum[3200]/spectrum[400]
        self.assertLess(ratio(processed),ratio(source)*.6)
        self.assertGreater(ratio(processed),ratio(reference))
        self.assertEqual(processed.shape,source.shape)
        self.assertEqual(report['version'],2)
        _,silent_reference=match_call_tone(source,np.zeros_like(reference))
        self.assertEqual(silent_reference['eq_db'],[0.]*6)

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
        self.assertLessEqual(result['processed_source_max_pcm_error'],.5/32768+1e-12)
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
            with self.assertRaisesRegex(ValueError,'No safe source-inclusive'):
                arrange(self.hook,self.song_dir,self.root/'fallback',history,43,True)
        self.assertFalse((self.root/'fallback').exists())
        self.assertEqual(history.read_bytes(),before)
        with self.assertRaises(ValueError):arrange(self.hook,self.song_dir,self.root/'no-consent',history,44)
        self.assertFalse((self.root/'no-consent').exists())
        for content in ('broken','{}','"string"','[]'*9000):
            history.write_text(content);self.assertEqual(read_history(history),[])

    def test_repeated_calls_preserve_music_and_reject_clashes(self):
        result=edit(self.song_dir,self.hook,self.root/'repeats',10,True,repeat_at=[13,16])
        self.assertEqual(len(result['events']),3)
        self.assertEqual(result['outside_region_max_pcm_error'],0)
        self.assertEqual(result['unchanged_seconds'],24)
        self.assertLessEqual(result['processed_source_max_pcm_error'],.5/32768+1e-12)
        hook=read_pcm(self.hook,(2,2))
        for repeats in ([10.5],[5],[29],[13,16,19],[float('nan')]):
            with self.assertRaises(ValueError):mix_calls(self.song,hook,10*RATE,self.vocals,repeats)
        with self.assertRaises(ValueError):mix_calls(self.song,hook,RATE,self.vocals,[5])

    def test_loops_fit_before_the_singer_and_keep_single_options(self):
        hook=read_pcm(self.hook,(2,2));grid={'bpm':120,'offset_frames':0,'confidence':1}
        vocals=np.zeros_like(self.song);vocals[15*RATE:17*RATE]=self.song[15*RATE:17*RATE]
        base=arrangement_options(self.song,vocals,hook,grid)
        choices=performance_options(base,hook,grid,len(self.song))
        self.assertEqual(sum(c['pattern']=='single-call' for c in choices),len(base))
        accepted=[]
        for choice in choices:
            if choice['pattern']!='rhythmic-loop' or choice['replace_region']:continue
            try:mix_calls(self.song,hook,round(choice['call_at']*RATE),vocals,choice['repeat_at'])
            except ValueError:continue
            accepted.append(choice)
            starts=[choice['call_at'],*choice['repeat_at']]
            self.assertTrue(all(abs((b-a)*2-round((b-a)*2))<1e-5 for a,b in zip(starts,starts[1:])))
        self.assertTrue(accepted,'At least one actual loop must fit, not just an unplayable option')

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
