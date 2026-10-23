"""Execute the existing musical pipelines inside an isolated worker job directory."""
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scripts'))


def run(work):
    payload = json.loads((work/'request.json').read_text())
    from song_duration import LIMITS
    payload.setdefault('duration_seconds',LIMITS[(work/'product.txt').read_text()]['legacy'])
    if (work/'product.txt').read_text() == 'music-dna':
        import music_dna_song
        from dna_direction import direction_for
        from singing_response import digest
        request = {**payload, 'direction': direction_for(music_dna_song.favorites(payload['profile']))}
        (work/'input.json').write_text(json.dumps(request))
        music_dna_song.run(work)
        if json.loads((work/'status.json').read_text())['state'] != 'completed':
            raise ValueError('Song did not pass the style check')
        fit = json.loads((work/'fit.json').read_text())
        if not fit['accepted'] or fit['audio_sha256'] != digest(work/'singer/singer.wav'):
            raise ValueError('Song receipt mismatch')
        shutil.copyfile(work/'singer/singer.wav', work/'audio.wav')
        performance=json.loads((work/'singer/complete.json').read_text())
        if performance['audio_sha256']!=fit['audio_sha256']:raise ValueError('Singer receipt mismatch')
        result = {'plan': json.loads((work/'plan.json').read_text()), 'fit': fit,
                  'performance': {'audio_sha256':performance['audio_sha256'],'vocal_identity':performance.get('vocal_identity')}}
    else:
        import singer_studio
        singer_studio.OUTPUT = work/'improvise'
        _, audio, lyrics, _, _ = singer_studio.make_reply(str(work/'source'), payload.get('phrase', ''),
            payload['voice'], payload['genre'], payload['consent'], payload['duration_seconds'])
        shutil.copyfile(audio, work/'audio.wav')
        result = {'lyrics': lyrics, 'arrangement': json.loads(Path(audio).with_name('complete.json').read_text())}
    (work/'result.json').write_text(json.dumps(result, allow_nan=False))


if __name__ == '__main__':
    run(Path(sys.argv[1]).resolve())
