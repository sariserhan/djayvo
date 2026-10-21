"""Rebuild the full-length, CC0 practice catalogue from pinned artist uploads."""
import hashlib
import json
from pathlib import Path
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ('funked-up', 'Funked Up', 'Joth', 'Funk / rock', 'Funked%20Up.mp3',
     '57cd81254a0f4e068535c5421f93b586514332ad2377f81aea190dd91659fff3', 'funked-up'),
    ('wednesday-night', 'Wednesday Night', 'Zane Little Music', 'Funk fusion', 'wednesday_night_0.mp3',
     '6187f62385f94db5feda3360da6309d90664c5410dda1351f837f978df2c5861', 'wednesday-night-funk-fusion'),
    ('rhythm-garden', 'Rhythm Garden', 'congusbongus', 'Electronic / dance', 'rhythm_garden_0.ogg',
     'c4800b0c891ce0c4cf670bd821d3d237d294f32bf0546276e56cd4e82bcecfb3', 'rhythm-garden'),
]


def main():
    cache = ROOT / 'build-academy/practice'
    public = ROOT / 'apps/web/practice-audio'
    cache.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)
    rows = []
    for identifier, title, artist, genre, filename, expected, page in SOURCES:
        source = cache / (identifier + Path(filename).suffix)
        url = 'https://opengameart.org/sites/default/files/' + filename
        if not source.exists():
            with urllib.request.urlopen(url, timeout=60) as response:
                data = response.read(32 * 1024 * 1024 + 1)
            assert len(data) <= 32 * 1024 * 1024, 'Source too large'
            assert hashlib.sha256(data).hexdigest() == expected, 'Source checksum mismatch'
            source.write_bytes(data)
        assert hashlib.sha256(source.read_bytes()).hexdigest() == expected, 'Source checksum mismatch'
        output = public / (identifier + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(source), '-map_metadata', '-1',
            '-af', 'loudnorm=I=-18:TP=-3:LRA=9', '-ar', '48000', '-ac', '2',
            '-c:a', 'libmp3lame', '-b:a', '160k', str(output)], check=True)
        info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-of', 'json', str(output)]))
        log = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(output), '-af',
            'loudnorm=I=-18:TP=-3:LRA=9:print_format=json', '-f', 'null', '-'], capture_output=True, text=True, check=True).stderr
        measured = json.JSONDecoder().raw_decode(log[log.rindex('{'):])[0]
        assert float(measured['input_tp']) < -1, 'Insufficient encoded peak headroom'
        rows.append(dict(id=identifier, title=title, artist=artist, genre=genre,
            url='./practice-audio/' + output.name, bytes=output.stat().st_size,
            sha256=hashlib.sha256(output.read_bytes()).hexdigest(), seconds=float(info['format']['duration']),
            source_url=url, source_sha256=expected, source_page='https://opengameart.org/content/' + page,
            license='CC0-1.0', license_url='https://creativecommons.org/publicdomain/zero/1.0/',
            verified='2026-10-21', modifications='Full-length; loudness normalized; stereo 48 kHz 160 kbps MP3',
            bpm=None, tempo_basis='Use Tap tempo; BPM, key and beat grid not independently verified',
            measurements=measured, human_listening='NOT RUN'))
    assert sum(row['bytes'] for row in rows) < 10 * 1024 * 1024
    manifest = dict(version=1, tracks=rows, purpose='User playback and mixing practice; not a training dataset')
    (public / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (public / 'CREDITS.txt').write_text('Jamloom practice library — artist uploads marked CC0, checked 2026-10-21.\n'
        'CC0 permits copying, modification, distribution and commercial performance.\n'
        'No artist endorsement is implied. No AI training performed.\n\n' + '\n\n'.join(
        f"{r['title']} — {r['artist']}\nSource: {r['source_page']}\nLicense: {r['license_url']}\nEdits: {r['modifications']}" for r in rows) + '\n')
    print(json.dumps({'gate': 'PASS', 'tracks': len(rows), 'bytes': sum(r['bytes'] for r in rows),
        'ffmpeg': subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0]}))


if __name__ == '__main__':
    main()
