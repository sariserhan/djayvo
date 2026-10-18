#!/usr/bin/env python3
"""Validate real submitted forms and summarize by source; never invent ratings or pass M1."""
import argparse,csv,hashlib,io,json,random,re
from pathlib import Path

RATING_FIELDS=('recognizable','groove_1_5','coherence_1_5','originality_1_5','enjoyment_1_5','would_share','technical_failure')
RATING_COLUMNS=['listener_id','clip_id','block_id','code',*RATING_FIELDS,'notes']
PAIR_COLUMNS=['listener_id','clip_id','block_id','left_code','right_code','preferred_code_or_tie','notes']
STYLES=('hiphop','reggae','experimental','baseline')


def estimate(values):
    if not values:return {'source_clips':0,'mean':None,'bootstrap_95_percent':None}
    mean=sum(values)/len(values);interval=None
    if len(values)>1:
        rng=random.Random(4123)
        means=sorted(sum(rng.choices(values,k=len(values)))/len(values) for _ in range(2000))
        interval=[means[49],means[1949]]
    return {'source_clips':len(values),'mean':mean,'bootstrap_95_percent':interval}


def summarize(batch,ratings_files=(),pairs_files=()):
    batch=Path(batch);freeze_bytes=(batch/'freeze.json').read_bytes();freeze=json.loads(freeze_bytes)
    report=json.loads((batch/'report.json').read_text())
    if hashlib.sha256(freeze_bytes).hexdigest()!=report['freeze_sha256']:raise ValueError('freeze hash mismatch')
    clips={c['id']:c for c in freeze['dataset']['clips']};blocks={}
    for row in report['records']:
        if row['packet']!='PASS':continue
        key=json.loads((batch/row['clip_id']/str(row['seed'])/'blinded/organizer-key.json').read_text())
        if (key['block_id']!=row['block_id'] or key['clip_id']!=clips[row['clip_id']]['sha256'][:16] or
                sorted(v['strategy'] for v in key['codes'].values())!=sorted(STYLES)):
            raise ValueError('organizer key does not match the frozen block')
        if key['block_id'] in blocks:raise ValueError('duplicate organizer block')
        blocks[key['block_id']]={'key':key,'clip':row['clip_id'],'kind':row['kind']}
    ratings={};pairs={};inputs=[];blank=0;total_rows=0
    for mode,paths,columns in [('ratings',ratings_files,RATING_COLUMNS),('pairs',pairs_files,PAIR_COLUMNS)]:
        for filename in paths:
            path=Path(filename)
            with path.open('rb') as stream:data=stream.read(1024*1024+1)
            if len(data)>1024*1024:raise ValueError('response file exceeds 1 MiB')
            inputs.append({'file':str(path),'sha256':hashlib.sha256(data).hexdigest(),'type':mode})
            reader=csv.DictReader(io.StringIO(data.decode('utf-8-sig'),newline=''))
            if reader.fieldnames!=columns:raise ValueError('unexpected response columns')
            for row in reader:
                total_rows+=1
                if total_rows>60000 or None in row or any(v is None for v in row.values()):raise ValueError('invalid/oversized CSV')
                block=blocks.get(row['block_id'])
                if block is None or row['clip_id']!=block['key']['clip_id']:raise ValueError('unknown clip/block')
                codes=block['key']['codes'];submitted=[row['code']] if mode=='ratings' else [row['left_code'],row['right_code']]
                if any(c not in codes for c in submitted):raise ValueError('unknown candidate code')
                if len(row['notes'])>2000:raise ValueError('notes exceed 2000 characters')
                fields=RATING_FIELDS if mode=='ratings' else ('preferred_code_or_tie',)
                if not row['listener_id'] and not row['notes'] and all(not row[f] for f in fields):blank+=1;continue
                if not re.fullmatch('[a-zA-Z0-9_-]{1,64}',row['listener_id']):raise ValueError('use an opaque listener ID')
                identity=(row['listener_id'],row['block_id'])
                if mode=='ratings':
                    values={}
                    for field in RATING_FIELDS:
                        if field.endswith('_1_5'):
                            if row[field] not in ('1','2','3','4','5'):raise ValueError('ratings must be integers 1–5')
                            values[field]=int(row[field])
                        else:
                            if row[field].lower() not in ('yes','no'):raise ValueError('complete yes/no judgments required')
                            values[field]=row[field].lower()=='yes'
                    identity+= (row['code'],)
                    if identity in ratings:raise ValueError('duplicate listener/block/candidate rating')
                    ratings[identity]=values
                else:
                    a,b=submitted
                    if a==b or sum(codes[c]['strategy']=='baseline' for c in submitted)!=1:raise ValueError('pair must contain one candidate and its baseline')
                    preferred=row['preferred_code_or_tie']
                    if preferred not in (*submitted,'tie'):raise ValueError('preference must name a displayed code or tie')
                    candidate=next(c for c in submitted if codes[c]['strategy']!='baseline');identity+=(candidate,)
                    if identity in pairs:raise ValueError('duplicate listener/block/candidate comparison')
                    pairs[identity]='tie' if preferred=='tie' else ('win' if preferred==candidate else 'loss')
    for listener,block,code in pairs:
        control=next(c for c,v in blocks[block]['key']['codes'].items() if v['strategy']=='baseline')
        if (listener,block,code) not in ratings or (listener,block,control) not in ratings:raise ValueError('comparison lacks corresponding candidate/baseline ratings')
    coverage={}
    for block,info in blocks.items():
        complete=[]
        for listener in {key[0] for key in ratings if key[1]==block}:
            if all((listener,block,c) in ratings for c in info['key']['codes']) and all((listener,block,c) in pairs for c,v in info['key']['codes'].items() if v['strategy']!='baseline'):complete.append(listener)
        coverage[block]={'complete_reviewer_ids':len(complete),'three_ids_present':len(complete)>=3}
    results={}
    for style in STYLES:
        by_clip={};votes={}
        for (listener,block,code),values in ratings.items():
            info=blocks[block]
            if info['key']['codes'][code]['strategy']!=style:continue
            metrics={**values,'enjoyment_at_least_4':values['enjoyment_1_5']>=4}
            if info['kind'] not in ('speech','syllabic_speech'):metrics.pop('recognizable')
            for field,value in metrics.items():by_clip.setdefault(info['clip'],{}).setdefault(field,[]).append(value)
        for (_,block,code),vote in pairs.items():
            info=blocks[block]
            if info['key']['codes'][code]['strategy']==style:votes.setdefault(info['clip'],[]).append(vote)
        fields=(*RATING_FIELDS,'enjoyment_at_least_4')
        means={field:estimate([sum(m[field])/len(m[field]) for m in by_clip.values() if field in m]) for field in fields}
        decisions={clip:('win' if v.count('win')>len(v)/2 else 'loss' if v.count('loss')>len(v)/2 else 'tie') for clip,v in votes.items()}
        results[style]={'metrics':means,'paired_clip_decisions':decisions,
            'paired_clip_win_fraction':estimate([value=='win' for value in decisions.values()]),
            'rated_source_clips':len(by_clip),'individual_ratings':sum(1 for (_,b,c) in ratings if blocks[b]['key']['codes'][c]['strategy']==style)}
    return {'status':'PARTIAL' if ratings else 'NOT RUN','scope':'descriptive human-response summary; M1 requires human evidence review',
        'formal_quality':'NOT RUN','reviewer_independence':'NOT RUN','audible_variety':'NOT RUN',
        'freeze_sha256':report['freeze_sha256'],'inputs':inputs,'blank_rows_ignored':blank,
        'individual_ratings':len(ratings),'individual_pairs':len(pairs),'coverage':coverage,
        'all_blocks_have_three_complete_ids':bool(coverage) and all(c['three_ids_present'] for c in coverage.values()),
        'technical_attempts':report['per_style_technical_counts'],'dataset_readiness':report['dataset_readiness'],
        'styles':results,'uncertainty':'2000 deterministic percentile bootstrap resamples of source-clip means; no interval for one clip. Descriptive only; reviewer independence and representativeness unverified.'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--batch',type=Path,required=True);parser.add_argument('--ratings',type=Path,action='append',default=[])
    parser.add_argument('--pairs',type=Path,action='append',default=[]);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists():raise ValueError('output exists; preserve previous evidence')
    report=summarize(args.batch,args.ratings,args.pairs)
    with args.output.open('x') as out:json.dump(report,out,indent=2,allow_nan=False);out.write('\n')
    print(report['status']+': listening summary; '+str(report['individual_ratings'])+' submitted ratings; formal quality NOT RUN')


if __name__=='__main__':main()
