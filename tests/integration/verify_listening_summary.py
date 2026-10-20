"""Temporary algorithm fixtures only: no study responses or human ratings are created."""
import copy,csv,hashlib,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
from summarize_listening import PAIR_COLUMNS,RATING_COLUMNS,STYLES,estimate,summarize


def reject(action):
    try:action()
    except ValueError:return
    raise AssertionError('invalid response accepted')


def main():
    assert estimate([])['mean'] is None and estimate([1])['bootstrap_95_percent'] is None
    assert estimate([0,1])==estimate([0,1])
    with tempfile.TemporaryDirectory(prefix='jamloom-response-unit-') as temp:
        root=Path(temp);clips=[{'id':'fixture-a','sha256':'a'*64},{'id':'fixture-b','sha256':'b'*64}]
        freeze=json.dumps({'dataset':{'clips':clips}}).encode();(root/'freeze.json').write_bytes(freeze)
        report={'freeze_sha256':hashlib.sha256(freeze).hexdigest(),'records':[],
            'per_style_technical_counts':{'hiphop':{'accepted':3,'attempted':4}},'dataset_readiness':{'status':'PARTIAL'}}
        ratings=[];pairs=[]
        for number,clip in enumerate((clips[0],clips[0],clips[1])):
            block='algorithm-fixture-'+str(number);seed=number+1
            codes={block+'-'+chr(65+i):{'strategy':style} for i,style in enumerate(STYLES)}
            key={'block_id':block,'clip_id':clip['sha256'][:16],'codes':codes}
            folder=root/clip['id']/str(seed)/'blinded';folder.mkdir(parents=True)
            (folder/'organizer-key.json').write_text(json.dumps(key))
            report['records'].append({'packet':'PASS','block_id':block,'clip_id':clip['id'],'seed':seed,'kind':'speech' if number<2 else 'noise'})
            for listener in ('unit-only-1','unit-only-2','unit-only-3'):
                for code in codes:
                    ratings.append(dict(zip(RATING_COLUMNS,[listener,key['clip_id'],block,code,'yes' if number<2 else 'no',
                        '5' if number<2 else '1','3','3','5' if number<2 else '1','yes' if number<2 else 'no','no','Algorithm fixture, not a listener'])))
                for code in list(codes)[:3]:
                    control=block+'-D'
                    pairs.append(dict(zip(PAIR_COLUMNS,[listener,key['clip_id'],block,code,control,code if number<2 else control,'Algorithm fixture, not a listener'])))
        (root/'report.json').write_text(json.dumps(report))
        a=root/'ratings.csv';b=root/'pairs.csv'
        def write(path,columns,rows):
            with path.open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=columns);w.writeheader();w.writerows(rows)
        write(a,RATING_COLUMNS,ratings);write(b,PAIR_COLUMNS,pairs)
        ratings[0]['notes']='Algorithm fixture\nwith a quoted "second line"; not a listener'
        write(a,RATING_COLUMNS,ratings)
        result=summarize(root,[a],[b])
        assert result['status']=='PARTIAL' and result['formal_quality']=='NOT RUN' and result['reviewer_independence']=='NOT RUN'
        assert result['all_blocks_have_three_complete_ids'] and result['individual_ratings']==36
        for style in STYLES:
            m=result['styles'][style]['metrics']
            assert m['enjoyment_1_5']['mean']==3 and m['enjoyment_at_least_4']['mean']==.5, 'repeated seeds inflated clip weighting'
            assert m['recognizable']['source_clips']==1 and m['recognizable']['mean']==1, 'non-speech counted in recognition'
        assert result['styles']['hiphop']['paired_clip_win_fraction']['mean']==.5
        assert result['technical_attempts']['hiphop']['attempted']==4
        empty=summarize(root);assert empty['status']=='NOT RUN' and empty['individual_ratings']==0
        blank=copy.deepcopy(ratings)
        for row in blank:
            for field in RATING_COLUMNS:
                if field not in ('clip_id','block_id','code'):row[field]=''
        write(a,RATING_COLUMNS,blank);assert summarize(root,[a])['blank_rows_ignored']==36
        for field,value in [('block_id','unknown'),('clip_id','unknown'),('code','unknown'),('listener_id','../invalid'),('groove_1_5','6'),('recognizable',''),('notes','x'*2001)]:
            bad=copy.deepcopy(ratings);bad[0][field]=value;write(a,RATING_COLUMNS,bad);reject(lambda:summarize(root,[a],[b]))
        write(a,RATING_COLUMNS,ratings+ratings[:1]);reject(lambda:summarize(root,[a],[b]))
        write(a,RATING_COLUMNS,ratings)
        for field,value in [('right_code',pairs[0]['left_code']),('preferred_code_or_tie','unknown')]:
            bad=copy.deepcopy(pairs);bad[0][field]=value;write(b,PAIR_COLUMNS,bad);reject(lambda:summarize(root,[a],[b]))
        write(b,PAIR_COLUMNS,pairs+pairs[:1]);reject(lambda:summarize(root,[a],[b]))
        write(b,PAIR_COLUMNS,pairs);reject(lambda:summarize(root,[],[b]))
        write(b,PAIR_COLUMNS,pairs[1:]);assert not summarize(root,[a],[b])['all_blocks_have_three_complete_ids']
        a.write_bytes(b'x'*(1024*1024+1));reject(lambda:summarize(root,[a]))
        (root/'freeze.json').write_text('{}');reject(lambda:summarize(root,[a],[b]))
    print('PASS: response binding, blanks, duplicate/invalid rejection, clip weighting, speech-only recognition, uncertainty and honest quality gates; algorithm fixtures only')


if __name__=='__main__':main()
