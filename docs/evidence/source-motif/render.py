"""Render fresh source-phrase comparisons; existing recordings are never replaced."""
import argparse
from pathlib import Path
import subprocess

root=Path(__file__).resolve().parents[3]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--renderer',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--plans',type=Path,help='Replay previous call-response plans')
args=parser.parse_args()
args.output.mkdir(parents=True,exist_ok=False)
cases=[(f'owner-{seed}','call_response',seed,'renders/voice-20261017-221411/source-pcm.wav','--consent')
       for seed in range(4123,4127)]
cases += [(style if style!='all' else 'fixture',style,4123,'renders/fixtures/synthetic-speech.wav','--synthetic-fixture')
          for style in (('call_response',) if args.plans else ('all','club','funk','baseline','call_response','hybrid'))]
for name,style,seed,source,permission in cases:
    command=[str(args.renderer.resolve()),'--input',str(root/source),permission,'--style',style,
             '--seed',str(seed),'--stems','--output',str(args.output/name)]
    if args.plans:command+=['--plan',str(args.plans/f'{name}.{style}.score.json')]
    subprocess.run(command,check=True)
print(f'PASS: {len(cases)} exports in {args.output}')
