#!/usr/bin/env python3
"""Small Q0 invariants; actual native import/render is checked by experiment runs."""
import copy
import hashlib
import io
import json
import math
from array import array
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import wave
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scripts'))
from q0_expression import express
from q0_performance import perform
from q0_listening_results import summarize, DIMENSIONS
from q0_independent_packet import reviewable
from q0_composition import compose
from q0_authored_score import authored
from q0_development import develop
from q0_phrase_form import adapt
from q0_phrase_trial import guitar_renderer
from q0_guitar_accent_trial import accents
from q0_audit import digest
from q0_audit import loudness, inputs, level_match


class Q0(unittest.TestCase):
    def setUp(self):
        self.plan = json.loads((ROOT/'docs/evidence/r0/hiphop.plan.json').read_text())['execution']

    def test_independent_review_requires_license_and_explicit_scope(self):
        rights = {'consent': {'local_processing': True, 'review_scope': 'independent_reviewers'},
                  'license': {'id': 'CC-BY-4.0', 'attribution': 'Test-only attribution'}}
        self.assertTrue(reviewable(rights))
        for permission in ('Owner requested local use', {}, {'local_processing': True},
                           {'local_processing': True, 'review_scope': 'owner_only'},
                           {'local_processing': False, 'review_scope': 'independent_reviewers'}):
            self.assertFalse(reviewable({**rights, 'consent': permission}))
        for license in ({}, {'id': 'unknown', 'attribution': 'Test'},
                        {'id': 'CC0-1.0', 'attribution': ''}):
            self.assertFalse(reviewable({**rights, 'license': license}))

    def test_repeatable_non_mutating_shared_clock(self):
        frozen = copy.deepcopy(self.plan)
        candidate, trace = express(self.plan, 4123)
        self.assertEqual(self.plan, frozen)
        self.assertEqual((candidate, trace), express(self.plan, 4123))
        for field in ('seed', 'source_asset_id', 'tempo_milli_bpm', 'key', 'sections', 'voice_clips'):
            self.assertEqual(self.plan[field], candidate[field])
        offsets = {}
        for a, b in zip(self.plan['tracks'], candidate['tracks']):
            self.assertEqual(len(a['events']), len(b['events']))
            for before, after in zip(a['events'], b['events']):
                self.assertEqual(before['note'], after['note'])
                offset = after['start_tick'] - before['start_tick']
                self.assertGreaterEqual(offset, 0)
                self.assertLessEqual(offset * 60000 / (960 * (self.plan['tempo_milli_bpm']/1000)), 21)
                self.assertEqual(offsets.setdefault(before['start_tick'], offset), offset)
                if a['instrument'] == 'drums' and before['note'] == 36:
                    self.assertEqual(offset, 0)
                self.assertTrue(1 <= after['velocity'] <= 127)
        self.assertNotEqual(candidate, self.plan)

    def test_performance_phrases_fills_and_shared_clock(self):
        original = copy.deepcopy(self.plan)
        candidate, trace = perform(self.plan, 4123)
        self.assertEqual(original, self.plan)
        self.assertEqual((candidate, trace), perform(self.plan, 4123))
        self.assertTrue(trace['transition_fills'])
        self.assertTrue(any(c['reason'] == 'melodic arrival/release' for c in trace['phrase_changes']))
        old_kicks = {n['start_tick'] for t in original['tracks'] if t['instrument'] == 'drums'
                     for n in t['events'] if n['note'] == 36}
        new_kicks = {n['start_tick'] for t in candidate['tracks'] if t['instrument'] == 'drums'
                     for n in t['events'] if n['note'] == 36}
        self.assertEqual(old_kicks, new_kicks)
        for fill in trace['transition_fills']:
            for note in fill['notes']:
                self.assertLess(note['start_tick']+note['duration_ticks'], fill['boundary_tick'])
                for start, stop in trace['vocal_windows']:
                    self.assertFalse(note['start_tick'] < stop and note['start_tick']+120 > start)
        for track in candidate['tracks']:
            for note in track['events']:
                self.assertTrue(1 <= note['velocity'] <= 127)
                self.assertTrue(0 <= note['start_tick'] < note['start_tick']+note['duration_ticks'] <= candidate['target_bars']*3840)
        for old, new in zip(original['tracks'], candidate['tracks']):
            if old['instrument'] == 'bass':
                for a, b in zip(old['events'], new['events']):
                    if a['start_tick'] in old_kicks:
                        self.assertEqual(a['start_tick'], b['start_tick'])
        bad = copy.deepcopy(self.plan); bad['voice_events'][0]['rate'] = 2
        with self.assertRaises(ValueError): perform(bad, 4123)
        bad = copy.deepcopy(self.plan); bad['tracks'] = [t for t in bad['tracks'] if t['instrument'] != 'drums']
        with self.assertRaises(ValueError): perform(bad, 4123)
        for style in ('hiphop', 'reggae', 'experimental'):
            instrumental = copy.deepcopy(self.plan)
            instrumental['strategy'] = style
            instrumental['voice_events'] = []
            # Clear existing snare pickups so each profile has an eligible test slot.
            for track in instrumental['tracks']:
                if track['instrument'] == 'drums':
                    track['events'] = [n for n in track['events'] if n['note'] != 38]
            _, details = perform(instrumental, 4124)
            self.assertTrue(details['transition_fills'], style)

    def test_listening_forms_fail_closed_and_never_pass_quality(self):
        # Synthetic protocol fixtures only, removed with the temporary directory.
        with tempfile.TemporaryDirectory() as tmp:
            trial = Path(tmp); listener = trial/'listener'; listener.mkdir()
            audio, keys = {}, {}
            for i, arm in enumerate('ABCDE', 1):
                code = f'test-source-{i}'
                path = listener/(code+'.wav'); path.write_bytes(b'test-only-not-a-recording')
                sha = digest(path); audio[path.name] = sha
                keys[code] = {'arm': arm, 'sha256': sha}
            identity = hashlib.sha256(json.dumps(audio, sort_keys=True).encode()).hexdigest()
            (listener/'packet.json').write_text(json.dumps({'packet_id': identity, 'audio_sha256': audio}))
            (trial/'report.json').write_text(json.dumps({'packet_id': identity,
                'records': [{'id': 'test-source', 'arms': dict.fromkeys('ABCDE', {})}]}))
            (trial/'organizer-key.json').write_text(json.dumps(keys))
            self.assertEqual(summarize(trial, [])['status'], 'NOT RUN')
            ratings = {'reviewer': 'TEST_ONLY', 'listened': 'yes'}
            for code, score in [('test-source-1', '2'), ('test-source-5', '4')]:
                ratings.update({code+'/'+d: score for d in DIMENSIONS})
            payload = {'schema_version': '1.0-q0-listening', 'packet_id': identity, 'ratings': ratings}
            response = trial/'response.json'
            response.write_text(json.dumps(payload))
            result = summarize(trial, [response])
            self.assertEqual(result['candidate_ratings'], 2)
            self.assertEqual(result['formal_quality'], 'NOT RUN')
            metric = result['comparisons']['E']['candidate_minus_A']['musicality']
            self.assertEqual(metric['mean'], 2)
            self.assertIsNone(metric['bootstrap_95_percent'])
            with self.assertRaises(ValueError): summarize(trial, [response, response])
            for change in ({'listened': 'no'}, {'test-source-5/groove': ''},
                           {'madeup/realism': '5'}, {'reviewer': 'UI_FIXTURE_ONLY'},
                           {'test-source-1/realism': 5}):
                changed = copy.deepcopy(payload); changed['ratings'].update(change)
                response.write_text(json.dumps(changed))
                with self.assertRaises(ValueError): summarize(trial, [response])
            changed = copy.deepcopy(payload); changed['packet_id'] = '0'*64
            response.write_text(json.dumps(changed))
            with self.assertRaises(ValueError): summarize(trial, [response])
            response.write_text('{"schema_version":"1.0-q0-listening","schema_version":"duplicate"}')
            with self.assertRaises(ValueError): summarize(trial, [response])
            blank = copy.deepcopy(payload)
            blank['ratings'] = {'reviewer': 'TEST_ONLY', 'listened': 'yes'}
            response.write_text(json.dumps(blank))
            self.assertEqual(summarize(trial, [response])['candidate_ratings'], 0)
            blank['ratings']['test-source-1/notes'] = 'Synthetic note-only protocol fixture'
            response.write_text(json.dumps(blank))
            notes = summarize(trial, [response])
            self.assertEqual(notes['candidate_ratings'], 0)
            self.assertEqual(len(notes['comments']), 1)
            self.assertEqual(notes['formal_quality'], 'NOT RUN')
            response.write_text(json.dumps(payload))
            (listener/'test-source-1.wav').write_bytes(b'changed')
            with self.assertRaises(ValueError): summarize(trial, [response])

    def test_composition_intact_calls_and_response_space(self):
        original = copy.deepcopy(self.plan)
        candidate, trace = compose(self.plan)
        self.assertEqual(original, self.plan)
        self.assertEqual((candidate, trace), compose(self.plan))
        for field in ('source', 'source_asset_id', 'tempo_milli_bpm', 'key', 'mix', 'sections', 'voice_clips'):
            self.assertEqual(original[field], candidate[field])
        self.assertEqual(candidate['voice_events'], [v for v in original['voice_events'] if v['clean']])
        self.assertGreater(trace['removed_short_vocal_events'], 0)
        self.assertGreaterEqual(len(trace['source_rhythm_ticks']), 2)
        for track in candidate['tracks']:
            for note in track['events']:
                self.assertGreater(note['duration_ticks'], 0)
                self.assertLessEqual(note['start_tick']+note['duration_ticks'], candidate['target_bars']*3840)
                if track['instrument'] != 'drums':
                    for start, stop in trace['intact_call_windows']:
                        self.assertFalse(note['start_tick'] < stop and note['start_tick']+note['duration_ticks'] > start)
        changed, _ = express(candidate, 4123)
        self.assertEqual(changed['voice_events'], candidate['voice_events'])

    def test_composition_rejects_unsupported_sources(self):
        for field, value in [('voice_events', []), ('time_signature', [3, 4]), ('target_bars', 2)]:
            plan = copy.deepcopy(self.plan); plan[field] = value
            with self.assertRaises(ValueError): compose(plan)
        plan = copy.deepcopy(self.plan); plan['analysis']['onsets'] = []
        with self.assertRaises(ValueError): compose(plan)
        for field, value in [('rate', 1.2), ('pitch_semitones', 2), ('echo_ticks', 960)]:
            plan = copy.deepcopy(self.plan)
            next(v for v in plan['voice_events'] if v['clean'])[field] = value
            with self.assertRaises(ValueError): compose(plan)

    def test_development_survives_final_rests_and_expression(self):
        phrase = [{'tick':tick,'degree':degree,'velocity':80,'analysis_frame_48khz':i*1000}
                  for i,(tick,degree) in enumerate(zip([0,480,600,1920,3000,3600],[3,0,0,3,0,0]))]
        plan=copy.deepcopy(self.plan)
        plan.update(target_bars=10,strategy='reggae')
        plan['source']['processed_frames']=96000
        with patch('q0_development.prosody',return_value=(phrase,None,{})):
            candidate,trace=develop(plan,Path('unused-test-source'))
        harmonic=next(t for t in candidate['tracks'] if t['instrument']=='piano')
        statement=next(s for s in trace['statements'] if s['kind']=='development')
        self.assertEqual(len(statement['events']),6)
        for event in statement['events']:
            self.assertTrue(any(n['note']==event['note'] and abs(n['start_tick']-event['tick'])<100
                                for n in harmonic['events']),f'Dropped motif event: {event}')
        self.assertEqual(len(statement['performed_events']),6)
        self.assertTrue(all(n in harmonic['events'] for n in statement['performed_events']))
        for n in statement['performed_events']:
            for start,stop in trace['intentional_rest_windows']:
                self.assertFalse(n['start_tick']<stop and n['start_tick']+n['duration_ticks']>start)
        # Exercise a six-beat motif, all groove profiles and each seeded timing depth.
        phrase[-1]['tick']=5760
        for style in ('hiphop','reggae','experimental'):
            for seed in (0,1,2):
                plan.update(strategy=style,seed=seed)
                with self.subTest(style=style,seed=seed), patch('q0_development.prosody',return_value=(phrase,None,{})):
                    result,trace=develop(plan,Path('unused-test-source'))
                    notes=next(t['events'] for t in result['tracks'] if t['instrument']=='piano')
                    played=next(s['performed_events'] for s in trace['statements'] if s['kind']=='development')
                    self.assertEqual(len(played),6)
                    self.assertEqual(len({n['start_tick'] for n in played}),6)
                    self.assertTrue(all(n in notes for n in played))
        actual_perform=perform
        def lose_note(original,seed):
            result,trace=actual_perform(original,seed)
            next(t for t in result['tracks'] if t['instrument']=='piano')['events'].clear()
            return result,trace
        with patch('q0_development.prosody',return_value=(phrase,None,{})), patch('q0_development.perform',side_effect=lose_note):
            with self.assertRaisesRegex(ValueError,'Motif event was lost'):
                develop(plan,Path('unused-test-source'))

    def test_authored_study_isolates_palette_and_preserves_call_space(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'test-only.wav'
            with wave.open(str(path), 'wb') as wav:
                wav.setparams((1, 2, 48000, 0, 'NONE', 'not compressed'))
                pcm = array('h', (round(9000*math.sin(2*math.pi*180*i/48000))
                                 for i in range(96000)))
                if sys.byteorder != 'little': pcm.byteswap()
                wav.writeframes(pcm.tobytes())
            plan = copy.deepcopy(self.plan)
            plan['source'].update(sha256=digest(path), original_frames=96000,
                                  original_rate=48000, processed_frames=96000,
                                  kind='recorded', consent_confirmed=True)
            plan['source_asset_id'] = 'sha256:'+digest(path)
            plan['analysis']['onsets'] = [1000, 6000, 18000, 29000, 47000, 71000]
            original = copy.deepcopy(plan)
            words = {'source_sha256':digest(path),'source_rate':48000,'source_frames':96000,
                     'words':[{'start_frame':1000,'end_frame':24000,'confidence':.95},
                              {'start_frame':24000,'end_frame':48000,'confidence':.98}]}
            developed, development = develop(plan,path,words)
            self.assertEqual((developed,development),develop(plan,path,words))
            self.assertEqual(plan,original)
            for field in ('source','tempo_milli_bpm','target_bars','tail_ms','mix'):
                self.assertEqual(developed[field],plan[field])
            self.assertTrue(development['hook'])
            self.assertTrue(development['source_analysis']['pitch_contour_used'])
            for a,b in zip(plan['tracks'],developed['tracks']):
                self.assertEqual({k:v for k,v in a.items() if k!='events'},
                                 {k:v for k,v in b.items() if k!='events'})
                for n in b['events']:
                    self.assertTrue(0<=n['start_tick']<n['start_tick']+n['duration_ticks']<=plan['target_bars']*3840)
                    for lo,hi in development['intentional_rest_windows']:
                        self.assertFalse(lo<=n['start_tick']<hi)
            statement = next(s for s in development['statements'] if s['kind']=='statement')['events']
            returning = next(s for s in development['statements'] if s['kind']=='return')['events']
            transformed = next(s for s in development['statements'] if s['kind']=='development')['events']
            self.assertEqual(len(transformed),len(statement))
            self.assertEqual([n['note'] for n in statement],[n['note'] for n in returning])
            self.assertEqual([n['tick']-statement[0]['tick'] for n in statement],
                             [n['tick']-returning[0]['tick'] for n in returning])
            self.assertIsNone(develop(plan,path)[1]['hook'])
            with self.assertRaises(ValueError): develop(plan,path,{**words,'source_sha256':'0'*64})
            badwords=copy.deepcopy(words);badwords['words'][1]['start_frame']=0
            with self.assertRaises(ValueError): develop(plan,path,badwords)
            changed=copy.deepcopy(plan);changed['analysis']['onsets']=[1000,12000,27000,50000,80000]
            self.assertNotEqual(development['source_motif'],develop(changed,path,words)[1]['source_motif'])
            a, _ = authored(plan, path, hybrid=False, expressive=True)
            b, _ = authored(plan, path, hybrid=True, expressive=True)
            self.assertEqual(plan, original)
            self.assertEqual(a, authored(plan, path, hybrid=False, expressive=True)[0])
            for track in b['tracks']:
                track.pop('sound', None)
            self.assertEqual(a, b)
            flat, _ = authored(plan, path, hybrid=False, expressive=False)
            for before, after in zip(flat['tracks'], a['tracks']):
                self.assertEqual([n['note'] for n in before['events']], [n['note'] for n in after['events']])
                for n in after['events']:
                    self.assertGreater(n['duration_ticks'], 0)
                    self.assertLessEqual(n['start_tick']+n['duration_ticks'], 16*3840)
            bass = next(t for t in a['tracks'] if t['instrument'] == 'bass')
            kicks = {n['start_tick'] for t in a['tracks'] if t['instrument'] == 'drums'
                     for n in t['events'] if n['note'] == 36}
            self.assertTrue(all(n['start_tick'] in kicks for n in bass['events']))
            for voice in a['voice_events']:
                stop = voice['start_tick']+96000*112000*960/(60000*48000)
                for track in a['tracks']:
                    if track['instrument'] != 'drums':
                        self.assertFalse(any(n['start_tick'] < stop and
                            n['start_tick']+n['duration_ticks'] > voice['start_tick']
                            for n in track['events']))
            plan['source']['consent_confirmed'] = False
            with self.assertRaises(ValueError): authored(plan, path, hybrid=True, expressive=True)
            plan['source']['consent_confirmed'] = True
            plan['source']['sha256'] = '0'*64
            with self.assertRaises(ValueError): authored(plan, path, hybrid=True, expressive=True)
            plan['source']['sha256'] = digest(path)
            plan['analysis']['onsets'] = [96000]
            with self.assertRaises(ValueError): authored(plan, path, hybrid=True, expressive=True)
            low_rate = Path(tmp)/'test-only-16k.wav'
            with wave.open(str(low_rate), 'wb') as wav:
                wav.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
                wav.writeframes(pcm[::3].tobytes())
            plan = copy.deepcopy(original)
            plan['source'].update(sha256=digest(low_rate), original_rate=16000, original_frames=32000)
            plan['source_asset_id'] = 'sha256:'+digest(low_rate)
            _, trace = authored(plan, low_rate, hybrid=True, expressive=True)
            self.assertEqual([n['analysis_frame_48khz'] for n in trace['source_motif']],
                             original['analysis']['onsets'])
            self.assertEqual([n['source_frame'] for n in trace['source_motif']],
                             [round(f/3) for f in original['analysis']['onsets']])

    def test_phrase_form_copy_bounds_coordinates_and_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            for rate in (16000, 48000):
                for quiet_background in (0, 500):
                    path = Path(tmp)/'test-only.wav'
                    pcm = array('h', (round(10000*math.sin(2*math.pi*180*i/rate))
                        if .8*rate <= i < 1.8*rate else quiet_background for i in range(4*rate)))
                    if sys.byteorder != 'little': pcm.byteswap()
                    with wave.open(str(path), 'wb') as wav:
                        wav.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
                        wav.writeframes(pcm.tobytes())
                    base = copy.deepcopy(self.plan)
                    base['source'].update(sha256=digest(path), original_frames=4*rate,
                        original_rate=rate, processed_frames=192000, kind='recorded', consent_confirmed=True)
                    base['source_asset_id'] = 'sha256:'+digest(path)
                    base['analysis']['onsets'] = [40000, 50000, 60000, 70000]
                    base['analysis']['phrases'] = [
                        {'start_frame': 38400, 'end_frame': 86400, 'confidence': .8}]
                    plan, _ = authored(base, path, hybrid=True, expressive=True)
                    frozen = copy.deepcopy(plan)
                    candidate, trace = adapt(plan, path)
                    self.assertEqual(plan, frozen)
                    self.assertEqual((candidate, trace), adapt(plan, path))
                    self.assertGreaterEqual(trace['energy_retained_fraction'], .995)
                    self.assertEqual(trace['fallback_to_complete_source'], bool(quiet_background))
                    self.assertEqual(candidate['voice_clips'][0], plan['voice_clips'][0])
                    self.assertEqual(trace['trim_engine_frames'],
                        [round(f*48000/rate) for f in trace['trim_original_frames']])
                    self.assertLessEqual(trace['trim_engine_frames'][0], 38400-5760)
                    self.assertGreaterEqual(trace['trim_engine_frames'][1], 86400+5760)
                    self.assertEqual(trace['call_bars_after'], 2 if quiet_background else 1)
                    self.assertEqual(candidate['target_bars'], 14 if quiet_background else 12)
                    for track, old_track in zip(candidate['tracks'], plan['tracks']):
                        if track['instrument'] != 'drums':
                            self.assertEqual([{k:v for k,v in n.items() if k!='start_tick'} for n in track['events']],
                                [{k:v for k,v in n.items() if k!='start_tick'} for n in old_track['events']])
                        for note in track['events']:
                            self.assertTrue(0 <= note['start_tick'] < note['start_tick']+
                                            note['duration_ticks'] <= candidate['target_bars']*3840)
                    kicks = {n['start_tick'] for t in candidate['tracks'] if t['instrument']=='drums'
                             for n in t['events'] if n['note']==36}
                    self.assertTrue(all(n['start_tick'] in kicks for t in candidate['tracks']
                                        if t['instrument']=='bass' for n in t['events']))
                    for field, value in [('consent_confirmed', False), ('sha256', '0'*64)]:
                        bad = copy.deepcopy(plan); bad['source'][field] = value
                        with self.assertRaises(ValueError): adapt(bad, path)
                    for field, value in [('note', 38), ('velocity', 80)]:
                        bad = copy.deepcopy(plan)
                        hat = next(n for t in bad['tracks'] if t['instrument']=='drums'
                                   for n in t['events'] if n['start_tick']==4*3840)
                        hat[field] = value
                        with self.assertRaises(ValueError): adapt(bad, path)
                    bad = copy.deepcopy(plan)
                    next(t for t in bad['tracks'] if t['instrument']=='piano')['events'].append(
                        {'start_tick': 2*3840, 'duration_ticks': 3*3840, 'note': 60, 'velocity': 70})
                    with self.assertRaises(ValueError): adapt(bad, path)
                    bad = copy.deepcopy(plan); bad['sections'][1]['start_bar'] = 1
                    with self.assertRaises(ValueError): adapt(bad, path)
                    bad = copy.deepcopy(plan); bad['analysis']['phrases'][0]['end_frame'] = 192001
                    with self.assertRaises(ValueError): adapt(bad, path)

    def test_invalid_context_and_seed(self):
        for seed in (-1, True, 2**32, 1.5):
            with self.assertRaises(ValueError): express(self.plan, seed)
        for key, value in [('strategy', 'unknown'), ('time_signature', [3,4]),
                           ('tempo_changes', [{'tick': 960}]), ('tempo_milli_bpm', 0)]:
            p = copy.deepcopy(self.plan); p[key] = value
            with self.assertRaises(ValueError): express(p, 1)

    def test_isolated_guitar_link_rejects_changed_inputs_before_build(self):
        evidence = json.loads((ROOT/'docs/evidence/q0-guitar-layer/report.json').read_text())
        expected = {ROOT/'renders/q0-guitar-layer-v2-20261020'/name: sha
                    for name, sha in evidence['files_sha256'].items()}
        expected.update({ROOT/name:sha for name,sha in evidence['preserved_sha256'].items()})
        expected[ROOT/'core/instruments/voice.cpp'] = evidence['voice_source_sha256']
        for changed in ('voice.o', 'libjamloom_core.a', 'voice.cpp'):
            def checked_digest(path):
                return 'changed' if Path(path).name == changed else expected[Path(path)]
            with tempfile.TemporaryDirectory() as directory:
                with patch('q0_phrase_trial.digest', side_effect=checked_digest), \
                     patch('q0_phrase_trial.subprocess.run') as build:
                    with self.assertRaises(ValueError):
                        guitar_renderer(Path(directory))
                    build.assert_not_called()
                self.assertEqual(list(Path(directory).iterdir()), [])

    def test_guitar_accents_change_only_twelve_velocities(self):
        plan = json.loads((ROOT/'docs/evidence/q0-phrase-form/owner-speech/score.json').read_text())
        original = copy.deepcopy(plan)
        candidate = accents(plan)
        self.assertEqual(plan, original)
        changes = []
        for a, b in zip(plan['tracks'], candidate['tracks']):
            if a['instrument'] != 'guitar':
                self.assertEqual(a, b)
            for old, new in zip(a['events'], b['events']):
                if old != new:
                    self.assertFalse(old.get('muted', False))
                    self.assertEqual({k:v for k,v in old.items() if k!='velocity'},
                                     {k:v for k,v in new.items() if k!='velocity'})
                    changes.append(new['velocity'])
        self.assertEqual(len(changes), 12)
        self.assertEqual(sum(v>84 for v in changes), 6)
        candidate['tracks'] = copy.deepcopy(plan['tracks'])
        self.assertEqual(candidate, plan)
        bad = copy.deepcopy(plan); bad['tracks'] = []
        with self.assertRaises(ValueError): accents(bad)
        bad = copy.deepcopy(plan)
        next(t for t in bad['tracks'] if t['instrument']=='guitar')['events'][0]['start_tick'] += 1
        with self.assertRaises(ValueError): accents(bad)

    def test_note_bounds_and_clean_voice(self):
        candidate, _ = express(self.plan, 4123)
        end = candidate['target_bars']*3840
        for track in candidate['tracks']:
            for note in track['events']:
                self.assertGreater(note['duration_ticks'], 0)
                self.assertLessEqual(note['start_tick']+note['duration_ticks'], end)
                following = [n['start_tick'] for n in track['events']
                             if n['note'] == note['note'] and n['start_tick'] > note['start_tick']]
                if following and track['instrument'] != 'drums':
                    self.assertLessEqual(note['start_tick']+note['duration_ticks'], min(following))
        for a, b in zip(self.plan['voice_events'], candidate['voice_events']):
            if a['clean']:
                self.assertEqual(a, b)
            for key in a.keys() - {'start_tick'}:
                self.assertEqual(a[key], b[key])

    def test_source_rights_and_integrity(self):
        ids = ['ls-2277-149896-0026','ls-2035-147960-0013','ls-2086-149220-0047','commons-laughter']
        ledger = {'clips': [{'id': x,'path': x,'sha256': 'verified',
            'consent': {'local_processing': True},'license': {'id':'CC0-1.0'}} for x in ids]}
        provenance = {'consent': 'Owner consent', 'scope': 'Local analysis, remixing, and private audition; no upload or training.'}
        def read(path):
            if path.name == 'manifest-final.json': return json.dumps(ledger)
            if path.name == 'source-provenance.json': return json.dumps(provenance)
            if path.name == 'pcm-conversion.json': return '{"wav_sha256":"verified"}'
            raise AssertionError('Unexpected read')
        with patch.object(Path, 'read_text', read), patch('q0_audit.digest', return_value='verified'):
            self.assertEqual(len(inputs()), 5)
            ledger['clips'][0]['consent']['local_processing'] = False
            with self.assertRaises(ValueError): inputs()
            ledger['clips'][0]['consent']['local_processing'] = True
            ledger['clips'][0]['sha256'] = 'changed'
            with self.assertRaises(ValueError): inputs()
            ledger['clips'][0]['sha256'] = 'verified'
            provenance['scope'] = 'Unknown'
            with self.assertRaises(ValueError): inputs()

    def test_gmd_tick_measurement_and_exclusions(self):
        import mido
        from q0_groove_reference import measure
        midi = mido.MidiFile(ticks_per_beat=960)
        track = mido.MidiTrack(); midi.tracks.append(track)
        track.extend([mido.MetaMessage('set_tempo',tempo=500000),
                      mido.Message('note_on',note=38,velocity=42,time=243),
                      mido.Message('note_off',note=38,time=100)])
        data = io.BytesIO(); midi.save(file=data)
        self.assertEqual(measure(data.getvalue()), [(38,42,1.5625)])
        track.append(mido.MetaMessage('set_tempo',tempo=600000))
        data = io.BytesIO(); midi.save(file=data)
        self.assertIsNone(measure(data.getvalue()))

    def test_event_frames_fail_on_missing_or_mistimed_rows(self):
        from q0_measure_comparisons import timing
        plan = {'ticks_per_quarter':960,'tempo_milli_bpm':120000,'sample_rate':48000,
            'tracks':[{'instrument':'piano','events':[
                {'start_tick':3,'duration_ticks':4,'note':60,'velocity':80}]}]}
        data = 'frame\tkind\tid\tinstrument\tpitch\tvelocity\n75\ton\t0\tpiano\t60\t80\n175\toff\t0\tpiano\t60\t0\n'
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'events.tsv';path.write_text(data)
            self.assertEqual(timing(plan,path), {'events':2,'maximum_frame_error':0})
            path.write_text(data.replace('175\toff','174\toff'))
            with self.assertRaises(ValueError): timing(plan,path)
            path.write_text(data.rsplit('175',1)[0])
            with self.assertRaises(ValueError): timing(plan,path)

    def test_ffmpeg_trailing_status_not_part_of_json(self):
        result = subprocess.CompletedProcess([], 0, '', 'log\n{"input_i":"-20","input_tp":"-3",'
            '"input_lra":"2","input_thresh":"-30"}\n[out#0/null] muxing overhead: unknown\n')
        with patch('q0_audit.subprocess.run', return_value=result):
            self.assertEqual(loudness('unused')['input_i'], '-20')

    def test_level_matching_remeasures_from_original_and_fails_closed(self):
        calls=[]
        def render(args, **kwargs):
            calls.append(args)
            Path(args[-1]).write_bytes(b'only-a-test')
        with tempfile.TemporaryDirectory() as directory:
            output=Path(directory)/'matched.wav'
            levels=[{'input_i':'-23.17','input_tp':'-8'}, {'input_i':'-23.00','input_tp':'-7.83'}]
            with patch('q0_audit.subprocess.run',side_effect=render), patch('q0_audit.loudness',side_effect=levels):
                gain,_=level_match(Path('original.wav'),output,-23,{'input_i':'-29.77'})
                self.assertAlmostEqual(gain,6.94)
                self.assertEqual([c[c.index('-i')+1] for c in calls],['original.wav','original.wav'])
            with self.assertRaises(ValueError): level_match(Path('original.wav'),output,-23,{'input_i':'-29.77'})
            output.unlink()
            with patch('q0_audit.subprocess.run',side_effect=render), patch('q0_audit.loudness',return_value={'input_i':'-23','input_tp':'0'}):
                with self.assertRaises(ValueError): level_match(Path('original.wav'),output,-23,{'input_i':'-29.77'})
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
