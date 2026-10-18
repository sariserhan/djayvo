from pathlib import Path
import json,subprocess
root=Path('renders/licensed-nonspeech-20261018');report={}
for clip in json.loads((root/'manifest.json').read_text())['clips']:
    output=root/(clip['id']+'.words.json')
    run=subprocess.run(['.venv-speech/bin/python','scripts/analyze_words.py','--input',clip['path'],
        '--synthetic-fixture' if clip['source_kind']=='synthetic' else '--consent','--model','build-speech-tools/faster-whisper-tiny',
        '--output',str(output)],capture_output=True,text=True,timeout=125)
    (root/(clip['id']+'.analysis.log')).write_text(run.stdout+run.stderr)
    row={'source_kind':clip['source_kind'],'declared_category':clip['kind'],'execution':'PASS' if run.returncode==0 else 'FAIL','human_category_check':'NOT RUN'}
    if output.exists():
        data=json.loads(output.read_text());row.update(estimated_words=len(data['words']),language_probability=data['language_probability'],
            high_confidence_words=sum(w['confidence']>=.8 for w in data['words']),inference_seconds=data['inference_seconds'])
    elif clip['kind']=='silence' and 'Silence or invalid audio' in run.stderr:row.update(execution='PASS',expected_rejection='PASS')
    report[clip['id']]=row
Path('docs/evidence/licensed-evaluation/nonspeech-word-estimates.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
