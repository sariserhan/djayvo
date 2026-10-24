"""Run the actual local Improvise flow against the existing owner-authorized phrase."""
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
import singer_studio
from arrange_voice_research import digest

output=Path(sys.argv[1] if len(sys.argv)>1 else 'renders/improvise-reggae-revision-20261023/studio')
output.mkdir(parents=True,exist_ok=False)
singer_studio.OUTPUT=output
source=ROOT/'renders/meaning-singer-trial-20261022/original-recording'
original=digest(source)
result=singer_studio.make_reply(str(source),'','male','reggae',True,35)
song,performance=map(Path,result[:2])
song_report=json.loads((song.parent/'complete.json').read_text())
mix_report=json.loads((performance.parent/'complete.json').read_text())
assert digest(source)==original==mix_report['original_recording_sha256']
assert mix_report['sample_used'] and mix_report['events']
assert mix_report['outside_region_max_pcm_error']==0
assert mix_report['processed_source_max_pcm_error']<=.5/32768+1e-12
assert all(e['processing']['version']==2 for e in mix_report['events'])
assert mix_report['peak']<.98
report={'technical':'PASS','listening':'NOT RUN','source_sha256':original,
        'song':str(song),'performance':str(performance),'lyrics':result[2],
        'recognized_phrase':result[4],'song_receipt':song_report,'mix_receipt':mix_report}
(output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'technical':'PASS','song':str(song),'performance':str(performance)}))
