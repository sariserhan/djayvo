import copy
import json
import tempfile
from unittest.mock import patch
from types import SimpleNamespace
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from music_dna_song import favorites, song_plan, parse_draft, run, draft
from singing_response import caption, digest, text_field
from dna_direction import direction_for


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
        self.assertEqual(case['duration'], 120)
        self.assertEqual(case['bpm'], 94)
        self.assertEqual([n['reference'] for n in plan['influences']], [r['reference'] for r in self.refs])
        self.assertIn(self.data['sound'], caption(case))
        self.assertNotIn('Artist One', caption(case))
        self.assertNotIn('source_audio', plan)

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
                    if command[2]=='draft':
                        plan=song_plan(copy.deepcopy(self.data),self.refs,123)
                        plan['input_sha256']=digest(work/'input.json')
                        (work/'plan.json').write_text(json.dumps(plan))
                    elif 'singing_response.py' in command[1]:
                        rendered.append(json.loads((work/'plan.json').read_text())['cases'][0]['seed'])
                        (work/'singer').mkdir();(work/'singer/singer.wav').write_bytes(b'fixture')
                    else:(work/'fit.json').write_text(json.dumps({'accepted':accepted[len(rendered)-1]}))
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
            work=Path(folder);profile={'references':[r['reference'] for r in self.refs],'referenceMetadata':[{'reference':self.refs[0]['reference'],'genre':'Soul'}]}
            (work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction_for(self.refs),'seed':123}))
            draft(work);plan=json.loads((work/'plan.json').read_text())
            self.assertEqual(len(prompts),2);self.assertIn('draft_lyrics',prompts[1]);self.assertNotIn('Artist One',prompts[1])
            self.assertEqual(plan['direction']['id'],'soul');self.assertEqual(plan['cases'][0]['lyrics'],self.data['lyrics'])
        data=copy.deepcopy(self.data);data['sound']='Мы идём домой и поём нашу песню'
        outputs=iter([json.dumps(data),json.dumps(self.data)]);prompts.clear()
        with tempfile.TemporaryDirectory() as folder,patch.dict(sys.modules,modules),patch('music_dna_song.lyric_model',return_value=(None,tokenizer,{'revision':'fixture'})):
            work=Path(folder);(work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction_for(self.refs),'seed':123}))
            draft(work);self.assertNotIn('draft_lyrics',prompts[1]);self.assertIn('in English',prompts[1])


if __name__ == '__main__':unittest.main()
