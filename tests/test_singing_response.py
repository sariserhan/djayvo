import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from singing_response import CODE_REVISION, WEIGHT_REVISION, STYLES, STYLE_LABELS, VOCAL_PROFILES, SINGER_REFERENCES, cast_singer_reference, resolve_vocal_reference, isolated_vocal_reference, choose_vocal_profile, vocal_description, generated_vocal_reference, digest, caption, load_plan, validate_plan, variants, draft, validate_reply_lyrics
from assemble_sung_response import PATTERNS


class SingingPlans(unittest.TestCase):
    def test_reggae_lyric_writer_receives_word_direction_not_band_instructions(self):
        tokenizer=Mock();generate=Mock(return_value='[Verse]\nYou have a question, I am listening\nTake your time and tell me more\n[Chorus]\nWhat is the thing you want to know\nWe can work it out together')
        with tempfile.TemporaryDirectory() as folder,patch('singing_response.cast_singer_reference'),\
                patch('singing_response.lyric_model',return_value=(None,tokenizer,{'revision':'test'})),\
                patch('singing_response.planner_functions',return_value=(Mock(),generate,Mock())):
            output=Path(folder)/'plan.json'
            draft(Path(folder),'I have a question',42,output,'male','reggae',35)
            self.assertEqual(load_plan(output)['phrase'],'I have a question')
            message=tokenizer.apply_chat_template.call_args_list[0].args[0][-1]['content']
            self.assertIn('short conversational lines',message)
            self.assertIn('not instrument or performance instructions',message)
            self.assertIn('I have a question',message)
            self.assertNotIn('organ replies',message)

    def test_lyric_writer_bounds_invalid_output_retries(self):
        good = '[Verse]\nYou have a question, I am listening\nTake your time and tell me more\n[Chorus]\nWhat is the thing you want to know\nWe can work it out together'
        bad = '[Verse]\nEven if it is just a small, silly tide'
        for outputs, succeeds, calls in (([good],True,1),([bad,good],True,2),
                                         ([bad,'[Guitar solo]'],False,2)):
            tokenizer=Mock();generate=Mock(side_effect=outputs)
            with tempfile.TemporaryDirectory() as folder,patch('singing_response.cast_singer_reference'), \
                    patch('singing_response.lyric_model',return_value=(None,tokenizer,{'revision':'test'})), \
                    patch('singing_response.planner_functions',return_value=(Mock(),generate,Mock())):
                output=Path(folder)/'plan.json'
                if succeeds:
                    draft(Path(folder),'I have a question',42,output,'male','funk',35)
                    case=load_plan(output)['cases'][0]
                    self.assertEqual(case['lyrics'],good)
                    self.assertEqual(case['lyric_checks']['passes'],calls)
                else:
                    with self.assertRaises(ValueError):draft(Path(folder),'I have a question',42,output,'male','funk',35)
                    self.assertFalse(output.exists())
                self.assertEqual(generate.call_count,calls)
                edit=tokenizer.apply_chat_template.call_args_list[0].args[0]
                self.assertIn('Stay with what they actually said',edit[0]['content'])
                self.assertEqual(json.loads(edit[1]['content'])['listener'],'I have a question')
        self.assertNotIn('🕺',validate_reply_lyrics(good+' 🕺'))
        for invalid in (good+'\n[Instrumental]',good.replace('Take your time','(sing softly) Take your time'), 'word '*200):
            with self.assertRaises(ValueError):validate_reply_lyrics(invalid)

    def test_reggae_directs_the_singer_not_only_the_backing(self):
        for voice in ('male','female'):
            for profile in (None,*[p for p,v in VOCAL_PROFILES.items() if v[0]==voice]):
                case={'genre':'reggae','voice':voice}
                if profile:case['vocal_profile']=profile
                prompt=caption(case)
                self.assertLess(len(prompt),512)
                for phrase in ('Melodic reggae singing','syncopated phrases','offbeat pickups','space for band replies'):
                    self.assertIn(phrase,prompt)
                self.assertNotIn('soul singer',prompt);self.assertNotIn('legato',prompt)
                self.assertEqual(caption({**case,'song_caption':'Existing Music DNA direction'}),'Existing Music DNA direction')

    def test_isolated_reference_requires_bound_separator_stems(self):
        import numpy as np
        import soundfile as sf
        with tempfile.TemporaryDirectory() as folder,patch('singing_response.ROOT',Path(folder).resolve()):
            root=Path(folder).resolve();stems=root/'renders/original/stems';stems.mkdir(parents=True)
            manifest=root/'assets/manifests/singer-separation.json';manifest.parent.mkdir(parents=True);manifest.write_text('{"sha256":"pinned-separator"}')
            audio=stems/'vocals.npy';np.save(audio,np.full((48000*30,2),1.2,dtype=np.float32),allow_pickle=False)
            receipt={'technical':'PASS','source_sha256':'original-hash','model_sha256':'pinned-separator','stems':{'vocals':digest(audio)},'sample_rate':48000,'frames':48000*30}
            (stems/'complete.json').write_text(json.dumps(receipt))
            reference={'audio':str(stems.parent/'singer.wav'),'sha256':'original-hash','voice':'male'}
            dest=root/'reference.wav';result=isolated_vocal_reference(reference,dest)
            pcm,rate=sf.read(dest);self.assertEqual(rate,48000);self.assertEqual(pcm.shape,(48000*30,2));self.assertLessEqual(abs(pcm).max(),.98)
            self.assertEqual(result['source_audio_sha256'],'original-hash');self.assertEqual(result['sha256'],digest(dest))
            with self.assertRaises(FileExistsError):isolated_vocal_reference(reference,dest)
            for field,value in [('source_sha256','different'),('model_sha256','untrusted'),('stems',{'vocals':'changed'})]:
                (stems/'complete.json').write_text(json.dumps({**receipt,field:value}))
                with self.assertRaisesRegex(ValueError,'provenance'):isolated_vocal_reference(reference,root/'invalid.wav')
                self.assertFalse((root/'invalid.wav').exists())

    def test_accepted_references_preserve_gender_and_validate_pinned_assets(self):
        for key,expected in SINGER_REFERENCES.items():
            case={'voice':expected['voice'],'seed':42}
            with patch('singing_response.inference_device',return_value='mps'):
                cast_singer_reference(case)
            self.assertEqual(case['singer_reference'],key)
            reference={'audio':'fixture','voice':expected['voice'],'sha256':expected['sha256'],'receipt_sha256':expected['receipt_sha256']}
            with patch('singing_response.generated_vocal_reference',return_value=reference) as load:
                self.assertEqual(resolve_vocal_reference(case),reference)
                self.assertEqual(load.call_args.args[0].name,Path(expected['folder']).name)
                with self.assertRaisesRegex(ValueError,'override'):resolve_vocal_reference(case,Path('other'))
                for field in ('sha256','receipt_sha256'):
                    with patch('singing_response.generated_vocal_reference',return_value={**reference,field:'changed'}):
                        with self.assertRaisesRegex(ValueError,'changed'):resolve_vocal_reference(case)
            with patch('singing_response.generated_vocal_reference',side_effect=FileNotFoundError):
                with self.assertRaises(FileNotFoundError):resolve_vocal_reference(case)
            legacy={'voice':expected['voice'],'seed':42}
            with patch('singing_response.inference_device',return_value='cuda'):
                cast_singer_reference(legacy)
            self.assertNotIn('singer_reference',legacy)
            self.assertIsNone(resolve_vocal_reference(legacy))
        for key in ('private/path',[], 'voice-2'):
            plan=self.plan();case=plan['cases'][0];case.update(voice='female',vocal_profile='female-alto',singer_reference=key,id=case['genre']+'-female')
            with self.assertRaisesRegex(ValueError,'singer reference'):validate_plan(plan)

    def test_reference_research_requires_bound_unconditioned_synthetic_audio(self):
        with tempfile.TemporaryDirectory() as folder,patch('singing_response.ROOT',Path(folder).resolve()),patch('arrange_voice_research.read_pcm') as pcm:
            root=Path(folder).resolve()/'renders'/'original';root.mkdir(parents=True)
            (root/'singer.wav').write_bytes(b'fixture bytes; decoder is mocked')
            receipt={'technical':'PASS','model_code':CODE_REVISION,'weights':WEIGHT_REVISION,'source_conditioning':None,'trained_adapter':False,'case':{'duration':30,'voice':'male'},'audio_sha256':digest(root/'singer.wav')}
            (root/'complete.json').write_text(json.dumps(receipt))
            result=generated_vocal_reference(root);self.assertEqual(result['sha256'],receipt['audio_sha256']);pcm.assert_called_once_with(root/'singer.wav',(30,30))
            for field,value in [('audio_sha256','wrong'),('weights','unverified'),('source_conditioning',{'audio':'private'}),('vocal_reference',{'audio':'another'}),('trained_adapter',True)]:
                (root/'complete.json').write_text(json.dumps({**receipt,field:value}))
                with self.assertRaises(ValueError):generated_vocal_reference(root)
            with self.assertRaises(ValueError):generated_vocal_reference(Path(folder)/'private')

    def test_vocal_cast_varies_without_changing_language_or_requested_gender(self):
        selected={choose_vocal_profile(seed) for seed in range(100)}
        self.assertEqual(selected,set(VOCAL_PROFILES))
        for voice in ('female','male'):
            for seed in range(100):
                profile=choose_vocal_profile(seed,voice)
                self.assertEqual(VOCAL_PROFILES[profile][0],voice)
                self.assertEqual(profile,choose_vocal_profile(seed,voice))
        for c in variants(42):
            description=caption(c)
            self.assertLess(len(description),512)
            self.assertIn(VOCAL_PROFILES[c['vocal_profile']][1],description)
            self.assertIn('no robotic effects',description)
            self.assertIn('no speech narration',description)
        for profile in ('celebrity',[], 'female-alto'):
            with self.assertRaises(ValueError):vocal_description({'voice':'male','vocal_profile':profile})
        with self.assertRaises(ValueError):choose_vocal_profile(True)
        legacy={'genre':'jazz','voice':'female'}
        self.assertIn('adult female soul singer',caption(legacy))

    def plan(self):
        cases = variants(42)[:4]
        for c in cases:
            c['lyrics'] = '[Verse]\nYou have a question, I wanna know\nLet it out and let the rhythm flow'
        return {'schema': 'jamloom-sung-response-1', 'model_code': CODE_REVISION,
                'weights': WEIGHT_REVISION, 'phrase': 'I have a question', 'cases': cases}

    def test_voices_and_styles_are_independent_and_repeatable(self):
        cases = variants(42)
        self.assertEqual(cases, variants(42))
        self.assertEqual({(c['genre'], c['voice']) for c in cases},
                         {(genre,voice) for genre in STYLES for voice in ('male','female')})
        self.assertEqual(len(STYLES),23)
        self.assertEqual(set(STYLE_LABELS),set(STYLES))
        self.assertEqual(set(PATTERNS),set(STYLES))
        self.assertTrue({'EDM','DJ','Lo-fi','Jazz','Blues','Rap','Chill','Indie','Techno','Synthwave','Country'} <= set(STYLE_LABELS.values()))
        self.assertTrue(all(60 <= bpm <= 180 for bpm,_ in STYLES.values()))
        self.assertTrue(all(tuple(sorted(p)) == p and 0 <= min(p) < max(p) <= 5.5 for p in PATTERNS.values()))
        self.assertEqual(len({c['seed'] for c in cases}), 46)
        self.assertEqual({c['source_repetitions'] for c in cases}, {1, 2})
        self.assertTrue(all('singer' in caption(c) and 'no speech narration' in caption(c) for c in cases))
        for c in cases:
            c['lyrics']=self.plan()['cases'][0]['lyrics']
            p=self.plan();p['cases']=[c];validate_plan(p)

    def test_rap_delivery_differs_from_sung_hiphop(self):
        rap = caption({'genre':'rap','voice':'female'})
        hiphop = caption({'genre':'hiphop','voice':'female'})
        self.assertIn('rhythmic rap verses',rap)
        self.assertIn('short sung hook',rap)
        self.assertNotIn('connected legato phrases',rap)
        self.assertIn('connected legato phrases',hiphop)
        self.assertIn('no robotic effects',rap)

    def test_invalid_or_unbounded_plan_rejected(self):
        validate_plan(self.plan())
        for value in (None, [], 'invalid'):
            with self.assertRaises(ValueError): validate_plan(value)
            p = self.plan(); p['cases'] = [value]
            with self.assertRaises(ValueError): validate_plan(p)
        for field, value in [('id', '../outside'), ('voice', 'celebrity'), ('genre', 'unknown'),
                             ('seed', True), ('duration', float('nan')), ('bpm', 0),
                             ('source_repetitions', True), ('lyrics', '[Instrumental]'),
                             ('lyrics', 'word ' * 86), ('lyrics', 'bad\x00text')]:
            with self.subTest(field=field, value=value):
                p = self.plan(); p['cases'][0][field] = value
                with self.assertRaises(ValueError): validate_plan(p)
        p = self.plan(); p['cases'].append(copy.deepcopy(p['cases'][0]))
        with self.assertRaises(ValueError): validate_plan(p)
        for value in ('', 'x'*32001, None):
            p = self.plan(); p['phrase'] = value
            with self.assertRaises(ValueError): validate_plan(p)

    def test_revision_and_size_checks(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'plan.json'
            p.write_text(json.dumps(self.plan()))
            self.assertEqual(load_plan(p), self.plan())
            value = self.plan(); value['weights'] = 'main'
            with self.assertRaises(ValueError): validate_plan(value)
            p.write_text(' ' * 262145)
            with self.assertRaises(ValueError): load_plan(p)


if __name__ == '__main__':
    unittest.main()
