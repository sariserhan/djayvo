#!/usr/bin/env python3
"""Small Q0 invariants; actual native import/render is checked by experiment runs."""
import copy
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
from q0_composition import compose
from q0_authored_score import authored
from q0_audit import digest
from q0_audit import loudness, inputs, level_match


class Q0(unittest.TestCase):
    def setUp(self):
        self.plan = json.loads((ROOT/'docs/evidence/r0/hiphop.plan.json').read_text())['execution']

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

    def test_invalid_context_and_seed(self):
        for seed in (-1, True, 2**32, 1.5):
            with self.assertRaises(ValueError): express(self.plan, seed)
        for key, value in [('strategy', 'unknown'), ('time_signature', [3,4]),
                           ('tempo_changes', [{'tick': 960}]), ('tempo_milli_bpm', 0)]:
            p = copy.deepcopy(self.plan); p[key] = value
            with self.assertRaises(ValueError): express(p, 1)

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
