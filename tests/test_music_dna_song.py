import copy
import json
import tempfile
import subprocess
from unittest.mock import patch
from types import SimpleNamespace
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from music_dna_song import favorites, song_plan, parse_draft, run, draft, retry_direction, performance_caption, check_render
from singing_response import caption, digest, text_field, VOCAL_PROFILES
from dna_direction import direction_for
from dna_direction import POLICY
from dna_sound import unknown, sound_guidance
from dna_language import choose_language, COUNTRY_LANGUAGES, LANGUAGES
from evaluate_dna_variants import prepare as prepare_variant, verify as verify_variant


class MusicDnaSong(unittest.TestCase):
    def setUp(self):
        self.refs = favorites({'references': ['A — Artist One', 'B — Artist Two'],
                               'referenceMetadata': [{'reference': 'A — Artist One', 'genre': 'Soul'}]})
        self.data = {'title': 'A new day', 'summary': 'A warm, intimate direction, based partly on genre.',
                     'influences': [{'index': 1, 'basis': 'genre_only', 'description': 'Warm soul harmony'},
                                    {'index': 2, 'basis': 'unknown', 'description': 'Unknown recording'}],
                     'sound': 'Live brushed drums, warm piano and an expressive vocal crescendo',
                     'direction_id': 'soul', 'energy': direction_for(self.refs)['energy'], 'instruments': direction_for(self.refs)['instruments'], 'voice': 'female', 'bpm': 94,
                     'lyrics': '\n'.join('['+s+']\n'+'New days bring us closer to the light\n'*4
                                         for s in ['Verse 1', 'Chorus', 'Verse 2', 'Bridge', 'Chorus', 'Outro'])}

    def test_negative_style_exclusions_do_not_become_positive_instructions(self):
        from music_dna_song import affirmative_sound
        self.assertEqual(affirmative_sound('Heavy riffs. No soft elements or ambient textures. Live drums.','ambient'),'Heavy riffs. Live drums.')
        self.assertEqual(affirmative_sound('Dark ambient synths.','ambient'),'Dark ambient synths.')
        self.assertIn('ambient',affirmative_sound('No drums but ambient synths.','ambient'))
        self.assertEqual(affirmative_sound('No guitar. Warm piano.','ambient'),'No guitar. Warm piano.')

    def test_structured_lyrics_own_the_headers_and_chorus_without_changing_words(self):
        from music_dna_song import structured_lyrics, song_sections
        parts={'verse_1':['İlk sabah evden yola çıkıyoruz','Eski yollar bize yeni kapılar açar','Sokak boyunca rüzgar bize eşlik eder','Günden güne daha güçlü yürüyoruz'],
               'chorus':['Bu yol bizi birbirimize yakın tutar','Yeni güne birlikte umutla adım atarız','Uzaklarda bekleyen ışık bize yol gösterir','Yanımızda dostlar varken korku geride kalır'],
               'verse_2':['Akşam olur yeni bir eve varırız','Masada sıcak ekmek bizi bekler','Yarın için küçük hayaller kurarız','Pencereden geçen kuşları birlikte izleriz'],
               'bridge':['Bazen yağmur yürüyüşü yavaşlatır','Birlikte yine yola devam ederiz'], 'outro':['Günden güne aynı umutla yürürüz']}
        result=structured_lyrics(parts);song_sections(result)
        self.assertEqual(result.count('[Chorus]'),3)
        for line in parts['chorus']:self.assertEqual(result.count(line),3)
        self.assertEqual(structured_lyrics(result),result)
        for change in ({'verse_1':['bad']},{'bridge':['[Translated heading]','words']},{'outro':['bad\\q']},{'extra':[]}):
            with self.assertRaises(ValueError):structured_lyrics({**parts,**change})

    def test_full_song_uses_traits_and_all_favorites_without_sampling(self):
        plan = song_plan(self.data, self.refs, 123)
        case = plan['cases'][0]
        self.assertEqual(len(plan['cases']),1)
        self.assertTrue(100<=case['duration']<=140)
        self.assertEqual(case['duration'],song_plan(self.data,self.refs,123)['cases'][0]['duration'])
        self.assertEqual(case['bpm'], 94)
        self.assertEqual([n['reference'] for n in plan['influences']], [r['reference'] for r in self.refs])
        self.assertIn(self.data['sound'], caption(case))
        self.assertNotIn('Artist One', caption(case))
        self.assertNotIn('source_audio', plan)

    def test_duration_boundaries_and_retry_preserve_the_arrangement(self):
        from music_dna_song import retry_direction
        for seconds in (100,140):
            plan=song_plan(self.data,self.refs,123,duration=seconds)
            self.assertEqual(plan['cases'][0]['duration'],seconds)
            self.assertEqual(retry_direction(plan)['cases'][0]['duration'],seconds)
        for seconds in (99,141,True,120.5):
            with self.assertRaises(ValueError):song_plan(self.data,self.refs,123,duration=seconds)

    def test_sound_profiles_control_tempo_and_reach_the_singer_and_style_retry(self):
        tracks=[{**unknown(r),'basis':'familiar','confidence':'medium','energy':'high','pace':'fast','texture':'electric',
                 'groove':'syncopated','production':['raw'],'vocals':['powerful']} for r in self.refs]
        guidance=sound_guidance(tracks,direction_for(self.refs),12)
        data=copy.deepcopy(self.data);data['bpm']=guidance['bpm'][0]
        plan=song_plan(data,self.refs,12,all_refs=self.refs,track_profiles=tracks,guidance=guidance)
        self.assertEqual(plan['track_profiles'],tracks)
        for item in ('syncopated','electric','raw','powerful'):
            self.assertIn(item,plan['cases'][0]['song_caption'])
            self.assertIn(item,retry_direction(copy.deepcopy(plan))['cases'][0]['song_caption'])
        self.assertEqual(len(plan['influences']),len(tracks))
        self.assertTrue(all(n['confidence']=='medium' for n in plan['influences']))
        data['bpm']=direction_for(self.refs)['bpm'][0]
        with self.assertRaisesRegex(ValueError,'tempo range'):song_plan(data,self.refs,12,track_profiles=tracks,guidance=guidance)

    def test_research_variants_bind_the_actual_seed_and_reject_duplicate_audio(self):
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/'source';source.mkdir()
            plan=song_plan(self.data,self.refs,123)
            plan['sound_guidance']={'caption':'syncopated electric raw'}
            (source/'input.json').write_text(json.dumps({'direction':plan['direction'],'seed':123}))
            plan['input_sha256']=digest(source/'input.json');plan['seed']=999
            (source/'plan.json').write_text(json.dumps(plan))
            work=Path(folder)/'take';variant=prepare_variant(source,work,124)
            self.assertEqual(variant['cases'][0]['seed'],124)
            self.assertNotIn('seed',variant)
            self.assertNotIn('singer_reference',variant['cases'][0])
            self.assertEqual(json.loads((source/'plan.json').read_text()),plan)
            self.assertEqual(variant['input_sha256'],digest(work/'input.json'))
            (work/'singer').mkdir();(work/'singer/singer.wav').write_bytes(b'fixture audio')
            receipt={'case':variant['cases'][0],'plan_sha256':digest(work/'plan.json'),'audio_sha256':digest(work/'singer/singer.wav')}
            (work/'singer/complete.json').write_text(json.dumps(receipt))
            seen=set();verify_variant(work,124,seen)
            with self.assertRaisesRegex(ValueError,'Duplicate'):verify_variant(work,124,seen)
            with self.assertRaisesRegex(ValueError,'seed'):verify_variant(work,125,set())
            receipt['case']['seed']=123;(work/'singer/complete.json').write_text(json.dumps(receipt))
            with self.assertRaisesRegex(ValueError,'seed'):verify_variant(work,124,set())
            for profile in ('male-tenor','female-alto'):
                comparison=prepare_variant(source,Path(folder)/profile,123,profile)
                case=comparison['cases'][0]
                self.assertEqual(case['seed'],123)
                self.assertEqual(case['lyrics'],plan['cases'][0]['lyrics'])
                self.assertEqual(case['vocal_profile'],profile)
                self.assertIn(VOCAL_PROFILES[profile][1],case['song_caption'])
                self.assertIn('syncopated electric raw',case['song_caption'])
                self.assertEqual(case['voice'],VOCAL_PROFILES[profile][0])

    def test_retry_changes_direction_brief_but_preserves_lyrics_language_and_favorites(self):
        with patch('singing_response.inference_device',return_value='mps'):
            plan = song_plan(self.data, self.refs, 123)
        before = copy.deepcopy(plan)
        retried = retry_direction(plan)
        self.assertEqual(retried['cases'][0]['seed'],124)
        for key in ('lyrics','bpm','voice','vocal_language','vocal_profile','singer_reference'):
            self.assertEqual(retried['cases'][0][key],before['cases'][0][key])
        self.assertEqual(retried['favorites'],before['favorites'])
        self.assertNotEqual(retried['cases'][0]['song_caption'],before['cases'][0]['song_caption'])
        self.data['sound']='A gentle 72 bpm groove'
        with self.assertRaisesRegex(ValueError,'selected BPM'):
            song_plan(self.data,self.refs,123)

    def test_reference_comparisons_are_bounded_before_writing_output(self):
        from evaluate_dna_variants import evaluate
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder)/'output'
            for refs,voices in [([],False),([Path('one')],False),([Path('one')]*9,False),([Path('one')]*2,True)]:
                with self.assertRaisesRegex(ValueError,'two to eight'):
                    evaluate(Path(folder),output,1,voices,refs)
                self.assertFalse(output.exists())

    def test_every_style_keeps_essential_controls_within_singer_text_budget(self):
        for direction in POLICY['directions']:
            for code in LANGUAGES:
                for profile,(voice,tone) in VOCAL_PROFILES.items():
                    case={'bpm':direction['bpm'][0],'voice':voice,'vocal_language':code,'vocal_profile':profile}
                    for retry in (False,True):
                        caption=performance_caption(direction,case,'Rich developing instrumental arrangement. '*100,retry=retry)
                        self.assertLess(len(caption),512)
                        for essential in (direction['label'],str(case['bpm']),LANGUAGES[code],tone,*direction['instruments']):self.assertIn(essential,caption)

    def test_checker_retries_interruption_on_same_audio_but_not_validation_errors(self):
        for error in (subprocess.CalledProcessError(-9,['checker']),subprocess.TimeoutExpired(['checker'],90)):
            with tempfile.TemporaryDirectory() as folder:
                work=Path(folder);audio=work/'singer.wav';audio.write_bytes(b'unchanged rendered song')
                with patch('music_dna_song.subprocess.run',side_effect=[error,None]) as process:check_render(work,{})
                self.assertEqual(process.call_count,2);self.assertEqual(audio.read_bytes(),b'unchanged rendered song')
                self.assertTrue(all('check_dna_audio.py' in call.args[0][1] for call in process.call_args_list))
        with tempfile.TemporaryDirectory() as folder,patch('music_dna_song.subprocess.run',side_effect=subprocess.CalledProcessError(1,['checker'])) as process:
            with self.assertRaises(subprocess.CalledProcessError):check_render(Path(folder),{})
            self.assertEqual(process.call_count,1)

    def test_rejects_missing_evidence_unbounded_plans_and_unknown_only_lists(self):
        for field, value in [('influences', []), ('bpm', True), ('bpm', 190), ('voice', 'celebrity'),
                             ('sound', 'Clone Artist One'), ('lyrics', '[Instrumental]'),
                             ('lyrics', 'word '*110), ('lyrics', 'word '*400), ('title', '\x00bad')]:
            with self.subTest(field=field):
                data = copy.deepcopy(self.data);data[field] = value
                with self.assertRaises(ValueError):song_plan(data, self.refs, 1)
        for note in self.data['influences']:note['basis'] = 'unknown'
        with self.assertRaisesRegex(ValueError, 'Could not recognize'):song_plan(self.data, self.refs, 1)

    def test_metadata_must_belong_to_favorites_and_cannot_invent_genre(self):
        with self.assertRaises(ValueError):favorites({'references': ['hello'], 'referenceMetadata': [{'reference': 'other', 'genre': 'Jazz'}]})
        self.data['influences'][1]['basis'] = 'genre_only'
        with self.assertRaisesRegex(ValueError, 'needs a genre'):song_plan(self.data, self.refs, 1)
        for value in (None, {}, {'references': []}, {'references': ['x'*161]}):
            with self.assertRaises(ValueError):favorites(value)

    def test_formatting_recovery_and_styles_beyond_the_reply_catalogue(self):
        self.assertEqual(parse_draft('```json\n{"title":"Test"}\n```'), {'title': 'Test'})
        self.assertEqual(parse_draft('{"title":"Test"}"}'), {'title': 'Test'})
        with self.assertRaises(ValueError):parse_draft('{"title":"Test"} unrelated extra prose')
        with self.assertRaises(ValueError):parse_draft('{"title":')
        self.data['direction_id'] = 'electronic'
        self.assertEqual(parse_draft('{"lyrics":{"outro":["last line"]"}}'), {'lyrics':{'outro':['last line']}})
        self.assertEqual(parse_draft('{"a":{"b":"hello]"}}'), {'a':{'b':'hello]'}})
        with self.assertRaisesRegex(ValueError, 'required musical direction'):song_plan(self.data, self.refs, 1)

    def test_style_retry_is_bounded_and_preserves_rejected_evidence(self):
        for accepted in ([False,True],[False,False],[True]):
            with self.subTest(accepted=accepted), tempfile.TemporaryDirectory() as folder:
                work=Path(folder)
                profile={'references':[r['reference'] for r in self.refs], 'referenceMetadata':[{'reference':self.refs[0]['reference'],'genre':'Soul'}]}
                (work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction_for(self.refs),'seed':123}))
                rendered=[]
                def process(command, **kwargs):
                    phase = json.loads((work/'status.json').read_text())['phase']
                    if command[2]=='draft':
                        self.assertEqual(phase, 'writing')
                        plan=song_plan(copy.deepcopy(self.data),self.refs,123)
                        plan['input_sha256']=digest(work/'input.json')
                        (work/'plan.json').write_text(json.dumps(plan))
                    elif 'singing_response.py' in command[1]:
                        self.assertEqual(phase, 'retrying' if rendered else 'composing')
                        rendered.append(json.loads((work/'plan.json').read_text())['cases'][0]['seed'])
                        (work/'singer').mkdir();(work/'singer/singer.wav').write_bytes(b'fixture')
                    else:
                        self.assertEqual(phase, 'checking')
                        (work/'fit.json').write_text(json.dumps({'accepted':accepted[len(rendered)-1]}))
                with patch('music_dna_song.subprocess.run',side_effect=process):run(work)
                self.assertEqual(rendered,[123] if len(accepted)==1 else [123,124])
                self.assertEqual(json.loads((work/'status.json').read_text())['state'],'completed' if any(accepted) else 'rejected')
                if not accepted[0]:
                    self.assertEqual((work/'rejected-1/input.json').read_bytes(),(work/'input.json').read_bytes())
                    self.assertEqual(json.loads((work/'rejected-1/plan.json').read_text())['cases'][0]['seed'],123)

    def test_heavy_list_cannot_be_softened_by_the_planner(self):
        refs = [{'reference': 'Heavy favorite', 'catalogue_genre': 'Metal'}]
        direction = direction_for(refs)
        self.data.update(direction_id=direction['id'],energy=direction['energy'],instruments=direction['instruments'],bpm=140)
        self.data['sound'] = 'A slow piano ballad with whisper vocals'
        with self.assertRaisesRegex(ValueError, 'contradicts'):song_plan(self.data, refs, 1)

    def test_language_evidence_and_production_constraints(self):
        with self.assertRaisesRegex(ValueError,'arrangement contains 201 characters; use at most 200'):text_field('x'*201,200,'arrangement')
        self.data['influences'][0]['basis']='a translated genre label'
        self.assertEqual(song_plan(self.data,self.refs,1)['influences'][0]['basis'],'genre_only')
        with self.assertRaisesRegex(ValueError,'requested singing language'):song_plan(self.data,self.refs,1,'tr')
        self.data['sound']='Мы идём домой и поём нашу песню'
        with self.assertRaisesRegex(ValueError,'in English'):song_plan(self.data,self.refs,1)
        self.data['sound']='Expressive soul band and warm piano'
        self.data['musical_traits']={k:'An expressive soulful performance' for k in ('groove','texture','harmony','vocal_delivery','arrangement')}
        self.data['musical_traits']['texture']='The backing band of Artist One'
        with self.assertRaisesRegex(ValueError,'without artist names'):song_plan(self.data,self.refs,1)

    def test_lyric_repair_preserves_the_validated_musical_direction(self):
        data=copy.deepcopy(self.data);data['lyrics']='[Verse 1]\nToo short'
        outputs=iter([json.dumps(data),json.dumps({'lyrics':self.data['lyrics']})]);prompts=[]
        def generate(*args,**kwargs):
            messages=json.loads(kwargs['prompt'])
            if messages[0]['content'].startswith('Describe how each'):
                batch=json.loads(messages[1]['content'])['favorites']
                return json.dumps({'tracks':[{'index':i+1,**unknown(ref)} for i,ref in enumerate(batch)]})
            prompts.append(kwargs['prompt']);return next(outputs)
        mx=SimpleNamespace(random=SimpleNamespace(seed=lambda _:None))
        tokenizer=SimpleNamespace(apply_chat_template=lambda messages,**kwargs:json.dumps(messages))
        modules={'mlx':SimpleNamespace(core=mx),'mlx.core':mx,'mlx_lm':SimpleNamespace(generate=generate),'mlx_lm.sample_utils':SimpleNamespace(make_sampler=lambda **kwargs:None)}
        with tempfile.TemporaryDirectory() as folder,patch.dict(sys.modules,modules),patch('music_dna_song.lyric_model',return_value=(None,tokenizer,{'revision':'fixture'})):
            work=Path(folder);profile={'references':[r['reference'] for r in self.refs],'referenceMetadata':[{'reference':self.refs[0]['reference'],'genre':'Soul'}],'vocalLanguage':'en'}
            (work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction_for(self.refs),'seed':123}))
            draft(work);plan=json.loads((work/'plan.json').read_text())
            self.assertEqual(len(prompts),2);self.assertIn('draft_lyrics',prompts[1]);self.assertNotIn('Artist One',prompts[1])
            self.assertEqual(plan['direction']['id'],'soul');self.assertEqual(plan['cases'][0]['lyrics'],self.data['lyrics'])
        data=copy.deepcopy(self.data);data['sound']='Мы идём домой и поём нашу песню'
        outputs=iter([json.dumps(data),json.dumps(self.data)]);prompts.clear()
        with tempfile.TemporaryDirectory() as folder,patch.dict(sys.modules,modules),patch('music_dna_song.lyric_model',return_value=(None,tokenizer,{'revision':'fixture'})):
            work=Path(folder);(work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction_for(self.refs),'seed':123}))
            draft(work);self.assertNotIn('draft_lyrics',prompts[1]);self.assertIn('in English',prompts[1])

    def test_failed_description_is_explicit_unknown_without_blocking_songwriting(self):
        rows=[{'index':1,**unknown(self.refs[0]),'basis':'Soul'},{'index':2,**unknown(self.refs[1])}]
        outputs=iter([json.dumps({'tracks':rows})]*2+[json.dumps(self.data)])
        tokenizer=SimpleNamespace(apply_chat_template=lambda messages,**kwargs:json.dumps(messages))
        with tempfile.TemporaryDirectory() as folder,patch('music_dna_song.planner_functions',return_value=(lambda _:None,lambda *a,**k:next(outputs),lambda **_:None)),patch('music_dna_song.lyric_model',return_value=(None,tokenizer,{'revision':'fixture'})):
            work=Path(folder);profile={'references':[r['reference'] for r in self.refs],'referenceMetadata':[{'reference':self.refs[0]['reference'],'genre':'Soul'}],'vocalLanguage':'en'}
            (work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction_for(self.refs),'seed':1}))
            draft(work);plan=json.loads((work/'plan.json').read_text())
            self.assertTrue(plan['track_profiles'][0]['unavailable'])
            self.assertEqual(plan['sound_guidance']['described'],0)
            self.assertEqual(plan['influences'][0]['confidence'],'unknown')
            self.assertEqual(plan['track_profiles'][0]['instruments'],[])

    def test_weighted_language_draw_and_unknown_fallback(self):
        refs=[{'reference':str(i)} for i in range(6)]
        rows=[{'index':i+1,'language':code} for i,code in enumerate(['tr','en','en','tr','en',None])]
        draws=[choose_language(rows,refs,seed)['code'] for seed in range(10000)]
        self.assertLess(abs(draws.count('tr')/len(draws)-.4),.02)
        self.assertEqual(set(draws),{'en','tr'})
        self.assertTrue(any(a==b for a,b in zip(draws,draws[1:])))
        selected=choose_language(rows,refs,23)
        self.assertEqual(selected,choose_language(rows,refs,23))
        self.assertEqual(selected['counts'],{'en':3,'tr':2});self.assertEqual(selected['unknown'],1)
        unknown=choose_language([{'index':1,'language':None}],refs[:1],1)
        self.assertEqual(unknown['code'],'en');self.assertEqual(unknown['counts'],{})
        self.assertIn('fallback',unknown['basis'])
        for code in ('tr','es','ru','ja'):
            self.assertEqual(choose_language([{'index':1,'language':code}],refs[:1],1)['code'],code)

    def test_country_only_boosts_languages_already_present_in_mixed_favorites(self):
        refs=[{'reference':str(i)} for i in range(5)]
        rows=[{'index':i+1,'language':code} for i,code in enumerate(['tr','en','en','tr','en'])]
        normal=choose_language(rows,refs,1)
        turkey=choose_language(rows,refs,1,'TR')
        self.assertEqual(normal['probabilities'],{'en':.6,'tr':.4})
        self.assertEqual(turkey['probabilities'],{'en':.5,'tr':.5});self.assertEqual(turkey['regional_boost'],['tr'])
        for country in ('TR','RU','ZZ'):
            for seed in range(30):
                english=choose_language([{'index':1,'language':'en'}],refs[:1],seed,country)
                self.assertEqual(english['code'],'en');self.assertEqual(english['regional_boost'],[])
        self.assertEqual(choose_language(rows,refs,1,'RU'),normal)
        russian=choose_language([{'index':1,'language':'ru'},{'index':2,'language':'en'}],refs[:2],1,'RU')
        self.assertEqual(russian['probabilities'],{'en':.4,'ru':.6})
        for country in ('turkish',[],3):
            with self.assertRaises(ValueError):choose_language(rows,refs,1,country)
        self.assertTrue(all(code in LANGUAGES for codes in COUNTRY_LANGUAGES.values() for code in codes))

    def test_language_evidence_rejects_missing_unbound_or_unsupported_rows(self):
        for rows in (None,[],[{'index':2,'language':'en'}],[{'index':True,'language':'en'}],
                     [{'index':1}],[{'index':1,'language':'made-up'}],[{'index':1,'language':[]}],
                     [{'index':1,'language':'en'},{'index':1,'language':'tr'}]):
            with self.subTest(rows=rows),self.assertRaises(ValueError):choose_language(rows,[self.refs[0]],1)

    def test_auto_language_is_drawn_once_and_enforced_during_plan_repair(self):
        selected=copy.deepcopy(self.data);selected['vocal_language']='tr'
        outputs=iter(['{"tracks":[]}',json.dumps({'tracks':[{'index':i+1,**unknown(ref),'language':code} for i,(ref,code) in enumerate(zip(self.refs,['tr','en']))]}),
                      json.dumps(self.data),json.dumps(selected)])
        prompts=[]
        def generate(*args,**kwargs):prompts.append(kwargs['prompt']);return next(outputs)
        mx=SimpleNamespace(random=SimpleNamespace(seed=lambda _:None))
        tokenizer=SimpleNamespace(apply_chat_template=lambda messages,**kwargs:json.dumps(messages))
        modules={'mlx':SimpleNamespace(core=mx),'mlx.core':mx,'mlx_lm':SimpleNamespace(generate=generate),'mlx_lm.sample_utils':SimpleNamespace(make_sampler=lambda **kwargs:None)}
        with tempfile.TemporaryDirectory() as folder,patch.dict(sys.modules,modules),patch('music_dna_song.lyric_model',return_value=(None,tokenizer,{'revision':'fixture'})):
            work=Path(folder);profile={'references':[r['reference'] for r in self.refs],'referenceMetadata':[{'reference':self.refs[0]['reference'],'genre':'Soul'}]}
            (work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction_for(self.refs),'seed':0,'country':'TR'}))
            draft(work);plan=json.loads((work/'plan.json').read_text())
            self.assertEqual(len(prompts),4);self.assertIn('Keep the requested singing language',prompts[3])
            self.assertEqual(plan['language']['code'],'tr');self.assertEqual(plan['language']['counts'],{'en':1,'tr':1})
            self.assertEqual(plan['cases'][0]['vocal_language'],'tr');self.assertEqual(len(plan['cases']),1)
            self.assertEqual(json.loads((work/'language-selection.json').read_text())['selection'],plan['language'])

    def test_whole_playlist_language_and_direction_use_late_songs_with_bounded_prompts(self):
        refs=[{'reference':f'Track {i} — Singer {i}', 'catalogue_genre':'Pop' if i<20 else 'Soul'} for i in range(51)]
        batch_sizes=[]
        def generate(*args,**kwargs):
            messages=json.loads(kwargs['prompt']);data=json.loads(messages[1]['content'])
            if messages[0]['content'].startswith('Describe how each'):
                batch_sizes.append(len(data['favorites']))
                return json.dumps({'tracks':[{'index':i+1,**unknown(r),'basis':'familiar','confidence':'medium','pace':'fast','energy':'high','texture':'electric','groove':'syncopated','language':'en' if int(r['reference'].split()[1])<20 else 'tr'} for i,r in enumerate(data['favorites'])]})
            self.assertEqual(len(data['favorites']),10)
            self.assertEqual(data['required_direction']['total'],51)
            candidate=copy.deepcopy(self.data)
            candidate['energy']='high'
            candidate['instruments']=['synths']
            candidate['direction_id']='pop'
            candidate['vocal_language']=data['requested_language']
            candidate['bpm']=data['required_sound']['bpm'][0]
            self.assertEqual(data['required_sound']['selected']['count'],10)
            self.assertTrue(all(int(r['reference'].split()[1])>=20 for r in data['favorites']))
            candidate['influences']=[{'index':i+1,'basis':'genre_only','description':'Catalogue style informs the arrangement.'} for i in range(len(data['favorites']))]
            return json.dumps(candidate)
        tokenizer=SimpleNamespace(apply_chat_template=lambda messages,**kwargs:json.dumps(messages))
        with tempfile.TemporaryDirectory() as folder,patch('music_dna_song.planner_functions',return_value=(lambda _:None,generate,lambda **_:None)),patch('music_dna_song.lyric_model',return_value=(None,tokenizer,{'revision':'fixture'})):
            work=Path(folder)
            profile={'references':[r['reference'] for r in refs],'referenceMetadata':[{'reference':r['reference'],'genre':r['catalogue_genre']} for r in refs]}
            self.assertEqual(len(favorites(profile)),51)
            (work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction_for(refs),'seed':0}))
            draft(work);plan=json.loads((work/'plan.json').read_text())
            self.assertEqual(batch_sizes,[6,6])
            self.assertEqual(len(plan['track_profiles']),51)
            self.assertEqual(plan['sound_guidance']['total'],51)
            self.assertEqual(plan['sound_guidance']['described'],12)
            self.assertEqual(plan['sound_guidance']['interpreted'],12)
            self.assertIn('syncopated',plan['cases'][0]['song_caption'])
            self.assertEqual(plan['language']['counts'],{'en':2,'tr':10})
            self.assertEqual(plan['direction']['total'],51)
            self.assertEqual(plan['direction']['id'],'soul')
            self.assertIn(', '.join(direction_for(refs)['instruments']),plan['cases'][0]['song_caption'])
            self.assertEqual(len(plan['favorites']),51)
            self.assertEqual(len(plan['influences']),51)
            self.assertEqual(plan['direction']['families'][0]['count'],31)
            self.assertEqual(plan['direction']['energy'],direction_for(refs)['energy'])


if __name__ == '__main__':unittest.main()
