"""No model needed: adversarial timestamp/consent metadata and conservative crop checks."""
import copy,io,json,math,subprocess,sys,tempfile,wave
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
from align_word_crops import align
from analyze_words import wav_info
from prepare_voice_transforms import add_echoes

def reject(call):
    try:call()
    except (ValueError,KeyError,wave.Error):return
    raise AssertionError('invalid input accepted')
plan={'schema_version':'1.6-remix','source':{'sha256':'a'*64,'original_rate':16000,'original_frames':48000,'processed_frames':144000},
      'sample_rate':48000,'tempo_milli_bpm':120000,'ticks_per_quarter':960,'time_signature':[4,4],'target_bars':14,'tail_ms':3000,
      'voice_clips':[{'id':0,'start_frame':0,'end_frame':144000,'confidence':1},{'id':1,'start_frame':20000,'end_frame':30000,'confidence':.5}],
      'voice_events':[{'clip_id':0,'start_tick':0,'clean':True,'reverse':False,'rate':1},
                      {'clip_id':1,'start_tick':9600,'clean':False,'reverse':False,'rate':1}]}
timing={'schema_version':'1.0-word-times','source_sha256':'a'*64,'source_rate':16000,'source_frames':48000,'language_probability':.9,
        'words':[{'start_frame':6400,'end_frame':11200,'confidence':.95}]}
aligned,changes=align(plan,timing)
assert len(changes)==1 and aligned['voice_clips'][1]['start_frame']==18240 and aligned['voice_clips'][1]['end_frame']==35040
assert aligned['voice_clips'][0]==plan['voice_clips'][0] and aligned['voice_events']==plan['voice_events'] and plan['voice_clips'][1]['start_frame']==20000
for key,value in [('source_sha256','b'*64),('source_rate',8000),('source_frames',48001),('words',timing['words']*129),('language_probability',float('nan'))]:
    bad=copy.deepcopy(timing);bad[key]=value;reject(lambda:align(plan,bad))
for key,value in [('start_frame',True),('start_frame',-1),('end_frame',48001),('confidence',float('nan')),('confidence',1.1),('confidence',True),('text','private')]:
    bad=copy.deepcopy(timing);bad['words'][0][key]=value;reject(lambda:align(plan,bad))
bad=copy.deepcopy(timing);bad['words']*=2;reject(lambda:align(plan,bad))
for field,value in [('clean',True),('reverse',True),('rate',1.1),('pitch_semitones',1),('echo_ticks',480)]:
    bad=copy.deepcopy(plan);bad['voice_events'][1][field]=value;assert align(bad,timing)[1]==[]
low=copy.deepcopy(timing);low['words'][0]['confidence']=.79;assert align(plan,low)[1]==[]
low['language_probability']=.49;assert align(plan,low)[1]==[]
# Expanding into the next event must be refused; no amount of confidence overrides timing.
crowded=copy.deepcopy(plan);crowded['voice_events'].append({**plan['voice_events'][1],'start_tick':10080});assert align(crowded,timing)[1]==[]
echoed=copy.deepcopy(plan)
echoed['voice_events'][0].update(start_tick=5000,clean=False,echo_ticks=960)
assert align(echoed,timing)[1]==[], 'previous echo tail must retain its clearance'
for version in ('1.0-remix','1.1-remix','1.2-remix','1.3-remix','1.4-remix','1.5-remix','1.6-remix'):
    candidate=copy.deepcopy(plan);candidate['schema_version']=version;add_echoes(candidate,480)
    assert candidate['schema_version']==('1.2-remix' if version in ('1.0-remix','1.1-remix') else version)
b=io.BytesIO()
with wave.open(b,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b'\0\0'*32000)
assert wav_info(b.getvalue())==(16000,32000)
reject(lambda:wav_info(b.getvalue()[:-2]));reject(lambda:wav_info(b'not a wav'))
with tempfile.TemporaryDirectory() as directory:
    root=Path(directory);(root/'source.wav').write_bytes(b.getvalue());(root/'keep.json').write_text('preserve')
    command=[sys.executable,'scripts/analyze_words.py','--input',str(root/'source.wav'),'--model',str(root/'missing'),'--output',str(root/'keep.json')]
    assert subprocess.run(command,capture_output=True).returncode!=0
    assert subprocess.run([*command,'--consent'],capture_output=True).returncode!=0
    assert (root/'keep.json').read_text()=='preserve'
print('PASS: source binding, bounds, confidence, clean/transform protection, scheduling clearance, version preservation, PCM validation, permission and existing-output protection; model accuracy NOT RUN')
