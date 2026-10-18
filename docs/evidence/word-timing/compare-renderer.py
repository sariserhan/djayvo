from pathlib import Path
import hashlib,json,sys
sys.path.insert(0,'scripts')
from compare_portability import compare
root=Path('renders/word-timing-20261018');other=Path('renders/arrangement-linux/word-timing-20261018/aligned');report={};count=0
for style in ['hiphop','reggae','experimental','club']:
    prefix=f'{style}-aligned.{style}';report[style]=compare(other/f'{style}.{style}',root/prefix)
    for p in root.glob(prefix+'*.wav'):
        q=other/p.name.replace(style+'-aligned.',style+'.',1)
        assert hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256(q.read_bytes()).digest();count+=1
report['exact_wavs']=count
Path('docs/evidence/word-timing/renderer-portability.json').write_text(json.dumps(report,indent=2)+'\n');print(count,'exact WAVs')
