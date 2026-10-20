#!/usr/bin/env python3
"""Composition-only Q0 hypothesis: source prosody, a recurring hook and thematic development."""
from array import array
import copy
import math
import statistics
import sys
import wave

from q0_authored_score import motif, Q, BAR
from q0_audit import digest
from q0_performance import perform


def prosody(plan, source, words=None):
    phrase = motif(plan, source, tempo_milli_bpm=plan['tempo_milli_bpm'])
    with wave.open(str(source)) as wav:
        channels, rate = wav.getnchannels(), wav.getframerate()
        pcm = array('h', wav.readframes(wav.getnframes()))
    if sys.byteorder != 'little':
        pcm.byteswap()
    # Descriptive autocorrelation only: uncertain speech pitch is not a transcription.
    hop = max(1, rate//8000)
    mono = [sum(pcm[i:i+channels])/channels for i in range(0, len(pcm), channels*hop)]
    analysis_rate = rate/hop
    first = phrase[0]['tick']
    for point in phrase:
        point['tick'] -= first
        center = round(point['source_frame']/hop)+round(.035*analysis_rate)
        start = max(0, center-round(.04*analysis_rate))
        values = mono[start:start+round(.08*analysis_rate)]
        mean = statistics.mean(values)
        values = [v-mean for v in values]
        scores = []
        for lag in range(round(analysis_rate/400), round(analysis_rate/75)):
            left, right = values[:-lag], values[lag:]
            denom = math.sqrt(sum(v*v for v in left)*sum(v*v for v in right))
            scores.append((sum(a*b for a,b in zip(left,right))/denom if denom else 0, lag))
        peaks = [s for i,s in enumerate(scores[1:-1],1) if s[0]>=scores[i-1][0] and s[0]>=scores[i+1][0]]
        best = max(peaks, default=(0,1))
        chosen = next((s for s in peaks if s[0] >= max(.7, best[0]*.93)), best)
        point['pitch_confidence'] = max(0, chosen[0])
        point['pitch_hz'] = analysis_rate/chosen[1] if chosen[0]>=.7 else None
    voiced = [p['pitch_hz'] for p in phrase if p['pitch_hz']]
    center = statistics.median(voiced) if len(voiced)>=3 else None
    scale = [-5,-2,0,3,5,7]
    for i, point in enumerate(phrase):
        target = 12*math.log2(point['pitch_hz']/center) if center and point['pitch_hz'] else [0,3,5,3,0,-2][i]
        point['degree'] = min(scale, key=lambda n: abs(n-max(-5,min(7,target))))
    # A common cadence makes a return recognizable even when pitch estimates are weak.
    phrase[-1]['degree'] = 0
    hook, choices = None, []
    if words is not None:
        if (words.get('source_sha256') != digest(source) or words.get('source_rate') != rate or
                words.get('source_frames') != plan['source']['original_frames']):
            raise ValueError('Word estimates do not match this source')
        items = words['words']
        previous = 0
        for word in items:
            lo, hi, confidence = word['start_frame'], word['end_frame'], word['confidence']
            if (type(lo) is not int or type(hi) is not int or not previous<=lo<hi<=words['source_frames']
                    or not math.isfinite(confidence) or not 0<=confidence<=1):
                raise ValueError('Invalid word estimate')
            previous = hi
        for a,b in zip(items,items[1:]):
            lo,hi = max(0,a['start_frame']-round(.06*rate)),min(words['source_frames'],b['end_frame']+round(.08*rate))
            if min(a['confidence'],b['confidence'])>=.8 and .5*rate<=hi-lo<=1.5*rate:
                choices.append((min(a['confidence'],b['confidence']),lo,hi))
        if choices:
            confidence,lo,hi = max(choices)
            hook = {'start_frame':round(lo*48000/rate),'end_frame':round(hi*48000/rate),
                    'confidence':confidence}
    return phrase, hook, {'voiced_motif_points':len(voiced),'pitch_contour_used':center is not None,
        'hook_candidates':len(choices),'hook_bounds':'Padded, unverified adjacent-word estimates' if hook else 'No word hook: use intact source only'}


def develop(original, source, words=None):
    if (original.get('time_signature') != [4,4] or original.get('ticks_per_quarter') != 960 or
            original.get('tempo_changes') or not 10<=original.get('target_bars',0)<=16):
        raise ValueError('Expected a supported fixed-tempo Q0 form')
    phrase, hook, analysis = prosody(original,source,words)
    p = copy.deepcopy(original)
    tempo = p['tempo_milli_bpm']
    frames_to_ticks = tempo*Q/(60000*48000)
    full_frames = p['source']['processed_frames']
    answer = 1+math.ceil((full_frames+4800)*frames_to_ticks/BAR)
    final = p['target_bars']-1
    contrast = max(answer+2,p['target_bars']//2)
    returning = contrast+1
    if returning+2>final:
        raise ValueError('Source leaves insufficient space for thematic development')
    boundaries = [('teaser',0),('source_call',1),('statement',answer),
                  ('contrast',contrast),('developed_return',returning),('resolution',final)]
    p['sections']=[{'name':n,'start_bar':a,'bars':b-a}
        for (n,a),(_,b) in zip(boundaries,[*boundaries[1:],('end',p['target_bars'])])]
    p['voice_clips']=[{'id':0,'start_frame':0,'end_frame':full_frames,'confidence':1}]
    p['voice_events']=[{'start_tick':BAR,'clip_id':0,'gain_db':-4,'rate':1,
                       'reverse':False,'pan':0,'clean':True}]
    if hook:
        p['voice_clips'].append({'id':1,**hook})
        for bar in (contrast, *([returning+2] if returning+4<=final else [])):
            if bar<final:
                p['voice_events'].append({'start_tick':bar*BAR,'clip_id':1,'gain_db':-7,
                                         'rate':1,'reverse':False,'pan':0,'clean':False})
    windows=[(v['start_tick'],v['start_tick']+math.ceil(
        (p['voice_clips'][v['clip_id']]['end_frame']-p['voice_clips'][v['clip_id']]['start_frame'])*frames_to_ticks))
        for v in p['voice_events']]
    tracks = {t['instrument']:t for t in p['tracks']}
    harmonic = next((name for name in ('piano','organ') if name in tracks),None)
    if harmonic is None or not {'bass','drums'}<=tracks.keys():
        raise ValueError('Expected harmonic, bass and drum instruments')
    for track in tracks.values():
        track['events']=[]
    tonic=p['key']['tonic_midi']
    def note(instrument,start,duration,pitch,velocity):
        if instrument not in ('drums','bass'):
            if any(start < stop+120 and start+duration > begin-120 for begin,stop in windows):
                return False
        if not 0<=start<start+duration<=p['target_bars']*BAR:
            raise ValueError('Development event outside form')
        tracks[instrument]['events'].append({'start_tick':start,'duration_ticks':duration,
                                             'note':pitch,'velocity':velocity})
        return True
    style=p['strategy']
    kick = {'hiphop':[0,1680,2400],'reggae':[1920],'experimental':[0,1440,2640]}[style]
    snare = [1920] if style=='reggae' else [960,2880]
    # Related chords reframe the recurring motif without changing key.
    for bar in range(p['target_bars']):
        base=bar*BAR
        call = 1<=bar<answer
        sparse = bar in (0,contrast,final) or call
        root = tonic if bar<returning or bar==final else tonic-4 if bar<returning+2 else tonic-7
        if call:
            for offset in (0,1920):
                note('drums',base+offset,120,42,36)
            continue
        for offset in ([0] if sparse else kick):
            note('drums',base+offset,240,36,91 if not sparse else 76)
            note('bass',base+offset,420 if offset else 660,root-24,84 if offset==0 else 70)
        if not sparse:
            for offset in snare: note('drums',base+offset,240,38,92)
            for i in range(8): note('drums',base+i*480,120,42,59 if i%2==0 else 40)
            # Pickup answers the last strong syllabic attack; it anticipates the next tonic.
            if bar%2 and bar+1<final: note('bass',base+3360,240,root-17,66)
        if bar in (0,answer,returning,returning+2):
            third = 4 if root==tonic-4 else 3
            for pitch in (root-12,root-12+third):
                note(harmonic,base+480,720,pitch,48)
        if bar in (contrast-1,final-1):
            # A planned two-beat stop creates space for the return rather than another fill.
            for track in tracks.values():
                track['events']=[n for n in track['events'] if not base+1920<=n['start_tick']<base+BAR]
    statements=[]
    entries=[(0,'foreshadow'),(answer,'statement')]
    if answer+4<=contrast:entries.append((answer+2,'answer_variation'))
    entries += [(returning,'return'),(returning+2,'development')]
    for bar,kind in entries:
        if bar>=final:continue
        chosen=phrase[:2] if kind=='foreshadow' else phrase
        emitted=[]
        for i,point in enumerate(chosen):
            offset=point['tick']
            if kind=='foreshadow': offset//=2
            if kind=='development':
                hook_stop=max((stop for start,stop in windows if start==bar*BAR),default=bar*BAR)
                offset=offset//2+math.ceil((hook_stop-bar*BAR)/Q)*Q+240
            tick=bar*BAR+offset
            if tick>=final*BAR:continue
            next_offset=chosen[i+1]['tick'] if i+1<len(chosen) else 2*BAR
            gap=max(120,next_offset-point['tick'])
            if kind in ('foreshadow','development'):gap//=2
            duration=min(gap-30,960 if i+1==len(chosen) else 600, final*BAR-tick)
            degree=3 if kind=='answer_variation' and i+1==len(chosen) else point['degree']
            pitch=tonic+degree+(12 if kind=='development' else 0)
            if note(harmonic,tick,max(60,duration),pitch,point['velocity']-(8 if kind=='foreshadow' else 0)):
                emitted.append({'tick':tick,'note':pitch,'source_frame':point['analysis_frame_48khz']})
        statements.append({'kind':kind,'events':emitted})
    note(harmonic,final*BAR,1440,tonic,63)
    for track in tracks.values():
        track['events'].sort(key=lambda n:(n['start_tick'],n['note']))
    expressed, expression = perform(p,p['seed'])
    rests = [(b*BAR+1920,(b+1)*BAR) for b in (contrast-1,final-1)]
    removed = []
    for track in expressed['tracks']:
        kept = []
        for n in track['events']:
            if any(a<=n['start_tick']<b for a,b in rests):
                removed.append({'instrument':track['instrument'],**n})
                continue
            for a,_ in rests:
                if n['start_tick']<a<n['start_tick']+n['duration_ticks']:
                    n['duration_ticks']=a-n['start_tick']
            kept.append(n)
        track['events']=kept
    return expressed, {'version':'1.0-q0-source-development','source_motif':phrase,
        'source_analysis':analysis,'hook':hook,'statements':statements,'voice_windows':windows,
        'first_answer_bar':answer,'expression':expression,
        'intentional_rest_windows':rests,'suppressed_pickups':removed,
        'preserved':['source identity','tempo','duration','instrument patches/gains','mix settings'],
        'limits':'Rules-based composition hypothesis. Pitch and word timing are uncertain estimates. '
                 'No understanding of words, musician approval, trained intelligence or musical improvement claimed.',
        'human_quality':'NOT RUN'}
