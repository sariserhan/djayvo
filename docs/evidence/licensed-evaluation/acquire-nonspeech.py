"""Acquire declared public-domain recordings; retain notices and exact crop provenance."""
from pathlib import Path
import hashlib,json,subprocess,urllib.request,wave
root=Path('renders/licensed-nonspeech-20261018');root.mkdir();clips=[]
sources=[('laughter','Laughter(s).ogg','sagetyrtle','https://upload.wikimedia.org/wikipedia/commons/c/cb/Laughter%28s%29.ogg','CC0-1.0','https://creativecommons.org/publicdomain/zero/1.0/',3),
 ('claps','Clapping_hurray.ogg','starlite (metadata: Zack and friends)','https://upload.wikimedia.org/wikipedia/commons/a/a8/Clapping_hurray.ogg','PD-author','https://commons.wikimedia.org/wiki/Template:PD-author',3),
 ('noise','Clicker_sound.ogg','Maddy','https://upload.wikimedia.org/wikipedia/commons/b/bd/Clicker_sound.ogg','CC0-1.0','https://creativecommons.org/publicdomain/zero/1.0/',None)]
for kind,title,author,url,license_id,license_url,seconds in sources:
    page='https://commons.wikimedia.org/wiki/File:'+title
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Djayvo-local-evaluation/1.0'}),timeout=30) as response:data=response.read(2*1024*1024+1)
    assert 0<len(data)<=2*1024*1024
    with (root/(kind+'.ogg')).open('xb') as out:out.write(data)
    wav=root/(kind+'.wav');args=['ffmpeg','-v','error','-n','-i',str(root/(kind+'.ogg'))]
    if seconds:args+=['-t',str(seconds)]
    subprocess.run([*args,'-ac','1','-ar','16000','-c:a','pcm_s16le',str(wav)],check=True,timeout=15)
    with wave.open(str(wav)) as f:duration=f.getnframes()/f.getframerate()
    assert 2<=duration<=5
    attribution=f'{title} by {author}. Source and rights notice: {page} . {license_id}: {license_url} . Modified: first {duration:.6f} seconds decoded to PCM16 mono 16 kHz; evaluation remixes slice/mix the recording. No endorsement implied.'
    clips.append({'id':'commons-'+kind,'session_id':'commons-'+kind,'kind':kind,'source_kind':'recorded','path':str(wav.resolve()),
        'sha256':hashlib.sha256(wav.read_bytes()).hexdigest(),'original_sha256':hashlib.sha256(data).hexdigest(),'download_url':url,
        'source_page':page,'source_description_category':kind,'category_human_verification':'NOT RUN','crop_start_seconds':0,'seconds':duration,
        'consent':{'local_processing':True,'review_scope':'independent_reviewers','evidence':'Public-domain declaration, not individual study consent: '+attribution},
        'license':{'id':license_id,'url':license_url,'attribution':attribution}})
# A separate procedural silence control is never counted as a recorded source.
silence=root/'silence.wav'
with wave.open(str(silence),'wb') as f:f.setparams((1,2,16000,0,'NONE','not compressed'));f.writeframes(bytes(96000))
clips.append({'id':'procedural-silence','session_id':'procedural-control','kind':'silence','source_kind':'synthetic','path':str(silence.resolve()),
    'sha256':hashlib.sha256(silence.read_bytes()).hexdigest(),'consent':{'local_processing':True,'review_scope':'independent_reviewers','evidence':'Original procedural silence control; no human recording.'}})
report={'schema_version':'1.0-evaluation','purpose':'Local evaluation only; no training or publication','clips':clips}
(root/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
Path('docs/evidence/licensed-evaluation/nonspeech-acquisition.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: three public-domain recordings with source hashes/attribution and one explicitly synthetic silence control; categories require human verification')
