#!/usr/bin/env python3
"""Local-only musician preview; one queued generation, no cloud services."""
import json
import os
from pathlib import Path
from song_duration import choose_duration
import secrets
import random
import shutil
import wave

import numpy as np
import subprocess
import sys
import uuid

from arrange_voice_research import RATE, digest, read_pcm
from assemble_sung_response import intervals
from local_call_edit import arrange
from singing_response import STYLES, STYLE_LABELS, VOICES, MAX_PHRASE_CHARS, digest as file_digest, load_plan, text_field

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'build-style-training/upstream'
OUTPUT = ROOT / 'renders/singer-studio'


class StudioError(ValueError):
    """A safe, actionable message for the studio listener."""


def prepare_source(audio, work):
    original = work/'original-recording'
    shutil.copyfile(audio, original)
    decoded = work/'decoded.wav'
    try:
        subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-protocol_whitelist', 'file,pipe',
                        '-i', str(original), '-t', '300.001', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
                        str(decoded)], check=True, timeout=120, capture_output=True)
    except (OSError, subprocess.SubprocessError) as error:
        raise StudioError('Could not read this audio file. Try recording again or uploading WAV, MP3 or M4A.') from error
    with wave.open(str(decoded)) as audio_file:
        seconds = audio_file.getnframes()/16000
    if seconds <= 0:
        raise StudioError('This recording is empty. Record a sound or choose another file.')
    if seconds > 300:
        raise StudioError('This local preview handles recordings up to 5 minutes. Choose a shorter section; the original is saved.')
    report={'original_sha256':file_digest(original),'original_seconds':seconds,
            'decoded_sha256':digest(decoded),'decoded_seconds':seconds,'original_preserved':True}
    (work/'input.json').write_text(json.dumps(report,indent=2)+'\n')
    return report


def understand(work, env):
    speech_python=Path(sys.executable) if os.environ.get('JAMLOOM_INFERENCE_DEVICE') == 'cuda' else ROOT/'.venv-speech/bin/python'
    try:
        with (work/'understand-private.log').open('w') as log:
            subprocess.run([str(speech_python),str(ROOT/'scripts/analyze_words.py'),'--input',str(work/'decoded.wav'),
                            '--model',str(ROOT/'build-speech-tools/faster-whisper-tiny'),'--output',str(work/'meaning.json'),
                            '--consent','--understand'],stdout=log,stderr=subprocess.STDOUT,env=env,timeout=620,check=True)
    except (OSError,subprocess.SubprocessError) as error:
        raise StudioError('Could not understand the recording locally. Add the words or an idea and try again; your recording is saved.') from error
    path=work/'meaning.json'
    if path.stat().st_size>1024**2:raise ValueError('Speech result exceeds budget')
    result=json.loads(path.read_text())
    if result.get('source_sha256')!=digest(work/'decoded.wav'):raise ValueError('Speech result source mismatch')
    transcript=result.get('transcript','')
    if not isinstance(transcript,str) or len(transcript)>MAX_PHRASE_CHARS:raise ValueError('Invalid transcript')
    return result


def sample_candidate(work, speech, genre, seconds, seed=0, attempt=0):
    candidates=[]
    for phrase in speech.get('phrases',[]):
        if not isinstance(phrase,dict) or not isinstance(phrase.get('text'),str):continue
        a,b=phrase.get('start_seconds'),phrase.get('end_seconds')
        if (type(a) in (int,float) and type(b) in (int,float) and np.isfinite([a,b]).all()
            and 0<=a<b<=seconds and .35<=b-a<=4.8 and 1<=len(phrase['text'].split())<=16):
            candidates.append((a,b))
    # Word timing supplies pause-bounded clauses even when ASR emits one long segment.
    rate=speech.get('source_rate',16000);groups=[]
    if type(rate) not in (int,float) or not np.isfinite(rate) or not 8000<=rate<=192000:raise ValueError('Invalid speech rate')
    for word in speech.get('words',[]):
        if not isinstance(word,dict):continue
        a,b=word.get('start_frame'),word.get('end_frame')
        if type(a) is not int or type(b) is not int or not 0<=a<b<=seconds*rate:continue
        a,b=a/rate,b/rate
        if groups and a<groups[-1][1]:continue
        if groups and 0<=a-groups[-1][1]<.3:groups[-1]=(groups[-1][0],b)
        else:groups.append((a,b))
    candidates.extend((a,b) for a,b in groups if .35<=b-a<=4.8)
    with wave.open(str(work/'decoded.wav')) as wav:
        pcm=np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').astype(np.float64)/32768
    hop=160;levels=np.sqrt(np.mean(np.pad(pcm,(0,(-len(pcm))%hop)).reshape(-1,hop)**2,axis=1))
    if not len(levels) or float(np.max(levels))<.0003:return None
    active=levels>max(.0003,float(np.max(levels))*.03)
    joined=active.copy()
    for a,b in intervals(~active):
        if a>0 and b<len(active) and b-a<18:joined[a:b]=True
    # Pauses also delimit laughter, claps and sounds without recognized words.
    if not speech.get('transcript','').strip() and not speech.get('words'):
        candidates.extend((float(a)/100,min(seconds,float(b)/100)) for a,b in intervals(joined) if .35<=(b-a)/100<=4.8)
        # Keep short percussion usable without forcing a whole sparse recording into a vocal gap.
        for a,b in intervals(joined):
            if 3<=b-a<35 and seconds>=.4:
                start=max(0,min(a/100-.04,seconds-.4))
                candidates.append((start,start+.4))
    if not candidates:
        for word in speech.get('words',[]):
            if not isinstance(word,dict):continue
            a,b=word.get('start_frame'),word.get('end_frame')
            if type(a) is int and type(b) is int and 0<=a<b<=seconds*rate and .35<=(b-a)/rate<=4.8:
                candidates.append((a/rate,b/rate))
        if not candidates and not speech.get('transcript','').strip():
            for a,b in intervals(joined):
                if b-a>=35:candidates.append((float(a)/100,min(seconds,float(a+200)/100,float(b)/100)))
    candidates=[(a,b) for a,b in candidates if np.sqrt(np.mean(pcm[round(a*16000):round(b*16000)]**2))>=.0003]
    if .35<=seconds<=5:candidates.append((0,seconds))
    candidates=sorted({(max(0,a-.04),min(seconds,b+.04)) for a,b in candidates})
    random.Random(seed).shuffle(candidates)
    if attempt>=len(candidates):return None
    a,b=candidates[attempt]
    source=work/('source.wav' if attempt==0 else f'source-{attempt}.wav')
    subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-protocol_whitelist','file,pipe',
        '-ss',str(a),'-i',str(work/'original-recording'),'-t',str(b-a),'-ar',str(RATE),'-ac','2',
        '-c:a','pcm_s16le',str(source)],check=True,timeout=20,capture_output=True)
    pcm=read_pcm(source,(.35,5));score=source.with_suffix('.json')
    word_frames=None
    for word in speech.get('words',[]):
        if not isinstance(word,dict):continue
        start,stop,confidence=word.get('start_frame'),word.get('end_frame'),word.get('confidence',0)
        if (type(start) is int and type(stop) is int and type(confidence) in (int,float)
                and .8<=confidence<=1 and a+.18<=start/rate<stop/rate<=b and b-stop/rate<=.08):
            first=max(0,round((start/rate-a-.04)*RATE));last=min(len(pcm),round((stop/rate-a+.04)*RATE))
            if .18*RATE<=last-first<=1.2*RATE:word_frames=[first,last]
    score.write_text(json.dumps({'source':{'sha256':digest(source),'kind':'recorded','consent_confirmed':True,
        'processed_frames':len(pcm)},'sample_rate':RATE,'voice_clips':[{'id':0,'start_frame':0,'end_frame':len(pcm)}],
        'original_seconds':[a,b],'rhythm_word_frames':word_frames,
        'selection':'whole-recording' if a==0 and b==seconds else 'excerpt'}))
    return source,score


def make_reply(audio, phrase, voice, genre, consent, duration=None):
    if consent is not True:
        raise StudioError('Confirm that you may use this recording.')
    try:
        phrase = text_field(phrase, MAX_PHRASE_CHARS, 'idea') if phrase else ''
    except ValueError as error:
        raise StudioError('Keep your words or idea under 32,000 characters.') from error
    if voice not in ('surprise', *VOICES) or genre not in ('surprise', *STYLES):
        raise StudioError('Choose an available voice and style.')
    if not audio or not Path(audio).is_file() or not 44 <= Path(audio).stat().st_size <= 100*1024**2:
        raise StudioError('Record or upload an audio clip, up to 100 MB.')
    seed = secrets.randbelow(2**32-2*len(STYLES))
    duration=choose_duration('improvise',seed,duration)
    chosen_voice = secrets.choice(tuple(VOICES)) if voice == 'surprise' else voice
    chosen_genre = secrets.choice(tuple(STYLES)) if genre == 'surprise' else genre
    work = OUTPUT / uuid.uuid4().hex
    work.mkdir(parents=True)
    (work / '.partial').touch()
    stage = 'Preparing the recording'
    try:
        input_report = prepare_source(audio,work)
        env = {**os.environ, 'PYTORCH_ENABLE_MPS_FALLBACK': '1', 'HF_HUB_DISABLE_TELEMETRY': '1'}
        speech={};interpretation='your supplied idea'
        stage = 'Understanding the recording'
        try:
            speech=understand(work,env)
        except StudioError:
            if not phrase:raise
        if not phrase:
            phrase=speech['transcript'].strip()
            interpretation='the locally recognized words'
            if not phrase:
                phrase='A quiet moment, with space to breathe' if speech.get('quiet') else 'A wordless sound: make an original musical response without inventing spoken words'
                interpretation='a wordless sound; add an idea if you want a specific meaning'
        stage = 'Finding usable parts of the recording'
        candidates=[]
        for attempt in range(4):
            candidate=sample_candidate(work,speech,chosen_genre,input_report['original_seconds'],seed,attempt)
            if candidate:candidates.append(candidate)
            else:break
        if not candidates:
            raise StudioError('No clear sound was found to blend into the music. Try a recording with an audible phrase or sound.')
        plan_path = work / 'reply.json'
        command = [sys.executable, str(ROOT / 'scripts/singing_response.py')]
        stage = 'Writing the lyrics'
        with (work / 'draft-private.log').open('w') as log:
            subprocess.run([*command, 'draft', '--runtime', str(RUNTIME), '--phrase', phrase, '--voice', chosen_voice,
                            '--genre', chosen_genre, '--duration', str(duration), '--seed', str(seed), '--output', str(plan_path)],
                           stdout=log, stderr=subprocess.STDOUT, env=env, timeout=600, check=True)
        plan = load_plan(plan_path)
        case = plan['cases'][0]
        singer = work / 'singer'
        stage = 'Generating the singer and music'
        with (work / 'render-private.log').open('w') as log:
            subprocess.run([*command, 'sing', '--runtime', str(RUNTIME), '--plan', str(plan_path), '--case', case['id'],
                            '--output', str(singer)], stdout=log, stderr=subprocess.STDOUT, env=env, timeout=600, check=True)
        stage = 'Finding room for your sound'
        with (work / 'separate-private.log').open('w') as log:
            subprocess.run([sys.executable, str(ROOT/'scripts/separate_singer.py'), '--input', str(singer/'singer.wav'),
                            '--output', str(singer/'stems')], stdout=log, stderr=subprocess.STDOUT, env=env, timeout=600, check=True)
        report=None
        for attempt,candidate in enumerate(candidates):
            result_dir=work/f'exchange-{attempt}'
            try:
                stage = 'Blending your sound into the song'
                report = arrange(candidate[0],singer,result_dir,OUTPUT/'arrangement-history.json',seed+attempt,True,source_score=candidate[1])
                if report.get('sample_used') is not True or not report.get('events'):
                    raise ValueError('Arrangement omitted the recording')
                report['source_excerpt']=json.loads(candidate[1].read_text())
                report['original_recording_sha256']=input_report['original_sha256']
                break
            except ValueError as error:
                report=None
                (work/f'arrangement-rejected-{attempt}.json').write_text(json.dumps({'stage':stage,'error_type':type(error).__name__})+'\n')
        if report is None:
            raise StudioError('Could not blend your recording without clashing with the song. Try another style or take; no song without your recording is delivered.')
        report['meaning_origin']=interpretation
        (result_dir/'complete.json').write_text(json.dumps(report,indent=2)+'\n')
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        (work/'failure.json').write_text(json.dumps({'stage':stage,'error_type':type(error).__name__})+'\n')
        if isinstance(error,StudioError): raise
        raise StudioError(f'{stage} failed. Your recording is saved. Try Make a song again; you do not need to record it again.') from error
    (work / '.partial').unlink()
    placement = ('Your sound returns as a rhythmic hook within the song.' if len(report['events'])>1 or report['pattern']=='word-reply' else
                 'Your sound takes a musical turn within the song.')
    return (str(singer/'singer.wav'), str(result_dir/'performance.wav'), case['lyrics'],
            f"{chosen_voice.title()} · {STYLE_LABELS[chosen_genre]}. Inspired by {interpretation}. {placement}",phrase)


def generate(*args):
    import gradio as gr
    try:
        return make_reply(*args)
    except StudioError as error:
        raise gr.Error(str(error)) from None
    except (ValueError, OSError, subprocess.SubprocessError):
        raise gr.Error('The studio could not finish the song. Try again; your recording has not been changed.') from None


def serve():
    os.environ['GRADIO_ANALYTICS_ENABLED'] = 'False'
    import gradio as gr

    with gr.Blocks(title='Jamloom · musician voice', analytics_enabled=False) as app:
        gr.Markdown('# Turn your sound into a song\nRecord a thought, a story or a sound. Your phrase can join a musical gap or take a short singing turn. Each song gets a fresh arrangement, chosen to fit the music. '
                    'Everything stays on this Mac. New singing is experimental; listen before keeping it.')
        consent = gr.Checkbox(label='I have permission to use this recording.', value=False)
        audio = gr.Audio(sources=['microphone', 'upload'], type='filepath', format='wav', buttons=['download'], label='Your recording · up to 5 minutes / 100 MB', elem_id='user-phrase')
        phrase = gr.Textbox(label='Words or idea (optional)', max_lines=3, placeholder='Leave blank to understand the recording locally, or tell us the idea')
        with gr.Row():
            voice = gr.Dropdown(choices=[('Surprise me', 'surprise'), ('Female', 'female'), ('Male', 'male')], value='surprise', label='Singer')
            genre = gr.Dropdown(choices=[('Surprise me', 'surprise'), *[(label,key) for key,label in STYLE_LABELS.items()]], value='surprise', label='Style')
        button = gr.Button('Make a song', variant='primary')
        status = gr.Markdown('Generation can take a few minutes. Nothing plays automatically. Local recordings and results remain in this preview until deleted.')
        exchange = gr.Audio(label='Your song', interactive=False, autoplay=False, buttons=['download'], elem_id='exchange-preview')
        with gr.Accordion('Compare with the original song', open=False):
            singer = gr.Audio(label='Original song · no sample', interactive=False, autoplay=False, buttons=['download'], elem_id='singer-preview')
        lyrics = gr.Textbox(label='Intended lyrics', interactive=False, lines=6)
        meaning = gr.Textbox(label='What inspired the song · correct it above if needed', interactive=False, lines=3)
        button.click(generate, [audio, phrase, voice, genre, consent], [singer, exchange, lyrics, status, meaning],
                     concurrency_limit=1, api_name=False)
    app.queue(max_size=1, default_concurrency_limit=1)
    app.launch(server_name='127.0.0.1', server_port=4198, share=False, allowed_paths=[str(OUTPUT)],
               max_file_size='100mb', footer_links=[], show_error=False, strict_cors=True,
               head="""<script>(() => {
                 const bound = new WeakSet();
                 const scan = root => [...root.querySelectorAll('*')].flatMap(e =>
                   e.tagName === 'AUDIO' ? [e] : e.shadowRoot ? scan(e.shadowRoot) : []);
                 setInterval(() => {
                   const players = scan(document);
                   players.forEach(a => { if (!bound.has(a)) {
                     bound.add(a); a.addEventListener('play', () => scan(document).forEach(b => { if (a !== b) b.pause(); }));
                   } });
                 }, 250);
               })();</script>""")


if __name__ == '__main__':
    serve()
