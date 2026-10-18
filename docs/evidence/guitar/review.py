"""Add level-matched pre-guitar controls and raw guitar stems without replacing files."""
from pathlib import Path
import json,subprocess,sys
sys.path.insert(0,'scripts')
from review_cloud_music import loudness
root=Path('renders/guitar-20261018');review=root/'review'
path=Path('docs/evidence/guitar/measurements.json');report=json.loads(path.read_text())
html=(review/'index.html').read_text()
for name,item in report['matched_review'].items():
    style='funk' if '-funk-' in name else 'hybrid';seed=name.rsplit('-',1)[1]
    old=Path('renders/funk-20261018')/f'owner-{seed}.funk.wav' if style=='funk' else Path('renders/creative-strategies-20261018')/f'{name}.hybrid.wav'
    target=item['matched']['lufs'];level=loudness(old);out=review/f'{name}-before.wav'
    subprocess.run(['ffmpeg','-v','error','-n','-i',str(old),'-af',f"volume={target-level['lufs']}dB",'-c:a','pcm_s16le',str(out)],check=True)
    measured=loudness(out);assert abs(measured['lufs']-target)<=.2 and measured['true_peak_dbfs']<=-1.8
    item['before']={'source':str(old),'original':level,'matched':measured}
    marker=f'<p>Voice alone · original level</p><audio controls preload="metadata" aria-label="{name} voice"'
    html=html.replace(marker,f'<p>Previous version · matched level</p><audio controls preload="metadata" aria-label="{name} before" src="{name}-before.wav"></audio>'
        f'<p>Guitar alone · original level</p><audio controls preload="metadata" aria-label="{name} guitar" src="../{name}.{style}.guitar.wav"></audio>'+marker)
(review/'index.html').write_text(html);path.write_text(json.dumps(report,indent=2)+'\n')
print('PASS: eight matched before/after pairs, guitar and unchanged voice stems; listening NOT RUN')
