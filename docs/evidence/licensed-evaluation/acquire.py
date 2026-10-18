"""Select 20 full short utterances from different speakers; never train or publish."""
from pathlib import Path,PurePosixPath
import hashlib,json,subprocess,tarfile,urllib.request
root=Path('renders/licensed-evaluation-20261018');root.mkdir(exist_ok=True);(root/'sources').mkdir(exist_ok=True)
url='https://www.openslr.org/resources/12/dev-clean.tar.gz'
# The first sequential transfer is preserved; bounded ranges complete it faster.
from concurrent.futures import ThreadPoolExecutor
partial=root/'dev-clean.tar.gz';archive=root/'dev-clean-verified.tar.gz'
total=337926286;offset=partial.stat().st_size if partial.exists() else 0
assert 0<=offset<total
parts=root/'download-parts';parts.mkdir()
ranges=[(start,min(start+8*1024*1024,total)-1) for start in range(offset,total,8*1024*1024)]
def fetch(bounds):
    start,end=bounds
    request=urllib.request.Request(url,headers={'Range':f'bytes={start}-{end}'})
    with urllib.request.urlopen(request,timeout=60) as response,(parts/str(start)).open('xb') as out:
        assert response.status==206 and response.headers['Content-Range']==f'bytes {start}-{end}/{total}'
        count=0
        while chunk:=response.read(1024*1024):
            count+=len(chunk)
            assert count<=end-start+1
            out.write(chunk)
        assert count==end-start+1
with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(fetch,ranges))
md5=hashlib.md5();sha=hashlib.sha256();count=0
with archive.open('xb') as out:
    for path in ([partial] if offset else [])+[parts/str(start) for start,end in ranges]:
        with path.open('rb') as source:
            while chunk:=source.read(1024*1024):
                out.write(chunk);md5.update(chunk);sha.update(chunk);count+=len(chunk)
assert count==total and md5.hexdigest()=='42e2234ba48799c1f50f24a7926300a1','Published archive checksum differs'
clips=[];speakers=set();rights={}
with tarfile.open(archive,'r:gz') as tar:
    for member in tar:
        if not member.isfile() or member.size>4*1024*1024:continue
        name=PurePosixPath(member.name)
        if name.name.upper() in ('LICENSE.TXT','README.TXT'):
            rights[name.name]=tar.extractfile(member).read().decode('utf-8');continue
        if len(clips)==20 or name.suffix!='.flac' or len(name.parts)!=5 or name.parts[:2]!=('LibriSpeech','dev-clean'):continue
        speaker,chapter=name.parts[2:4]
        if speaker in speakers or not speaker.isdigit() or not chapter.isdigit():continue
        data=tar.extractfile(member).read()
        probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','json','-i','pipe:0'],input=data,capture_output=True,check=True,timeout=15)
        seconds=float(json.loads(probe.stdout)['format']['duration'])
        if not 2<=seconds<=5:continue
        clip_id='ls-'+name.stem;out=root/'sources'/f'{clip_id}.wav'
        subprocess.run(['ffmpeg','-v','error','-n','-i','pipe:0','-ac','1','-ar','16000','-c:a','pcm_s16le',str(out)],input=data,check=True,timeout=15)
        speakers.add(speaker)
        attribution=('LibriSpeech (c) 2014 by Vassil Panayotov. Dev-clean corpus credited to Vassil Panayotov, Guoguo Chen, Daniel Povey and Sanjeev Khudanpur; '
            'derived from LibriVox public-domain audiobooks. Source: https://www.openslr.org/12/ ; '
            'CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . '+
            f'Utterance {name.stem}. Modified: FLAC decoded to PCM16 WAV; evaluation remixes slice and mix this source. No endorsement implied.')
        clips.append({'id':clip_id,'session_id':f'ls-{speaker}-{chapter}','speaker_id':f'ls-{speaker}','kind':'speech','source_kind':'recorded',
            'path':f'sources/{clip_id}.wav','sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
            'consent':{'local_processing':True,'review_scope':'independent_reviewers','evidence':'Public dataset license, not individual study consent: '+attribution},
            'license':{'id':'CC-BY-4.0','url':'https://creativecommons.org/licenses/by/4.0/','attribution':attribution},
            'archive_member':member.name,'original_flac_sha256':hashlib.sha256(data).hexdigest(),'seconds':seconds})
assert len(clips)==20 and len(speakers)==20
manifest={'schema_version':'1.0-evaluation','purpose':'Local technical and blinded listening evaluation; no training or publication',
          'dataset_url':'https://www.openslr.org/12/','archive':{'url':url,'bytes':count,'md5':md5.hexdigest(),'sha256':sha.hexdigest()},
          'selection':'First complete 2–5 second utterance for each of the first 20 eligible distinct speakers in pinned tar order; no musical outcome selection',
          'clips':clips}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for name,text in rights.items():(root/name).write_text(text)
Path('docs/evidence/licensed-evaluation/acquisition.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('PASS: 20 full short utterances from 20 source speaker IDs, published archive MD5 verified, SHA256/source hashes and attribution recorded; listening NOT RUN')
