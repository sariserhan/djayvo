#!/usr/bin/env python3
"""Synthetic leakage controls; no human recordings or training data are created."""
import copy
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import wave

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scripts'))
import demonstrations as d
from check_style_overlap import np, calibration

class Overlap(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='r1-overlap-', dir=ROOT/'renders')
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.rng = np.random.default_rng(419)
        self.source = self.rng.normal(0, .08, 3 * 16000)

    def record(self, name, samples, split='train', rate=16000):
        path = self.folder/(name+'.wav')
        with wave.open(str(path), 'wb') as wav:
            wav.setnchannels(1 if samples.ndim == 1 else samples.shape[1])
            wav.setsampwidth(2);wav.setframerate(rate)
            wav.writeframes(np.clip(samples*32768, -32768, 32767).astype('<i2').tobytes())
        return {'asset': d.reference(path), 'split': split}

    def test_shift_gain_dc_inversion_noise_and_stereo(self):
        a = self.record('source', self.source)
        copied = np.r_[np.zeros(4000), -.35*self.source+.02, np.zeros(8000)]
        copied += self.rng.normal(0,.0005,len(copied))
        b = self.record('copy', np.column_stack([copied,copied]), 'test')
        self.assertNotEqual(a['asset']['sha256'], b['asset']['sha256'])
        with self.assertRaisesRegex(ValueError,'near-duplicate'):
            d.check_audio_splits([a,b])
        b['split']='train';d.check_audio_splits([a,b])

    def test_unrelated_and_silence_do_not_invent_a_match(self):
        records = [self.record('a',self.source),self.record('b',self.rng.normal(0,.08,len(self.source)),'dev'),
                   self.record('silence',np.zeros(len(self.source)),'test')]
        d.check_audio_splits(records)
        self.assertEqual('PASS',calibration()['status'])

    def test_checksum_corruption_and_oversize_batches_fail_closed(self):
        a=self.record('a',self.source);b=self.record('b',self.source*.5,'dev')
        with open(self.folder/'b.wav','ab') as out:out.write(b'changed')
        with self.assertRaisesRegex(ValueError,'changed source'):d.check_audio_splits([a,b])
        records=[{'asset':{'sha256':f'{i:064x}','path':'unused'},'split':'train' if i%2 else 'test'} for i in range(129)]
        with self.assertRaisesRegex(ValueError,'128'):d.check_audio_splits(records)

    def test_cross_ledger_export_invokes_audio_guard(self):
        a=self.record('a',self.source);b=self.record('b',self.source*.5,'dev')
        traces=[]
        for i,record in enumerate([a,b]):
            record.update({k:f'{k}-{i}' for k in ('source_group','session_group','phrase_group','performer_group')})
            record.update(speakers=[],strata={})
            plan={k:i for k in ('tracks','voice_events','voice_clips','sections','tempo_milli_bpm','key')}
            trace={'session_id':str(i),'initial_plan':plan,'actor':{'kind':'automated_test'},'ledger':{}}
            step={'sequence':0,'action':{},'render':{}}
            traces.append((trace,record,plan,[(plan,step,plan)],{}))
        output=self.folder/'never-written.jsonl'
        with patch.object(d,'audited',side_effect=traces), patch.object(d,'reference',return_value={}), self.assertRaisesRegex(ValueError,'near-duplicate'):
            d.export(['a','b'],output)
        self.assertFalse(output.exists())

    def test_ledger_ingestion_invokes_audio_guard_after_rights_validation(self):
        base=d.load(ROOT/'datasets/examples/r1-ledger.json')['records'][0]
        records=[]
        for i,samples in enumerate([self.source,self.source*.5]):
            record=copy.deepcopy(base);record.update(self.record(str(i),samples,'train' if i==0 else 'test'))
            record.update(id=f'case-{i}',origin='first_party_recording',reviewer_id='test-only')
            record.update({k:f'{k}-{i}' for k in ('source_group','session_group','phrase_group','performer_group')})
            records.append(record)
        path=self.folder/'ledger.json';d.write_json(path,{'schema_version':'1.0-demonstration-ledger','records':records})
        with self.assertRaisesRegex(ValueError,'near-duplicate'):d.ledger(path)

if __name__=='__main__':unittest.main()
