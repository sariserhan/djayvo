"""Fresh local source-to-song runs; no cached transcription, no cloud or playback."""
import json,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];sys.path.insert(0,str(ROOT/'scripts'))
import singer_studio
from singing_response import digest
out=ROOT/'renders/improvise-finish-20261023'; runs=[]
for label,source,genre,voice,duration in [
 ('reggae-question',ROOT/'renders/meaning-singer-trial-20261022/original-recording','reggae','male',33),
 ('jazz-coffee',out/'sources/coffee.aiff','jazz','female',39),
 ('edm-dance',out/'sources/dance.aiff','edm','male',45),
 ('acoustic-turkish',out/'sources/turkish.aiff','acousticpop','female',30)]:
    singer_studio.OUTPUT=out/label;singer_studio.OUTPUT.mkdir(exist_ok=False)
    start=time.monotonic();original=digest(source)
    try:
        song,audio,lyrics,status,phrase=singer_studio.make_reply(str(source),'',voice,genre,True,duration)
        receipt=json.loads(Path(audio).with_name('complete.json').read_text())
        assert digest(source)==original==receipt['original_recording_sha256']
        assert receipt['sample_used'] and receipt['events'] and receipt['outside_region_max_pcm_error']==0
        assert receipt['peak']<.98 and receipt['artifacts']['performance']==digest(audio)
        row={'label':label,'technical':'PASS','audio':audio,'song':song,'lyrics':lyrics,'recognized':phrase,
             'pattern':receipt['pattern'],'seconds':round(time.monotonic()-start,2),'source_sha256':original}
    except Exception as error:
        row={'label':label,'technical':'FAIL','error':str(error),'seconds':round(time.monotonic()-start,2)}
    runs.append(row);(out/'fresh.json').write_text(json.dumps(runs,indent=2)+'\n');print(json.dumps(row),flush=True)
