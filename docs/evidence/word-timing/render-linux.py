from pathlib import Path
import subprocess
root=Path('/out/word-timing-20261018/aligned');root.mkdir()
for style in ('hiphop','reggae','experimental','club'):
    subprocess.run(['/work/reverb/build/djayvo_remix','--input','/src/renders/voice-20261017-221411/source-pcm.wav','--consent',
        '--style',style,'--plan',f'/src/renders/word-timing-20261018/{style}-aligned.json','--stems',
        '--output',str(root/style)],check=True)
