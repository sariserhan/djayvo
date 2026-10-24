"""Exercise real automatic crops and rhythm choices against retained generated songs."""
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[3];sys.path.insert(0,str(ROOT/'scripts'))
from singer_studio import prepare_source,sample_candidate
from local_call_edit import arrange
from arrange_voice_research import digest

out=Path(sys.argv[1] if len(sys.argv)>1 else 'renders/improvise-rhythm-integration-20261023')
out.mkdir(parents=True,exist_ok=False)
original=ROOT/'renders/meaning-singer-trial-20261022/original-recording'
speech=json.loads((original.parent/'meaning.json').read_text())
expected=json.loads((ROOT/'docs/evidence/improvise-reggae-revision/studio.json').read_text())['source_sha256']
assert digest(original)==expected
runs=[]
for style,song in [('reggae',ROOT/'renders/improvise-reggae-revision-20261023/controlled'),
                   ('funk',ROOT/'renders/integrated-singer-audition-20261022/funk-male'),
                   ('house',ROOT/'renders/integrated-singer-audition-20261022/house-female')]:
    for seed in (2,7,11,19):
        work=out/f'{style}-{seed}';work.mkdir();prepare_source(original,work)
        assert digest(work/'decoded.wav')==speech['source_sha256']
        attempts=[];result=None
        for attempt in range(4):
            candidate=sample_candidate(work,speech,style,6,seed,attempt)
            if candidate is None:break
            try:
                result=arrange(candidate[0],song,work/f'mix-{attempt}',out/'history.json',seed+attempt,True,source_score=candidate[1])
            except ValueError as error:
                attempts.append({'attempt':attempt,'error':str(error)});continue
            assert result['source_sha256']==digest(candidate[0])
            assert result['outside_region_max_pcm_error']==0 and result['peak']<.98
            assert result['processed_source_max_pcm_error']<=.5/32768+1e-12
            if result.get('source_rhythm'):assert result['source_rhythm']['input_sha256']==digest(candidate[0])
            result['source_excerpt']=json.loads(candidate[1].read_text())
            result['original_recording_sha256']=expected
            (work/f'mix-{attempt}'/'complete.json').write_text(json.dumps(result,indent=2)+'\n')
            runs.append({'style':style,'seed':seed,'technical':'PASS','attempts':attempts,
                         'performance':str(work/f'mix-{attempt}'/'performance.wav'),'receipt':result})
            break
        if result is None:runs.append({'style':style,'seed':seed,'technical':'FAIL','attempts':attempts})
assert digest(original)==expected
report={'technical':'PASS' if all(r['technical']=='PASS' for r in runs) else 'PARTIAL','listening':'NOT RUN for automatic mixes',
        'new_model_inference':False,'cached_asr_sha256':digest(original.parent/'meaning.json'),'original_sha256':expected,'runs':runs}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'technical':report['technical'],'completed':sum(r['technical']=='PASS' for r in runs),
                  'patterns':sorted({r['receipt']['pattern'] for r in runs if r['technical']=='PASS'})}))
