"""Acquire the pinned public MIT model locally; no audio is sent."""
import hashlib,json,urllib.request
from pathlib import Path
root=Path('build-speech-tools/faster-whisper-tiny');root.mkdir(parents=True)
m=json.loads(Path('docs/evidence/word-timing/model-metadata.json').read_text())
files={}
for name in ('config.json','model.bin','tokenizer.json','vocabulary.txt','README.md'):
    url=f"https://huggingface.co/{m['repository']}/resolve/{m['revision']}/{name}"
    with urllib.request.urlopen(url,timeout=120) as response:
        data=response.read(100*1024*1024+1)
    assert len(data)<=100*1024*1024
    (root/name).write_bytes(data);files[name]={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'url':url}
m.update(files=files,license_url='https://github.com/openai/whisper/blob/main/LICENSE',bundled_in_product=False,training=False)
Path('assets/manifests/word-timing-tiny.json').write_text(json.dumps(m,indent=2)+'\n')
print('PASS: pinned tiny speech model downloaded; bytes',sum(f['bytes'] for f in files.values()))
