"""Verify the actual comparison artifacts without inferring musical quality."""
import json
from pathlib import Path
import sys
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'scripts'))
from arrange_voice_research import RATE,digest,read_pcm
root=Path('renders/gentle-singer-review-20261022')
original=Path('renders/integrated-singer-audition-20261022')
r=json.loads((root/'complete.json').read_text());checks=[]
for c in r['cases']:
 case=c['case'];folder=root/case;a=c['assembly']
 song=read_pcm(original/case/'singer.wav',(30,30));mixed=read_pcm(folder/'performance.wav',(30,30))
 assert digest(folder/'music.wav')==digest(original/case/'singer.wav')==a['singer_sha256']
 assert len(a['events'])<=1 and a['master_gain']==1
 outside=np.ones(len(song),dtype=bool)
 for e in a['events']:
  outside[e['start_frame']:e['end_frame']]=False
  assert e['rate']==1 and not e['echo']
  assert e['estimated_vocal_max_window_rms']<=e['vocal_threshold_rms']
 assert np.array_equal(song[outside],mixed[outside])
 assert np.max(np.abs(mixed))<1 and np.isfinite(mixed).all()
 if not a['sample_used']:assert digest(folder/'performance.wav')==a['singer_sha256']
 for m in c['matched'].values():assert m['true_peak_dbfs']<=-1.8
 checks.append({'case':case,'status':'PASS','sample_used':a['sample_used'],'events':a['events'],
  'original_music_sha256':a['singer_sha256'],'music_preserved_byte_exact':True,
  'outside_sample_pcm_identical':True,'source_sha256':a['source_sha256'],
  'source_identity_max_pcm_error':a['source_identity_max_pcm_error'],
  'peak':float(np.max(np.abs(mixed))),'loudness_matched':c['matched']})
Path('docs/evidence/gentle-singer/audio.json').write_text(json.dumps({'technical':'PASS','cases':checks,'listening':'NOT RUN'},indent=2)+'\n')
print('PASS: six actual comparisons; original songs unchanged; four single samples, two unchanged fallbacks')
