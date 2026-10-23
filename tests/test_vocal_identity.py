import sys,unittest,json,tempfile,subprocess,os
from unittest.mock import patch
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from vocal_identity import cast_identity,validate_identity,mix_identity,finish_identity,IDENTITIES

class IdentityTests(unittest.TestCase):
 def test_normal_casting_requires_local_opt_in_and_preserves_female_fallback(self):
  from singing_response import cast_singer_reference
  for enabled,device,voice,converted in [('false','mps','male',False),('true','mps','male',True),('true','mps','female',False),('true','cuda','male',False)]:
   case={'seed':42,'voice':voice}
   with patch.dict(os.environ,{'JAMLOOM_VOCAL_IDENTITY_ENABLED':enabled}),patch('singing_response.inference_device',return_value=device):
    cast_singer_reference(case)
   self.assertEqual('vocal_identity' in case,converted)
   self.assertEqual('singer_reference' in case,device=='mps' and not converted)

 def test_hard_parent_timeout_stops_conversion_child(self):
  child="import os,time;from vocal_identity import watch_parent;watch_parent(os.getppid());print('ready',flush=True);time.sleep(60)"
  parent="import subprocess,sys,time;subprocess.Popen([sys.executable,'-c',sys.argv[1]]);time.sleep(60)"
  process=subprocess.Popen([sys.executable,'-c',parent,child],cwd=Path(__file__).resolve().parents[1]/'scripts',stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  try:
   self.assertEqual(process.stdout.readline().strip(),'ready')
   process.kill()
   # The inherited pipe stays open if the conversion child survives its parent.
   _,error=process.communicate(timeout=5);self.assertEqual(error,'')
  finally:
   if process.poll() is None:process.kill();process.wait()

 def test_failed_conversion_preserves_base_without_publishing_completion(self):
  with tempfile.TemporaryDirectory() as folder:
   work=Path(folder);(work/'singer.wav').write_bytes(b'base fixture')
   receipt={'case':{'voice':'male','vocal_identity':'am_michael'},'source_conditioning':None}
   (work/'complete.json').write_text(json.dumps(receipt))
   with patch('separate_singer.separate',side_effect=ValueError('invalid source')):
    with self.assertRaisesRegex(ValueError,'invalid source'):finish_identity(work)
   self.assertTrue((work/'.partial').exists());self.assertFalse((work/'complete.json').exists());self.assertFalse((work/'singer.wav').exists())
   self.assertEqual((work/'base.wav').read_bytes(),b'base fixture')
   self.assertEqual(json.loads((work/'base.complete.json').read_text()),receipt)

 def test_cast_is_stable_diverse_and_gender_bound(self):
  choices=set()
  for seed in range(30):
   case={'seed':seed,'voice':'male','singer_reference':'voice-2'}
   self.assertTrue(cast_identity(case));self.assertNotIn('singer_reference',case)
   identity=validate_identity(case);choices.add(identity);cast_identity(case);self.assertEqual(identity,validate_identity(case))
  self.assertEqual(choices,{key for key,value in IDENTITIES.items() if value['accepted']});self.assertFalse(cast_identity({'seed':0,'voice':'female'}))
  for case in [{'voice':'female','vocal_identity':'am_michael'},{'voice':'male','vocal_identity':'am_puck'},{'voice':'male','vocal_identity':'am_michael','singer_reference':'voice-2'}]:
   with self.assertRaises(ValueError):validate_identity(case)
 def test_mix_preserves_backing_and_rejects_broken_conversion(self):
  rate=48000;t=np.arange(rate)/rate;stem=np.tile((.1*np.sin(2*np.pi*220*t))[:,None],(1,2));backing=np.tile((.2*np.sin(2*np.pi*100*t))[:,None],(1,2))
  vocal=.1*np.sin(2*np.pi*220*np.arange(44100)/44100)
  mixed,report=mix_identity(backing+stem,stem,vocal)
  self.assertEqual(mixed.shape,stem.shape);self.assertLess(np.max(np.abs(mixed-(backing+stem))),.003)
  self.assertEqual(report['master_gain'],1)
  for bad in [np.zeros(44100),np.full(44100,np.nan),vocal[:22050]]:
   with self.assertRaises(ValueError):mix_identity(backing+stem,stem,bad)
if __name__=='__main__':unittest.main()
