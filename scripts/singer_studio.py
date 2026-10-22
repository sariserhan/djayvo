#!/usr/bin/env python3
"""Local-only musician preview; one queued generation, no cloud services."""
import json
import os
from pathlib import Path
import secrets
import random
import shutil
import wave

import numpy as np
import subprocess
import sys
import uuid

from arrange_voice_research import RATE, digest, read_pcm
from assemble_sung_response import keep_song
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
    speech_python=ROOT/'.venv-speech/bin/python'
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


def sample_candidate(work, speech, genre, seconds, seed=0):
    candidates=[]
    for phrase in speech.get('phrases',[]):
        if not isinstance(phrase,dict) or not isinstance(phrase.get('text'),str):continue
        a,b=phrase.get('start_seconds'),phrase.get('end_seconds')
        if (type(a) in (int,float) and type(b) in (int,float) and np.isfinite([a,b]).all()
            and 0<=a<b<=seconds and .35<=b-a<=2.5 and 1<=len(phrase['text'].split())<=8):
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
    candidates.extend((a,b) for a,b in groups if .35<=b-a<=2.5)
    if not candidates:return None
    a,b=random.Random(seed).choice(sorted(set(candidates)))
    a=max(0,a-.04);b=min(seconds,b+.04)
    source=work/'source.wav'
    subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-protocol_whitelist','file,pipe',
        '-ss',str(a),'-i',str(work/'original-recording'),'-t',str(b-a),'-ar',str(RATE),'-ac','2',
        '-c:a','pcm_s16le',str(source)],check=True,timeout=20,capture_output=True)
    pcm=read_pcm(source,(.35,5));score=work/'source.json'
    score.write_text(json.dumps({'source':{'sha256':digest(source),'kind':'recorded','consent_confirmed':True,
        'processed_frames':len(pcm)},'sample_rate':RATE,'voice_clips':[{'id':0,'start_frame':0,'end_frame':len(pcm)}],
        'original_seconds':[a,b]}))
    return source,score


def make_reply(audio, phrase, voice, genre, consent):
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
        stage = 'Choosing whether to use the recording'
        try:
            candidate=sample_candidate(work,speech,chosen_genre,input_report['original_seconds'],seed)
        except (ValueError,OSError,subprocess.SubprocessError):
            candidate=None
        plan_path = work / 'reply.json'
        command = [sys.executable, str(ROOT / 'scripts/singing_response.py')]
        stage = 'Writing the lyrics'
        with (work / 'draft-private.log').open('w') as log:
            subprocess.run([*command, 'draft', '--runtime', str(RUNTIME), '--phrase', phrase, '--voice', chosen_voice,
                            '--genre', chosen_genre, '--seed', str(seed), '--output', str(plan_path)],
                           stdout=log, stderr=subprocess.STDOUT, env=env, timeout=600, check=True)
        plan = load_plan(plan_path)
        case = plan['cases'][0]
        singer = work / 'singer'
        stage = 'Generating the singer and music'
        with (work / 'render-private.log').open('w') as log:
            subprocess.run([*command, 'sing', '--runtime', str(RUNTIME), '--plan', str(plan_path), '--case', case['id'],
                            '--output', str(singer)], stdout=log, stderr=subprocess.STDOUT, env=env, timeout=600, check=True)
        result_dir=work/'exchange'
        if candidate:
            try:
                stage = 'Finding room for your phrase'
                with (work / 'separate-private.log').open('w') as log:
                    subprocess.run([sys.executable, str(ROOT/'scripts/separate_singer.py'), '--input', str(singer/'singer.wav'),
                                    '--output', str(singer/'stems')], stdout=log, stderr=subprocess.STDOUT, env=env, timeout=600, check=True)
                stage = 'Arranging your phrase'
                report = arrange(candidate[0],singer,result_dir,OUTPUT/'arrangement-history.json',seed,True)
            except (ValueError,OSError,subprocess.SubprocessError) as error:
                (work/'sample-skipped.json').write_text(json.dumps({'stage':stage,'error_type':type(error).__name__})+'\n')
                result_dir=work/'meaning-only'
                report=keep_song(singer,result_dir,'Could not arrange the recording; the completed song is preserved for comparison.')
        else:
            report = keep_song(singer,result_dir,'Could not find a short, intact phrase; the completed song is preserved for comparison.')
        report['meaning_origin']=interpretation
        (result_dir/'complete.json').write_text(json.dumps(report,indent=2)+'\n')
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        (work/'failure.json').write_text(json.dumps({'stage':stage,'error_type':type(error).__name__})+'\n')
        if isinstance(error,StudioError): raise
        raise StudioError(f'{stage} failed. Your recording is saved. Try Make a song again; you do not need to record it again.') from error
    (work / '.partial').unlink()
    placement = (('Your phrase takes a short singing turn; the rest of the song stays in place.'
                  if report.get('mode')=='vocal-replacement' else
                  'Your phrase joins a gap in the song; the singer and band stay unchanged.') if report['sample_used'] else
                 'Could not fit your recording this time. The original song is saved without replaying your recording; try another song.')
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
