#!/usr/bin/env python3
"""Local-only musician preview; one queued generation, no cloud services."""
import json
import os
from pathlib import Path
import secrets
import shutil
import wave

import numpy as np
import subprocess
import sys
import uuid

from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from assemble_sung_response import assemble, envelope
from singing_response import STYLES, STYLE_LABELS, VOICES, load_plan, text_field

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
                        '-i', str(original), '-t', '15.001', '-ar', str(RATE), '-ac', '2', '-c:a', 'pcm_s16le',
                        str(decoded)], check=True, timeout=20, capture_output=True)
    except (OSError, subprocess.SubprocessError) as error:
        raise StudioError('Could not read this audio file. Try recording again or uploading WAV, MP3 or M4A.') from error
    with wave.open(str(decoded)) as audio_file:
        seconds = audio_file.getnframes()/RATE
    if seconds < 2:
        raise StudioError(f'This recording is {seconds:.2f} seconds. Record at least 2 seconds.')
    if seconds > 15:
        raise StudioError('This recording is longer than 15 seconds. Trim it to a short 2–5 second phrase.')
    try:
        pcm = read_pcm(decoded, (2, 15))
    except ValueError as error:
        raise StudioError('This recording is silent or unreadable. Check your microphone or try another file.') from error
    start,stop = 0,len(pcm)
    if seconds > 5:
        levels = envelope(pcm);hop=RATE//100
        active = np.flatnonzero(levels > max(.0003,float(levels.max())*.015))
        if not len(active): raise StudioError('No clear sound was found. Speak closer to the microphone and try again.')
        begin,end = int(active[0])*hop,min(len(pcm),int(active[-1]+1)*hop)
        if end-begin > 5*RATE:
            raise StudioError(f'This recording is {seconds:.2f} seconds and its sound exceeds 5 seconds. Trim it to one short phrase; the original recording is saved.')
        padding=min(RATE//25,(5*RATE-(end-begin))//2)
        start,stop=max(0,begin-padding),min(len(pcm),end+padding)
        # Keep the two-second minimum using existing quiet, without cutting the audible phrase.
        start=max(0,min(start,stop-2*RATE));stop=min(len(pcm),max(stop,start+2*RATE))
    source=work/'source.wav';write_pcm(source,pcm[start:stop])
    report={'original_sha256':digest(original),'original_seconds':seconds,
            'source_sha256':digest(source),'source_seconds':(stop-start)/RATE,
            'kept_frames':[start,stop],'edge_quiet_removed':start>0 or stop<len(pcm)}
    (work/'input.json').write_text(json.dumps(report,indent=2)+'\n')
    return read_pcm(source,(2,5)),report


def make_reply(audio, phrase, voice, genre, consent):
    if consent is not True:
        raise StudioError('Confirm that you may use this recording.')
    try:
        phrase = text_field(phrase, 240, 'phrase')
    except ValueError as error:
        raise StudioError('Enter what the recording says, using up to 240 characters.') from error
    if voice not in ('surprise', *VOICES) or genre not in ('surprise', *STYLES):
        raise StudioError('Choose an available voice and style.')
    if not audio or not Path(audio).is_file() or not 44 <= Path(audio).stat().st_size <= 10*1024**2:
        raise StudioError('Record or upload an audio clip, up to 10 MB.')
    seed = secrets.randbelow(2**32-2*len(STYLES))
    chosen_voice = secrets.choice(tuple(VOICES)) if voice == 'surprise' else voice
    chosen_genre = secrets.choice(tuple(STYLES)) if genre == 'surprise' else genre
    work = OUTPUT / uuid.uuid4().hex
    work.mkdir(parents=True)
    (work / '.partial').touch()
    source = work / 'source.wav'
    stage = 'Preparing the recording'
    try:
        pcm,input_report = prepare_source(audio,work)
        score = work / 'source.json'
        score.write_text(json.dumps({'source': {'sha256': digest(source), 'kind': 'recorded', 'consent_confirmed': True,
            'processed_frames': len(pcm)}, 'sample_rate': RATE, 'voice_clips': [{'id': 0, 'start_frame': 0, 'end_frame': len(pcm)}]}))
        plan_path = work / 'reply.json'
        command = [sys.executable, str(ROOT / 'scripts/singing_response.py')]
        env = {**os.environ, 'PYTORCH_ENABLE_MPS_FALLBACK': '1', 'HF_HUB_DISABLE_TELEMETRY': '1'}
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
        stage = 'Finding room for your phrase'
        with (work / 'separate-private.log').open('w') as log:
            subprocess.run([sys.executable, str(ROOT/'scripts/separate_singer.py'), '--input', str(singer/'singer.wav'),
                            '--output', str(singer/'stems')], stdout=log, stderr=subprocess.STDOUT, env=env, timeout=600, check=True)
        stage = 'Arranging your phrase'
        report = assemble(source, score, singer, work / 'exchange', True)
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        (work/'failure.json').write_text(json.dumps({'stage':stage,'error_type':type(error).__name__})+'\n')
        if isinstance(error,StudioError): raise
        raise StudioError(f'{stage} failed. Your recording is saved. Try Make a song again; you do not need to record it again.') from error
    (work / '.partial').unlink()
    placement = ('Used one intact phrase in a vocal gap. The singer and band stay unchanged.'
                 if report['sample_used'] else
                 'No safe space for the recording: kept the original song. The lyrics still respond to your words; no sample was inserted.')
    preparation = 'Extra quiet was trimmed from the recording. ' if input_report['edge_quiet_removed'] else ''
    return (str(singer/'singer.wav'), str(work/'exchange/performance.wav'), case['lyrics'],
            f"{chosen_voice.title()} · {STYLE_LABELS[chosen_genre]}. {preparation}{placement} Listen and compare with the original song.")


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
        gr.Markdown('# Turn your sound into a song\nAn AI singer answers your words. All or part of your recording joins where it fits, while the music keeps flowing. '
                    'Everything stays on this Mac. New singing is experimental; listen before keeping it.')
        consent = gr.Checkbox(label='I have permission to use this recording.', value=False)
        audio = gr.Audio(sources=['microphone', 'upload'], type='filepath', format='wav', buttons=['download'], label='Your phrase · 2–5 seconds of sound; extra quiet is trimmed', elem_id='user-phrase')
        phrase = gr.Textbox(label='What does the recording say?', max_lines=2, placeholder='I have a question')
        with gr.Row():
            voice = gr.Dropdown(choices=[('Surprise me', 'surprise'), ('Female', 'female'), ('Male', 'male')], value='surprise', label='Singer')
            genre = gr.Dropdown(choices=[('Surprise me', 'surprise'), *[(label,key) for key,label in STYLE_LABELS.items()]], value='surprise', label='Style')
        button = gr.Button('Make a song', variant='primary')
        status = gr.Markdown('Generation can take a few minutes. Nothing plays automatically. Local recordings and results remain in this preview until deleted.')
        exchange = gr.Audio(label='Your song', interactive=False, autoplay=False, buttons=['download'], elem_id='exchange-preview')
        with gr.Accordion('Compare with the original song', open=False):
            singer = gr.Audio(label='Original song · no sample', interactive=False, autoplay=False, buttons=['download'], elem_id='singer-preview')
        lyrics = gr.Textbox(label='Intended lyrics', interactive=False, lines=6)
        button.click(generate, [audio, phrase, voice, genre, consent], [singer, exchange, lyrics, status],
                     concurrency_limit=1, api_name=False)
    app.queue(max_size=1, default_concurrency_limit=1)
    app.launch(server_name='127.0.0.1', server_port=4198, share=False, allowed_paths=[str(OUTPUT)],
               max_file_size='10mb', footer_links=[], show_error=False, strict_cors=True,
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
