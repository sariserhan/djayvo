#!/usr/bin/env python3
"""Local-only musician preview; one queued generation, no cloud services."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import uuid

from arrange_voice_research import RATE, digest, read_pcm
from assemble_sung_response import assemble
from singing_response import STYLES, STYLE_LABELS, VOICES, load_plan, text_field

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'build-style-training/upstream'
OUTPUT = ROOT / 'renders/singer-studio'


def make_reply(audio, phrase, voice, genre, consent):
    if consent is not True:
        raise ValueError('Confirm that you may use this recording.')
    phrase = text_field(phrase, 240, 'phrase; enter what the recording says')
    if voice not in ('surprise', *VOICES) or genre not in ('surprise', *STYLES):
        raise ValueError('Choose an available voice and style.')
    if not audio or not Path(audio).is_file() or not 44 <= Path(audio).stat().st_size <= 10*1024**2:
        raise ValueError('Record or upload a short audio clip, up to 10 MB.')
    seed = secrets.randbelow(2**32-2*len(STYLES))
    chosen_voice = secrets.choice(tuple(VOICES)) if voice == 'surprise' else voice
    chosen_genre = secrets.choice(tuple(STYLES)) if genre == 'surprise' else genre
    work = OUTPUT / uuid.uuid4().hex
    work.mkdir(parents=True)
    (work / '.partial').touch()
    source = work / 'source.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-protocol_whitelist', 'file,pipe', '-i', str(audio), '-t', '5.001',
                    '-ar', str(RATE), '-ac', '2', '-c:a', 'pcm_s16le', str(source)], check=True, timeout=20, capture_output=True)
    pcm = read_pcm(source, (2, 5))
    score = work / 'source.json'
    score.write_text(json.dumps({'source': {'sha256': digest(source), 'kind': 'recorded', 'consent_confirmed': True,
        'processed_frames': len(pcm)}, 'sample_rate': RATE, 'voice_clips': [{'id': 0, 'start_frame': 0, 'end_frame': len(pcm)}]}))
    plan_path = work / 'reply.json'
    command = [sys.executable, str(ROOT / 'scripts/singing_response.py')]
    env = {**os.environ, 'PYTORCH_ENABLE_MPS_FALLBACK': '1', 'HF_HUB_DISABLE_TELEMETRY': '1'}
    with (work / 'draft-private.log').open('w') as log:
        subprocess.run([*command, 'draft', '--runtime', str(RUNTIME), '--phrase', phrase, '--voice', chosen_voice,
                        '--genre', chosen_genre, '--seed', str(seed), '--output', str(plan_path)],
                       stdout=log, stderr=subprocess.STDOUT, env=env, timeout=600, check=True)
    plan = load_plan(plan_path)
    case = plan['cases'][0]
    singer = work / 'singer'
    with (work / 'render-private.log').open('w') as log:
        subprocess.run([*command, 'sing', '--runtime', str(RUNTIME), '--plan', str(plan_path), '--case', case['id'],
                        '--output', str(singer)], stdout=log, stderr=subprocess.STDOUT, env=env, timeout=600, check=True)
    with (work / 'separate-private.log').open('w') as log:
        subprocess.run([sys.executable, str(ROOT/'scripts/separate_singer.py'), '--input', str(singer/'singer.wav'),
                        '--output', str(singer/'stems')], stdout=log, stderr=subprocess.STDOUT, env=env, timeout=600, check=True)
    report = assemble(source, score, singer, work / 'exchange', True)
    (work / '.partial').unlink()
    placement = ('Used one intact phrase in a vocal gap. The singer and band stay unchanged.'
                 if report['sample_used'] else
                 'No safe space for the recording: kept the original song. The lyrics still respond to your words; no sample was inserted.')
    return (str(singer/'singer.wav'), str(work/'exchange/performance.wav'), case['lyrics'],
            f"{chosen_voice.title()} · {STYLE_LABELS[chosen_genre]}. {placement} Listen and compare with the original song.")


def serve():
    os.environ['GRADIO_ANALYTICS_ENABLED'] = 'False'
    import gradio as gr

    def generate(*args):
        try:
            return make_reply(*args)
        except (ValueError, OSError, subprocess.SubprocessError):
            raise gr.Error('Could not make this reply. Use a clear 2–5 second clip, confirm its words and permission, and try again. No completed output was replaced.') from None

    with gr.Blocks(title='Jamloom · musician voice', analytics_enabled=False) as app:
        gr.Markdown('# Turn your sound into a song\nAn AI singer answers your words. All or part of your recording joins where it fits, while the music keeps flowing. '
                    'Everything stays on this Mac. New singing is experimental; listen before keeping it.')
        consent = gr.Checkbox(label='I have permission to use this recording.', value=False)
        audio = gr.Audio(sources=['microphone', 'upload'], type='filepath', format='wav', buttons=['download'], label='Your phrase · 2–5 seconds', elem_id='user-phrase')
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
