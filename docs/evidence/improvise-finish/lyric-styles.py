"""Real planner coverage across every offered style; no song inference or cloud calls."""
import json,sys,time
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[3];sys.path.insert(0,str(ROOT/'scripts'))
import singing_response as singer
out=ROOT/'renders/improvise-finish-20261023/lyric-styles';out.mkdir(exist_ok=False)
# Keep only one local model resident while exercising the actual draft function.
loaded=singer.lyric_model(ROOT/'build-style-training/upstream');rows=[]
phrases=['I have a question, please help.','My coffee is cold again. Can we start this morning over?',
         'I lost my keys, but I still want to dance.','Bugün çok mutluyum. Hadi birlikte dans edelim.',
         'A wordless percussive sound; make a musical response without inventing spoken words']
with patch.object(singer,'lyric_model',return_value=loaded):
 for i,style in enumerate(singer.STYLES):
  try:
   path=out/(style+'.json');singer.draft(ROOT/'build-style-training/upstream',phrases[i%len(phrases)],71401+i,path,'female' if i%2 else 'male',style,30+i%16)
   case=singer.load_plan(path)['cases'][0];assert case['lyric_checks']['version']==2
   row={'style':style,'technical':'PASS','passes':case['lyric_checks']['passes'],'plan_sha256':singer.digest(path),'lyrics':case['lyrics']}
  except Exception as error:row={'style':style,'technical':'FAIL','error':str(error)}
  rows.append(row);(out/'report.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(row),flush=True)
