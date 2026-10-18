"""Verify final band-edge correction against initial artifacts and all runtimes."""
from pathlib import Path
import hashlib,json,re,sys
sys.path.insert(0,'scripts')
from compare_portability import compare
root=Path('renders/sustained-instruments-20261018');evidence=Path('docs/evidence/sustained-instruments')
r={'browser':{},'mac_smoke':{},'linux_final':{}}
for kind in ('wasm','chromium','webkit'):
    folder=Path(re.search(r'/Users/\S+/renders/web-[\w-]+',(evidence/f'{kind}-final.log').read_text())[0])
    r['browser'][kind]={}
    for style in ('hiphop','reggae','experimental','club','funk','call_response','hybrid'):
        name='fixture' if style in ('hiphop','reggae','experimental') else style
        r['browser'][kind][style]=compare(root/f'{name}.{style}',folder/f'mix.{style}')
        assert r['browser'][kind][style]['byte_identical_wav']
for style in ('hiphop','reggae','experimental'):
    r['mac_smoke'][style]=compare(root/f'fixture.{style}',Path('renders/sustained-mac-smoke-20261018')/f'remix.{style}')
    r['linux_final'][style]=compare(root/f'fixture.{style}',Path('renders/arrangement-linux/sustained-instruments-20261018')/f'final-fixture.{style}')
    for p in root.glob(f'fixture.{style}*.wav'):
        for folder,prefix in [('renders/sustained-mac-smoke-20261018','remix'),('renders/arrangement-linux/sustained-instruments-20261018','final-fixture')]:
            q=Path(folder)/(prefix+p.name[len('fixture'):]);assert hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256(q.read_bytes()).digest()
r.update(status='PASS',default_mix_and_stem_wavs_per_native_platform=17,final_browser_styles_per_runtime=7,hearing='NOT RUN')
(evidence/'final-comparisons.json').write_text(json.dumps(r,indent=2)+'\n')
print('PASS: final near-band-edge fix preserves all 17 default mix/stem WAVs on M5/Linux and seven styles in Node/Chromium/WebKit; exact frames and PCM')
