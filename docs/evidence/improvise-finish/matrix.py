"""Exercise every offered genre with varied local inputs; retained music, real ASR/crops/mixes."""
import json,sys,os,time
from pathlib import Path
import numpy as np
import soundfile as sf
ROOT=Path(__file__).resolve().parents[3];sys.path.insert(0,str(ROOT/'scripts'))
from singer_studio import prepare_source,understand,sample_candidate
from singing_response import STYLES,digest
from local_call_edit import arrange
out=ROOT/'renders/improvise-finish-20261023';dest=out/'matrix';dest.mkdir(exist_ok=False)
rng=np.random.default_rng(246);pcm,rate=sf.read(out/'sources/coffee.aiff');sf.write(out/'sources/noisy.wav',pcm*.35+rng.normal(0,.012,pcm.shape),rate,subtype='PCM_16')
claps=np.zeros(16000*3)
for start in (2400,11000,19000,31000):
    n=2200;claps[start:start+n]+=rng.normal(0,.25,n)*np.exp(-np.arange(n)/230)
sf.write(out/'sources/claps.wav',claps,16000,subtype='PCM_16')
sf.write(out/'sources/silence.wav',np.zeros(32000),16000,subtype='PCM_16')
sources={'owner':ROOT/'renders/meaning-singer-trial-20261022/original-recording',
         **{name:out/'sources'/file for name,file in [('coffee','coffee.aiff'),('dance','dance.aiff'),('turkish','turkish.aiff'),('noisy','noisy.wav'),('claps','claps.wav'),('silence','silence.wav')]}}
prepared={};rows=[]
for name,source in sources.items():
    folder=dest/name;folder.mkdir();before=digest(source);info=prepare_source(source,folder)
    speech=understand(folder,os.environ.copy());prepared[name]=(folder,source,before,info,speech)
for index,genre in enumerate(STYLES):
    songs=list((ROOT/f'renders/music-validation-20261023/improvise-{genre}/improvise').glob('*/singer'))
    assert len(songs)==1,genre
    for name,(folder,source,before,info,speech) in prepared.items():
        work=folder/genre;work.mkdir();(work/'decoded.wav').symlink_to(folder/'decoded.wav');(work/'original-recording').symlink_to(folder/'original-recording')
        row={'source':name,'genre':genre,'source_sha256':before};attempts=[];result=None
        for attempt in range(4):
            candidate=sample_candidate(work,speech,genre,info['original_seconds'],810+index,attempt)
            if candidate is None:break
            try:result=arrange(candidate[0],songs[0],work/f'mix-{attempt}',dest/'history.json',810+index+attempt,True,source_score=candidate[1])
            except ValueError as error:attempts.append(str(error));continue
            assert result['sample_used'] and result['events'] and result['outside_region_max_pcm_error']==0 and result['peak']<.98
            result['source_excerpt']=json.loads(candidate[1].read_text());result['original_recording_sha256']=before
            (work/f'mix-{attempt}'/'complete.json').write_text(json.dumps(result,indent=2)+'\n')
            row.update(technical='PASS',pattern=result['pattern'],audio=str(work/f'mix-{attempt}'/'performance.wav'),peak=result['peak']);break
        assert digest(source)==before
        if result is None:row.update(technical='EXPECTED_REJECTION' if name=='silence' else 'FAIL',attempts=attempts)
        rows.append(row);(out/'matrix.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(row),flush=True)
