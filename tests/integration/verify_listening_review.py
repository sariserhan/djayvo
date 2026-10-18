"""Temporary synthetic form fixtures only; no study observations are created."""
import csv,hashlib,json,sys,tempfile,wave
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
from prepare_listening_review import build_review
from summarize_listening import RATING_COLUMNS,PAIR_COLUMNS,STYLES,summarize


def fixture(root):
    root=Path(root);folder=root/'synthetic-ui-fixture/4123/blinded';listener=folder/'listener';listener.mkdir(parents=True)
    with wave.open(str(listener/'source.wav'),'wb') as audio:
        audio.setparams((1,2,16000,0,'NONE','not compressed'));audio.writeframes(b'\x00\x10\x00\xf0'*16000)
    data=(listener/'source.wav').read_bytes();sha=hashlib.sha256(data).hexdigest();block='a'*24
    codes={block+'-'+chr(65+i):{'strategy':style,'sha256':sha} for i,style in enumerate(STYLES)}
    for code in codes:(listener/(code+'.wav')).write_bytes(data)
    key={'block_id':block,'clip_id':sha[:16],'codes':codes};(folder/'organizer-key.json').write_text(json.dumps(key))
    clip={'id':'synthetic-ui-fixture','kind':'synthetic_control','source_kind':'synthetic','sha256':sha,'consent':{'local_processing':True,'review_scope':'owner_only'}}
    freeze=json.dumps({'dataset':{'clips':[clip]}}).encode();(root/'freeze.json').write_bytes(freeze)
    report={'freeze_sha256':hashlib.sha256(freeze).hexdigest(),'records':[{'packet':'PASS','block_id':block,'clip_id':clip['id'],'seed':4123,'review_scope':'owner_only','kind':'synthetic_control'}],'per_style_technical_counts':{},'dataset_readiness':{'status':'PARTIAL'}}
    (root/'report.json').write_text(json.dumps(report))
    with (listener/'responses.csv').open('w',newline='') as f:
        writer=csv.writer(f);writer.writerow(RATING_COLUMNS)
        for code in codes:writer.writerow(['',sha[:16],block,code,*(['']*8)])
    with (listener/'pairs.csv').open('w',newline='') as f:
        writer=csv.writer(f);writer.writerow(PAIR_COLUMNS)
        for code in list(codes)[:3]:writer.writerow(['',sha[:16],block,code,block+'-D','',''])
    (listener/'INSTRUCTIONS.txt').write_text('Synthetic UI test only. Not study evidence. <script>unsafe()</script>')
    return listener


def main():
    with tempfile.TemporaryDirectory(prefix='djayvo-listening-ui-') as tmp:
        root=Path(tmp);batch=root/'batch';listener=fixture(batch);out=root/'review'
        original={str(p.relative_to(batch)):hashlib.sha256(p.read_bytes()).hexdigest() for p in batch.rglob('*') if p.is_file()}
        manifest=build_review(batch,'synthetic-ui-fixture',4123,out)
        assert manifest['human_listening']=='NOT RUN' and manifest['review_scope']=='owner_only'
        assert not (out/'organizer-key.json').exists()
        page=(out/'index.html').read_text();assert 'owner-only' in page and '&lt;script&gt;' in page
        assert all(style not in page for style in STYLES) and 'unsafe()<' not in page
        assert all(hashlib.sha256((out/name).read_bytes()).hexdigest()==sha for name,sha in manifest['audio_sha256'].items())
        assert summarize(batch,[out/'responses.csv'],[out/'pairs.csv'])['individual_ratings']==0
        count=6
        def reject(action):
            nonlocal count
            try:action()
            except (ValueError,FileNotFoundError):count+=1;return
            raise AssertionError('invalid packet was accepted')
        reject(lambda:build_review(batch,'synthetic-ui-fixture',4123,out))
        reject(lambda:build_review(batch,'../outside',4123,root/'bad'))
        reject(lambda:build_review(batch,'synthetic-ui-fixture',4123,batch/'new'))
        reject(lambda:build_review(batch,'synthetic-ui-fixture',9999,root/'bad'))
        assert original=={str(p.relative_to(batch)):hashlib.sha256(p.read_bytes()).hexdigest() for p in batch.rglob('*') if p.is_file()};count+=1
        for name in ['source.wav','responses.csv','pairs.csv']:
            path=listener/name;data=path.read_bytes();path.write_bytes(data+b'changed');reject(lambda:build_review(batch,'synthetic-ui-fixture',4123,root/'bad'));path.write_bytes(data)
        path=listener/'source.wav';data=path.read_bytes();path.unlink();path.symlink_to(out/'source.wav');reject(lambda:build_review(batch,'synthetic-ui-fixture',4123,root/'bad'));path.unlink();path.write_bytes(data)
        freeze=batch/'freeze.json';data=freeze.read_bytes();freeze.write_bytes(data+b' ');reject(lambda:build_review(batch,'synthetic-ui-fixture',4123,root/'bad'));freeze.write_bytes(data)
        record=json.loads((batch/'report.json').read_text());record['records'][0]['review_scope']='independent_reviewers';(batch/'report.json').write_text(json.dumps(record));reject(lambda:build_review(batch,'synthetic-ui-fixture',4123,root/'bad'))
        record['records'][0]['review_scope']='owner_only';(batch/'report.json').write_text(json.dumps(record))
        responses=listener/'responses.csv';data=responses.read_bytes();rows=list(csv.reader(data.decode().splitlines()));rows[1][0]='synthetic-filled'
        with responses.open('w',newline='') as f:csv.writer(f).writerows(rows)
        reject(lambda:build_review(batch,'synthetic-ui-fixture',4123,root/'bad'));responses.write_bytes(data)
        instructions=listener/'INSTRUCTIONS.txt';data=instructions.read_bytes();instructions.write_bytes(b'x'*(65536+1));reject(lambda:build_review(batch,'synthetic-ui-fixture',4123,root/'bad'));instructions.write_bytes(data)
        frozen=json.loads(freeze.read_text());frozen['dataset']['clips'][0]['license']={'id':'test-only'};freeze.write_text(json.dumps(frozen));record['freeze_sha256']=hashlib.sha256(freeze.read_bytes()).hexdigest();(batch/'report.json').write_text(json.dumps(record))
        reject(lambda:build_review(batch,'synthetic-ui-fixture',4123,root/'bad'))
        (listener/'ATTRIBUTION.txt').write_text('Synthetic credit <script>unsafe()</script>')
        build_review(batch,'synthetic-ui-fixture',4123,root/'credited');assert '&lt;script&gt;' in (root/'credited/index.html').read_text();count+=1
        print(f'PASS: {count} local review packaging checks; human listening NOT RUN')

if __name__=='__main__':main()
