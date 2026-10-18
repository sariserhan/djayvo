"""Measure optional local timing on each licensed speaker once; never infer accuracy."""
from pathlib import Path
import json,subprocess
root=Path('renders/licensed-speech-timing-20261018');root.mkdir();results=[]
manifest=json.loads(Path('renders/licensed-evaluation-20261018/manifest-final.json').read_text())
for clip in manifest['clips']:
    if clip['kind']!='speech':continue
    output=root/(clip['id']+'.words.json')
    run=subprocess.run(['.venv-speech/bin/python','scripts/analyze_words.py','--input',clip['path'],'--consent',
        '--model','build-speech-tools/faster-whisper-tiny','--output',str(output)],capture_output=True,text=True,timeout=125)
    (root/(clip['id']+'.log')).write_text(run.stdout+run.stderr)
    row={'clip_id':clip['id'],'source_sha256':clip['sha256'],'execution':'PASS' if run.returncode==0 else 'FAIL','word_accuracy':'NOT RUN'}
    if output.exists():
        data=json.loads(output.read_text());row.update(estimated_words=len(data['words']),high_confidence_words=sum(w['confidence']>=.8 for w in data['words']),
            language=data['language'],language_probability=data['language_probability'],inference_seconds=data['inference_seconds'],peak_rss_bytes=data['peak_rss_bytes'])
    results.append(row)
report={'execution':'PASS' if all(r['execution']=='PASS' for r in results) else 'FAIL','sources':len(results),'results':results,
    'workload':'M5 CPU, concurrent with native evaluation preparation; not an isolated latency benchmark','word_accuracy':'NOT RUN','musical_quality':'NOT RUN'}
Path('docs/evidence/licensed-evaluation/speech-timing.json').write_text(json.dumps(report,indent=2)+'\n')
print(report['execution'],len(results),'licensed speech analyses; accuracy NOT RUN')
