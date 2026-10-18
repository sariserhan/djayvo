"""Run from the repository root; local-only checks in a new ignored directory."""
import hashlib
import json
from pathlib import Path
import platform
import subprocess
import sys
import tempfile
import wave
import numpy as np

sys.path.insert(0,str(Path.cwd()/"scripts"))
from prepare_voice_research import prepare

root=Path(tempfile.mkdtemp(prefix="research-input-",dir="renders"))
source=Path("renders/voice-20261017-221411/source-pcm.wav")
fixture=Path("renders/fixtures/synthetic-speech.wav")
master=Path("ai_improvisational_musician_master_spec_v1.md")
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
protected={str(p):digest(p) for p in (source,fixture,master)}
report={"platform":platform.platform(),"machine":platform.machine(),"python":sys.version,
        "numpy":np.__version__,"output":str(root),"protected_sha256":protected,
        "listening":"NOT RUN","full_specification":"PARTIAL","cases":[]}
report["ffmpeg"]=subprocess.run(["ffmpeg","-version"],capture_output=True,text=True,check=True).stdout.splitlines()[0]
speech=".venv-speech/bin/python"
report["speech_environment"]=json.loads(subprocess.run([speech,"-c",
    "import sys,json,importlib.metadata as m; print(json.dumps({'python':sys.version,**{p:m.version(p) for p in ('numpy','faster-whisper','ctranslate2')}}))"],
    capture_output=True,text=True,check=True).stdout)
prepare(source,"renders/voice-club-v8/final/remix.club.score.json","renders/cloud-trial-20261018",root/"voice",True)
previous=Path("renders/voice-research-20261018")
files=sorted((root/"voice").rglob("*.wav"))
assert len(files)==42
for path in files:assert digest(path)==digest(previous/path.relative_to(root/"voice")),str(path)
for path in sorted((root/"voice").glob("*/complete.json")):
    before=json.loads((previous/path.relative_to(root/"voice")).read_text())
    after=json.loads(path.read_text())
    assert after==before,str(path)
    report["cases"].append({"name":path.parent.name,"status":"PASS","events_identical":True,
                            "artifacts":after["artifacts"]})
report["voice_comparison"]={"status":"PASS","wav_files":42,"plans":6,"maximum_pcm_difference":0,"rms_pcm_difference":0}
report["speech_comparison"]=[]
for name,path,permission in (("owner",source,"--consent"),("fixture",fixture,"--synthetic-fixture")):
    output=root/(name+".words.json")
    command=[speech,"scripts/analyze_words.py","--input",str(path),permission,"--model",
             "build-speech-tools/faster-whisper-tiny","--output",str(output)]
    result=subprocess.run(command,capture_output=True,text=True,timeout=130)
    (root/(name+".log")).write_text(result.stdout+result.stderr)
    assert result.returncode==0,result.stderr
    after=json.loads(output.read_text())
    before=json.loads((Path("renders/word-timing-20261018")/(name+".words.json")).read_text())
    keys=("words","source_sha256","source_rate","source_frames","model_manifest_sha256","language","language_probability")
    assert all(before[k]==after[k] for k in keys),name
    report["speech_comparison"].append({"source":name,"status":"PASS","words":len(after["words"]),
        "frames_and_confidences_identical":True,"model_manifest_sha256":after["model_manifest_sha256"],
        "inference_seconds":after["inference_seconds"],"peak_rss_bytes":after["peak_rss_bytes"]})
dc=root/"constant.wav"
with wave.open(str(dc),"wb") as wav:
    wav.setparams((1,2,44100,0,"NONE","not compressed"))
    wav.writeframes(np.full(3*44100,16384,dtype="<i2").tobytes())
output=root/"constant.words.json"
result=subprocess.run([speech,"scripts/analyze_words.py","--input",str(dc),"--synthetic-fixture",
    "--model","build-speech-tools/faster-whisper-tiny","--output",str(output)],capture_output=True,text=True,timeout=130)
(root/"constant.log").write_text(result.stdout+result.stderr)
assert result.returncode!=0 and "Silence or invalid audio" in result.stderr and not output.exists()
report["actual_cli_rejection"]={"status":"PASS","rate":44100,"published_output":False}
assert all(digest(Path(p))==value for p,value in protected.items())
(root/"report.json").write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report,indent=2))
