import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from dna_language import LANGUAGES,language,lyric_units,validate_script
from dna_direction import direction_for,POLICY
from music_dna_song import song_sections
from train_dna_feedback import collect,split,consent_current,invalidate,command,run,group_key,check_lengths,execute,heldout_loss,owner_reviewed
from singing_response import digest
from evaluate_music_coverage import matrix, evaluate

class DnaExpansion(unittest.TestCase):
    def test_owner_research_is_explicit_hash_bound_and_revocable(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);feedback,work=self.fixture(root);feedback.unlink()
            review=root/'renders/music-dna-training/owner-review.json';review.parent.mkdir()
            item={'work':str(work.relative_to(root)),'files':{n:digest(work/n) for n in ('input.json','plan.json','fit.json','singer/complete.json','singer/singer.wav')}}
            value={'schema':'jamloom-owner-plan-review-1','trainingConsent':True,'songs':[item,item]}
            review.write_text(json.dumps(value));rows=owner_reviewed(root)
            self.assertEqual(len(rows),1);self.assertEqual(collect(root)[0],[])
            self.assertNotIn('Private catalogue name',json.dumps(rows));self.assertTrue(consent_current(root,rows))
            value['trainingConsent']=False;review.write_text(json.dumps(value))
            self.assertFalse(consent_current(root,rows))
            with self.assertRaises(ValueError):owner_reviewed(root)
            value['trainingConsent']=True;review.write_text(json.dumps(value));(work/'plan.json').write_text('{}')
            with self.assertRaisesRegex(ValueError,'changed'):owner_reviewed(root)

    def test_coverage_resume_publishes_finished_render_without_regenerating(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);source=root/'source';source.write_bytes(b'original synthetic fixture')
            output=root/'coverage';work=output/'dna-en';work.mkdir(parents=True)
            rows=[{'id':'dna-en','product':'music-dna'}]
            report={'matrix':rows,'source_sha256':digest(source),'results':[{'id':'dna-en','state':'running'}]}
            (output/'report.json').write_text(json.dumps(report));(work/'status.json').write_text('{"state":"completed"}')
            with patch('evaluate_music_coverage.matrix',return_value=rows),patch('evaluate_music_coverage.publish',return_value=[{'status':'PASS'}]) as publish,patch('evaluate_music_coverage.subprocess.Popen') as render:
                result=evaluate(output,source,True)
                self.assertEqual(result['results'][0]['state'],'completed');publish.assert_called_once();render.assert_not_called()
                evaluate(output,source,True);publish.assert_called_once()
                source.write_bytes(b'changed')
                with self.assertRaisesRegex(ValueError,'inputs differ'):evaluate(output,source,True)

    def test_local_audio_matrix_covers_each_language_family_and_reply_style(self):
        from singing_response import STYLES
        rows=matrix();dna=[r for r in rows if r['product']=='music-dna'];reply=[r for r in rows if r['product']=='improvise']
        self.assertEqual(len(rows),73);self.assertEqual(len({r['id'] for r in rows}),len(rows))
        self.assertEqual({r['language'] for r in dna},set(LANGUAGES))
        self.assertEqual({r['direction'] for r in dna},{d['id'] for d in POLICY['directions']})
        self.assertEqual({r['direction'] for r in reply},set(STYLES))
        for row in dna:
            self.assertEqual(row['payload']['profile']['vocalLanguage'],row['language'])
            self.assertEqual(row['payload']['profile']['referenceMetadata'][0]['source'],'coverage-fixture')
    def test_all_language_settings_and_genre_coverage(self):
        self.assertEqual(len(LANGUAGES),50)
        for code in LANGUAGES:self.assertEqual(language(code),code)
        for code in ('xx','unknown','',None):
            with self.assertRaises(ValueError):language(code)
        manifest=json.loads((Path(__file__).resolve().parents[1]/'assets/manifests/dna-evaluation.json').read_text())
        covered=set()
        for case in manifest['cases']:
            result=direction_for([{'reference':r['reference'],'catalogue_genre':r['genre']} for r in case['favorites']])
            self.assertEqual(result['id'],case['direction']);covered.add(result['id'])
        self.assertEqual(covered,{d['id']for d in POLICY['directions']})
        for d in POLICY['directions']:
            self.assertEqual(direction_for([{'reference':'Generated musical direction','catalogue_genre':'Metal' if d['id']=='heavy-rock' else d['id']}])['id'],d['id'])
        self.assertEqual(direction_for([{'reference':'Spanish title','catalogue_genre':'Metal'}])['id'],'heavy-rock')

    def test_scripts_nonspace_lyrics_and_developed_sections(self):
        for code,text in [('ru','Мы идём домой'),('tr','Güneş yine doğar'),('es','La noche y el corazón'),('ja','夜の街で歌い続ける'),('ar','نغني في الطريق'),('hi','दिल की आवाज़'),('zh','我们一起唱歌'),('ko','우리 함께 노래해요')]:validate_script(text,code)
        with self.assertRaises(ValueError):validate_script('An English song','ru')
        with self.assertRaises(ValueError):validate_script('An English song','ja')
        self.assertEqual(lyric_units('夜の街で歌う'*50,'ja')[0],300)
        lyrics='[Verse 1]\nFirst line\nSecond line\n[Chorus]\nOur hook\nA response\n[Verse 2]\nA new line\nA changed line\n[Chorus]\nOur hook\nA response\n[Bridge]\nA turn\n[Outro]\nResolved'
        song_sections(lyrics)
        for bad in [lyrics.replace('A new line\nA changed line','First line\nSecond line'),lyrics.replace('[Outro]\nResolved','[Outro]'),lyrics.replace('[Chorus]\nOur hook\nA response\n[Bridge]','[Chorus]\nAnother hook\nA response\n[Bridge]'),lyrics.replace('Our hook\nA response','Our hook\nOur hook')]:
            with self.assertRaises(ValueError):song_sections(bad)

    def fixture(self,root,consent=True):
        job='a'*32;work=root/'renders/music-dna-songs'/job;(work/'singer').mkdir(parents=True)
        request={'profile':{'references':['Private catalogue name'],'referenceMetadata':[{'reference':'Private catalogue name','genre':'Pop'}],'vocalLanguage':'es'}}
        lyrics='\n'.join('['+s+']\n'+'La noche nos lleva de vuelta a casa\n'*4 for s in ['Verse 1','Chorus','Verse 2','Chorus','Bridge','Outro'])
        direction=direction_for([{'reference':'Private catalogue name','catalogue_genre':'Pop'}])
        (work/'input.json').write_text(json.dumps(request));plan={'schema':'jamloom-dna-song-1','title':'Original title','direction':direction,'input_sha256':digest(work/'input.json'),'cases':[{'song_caption':'Original lively pop','vocal_language':'es','voice':'female','bpm':110,'lyrics':lyrics}]}
        (work/'plan.json').write_text(json.dumps(plan));(work/'singer/singer.wav').write_bytes(b'technical fixture, not audio training evidence')
        hashes={'plan_sha256':digest(work/'plan.json'),'audio_sha256':digest(work/'singer/singer.wav')}
        (work/'singer/complete.json').write_text(json.dumps(hashes));(work/'fit.json').write_text(json.dumps({**hashes,'input_sha256':digest(work/'input.json'),'accepted':True}));(work/'status.json').write_text('{"state":"completed"}')
        path=root/'renders/music-dna-feedback'/'listener'/(job+'.json');path.parent.mkdir(parents=True)
        path.write_text(json.dumps({'job':job,'trainingConsent':consent,'consentVersion':1,'rating':'like','tags':['groove'],**hashes}));return path,work

    def test_hosted_feedback_requires_live_current_consent_and_reuses_planner_validation(self):
        from datetime import datetime,timezone,timedelta
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);path,work=self.fixture(root)
            f=json.loads(path.read_text());plan=json.loads((work/'plan.json').read_text());path.unlink()
            snapshot=root/'renders/music-dna-training/hosted-feedback.json';snapshot.parent.mkdir(parents=True)
            row={'record':{**f,'plan':plan,'group':group_key(['Private catalogue name'])},'sha256':'f'*64}
            data={'schema':'jamloom-hosted-training-1','checkedAt':datetime.now(timezone.utc).isoformat(),'live':True,'records':[row]}
            snapshot.write_text(json.dumps(data));records,_=collect(root)
            self.assertEqual(len(records),1);self.assertTrue(consent_current(root,records));self.assertNotIn('Private catalogue name',json.dumps(records))
            data['records']=[];snapshot.write_text(json.dumps(data));self.assertFalse(consent_current(root,records))
            data['records']=[row];data['checkedAt']=(datetime.now(timezone.utc)-timedelta(seconds=21)).isoformat();snapshot.write_text(json.dumps(data))
            self.assertEqual(collect(root)[0],[]);self.assertFalse(consent_current(root,records))
            data['checkedAt']=datetime.now(timezone.utc).isoformat();data['live']=False;snapshot.write_text(json.dumps(data));self.assertEqual(collect(root)[0],[])

    def test_training_excludes_unconsented_changed_duplicate_and_reference_data(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);path,work=self.fixture(root,False);self.assertEqual(collect(root)[0],[])
            f=json.loads(path.read_text());f['trainingConsent']=True;path.write_text(json.dumps(f))
            rows,_=collect(root);self.assertEqual(len(rows),1);self.assertNotIn('Private catalogue name',json.dumps(rows))
            self.assertIsNone(split(rows));self.assertTrue(consent_current(root,rows))
            (path.parent/('b'*32+'.json')).write_text(path.read_text());self.assertEqual(len(collect(root)[0]),1)
            run=root/'renders/music-dna-training/runs/trial';(run/'adapter').mkdir(parents=True);(run/'adapter/weights').write_text('fixture')
            (run/'manifest.json').write_text(json.dumps({'sources':rows,'state':'candidate_needs_review'}))
            path.unlink();self.assertFalse(consent_current(root,rows));invalidate(root);self.assertFalse((run/'adapter').exists())
            (work/'singer/singer.wav').write_bytes(b'changed');self.assertEqual(collect(root)[0],[])

    def test_training_orchestration_keeps_candidates_private_and_cleans_dataset(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);path,work=self.fixture(root);rows,counts=collect(root);calls=[];datasets=[]
            def execute_fixture(args,root,sources,log):
                calls.append(args);data=Path(args[args.index('--data')+1]);datasets.append(data)
                self.assertTrue((data/'test.jsonl').exists());self.assertTrue(consent_current(root,sources))
                log.write_text('Technical fixture, no model execution. Test loss 2.000, Test ppl 7.389.')
                if '--train' in args:
                    adapter=Path(args[args.index('--adapter-path')+1]);adapter.mkdir();(adapter/'adapters.safetensors').write_bytes(b'fixture weights')
            with patch('train_dna_feedback.split',return_value=(rows,rows)),patch('train_dna_feedback.MODEL_MANIFEST',{'files_sha256':{},'revision':'fixture'}),patch('train_dna_feedback.check_lengths',return_value=1500),patch('train_dna_feedback.execute',side_effect=execute_fixture):
                result=run(root,True)
            self.assertEqual(result['state'],'candidate_needs_review');self.assertEqual(len(calls),3)
            self.assertEqual(calls[0][calls[0].index('--adapter-path')+1],'')
            self.assertTrue(all(not p.exists() for p in datasets));self.assertIn('never replace',result['promotion'])
            self.assertFalse(result['evaluation']['loss_improved']);self.assertEqual(result['evaluation']['listening'],'NOT RUN')
            with patch('train_dna_feedback.split',return_value=(rows,rows)),patch('train_dna_feedback.execute') as repeated:
                self.assertEqual(run(root,True)['state'],'candidate_needs_review');repeated.assert_not_called()
            path.unlink();invalidate(root)
            manifest=next((root/'renders/music-dna-training/runs').glob('*/manifest.json'))
            self.assertEqual(json.loads(manifest.read_text())['state'],'withdrawn')
            self.assertFalse((manifest.parent/'adapter').exists())

    def test_training_does_not_truncate_endings_or_continue_after_withdrawal(self):
        records=[{'data':{'messages':[]}}]
        for length in (1000,4097):
            fake=SimpleNamespace(load_tokenizer=lambda *args:SimpleNamespace(apply_chat_template=lambda messages:list(range(length))))
            with patch.dict(sys.modules,{'mlx_lm.utils':fake}):
                if length>4096:
                    with self.assertRaisesRegex(ValueError,'do not truncate'):check_lengths(Path('fixture'),records)
                else:self.assertEqual(check_lengths(Path('fixture'),records),length)
        with tempfile.TemporaryDirectory() as folder,patch('train_dna_feedback.consent_current',return_value=False):
            with self.assertRaisesRegex(ValueError,'consent changed'):
                execute([sys.executable,'-c','import time; time.sleep(60)'],Path(folder),[],Path(folder)/'process.log')
            with self.assertRaisesRegex(ValueError,'finite test loss'):heldout_loss(Path(folder)/'process.log')
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);self.fixture(root);rows,_=collect(root)
            with patch('train_dna_feedback.split',return_value=(rows,rows)),patch('train_dna_feedback.MODEL_MANIFEST',{'files_sha256':{},'revision':'fixture'}),patch('train_dna_feedback.check_lengths',side_effect=ValueError('Context budget exceeded')):
                with self.assertRaisesRegex(ValueError,'Context budget'):run(root,True)
            status=json.loads((root/'renders/music-dna-training/status.json').read_text())
            self.assertEqual(status['state'],'failed_or_withdrawn')

    def test_holdout_groups_do_not_leak_and_training_is_bounded(self):
        self.assertEqual(group_key([' Beyoncé ','Second']),group_key(['second','Beyonce\u0301','SECOND']))
        rows=[{'group':str(i//4),'genre':['pop','rock','jazz'][i%3],'language':['en','es'][i%2]}for i in range(40)]
        train,valid=split(rows);self.assertTrue(set(r['group']for r in train).isdisjoint(r['group']for r in valid))
        cmd=command(Path('model'),Path('data'),Path('adapter'),True)
        self.assertIn('--mask-prompt',cmd);self.assertEqual(cmd[cmd.index('--iters')+1],'100');self.assertIn('--grad-checkpoint',cmd)
        baseline=command(Path('model'),Path('data'),None,False)
        self.assertEqual(baseline[baseline.index('--adapter-path')+1],'')

if __name__=='__main__':unittest.main()
