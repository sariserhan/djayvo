"""Private Runpod handler. Only short-lived grants to Jamloom's R2 are accepted."""
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import wave

ROOT = Path(__file__).resolve().parents[2]
MAX_SECONDS = 900


class GenerationFailure(RuntimeError):
    """Only static stage names and source locations, never exception messages."""


def failure_location(work):
    try:
        if (work/'status.json').exists() and json.loads((work/'status.json').read_text()).get('state')=='rejected':
            try:
                fit=json.loads((work/'fit.json').read_text())
                matched=fit.get('matching_windows')
                if type(matched) is int and 0<=matched<=4:
                    return f'style-rejected:matched-{matched}-of-4'
            except (OSError,ValueError,TypeError,AttributeError):
                pass
            return 'style-rejected'
    except (OSError,ValueError,TypeError):
        pass
    try:
        failure=json.loads((work/'failure.json').read_text())
        if failure.get('stage') in ('writing','composing','retrying','checking') and failure.get('reason')=='timeout':
            return f"{failure['stage']}-timeout"
        if failure.get('stage') in ('writing','composing','retrying','checking') and type(failure.get('returncode')) is int:
            return f"{failure['stage']}-exit-{failure['returncode']}"
    except (OSError,ValueError,TypeError):
        pass
    logs = [(stage,work/(stage+'.log')) for stage in ('fit-retry', 'fit', 'singer', 'planner', 'private')]
    for path in (work/'improvise').glob('*/failure.json'):
        try:
            failure=json.loads(path.read_text())
            stage,filename={
                'Preparing the recording':('source',None),
                'Understanding the recording':('transcription','understand-private.log'),
                'Finding usable parts of the recording':('selection',None),
                'Writing the lyrics':('lyrics','draft-private.log'),
                'Generating the singer and music':('singing','render-private.log'),
                'Finding room for your sound':('separation','separate-private.log'),
                'Blending your sound into the song':('arrangement',None),
            }[failure['stage']]
            if filename is None:return 'improvise-'+stage
            logs.insert(0,('improvise-'+stage,path.parent/filename))
            break
        except (OSError,ValueError,TypeError,KeyError):
            continue
    for stage,path in logs:
        if stage.startswith('improvise-') and not path.exists():
            return stage
        if path.exists():
            with path.open('rb') as log:
                log.seek(max(0, path.stat().st_size-32768))
                tail = log.read().decode(errors='replace')
            locations = re.findall(r'File "[^"\n]*/([A-Za-z_]+\.py)", line ([0-9]+)', tail)
            # The conversion wrapper can hide the child's useful traceback behind its own failure.
            if locations and locations[-1][0] == 'vocal_identity.py' and 'Singer identity conversion failed' in tail:
                child = tail.rsplit('Traceback (most recent call last):', 1)[0]
                inner = re.findall(r'File "[^"\n]*/([A-Za-z_]+\.py)", line ([0-9]+)', child)
                if inner:
                    locations = inner
            location = ':'.join(locations[-1]) if locations else 'unavailable'
            return f'{stage}@{location}'
    return 'unavailable'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Storage redirect refused')


def storage_url(value):
    origin = os.environ.get('JAMLOOM_R2_ORIGIN', '')
    bucket = os.environ.get('JAMLOOM_R2_BUCKET', '')
    if not re.fullmatch(r'https://[a-f0-9]{32}\.r2\.cloudflarestorage\.com', origin) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,61}[a-z0-9]', bucket):
        raise ValueError('Worker storage is not configured')
    if not isinstance(value, str) or len(value) > 4096:
        raise ValueError('Invalid storage grant')
    url = urllib.parse.urlsplit(value)
    if url.scheme + '://' + url.netloc != origin or url.fragment or not re.fullmatch('/' + bucket + r'/uploads/[a-f0-9-]{36}\.wav', url.path):
        raise ValueError('Storage grant is outside the job staging area')
    if not urllib.parse.parse_qs(url.query).get('X-Amz-Signature'):
        raise ValueError('Signed storage grant required')
    return value


def validate(value):
    if not isinstance(value, dict) or len(json.dumps(value, allow_nan=False).encode()) > 16*1024*1024:
        raise ValueError('Invalid job')
    if not re.fullmatch(r'[a-f0-9]{32}', str(value.get('id', ''))) or value.get('product') not in ('music-dna', 'improvise'):
        raise ValueError('Invalid job identity')
    if type(value.get('timeout_seconds')) is not int or not 1 <= value['timeout_seconds'] <= MAX_SECONDS:
        raise ValueError('Invalid execution limit')
    storage_url(value.get('output_url'))
    payload = value.get('payload')
    if not isinstance(payload, dict):
        raise ValueError('Missing music input')
    from song_duration import validate_duration
    if 'duration_seconds' in payload:validate_duration(value['product'],payload['duration_seconds'])
    if value['product'] == 'music-dna':
        from music_dna_song import favorites
        from dna_direction import direction_for
        from dna_language import language
        direction_for(favorites(payload.get('profile')))
        language(payload['profile'].get('vocalLanguage', 'en')) if payload['profile'].get('vocalLanguage', 'auto') != 'auto' else None
        if type(payload.get('seed')) is not int or not 0 <= payload['seed'] < 2**32:
            raise ValueError('Invalid seed')
        if payload.get('country') is not None and not re.fullmatch('[A-Z]{2}', str(payload['country'])):
            raise ValueError('Invalid country')
        feedback=payload.get('feedback', [])
        if not isinstance(feedback,list) or len(feedback)>12 or len(json.dumps(feedback).encode())>16384:
            raise ValueError('Invalid feedback context')
        cached=payload.get('track_profiles',[])
        if not isinstance(cached,list) or len(cached)>5000 or len(json.dumps(cached).encode())>12*1024*1024:
            raise ValueError('Invalid saved song descriptions')
        if set(payload) - {'profile', 'seed', 'country', 'feedback', 'duration_seconds', 'track_profiles'}:
            raise ValueError('Unsupported DNA input')
    else:
        from singing_response import STYLES, VOICES, text_field, MAX_PHRASE_CHARS
        if payload.get('consent') is not True:
            raise ValueError('Recording permission required')
        if payload.get('genre') not in ('surprise', *STYLES) or payload.get('voice') not in ('surprise', *VOICES):
            raise ValueError('Invalid style or voice')
        if payload.get('phrase'):
            text_field(payload['phrase'], MAX_PHRASE_CHARS, 'idea')
        source = value.get('source', {})
        storage_url(source.get('url'))
        if source['url'] == value['output_url'] or type(source.get('bytes')) is not int or not 44 <= source['bytes'] <= 100*1024**2 or not re.fullmatch('[a-f0-9]{64}', str(source.get('sha256', ''))):
            raise ValueError('Invalid recording receipt')
    return value


def download(source, target):
    digest = hashlib.sha256()
    size = 0
    opener = urllib.request.build_opener(NoRedirect)
    with opener.open(source['url'], timeout=30) as response, target.open('xb') as output:
        while chunk := response.read(1024*1024):
            size += len(chunk)
            if size > source['bytes']:
                raise ValueError('Recording exceeded its receipt')
            digest.update(chunk)
            output.write(chunk)
    if size != source['bytes'] or digest.hexdigest() != source['sha256']:
        raise ValueError('Recording checksum mismatch')


def execute(work, timeout):
    with (work/'private.log').open('wb') as log:
        child = subprocess.Popen([str(ROOT/'build-style-training/upstream/.venv/bin/python'), str(Path(__file__).with_name('pipeline.py')), str(work)],
            stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
            env={**os.environ, 'JAMLOOM_INFERENCE_DEVICE': 'cuda', 'HF_HUB_OFFLINE': '1', 'HF_HUB_DISABLE_TELEMETRY': '1'})
        try:
            if child.wait(timeout=timeout):
                raise GenerationFailure(failure_location(work))
        except subprocess.TimeoutExpired:
            raise GenerationFailure('worker-timeout') from None
        finally:
            # Kill descendants too: a timed-out planner must not keep consuming GPU time.
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            child.wait()


def handler(job):
    try:
        value = validate(job.get('input'))
        with tempfile.TemporaryDirectory(prefix='jamloom-') as folder:
            work = Path(folder)
            (work/'request.json').write_text(json.dumps(value['payload'], allow_nan=False))
            (work/'product.txt').write_text(value['product'])
            if value['product'] == 'improvise':
                download(value['source'], work/'source')
            execute(work, value['timeout_seconds'])
            audio = work/'audio.wav'
            from song_duration import LIMITS
            seconds = value['payload'].get('duration_seconds',LIMITS[value['product']]['legacy'])
            with wave.open(str(audio)) as wav:
                if (wav.getframerate(), wav.getnchannels(), wav.getsampwidth(), wav.getnframes()) != (48000, 2, 2, seconds*48000):
                    raise ValueError('Unexpected finished audio')
            data = audio.read_bytes()
            if len(data) != seconds*48000*4+44:
                raise ValueError('Unexpected WAV encoding')
            result_path = work/'result.json'
            if result_path.stat().st_size > 12*1024*1024:
                raise ValueError('Result exceeds budget')
            result = json.loads(result_path.read_text())
            request = urllib.request.Request(value['output_url'], data=data, method='PUT',
                headers={'Content-Type': 'audio/wav', 'Content-Length': str(len(data))})
            with urllib.request.build_opener(NoRedirect).open(request, timeout=120) as response:
                if response.status not in (200, 201, 204):
                    raise ValueError('Storage write failed')
            return {'schema': 'jamloom-runpod-1', 'id': value['id'], 'product': value['product'],
                    'audio_sha256': hashlib.sha256(data).hexdigest(), 'audio_bytes': len(data),
                    'seconds': seconds, **result}
    except GenerationFailure as error:
        raise RuntimeError(f'Jamloom generation failed at {error}; no completed song was accepted.') from None
    except Exception:
        # Provider logs/errors must not contain transcripts, signed URLs or model drafts.
        raise RuntimeError('Jamloom generation failed; no completed song was accepted.') from None


if __name__ == '__main__':
    sys.path.insert(0, str(ROOT/'scripts'))
    import runpod
    runpod.serverless.start({'handler': handler})
