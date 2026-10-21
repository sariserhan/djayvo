"""Prepare pinned CC0 artist recordings, independently of the generative engine."""
import hashlib
import json
from pathlib import Path
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ('extended', 'Extended', '5_extended.wav', 'e71d83f5dba0187618354847fb86ae0f497d1016d1c7ac566a96b5325b75c5e1'),
    ('theories', 'Theories of Everything', '7_t.o.e.wav', '8c4033f4a17de2a19ccdd25e0c2bd95e885912592f2324c474c7384c83cb9b83'),
]

def main():
    cache = ROOT / 'build-academy'; cache.mkdir(exist_ok=True)
    public = ROOT / 'apps/site/public/academy-audio'; public.mkdir(exist_ok=True)
    rows = []
    for identifier, title, filename, expected in SOURCES:
        source = cache / filename; url = 'https://opengameart.org/sites/default/files/' + filename
        if not source.exists():
            with urllib.request.urlopen(url, timeout=60) as response:
                source.write_bytes(response.read(60*1024*1024))
        assert hashlib.sha256(source.read_bytes()).hexdigest() == expected, 'Source checksum mismatch'
        wav = cache / (identifier+'-teaching-v2.wav'); output = public / (identifier+'-v2.mp3')
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(source),'-af',
            'atrim=start=32:duration=64,asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-3:LRA=9,afade=t=in:d=0.015,afade=t=out:st=63.985:d=0.015',
            '-ar','48000','-ac','2','-c:a','pcm_s24le',str(wav)],check=True)
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-c:a','libmp3lame','-b:a','192k',str(output)],check=True)
        log = subprocess.run(['ffmpeg','-hide_banner','-i',str(output),'-af',
            'loudnorm=I=-18:TP=-3:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
        measured = json.JSONDecoder().raw_decode(log[log.rindex('{'):])[0]
        assert float(measured['input_tp']) < -1
        silence = subprocess.run(['ffmpeg','-hide_banner','-i',str(output),'-af','silencedetect=noise=-55dB:d=0.2','-f','null','-'],capture_output=True,text=True,check=True).stderr
        assert 'silence_start:' not in silence, 'Teaching track has an unexpected silent interval'
        rows.append(dict(id=identifier,title=title,artist='Tricks & Traps',url='/academy-audio/'+identifier+'-v2.mp3',
            sha256=hashlib.sha256(output.read_bytes()).hexdigest(),bytes=output.stat().st_size,source_url=url,
            source_sha256=expected,source_page='https://opengameart.org/content/free-rhythm-game-music-pack-2',
            license='CC0-1.0',license_url='https://creativecommons.org/publicdomain/zero/1.0/',
            modifications='32–96 second excerpt, timestamps reset before loudness normalization, 15 ms edge fades, stereo MP3',
            bpm=120,tempo_basis='Author metadata; absolute downbeat and key not independently verified',seconds=64,
            measurements=measured,listening='NOT RUN'))
    manifest=dict(version=2,tracks=rows,rights='Artist upload explicitly CC0, verified 2026-10-21. Course suitability listening and commercial legal review remain open.')
    (public/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (ROOT/'docs/evidence/academy-completion/audio.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (public/'CREDITS.txt').write_text('Extended and Theories of Everything — Tricks & Traps, Different Reality (2021).\n'
        'Source: https://opengameart.org/content/free-rhythm-game-music-pack-2\n'
        'CC0: https://creativecommons.org/publicdomain/zero/1.0/\n'
        'Edits: teaching excerpts, normalization, edge fades, MP3 encoding. No Jamloom AI generation.\n')
    print(json.dumps({'technical':'PASS','tracks':len(rows),'human_listening':'NOT RUN'}))

if __name__ == '__main__':
    main()
