"""Exercise real source selection and mixes; no new model inference or listening."""
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'scripts'))
from local_call_edit import arrange
from singer_studio import prepare_source, sample_candidate
from arrange_voice_research import digest

root=Path('renders/arrangement-variety-20261022');root.mkdir(exist_ok=False)
song=Path('renders/integrated-singer-audition-20261022/reggae-male')
source=Path('renders/meaning-singer-trial-20261022/original-recording')
speech=json.loads(Path('renders/meaning-singer-trial-20261022/meaning.json').read_text())
original_hash=digest(source);reports=[]
for seed in range(8):
    work=root/str(seed);work.mkdir();r=prepare_source(source,work)
    hook,score=sample_candidate(work,speech,'reggae',r['original_seconds'],seed)
    report=arrange(hook,song,work/'mix',root/'history.json',seed,True)
    assert report['sample_used'],report
    assert report['outside_region_max_pcm_error']==0
    report['crop_seconds']=json.loads(score.read_text())['original_seconds']
    reports.append(report)
assert digest(source)==original_hash
modes=[r['mode'] for r in reports];fingerprints=[r['arrangement_fingerprint'] for r in reports]
assert len(set(modes))==2,modes
assert any(a==b for a,b in zip(modes,modes[1:])),modes
assert all(a!=b for a,b in zip(fingerprints,fingerprints[1:])),fingerprints
result={'technical':'PASS','listening':'NOT RUN','model_generation':'NOT RUN - existing original song reused',
        'source_preserved':True,'both_modes':True,'not_fixed_alternation':True,'no_consecutive_shape_repeat':True,'runs':reports}
Path('docs/evidence/arrangement-variety/repeated-renders.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'status':'PASS','modes':modes,'fingerprints':fingerprints,'crops':[r['crop_seconds'] for r in reports]}))
