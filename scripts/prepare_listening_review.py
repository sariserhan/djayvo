#!/usr/bin/env python3
"""Copy one verified frozen block into a fresh, local-only listening form; never supply ratings."""
import argparse,csv,hashlib,html,io,json,re,shutil
from pathlib import Path
from summarize_listening import RATING_COLUMNS,PAIR_COLUMNS,RATING_FIELDS,STYLES

ROOT=Path(__file__).resolve().parents[1]

def bounded(path,limit):
    if path.is_symlink():raise ValueError('symlinks are not allowed in a review packet')
    with path.open('rb') as stream:data=stream.read(limit+1)
    if len(data)>limit:raise ValueError('packet file exceeds size limit')
    return data

def build_review(batch,clip_id,seed,output):
    batch=Path(batch).resolve();output=Path(output)
    if output.resolve().is_relative_to(batch):raise ValueError('review output must be outside the frozen batch')
    if output.exists():raise ValueError('choose a fresh output directory; existing responses are preserved')
    if not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}',clip_id) or not isinstance(seed,int) or seed<0:raise ValueError('invalid clip or seed')
    freeze_bytes=bounded(batch/'freeze.json',2**20);freeze=json.loads(freeze_bytes)
    report=json.loads(bounded(batch/'report.json',4*2**20))
    if hashlib.sha256(freeze_bytes).hexdigest()!=report['freeze_sha256']:raise ValueError('freeze hash mismatch')
    clip=next((c for c in freeze['dataset']['clips'] if c['id']==clip_id),None)
    row=next((r for r in report['records'] if r['clip_id']==clip_id and r['seed']==seed and r['packet']=='PASS'),None)
    if not clip or not row:raise ValueError('no accepted frozen packet for this clip/seed')
    scope=clip['consent']['review_scope']
    if clip['consent']['local_processing'] is not True or scope not in ('owner_only','independent_reviewers') or row['review_scope']!=scope:raise ValueError('review permission is missing or inconsistent')
    folder=batch/clip_id/str(seed)/'blinded';listener=folder/'listener'
    if not listener.resolve().is_relative_to(batch) or listener.is_symlink():raise ValueError('packet escapes frozen batch')
    key=json.loads(bounded(folder/'organizer-key.json',64*1024))
    block=key['block_id'];codes=list(key['codes'])
    if (not re.fullmatch('[0-9a-f]{24}',block) or row['block_id']!=block or key['clip_id']!=clip['sha256'][:16] or
        codes!=[block+'-'+letter for letter in 'ABCD'] or sorted(v['strategy'] for v in key['codes'].values())!=sorted(STYLES)):
        raise ValueError('invalid frozen block identity')
    files={};tables=[]
    for name,columns in [('responses.csv',RATING_COLUMNS),('pairs.csv',PAIR_COLUMNS)]:
        data=bounded(listener/name,64*1024);reader=csv.DictReader(io.StringIO(data.decode('utf-8-sig'),newline=''));rows=list(reader)
        if reader.fieldnames!=columns or len(rows)!=(4 if name=='responses.csv' else 3):raise ValueError('invalid blank forms')
        identity={'clip_id','block_id','code','left_code','right_code'}
        for item in rows:
            if None in item or any(v is None for v in item.values()) or item['clip_id']!=key['clip_id'] or item['block_id']!=block or any(v for k,v in item.items() if k not in identity):raise ValueError('forms contain responses or changed identity; do not overwrite them')
        files[name]=data;tables.append(rows)
    if [r['code'] for r in tables[0]]!=codes:raise ValueError('candidate order changed')
    pairs=[[r['left_code'],r['right_code']] for r in tables[1]]
    control=next(c for c in codes if key['codes'][c]['strategy']=='baseline')
    if any(len(set(p))!=2 or any(c not in codes for c in p) or control not in p for p in pairs) or len({next(c for c in p if c!=control) for p in pairs})!=3:raise ValueError('comparison assignment changed')
    hashes={}
    for name,expected in [('source.wav',clip['sha256']),*((c+'.wav',key['codes'][c]['sha256']) for c in codes)]:
        data=bounded(listener/name,32*2**20)
        if hashlib.sha256(data).hexdigest()!=expected:raise ValueError('audio hash mismatch: '+name)
        files[name]=data;hashes[name]=expected
    files['INSTRUCTIONS.txt']=bounded(listener/'INSTRUCTIONS.txt',64*1024)
    attribution=bounded(listener/'ATTRIBUTION.txt',64*1024) if (listener/'ATTRIBUTION.txt').exists() else b''
    if clip.get('license') and not attribution.strip():raise ValueError('licensed source attribution is missing')
    if attribution:files['ATTRIBUTION.txt']=attribution
    packet={'block_id':block,'clip_id':key['clip_id'],'codes':codes,'pairs':pairs,
            'rating_columns':RATING_COLUMNS,'pair_columns':PAIR_COLUMNS,'rating_fields':RATING_FIELDS}
    esc=html.escape
    def select(name,label,options):
        return '<label>'+esc(label)+'<select required aria-label="'+esc(label)+'" name="'+esc(name)+'"><option value="">Choose…</option>'+''.join('<option value="'+esc(v)+'">'+esc(t)+'</option>' for v,t in options)+'</select></label>'
    choices=[('yes','Yes'),('no','No')];scores=[(str(n),str(n)+(' — poor' if n==1 else ' — excellent' if n==5 else '')) for n in range(1,6)]
    labels=['Recognizable source','Groove','Coherence','Originality','Enjoyment','Would you share it?','Technical failure or glitch?']
    sections=''
    for code in codes:
        letter=code[-1];sections+='<fieldset><legend>Candidate '+letter+'</legend><audio controls preload="none" aria-label="Candidate '+letter+'" src="'+code+'.wav"></audio><div class="fields">'
        for field,label in zip(RATING_FIELDS,labels):sections+=select(code+'-'+field,label,scores if field.endswith('_1_5') else choices)
        sections+='</div><label>Notes for candidate '+letter+'<textarea name="'+code+'-notes" maxlength="2000" placeholder="Optional: describe a problem and its timestamp"></textarea></label></fieldset>'
    for i,(left,right) in enumerate(pairs):
        sections+='<fieldset><legend>Comparison '+str(i+1)+'</legend><p>Candidate '+left[-1]+' and candidate '+right[-1]+'. Replay them above as needed.</p>'+select('pair-'+str(i),'Which do you prefer?',[(left,'Candidate '+left[-1]),(right,'Candidate '+right[-1]),('tie','Tie')])+'<label>Comparison notes<textarea name="pair-notes-'+str(i)+'" maxlength="2000"></textarea></label></fieldset>'
    scope_text='This packet is for owner-only listening. Do not send it to independent reviewers.' if scope=='owner_only' else 'This packet is prepared for the declared independent-review scope. The organizer must verify permissions and assign reviewers before sharing.'
    page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; media-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'"><title>Djayvo blinded listening review</title><link rel="stylesheet" href="review.css"><script defer src="review.js"></script></head><body><main><h1>Listen. Compare. Tell us what you hear.</h1><p>Use a comfortable volume. Listen to the source, then all four candidates in their assigned order. Ratings start blank; there is no correct answer.</p><p>'''+esc(scope_text)+'''</p><p>Responses stay in this tab. Download both files before closing. Nothing is uploaded. Use your assigned reviewer code, not your name or email.</p><h2>Source</h2><audio controls preload="none" aria-label="Source" src="source.wav"></audio><form><label>Reviewer code<input name="listener_id" required maxlength="64" pattern="[a-zA-Z0-9]([a-zA-Z0-9_]|-){0,63}" autocomplete="off"></label><p>1 means poor; 5 means excellent. Recognition asks whether you can recognize the supplied source, including non-speech sounds. Do not include personal information in notes.</p>'''+sections+'''<label class="check"><input type="checkbox" required>I entered these judgments from my own listening.</label><div class="downloads"><button type="submit" value="ratings">Download ratings</button><button type="submit" value="pairs">Download comparisons</button></div><p id="status" role="status">No observations have been submitted.</p></form><details><summary>Instructions and source credits</summary><pre>'''+esc(files['INSTRUCTIONS.txt'].decode())+'\n'+esc(attribution.decode())+'''</pre></details><small>Blinded block '''+block+''' · Technical validation is not musical-quality acceptance.</small></main><script type="application/json" id="packet">'''+json.dumps(packet).replace('<','\\u003c')+'</script></body></html>'
    output.mkdir(parents=True,exist_ok=False)
    for name,data in files.items():(output/name).write_bytes(data)
    for name in ['review.js','review.css']:shutil.copyfile(ROOT/'apps/listening'/name,output/name)
    (output/'index.html').write_text(page)
    manifest={'status':'PASS','block_id':block,'freeze_sha256':report['freeze_sha256'],'review_scope':scope,'audio_sha256':hashes,'human_listening':'NOT RUN'}
    (output/'packet.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--batch',type=Path,required=True);p.add_argument('--clip',required=True);p.add_argument('--seed',type=int,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();build_review(a.batch,a.clip,a.seed,a.output)
    print('PASS: local review form prepared; NOT RUN: human listening. Serve only the new directory on loopback.')
