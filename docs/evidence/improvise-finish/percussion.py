"""Recheck all 23 styles after fixing short percussion selection; retain failed evidence."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];sys.path.insert(0,str(ROOT/'scripts'))
from singer_studio import sample_candidate
from singing_response import STYLES,digest
from local_call_edit import arrange
out=ROOT/'renders/improvise-finish-20261023';dest=out/'percussion';dest.mkdir(exist_ok=False)
source=out/'matrix/claps';speech=json.loads((source/'meaning.json').read_text());rows=[]
for index,genre in enumerate(STYLES):
    work=dest/genre;work.mkdir()
    for f in ('decoded.wav','original-recording'):(work/f).symlink_to(source/f)
    song=next((ROOT/f'renders/music-validation-20261023/improvise-{genre}/improvise').glob('*/singer'))
    result=None;errors=[]
    for attempt in range(4):
        candidate=sample_candidate(work,speech,genre,3,810+index,attempt)
        if candidate is None:break
        try:result=arrange(candidate[0],song,work/f'mix-{attempt}',dest/'history.json',810+index+attempt,True,source_score=candidate[1])
        except ValueError as error:errors.append(str(error));continue
        assert result['sample_used'] and result['events'] and result['outside_region_max_pcm_error']==0 and result['peak']<.98
        result['source_excerpt']=json.loads(candidate[1].read_text());result['original_recording_sha256']=digest(source/'original-recording')
        (work/f'mix-{attempt}'/'complete.json').write_text(json.dumps(result,indent=2)+'\n');break
    row={'genre':genre,'technical':'PASS' if result else 'FAIL','errors':errors}
    if result:row.update(audio=str(work/f'mix-{attempt}'/'performance.wav'),pattern=result['pattern'])
    rows.append(row);(out/'percussion.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(row),flush=True)
