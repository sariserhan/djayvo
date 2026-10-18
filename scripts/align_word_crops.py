#!/usr/bin/env python3
"""Conservatively propose whole-word crops; the native validator still decides acceptance."""
import argparse
import copy
import json
import math
from pathlib import Path
from prepare_voice_transforms import frame_at


def align(plan,timing):
    # shortcut: recognition confidence is not calibrated timing accuracy; require listening before enabling by default.
    source=plan['source'];rate=plan['sample_rate'];frames=source['processed_frames']
    if (timing.get('schema_version')!='1.0-word-times' or timing.get('source_sha256')!=source['sha256']
        or type(timing.get('source_rate')) is not int or timing['source_rate']!=source['original_rate']
        or type(timing.get('source_frames')) is not int or timing['source_frames']!=source['original_frames']):
        raise ValueError('Word timings must match this exact source recording')
    words=timing.get('words')
    if not isinstance(words,list) or len(words)>128:raise ValueError('Word budget exceeded')
    previous=0;scaled=[]
    for word in words:
        if not isinstance(word,dict) or set(word)!={'start_frame','end_frame','confidence'}:raise ValueError('Invalid word estimate')
        begin,end,confidence=word['start_frame'],word['end_frame'],word['confidence']
        if (type(begin) is not int or type(end) is not int or not previous<=begin<end<=timing['source_frames']
            or type(confidence) not in (float,int) or not math.isfinite(confidence) or not 0<=confidence<=1):
            raise ValueError('Invalid word boundaries/confidence')
        previous=end
        lo=max(0,round(begin*rate/timing['source_rate'])-rate//50)
        hi=min(frames,round(end*rate/timing['source_rate'])+rate*3//100)
        if confidence>=.8 and rate*.08<=hi-lo<=rate:scaled.append((lo,hi,confidence))
    probability=timing.get('language_probability')
    if type(probability) not in (int,float) or not math.isfinite(probability) or not 0<=probability<=1:
        raise ValueError('Invalid language confidence')
    result=copy.deepcopy(plan);changes=[]
    if probability<.5:return result,changes
    events=sorted(plan['voice_events'],key=lambda e:e['start_tick'])
    music_end=frame_at(plan,plan['target_bars']*plan['ticks_per_quarter']*4*plan['time_signature'][0]//plan['time_signature'][1])
    for clip in result['voice_clips']:
        users=[e for e in events if e['clip_id']==clip['id']]
        if not users or any(e['clean'] or e['reverse'] or e['rate']!=1 or e.get('pitch_semitones',0)!=0
            or e.get('time_stretch',1)!=1 or e.get('echo_ticks',0)!=0 for e in users):continue
        lo,hi=clip['start_frame'],clip['end_frame']
        candidates=[w for w in scaled if min(hi,w[1])>max(lo,w[0]) and abs(w[0]-lo)<=rate*.2 and abs(w[1]-hi)<=rate*.3]
        if not candidates:continue
        begin,end,confidence=max(candidates,key=lambda w:min(hi,w[1])-max(lo,w[0]))
        if (begin,end)==(lo,hi):continue
        clear=True
        for event in users:
            start=frame_at(plan,event['start_tick'])
            following=[frame_at(plan,e['start_tick']) for e in events if e['start_tick']>event['start_tick']]
            if start+end-begin>min([music_end,*following])-rate*80//1000:clear=False;break
            # Simultaneous and previous fragments must not overlap this placement.
            for other in events:
                if other is event or other['start_tick']>event['start_tick']:continue
                prior=result['voice_clips'][other['clip_id']]
                duration=math.ceil((prior['end_frame']-prior['start_frame'])*other.get('time_stretch',1)/other['rate'])
                last_tick=other['start_tick']+3*other.get('echo_ticks',0)
                if frame_at(plan,last_tick)+duration>start-rate*80//1000:clear=False;break
        if not clear:continue
        changes.append({'clip_id':clip['id'],'old_frames':[lo,hi],'new_frames':[begin,end],'confidence':confidence})
        clip.update(start_frame=begin,end_frame=end,confidence=confidence)
    return result,changes


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--plan',type=Path,required=True);p.add_argument('--words',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    if args.plan.stat().st_size>4*1024*1024 or args.words.stat().st_size>128*1024:raise ValueError('Input document exceeds limit')
    plan,changes=align(json.loads(args.plan.read_text()),json.loads(args.words.read_text()))
    with args.output.open('x') as out:json.dump(plan,out,indent=2,allow_nan=False);out.write('\n')
    print(json.dumps({'status':'PASS','changed_clips':len(changes),'changes':changes,'native_validation':'NOT RUN','timing_accuracy':'NOT RUN'}))


if __name__=='__main__':main()
