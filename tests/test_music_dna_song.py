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
from singing_response import caption, digest, text_field
from dna_direction import direction_for
from dna_direction import POLICY
from dna_language import choose_language, COUNTRY_LANGUAGES, LANGUAGES


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

    def test_full_song_uses_traits_and_all_favorites_without_sampling(self):
        plan = song_plan(self.data, self.refs, 123)
        case = plan['cases'][0]
        self.assertEqual(len(plan['cases']),1)
        self.assertEqual(case['duration'], 120)
        self.assertEqual(case['bpm'], 94)
        self.assertEqual([n['reference'] for n in plan['influences']], [r['reference'] for r in self.refs])
        self.assertIn(self.data['sound'], caption(case))
        self.assertNotIn('Artist One', caption(case))
        self.assertNotIn('source_audio', plan)

    def test_retry_changes_direction_brief_but_preserves_lyrics_language_and_favorites(self):
        plan = song_plan(self.data, self.refs, 123)
        before = copy.deepcopy(plan)
        retried = retry_direction(plan)
        self.assertEqual(retried['cases'][0]['seed'],124)
        for key in ('lyrics','bpm','voice','vocal_language'):
            self.assertEqual(retried['cases'][0][key],before['cases'][0][key])
        self.assertEqual(retried['favorites'],before['favorites'])
        self.assertNotEqual(retried['cases'][0]['song_caption'],before['cases'][0]['song_caption'])
        self.data['sound']='A gentle 72 bpm groove'
        with self.assertRaisesRegex(ValueError,'selected BPM'):
            song_plan(self.data,self.refs,123)

    def test_every_style_keeps_essential_controls_within_singer_text_budget(self):
        for direction in POLICY['directions']:
            for code in LANGUAGES:
                case={'bpm':direction['bpm'][0],'voice':'female','vocal_language':code}
                for retry in (False,True):
                    caption=performance_caption(direction,case,'Rich developing instrumental arrangement. '*100,retry=retry)
                    self.assertLess(len(caption),512)
                    for essential in (direction['label'],str(case['bpm']),LANGUAGES[code],*direction['instruments']):self.assertIn(essential,caption)

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
        def generate(*args,**kwargs):prompts.append(kwargs['prompt']);return next(outputs)
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
        outputs=iter(['{"favorites":[]}',json.dumps({'favorites':[{'index':1,'language':'tr'},{'index':2,'language':'en'}]}),
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


if __name__ == '__main__':unittest.main()
