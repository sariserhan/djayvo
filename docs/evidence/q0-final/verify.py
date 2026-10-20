#!/usr/bin/env python3
"""Revalidate Q0 delivery without rerendering or rewriting historical evidence."""
import argparse
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
from q0_audit import digest, inputs
from q0_listening_results import summarize
from q0_measure_comparisons import timing
from verify_export import verify_export

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
if args.output.exists():raise ValueError('Preserve existing verification; choose fresh output')
def read(name):return json.loads((ROOT/name).read_text())
checked={}
def check(path,sha):
    if str(path) not in checked:
        assert digest(ROOT/path)==sha,path
        checked[str(path)]=sha
    else:assert checked[str(path)]==sha,path
rights=inputs()
assert len(rights)==5
for r in read('docs/evidence/q0/audio-inventory.json'):check(Path(r['file']),r['sha256'])
for trial,report in [('q0-performance-20261020','q0-performance'),('q0-development-v2-20261020','q0-development')]:
    for name,sha in read(f'docs/evidence/{report}/measurements.json')['trial_file_sha256'].items():
        check(Path('renders')/trial/name,sha)
    result=summarize(ROOT/'renders'/trial,[])
    assert result['candidate_ratings']==0
correction=read('docs/evidence/q0-motif-completion/report.json')
for name,sha in correction['artifact_sha256'].items():check(Path(correction['output'])/name,sha)
check(Path('scripts/q0_development.py'),correction['planner_sha256'])
for name,sha in read('docs/evidence/q0-development/measurements.json')['preserved_sha256'].items():check(Path(name),sha)
for report,folder in [('q0-performance/wasm-report.json','q0-performance-wasm-v3-20261020'),
                      ('q0-followup/linux-report.json','arrangement-linux/q0-performance-20261020'),
                      ('q0-development/wasm-report.json','q0-development-wasm-20261020'),
                      ('q0-development/linux-report.json','arrangement-linux/q0-development-20261020'),
                      ('q0-motif-completion/linux-report.json','arrangement-linux/q0-motif-completion-20261020')]:
    for name,sha in read('docs/evidence/'+report)['files_sha256'].items():check(Path('renders')/folder/name,sha)
rows=[]
for record in read('renders/q0-performance-20261020/report.json')['records']:
    ident,style=record['id'],record['style']
    events=0
    for arm in 'ABCDE':
        folder=ROOT/'renders'/('q0-baseline-v2-20261020' if arm=='A' else 'q0-performance-20261020')/ident
        verify_export(folder/arm,(style,))
        events+=timing(json.loads((folder/f'{arm}.{style}.score.json').read_text()),folder/f'{arm}.{style}.events.tsv')['events']
    corrected=next(r for r in correction['rows'] if r['id']==ident)['plan_changed']
    folder=ROOT/'renders'/('q0-motif-completion-v2-20261020' if corrected else 'q0-development-v2-20261020')/ident
    verify_export(folder/'candidate',(style,))
    final=timing(json.loads((folder/f'candidate.{style}.score.json').read_text()),folder/f'candidate.{style}.events.tsv')
    rows.append({'id':ident,'five_condition_events':events,'latest_candidate':str(folder.relative_to(ROOT)),
                 'latest_event_check':final})
feedback=read('docs/evidence/q0-final/owner-feedback.json')
packet=read('renders/q0-development-v2-20261020/listener/packet.json')
assert feedback['packet_id']==packet['packet_id']
for name,sha in feedback['audio_sha256'].items():assert sha==packet['audio_sha256'][name]
assert feedback['answer']=='Both still bad' and feedback['substantial_improvement_gate']=='FAIL'
assert not next(r for r in correction['rows'] if r['id']=='owner-speech')['plan_changed']
result={'artifact_verification':'PASS','quality_gate':'FAIL','formal_independent_study':'NOT RUN',
        'checked_files':len(checked),'source_count':len(rights),'records':rows,
        'feedback_sha256':digest(ROOT/'docs/evidence/q0-final/owner-feedback.json'),
        'limits':'Revalidation of existing execution artifacts, not new platform execution or listening. No invented ratings or benchmark changes.'}
with args.output.open('x') as f:json.dump(result,f,indent=2);f.write('\n')
print(f'PASS: {len(checked)} retained file hashes, five authorized inputs, 25 five-condition exports and five latest candidate exports; final quality FAIL from actual owner feedback')
