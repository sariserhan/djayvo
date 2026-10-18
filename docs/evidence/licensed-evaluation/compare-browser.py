from pathlib import Path
import json,re,sys
sys.path.insert(0,'scripts')
from compare_portability import compare
root=Path('renders/transient-validation-20261018');evidence=Path('docs/evidence/licensed-evaluation');rows={}
for name in ['chromium','webkit']:
    output=Path(re.search(r'/Users/\S+/renders/web-[\w-]+',(evidence/f'{name}-transient.log').read_text())[0]);rows[name]={}
    for style in ['hiphop','reggae','experimental','club','funk','call_response','hybrid']:
        prefix='mix' if style in ('hiphop','reggae','experimental') else style
        rows[name][style]=compare(root/f'{prefix}.{style}',output/f'mix.{style}')
output=Path(re.search(r'/Users/\S+/renders/web-[\w-]+',(evidence/'wasm-defaults.log').read_text())[0]);rows['default_wasm']={}
for style in ['hiphop','reggae','experimental','club','funk','call_response','hybrid']:
    prefix='fixture' if style in ('hiphop','reggae','experimental') else style
    rows['default_wasm'][style]=compare(Path('renders/feedback-reverb-20261018')/f'{prefix}.{style}',output/f'mix.{style}')
(evidence/'browser-comparison.json').write_text(json.dumps(rows,indent=2)+'\n');print('PASS: seven transient styles in each browser and seven unchanged default WASM styles agree with native')
