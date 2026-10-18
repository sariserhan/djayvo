"""Exercise nonspeech/silence and preserve the supplied speech fixture."""
import array,json,random,subprocess,wave
from pathlib import Path
root=Path('renders/word-timing-20261018');result={};rng=random.Random(4123)
for name in ('silence','noise'):
    samples=array.array('h',(0 if name=='silence' else rng.randrange(-3000,3001) for _ in range(48000)))
    path=root/f'{name}.wav'
    with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(16000);f.writeframes(samples.tobytes())
    out=root/f'{name}.words.json'
    done=subprocess.run(['.venv-speech/bin/python','scripts/analyze_words.py','--input',str(path),'--synthetic-fixture',
        '--model','build-speech-tools/faster-whisper-tiny','--output',str(out)],capture_output=True,text=True,timeout=130)
    if name=='silence':assert done.returncode!=0 and not out.exists();result[name]={'rejected_before_inference':'PASS'}
    else:
        assert done.returncode==0,done.stderr
        record=json.loads(out.read_text());result[name]={'word_estimates':len(record['words']),'inference_seconds':record['inference_seconds'],'nonspeech_evidence':'single procedural control only'}
Path('docs/evidence/word-timing/controls.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
