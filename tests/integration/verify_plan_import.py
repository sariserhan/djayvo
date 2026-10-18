#!/usr/bin/env python3
"""Exercise the real offline CLI boundary; no model or listening results implied."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[2]/'scripts'))
from make_fixture import make_signal
from verify_export import verify_export
from prepare_voice_transforms import add_echoes


def main(renderer):
    with tempfile.TemporaryDirectory(prefix='djayvo-plan-import-') as folder:
        root=Path(folder)
        source=root/'signal.wav'
        make_signal(source,8000)
        def run(name, options=(), success=True, permission='--synthetic-fixture'):
            command=[str(renderer.resolve()),'--input',str(source),'--output',str(root/name),
                     '--sample-rate','8000','--style','hiphop']
            if permission:
                command.append(permission)
            result=subprocess.run([*command,*options],capture_output=True,text=True,timeout=120)
            assert (result.returncode==0)==success, result.stdout+result.stderr
            if not success and name!='collision':
                assert not list(root.glob(name+'.*')), 'rejected plan published output'
            return result

        plans={}
        for style in ('hiphop','reggae','experimental','baseline','club'):
            run('rules-'+style,('--style',style,'--stems'))
            path=root/f'rules-{style}.{style}.score.json'
            plans[style]=json.loads(path.read_text())
            run('replay-'+style,('--style',style,'--plan',str(path),'--stems','--block-size','113'))
            original=verify_export(root/('rules-'+style))
            replay=verify_export(root/('replay-'+style))
            assert original['artifacts']==replay['artifacts'], 'replay changed events, PCM or score'
            assert replay['planning']=={'mode':'imported','candidate_sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        base=plans['hiphop']
        sparse=copy.deepcopy(base)
        selected=add_echoes(sparse,480)
        assert 1<=len(selected)<=3
        assert [e for e in sparse['voice_events'] if e['clean']]==[e for e in base['voice_events'] if e['clean']]
        assert all(not e.get('echo_ticks') for e in base['voice_events'])
        empty=copy.deepcopy(base);empty['voice_events']=[e for e in empty['voice_events'] if e['clean']]
        try:add_echoes(empty,480)
        except ValueError:pass
        else:raise AssertionError('echo selector accepted a plan with no fragments')
        candidate=root/'candidate.json'
        candidate.write_text(json.dumps(sparse));run('sparse-echo',('--plan',str(candidate)))
        edited=copy.deepcopy(base)
        edited['tracks'][0]['events'][0]['velocity']=max(1,edited['tracks'][0]['events'][0]['velocity']-20)
        candidate.write_text(json.dumps(edited))
        run('edited',('--plan',str(candidate)))
        assert (root/'edited.hiphop.wav').read_bytes()!=(root/'rules-hiphop.hiphop.wav').read_bytes()
        assert json.loads((root/'edited.hiphop.score.json').read_text())==edited

        # Equivalent JSON spellings must preserve the exported score and PCM.
        candidate.write_text(json.dumps(base,sort_keys=True).replace('"hiphop"','"\\u0068iphop"'))
        run('escaped',('--plan',str(candidate)))
        assert (root/'escaped.hiphop.wav').read_bytes()==(root/'rules-hiphop.hiphop.wav').read_bytes()

        transformed=copy.deepcopy(base)
        transformed['schema_version']='1.1-remix'
        event=next(e for e in transformed['voice_events'] if not e['clean'])
        event.update(pitch_semitones=3,time_stretch=1.125)
        candidate.write_text(json.dumps(transformed))
        run('transformed',('--plan',str(candidate),'--stems'))
        exported=root/'transformed.hiphop.score.json'
        assert json.loads(exported.read_text())==transformed
        run('transform-replay',('--plan',str(exported),'--stems','--block-size','113'))
        assert verify_export(root/'transformed')['artifacts']==verify_export(root/'transform-replay')['artifacts']
        assert (root/'transformed.hiphop.wav').read_bytes()!=(root/'rules-hiphop.hiphop.wav').read_bytes()
        for instrument in ('piano','bass','drums'):
            assert (root/f'transformed.hiphop.{instrument}.wav').read_bytes()==(root/f'rules-hiphop.hiphop.{instrument}.wav').read_bytes()
        transform_invalid=[]
        for key,value in [('pitch_semitones',4.01),('pitch_semitones',None),('pitch_semitones',True),
                          ('time_stretch',0.79),('time_stretch',1.26),('time_stretch','1.1'),('rate',1.1)]:
            item=copy.deepcopy(transformed)
            next(e for e in item['voice_events'] if not e['clean'])[key]=value
            transform_invalid.append(json.dumps(item))
        item=copy.deepcopy(transformed);item['schema_version']='1.0-remix';transform_invalid.append(json.dumps(item))
        item=copy.deepcopy(transformed)
        next(e for e in item['voice_events'] if e['clean'])['pitch_semitones']=1
        transform_invalid.append(json.dumps(item))

        echo=copy.deepcopy(transformed)
        fragment=next(e for e in echo['voice_events'] if not e['clean'])
        hook=next(e for e in echo['voice_events'] if e['clean'])
        fragment['start_tick']=0;hook['start_tick']=9600
        echo['voice_events']=[fragment,hook]
        candidate.write_text(json.dumps(echo));run('echo-control',('--plan',str(candidate),'--stems'))
        echo['schema_version']='1.2-remix';fragment.update(echo_ticks=480,echo_gain_db=-12)
        candidate.write_text(json.dumps(echo));run('echo',('--plan',str(candidate),'--stems'))
        exported=root/'echo.hiphop.score.json'
        assert json.loads(exported.read_text())==echo
        run('echo-replay',('--plan',str(exported),'--stems','--block-size','113'))
        assert verify_export(root/'echo')['artifacts']==verify_export(root/'echo-replay')['artifacts']
        assert (root/'echo.hiphop.wav').read_bytes()!=(root/'echo-control.hiphop.wav').read_bytes()
        for instrument in ('piano','bass','drums'):
            assert (root/f'echo.hiphop.{instrument}.wav').read_bytes()==(root/f'echo-control.hiphop.{instrument}.wav').read_bytes()
        for key,value in [('echo_ticks',119),('echo_ticks',961),('echo_ticks',480.5),('echo_ticks',True),
                          ('echo_gain_db',-24.1),('echo_gain_db',-5.9),('echo_gain_db','-12')]:
            item=copy.deepcopy(echo);item['voice_events'][0][key]=value;transform_invalid.append(json.dumps(item))
        for version in ('1.0-remix','1.1-remix'):
            item=copy.deepcopy(echo);item['schema_version']=version;transform_invalid.append(json.dumps(item))
        item=copy.deepcopy(echo);item['voice_events'][1]['echo_ticks']=480;transform_invalid.append(json.dumps(item))
        item=copy.deepcopy(echo);item['voice_events'][1]['start_tick']=960;transform_invalid.append(json.dumps(item))

        mutations=[
            ('schema_version','future'),('seed',4124),('sample_rate',48000),('strategy','reggae'),
            ('ticks_per_quarter',480),('source_asset_id','sha256:'+'0'*64),('tempo_milli_bpm',float('nan')),
            ('target_bars',2**60),('target_bars',True),('target_bars',1.5),('target_bars',1),
            ('tracks',[]),('sections',[]),('voice_events',[]),('unsupported_action','network')]
        invalid=transform_invalid
        for field,value in mutations:
            item=copy.deepcopy(base);item[field]=value;invalid.append(json.dumps(item))
        for field,value in [('sha256','0'*64),('processed_frames',1),('kind','recorded'),('consent_confirmed',True)]:
            item=copy.deepcopy(base);item['source'][field]=value;invalid.append(json.dumps(item))
        for path,value in [
            (('voice_clips',0,'end_frame'),99999999),(('voice_clips',0,'id'),1),
            (('voice_events',0,'clip_id'),63),(('voice_events',0,'rate'),1.2),
            (('voice_events',0,'start_tick'),4000000000),(('voice_events',0,'clean'),'true'),
            (('tracks',0,'instrument'),'download'),(('tracks',0,'sound'),'external'),
            (('tracks',0,'events',0,'duration_ticks'),0),(('tracks',0,'events',0,'start_tick'),-1),
            (('mix','clean_hook_instrument_duck_db'),0),(('mix','master_target_peak_dbfs'),1),
            (('key','mode'),'major'),(('sections',0,'name'),'../escape')]:
            item=copy.deepcopy(base);cursor=item
            for key in path[:-1]:cursor=cursor[key]
            cursor[path[-1]]=value;invalid.append(json.dumps(item))
        item=copy.deepcopy(base)
        item['voice_events']=[{**e,'clean':False} for e in item['voice_events']]
        invalid.append(json.dumps(item))
        item=copy.deepcopy(base)
        item['tracks'][0]['events']=[item['tracks'][0]['events'][0]]*129
        invalid.append(json.dumps(item))
        item=copy.deepcopy(base)
        note=item['tracks'][0]['events'][0]
        note['note']=item['key']['tonic_midi']+1
        note['duration_ticks']=960
        invalid.append(json.dumps(item))
        invalid.extend(['', 'null','[]','[1,]','{"a":1,}',json.dumps(base)+'false',
                        json.dumps(base)[:-1]+',"seed":4123}',
                        json.dumps(base).replace('"seed": 4123','"seed": 04123'),
                        json.dumps(base).replace('"seed": 4123','"seed": +4123'),
                        json.dumps(base).replace('"seed": 4123','"seed": 1e9999'),
                        json.dumps(base).replace('"hiphop"','"\\uD800"'),
                        '['*20+'0'+']'*20,'['+'0,'*100001+'0]', ' '* (4*1024*1024+1)])
        for i,text in enumerate(invalid):
            candidate.write_text(text)
            run(f'rejected-{i}',('--plan',str(candidate)),success=False)
        candidate.write_text(json.dumps({**base,'seed':4124}))
        result=run('fallback',('--plan',str(candidate),'--plan-fallback'))
        assert 'candidate plan rejected' in result.stderr
        record=verify_export(root/'fallback')
        assert record['planning']['mode']=='fallback'
        assert record['planning']['candidate_sha256']==hashlib.sha256(candidate.read_bytes()).hexdigest()
        assert (root/'fallback.hiphop.wav').read_bytes()==(root/'rules-hiphop.hiphop.wav').read_bytes()
        run('unreadable',('--plan',str(root/'missing.json'),'--plan-fallback'))
        assert verify_export(root/'unreadable')['planning']=={'mode':'fallback','candidate_sha256':None}
        run('denied',('--plan',str(candidate),'--plan-fallback'),success=False,permission='')
        run('no-plan',('--plan-fallback',),success=False)
        run('ambiguous',('--plan',str(candidate),'--style','all'),success=False)
        run('collision')
        before=(root/'collision.hiphop.wav').read_bytes()
        run('collision',('--plan',str(candidate),'--plan-fallback'),success=False)
        assert (root/'collision.hiphop.wav').read_bytes()==before
        marker=root/'fallback.complete.json'
        record['planning']['candidate_sha256']='bad'
        marker.write_text(json.dumps(record))
        try:verify_export(root/'fallback')
        except ValueError:pass
        else:raise AssertionError('invalid selection receipt accepted')
        print(json.dumps({'roundtrip_styles':5,'identical_artifacts':40,'edited_plan_changes_pcm':'PASS',
                          'independent_transform_replay_and_instrument_stems':'PASS',
                          'tempo_echo_replay_and_instrument_stems':'PASS',
                          'rejected_candidates':len(invalid),'explicit_fallback':'PASS','consent_and_collision':'PASS',
                          'model_inference':'NOT RUN','listening':'NOT RUN'},indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--renderer',type=Path,required=True)
    main(parser.parse_args().renderer)
