#!/usr/bin/env python3
"""One bounded synthetic R1 demonstration; no recordings, training or listening claims."""
import argparse
import array
import copy
import csv
from fractions import Fraction
import math
from pathlib import Path
import platform
import subprocess
import tempfile
from types import SimpleNamespace
import wave

import demonstrations as d


def pcm(path):
    with wave.open(str(path), 'rb') as f:
        samples = array.array('h', f.readframes(f.getnframes()))
    if __import__('sys').byteorder != 'little': samples.byteswap()
    return samples


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--renderer', type=Path, default=d.ROOT/'build-jamloom/jamloom_remix')
    args = parser.parse_args()
    output = args.output.absolute()
    output.relative_to(d.ROOT/'renders')
    if '..' in output.parts or any(p.is_symlink() for p in (output, *output.parents)):
        raise ValueError('choose a new non-symlink directory under renders')
    output.mkdir(exist_ok=False)
    hiphop = d.load(d.ROOT/'docs/evidence/r0/hiphop.plan.json')['execution']
    reggae = d.load(d.ROOT/'docs/evidence/r0/reggae.plan.json')['execution']
    reggae['schema_version'] = '1.7-remix'
    d.write_json(output/'initial.json', hiphop)
    trace = output/'trace-0.json'
    d.start(SimpleNamespace(plan=output/'initial.json', ledger=d.ROOT/'datasets/examples/r1-ledger.json',
        record='r1_synthetic_test', renderer=args.renderer, actor='automated_test', output=trace))
    track = copy.deepcopy(reggae['tracks'][0])
    track['events'][0]['velocity'] = 48
    track['automation'] = [{'start_tick':0,'gain_db':track['gain_db'],'pan':track['pan']},
                           {'start_tick':7680,'gain_db':track['gain_db']-3,'pan':.1}]
    actions = [
        {'kind':'candidate','value':reggae,'reason':'Select offbeat arrangement as a test decision'},
        {'kind':'note','track':0,'index':0,'value':track['events'][0], 'reason':'Soften opening organ note'},
        {'kind':'track','index':0,'value':track,'reason':'Ramp organ gain and pan after opening'},
        {'kind':'slice','index':1,'value':{**reggae['voice_clips'][1],
            'end_frame':reggae['voice_clips'][1]['end_frame']+1},'reason':'Exercise frame-accurate slice adjustment'},
        {'kind':'vocal','index':1,'value':{**reggae['voice_events'][1],'pan':.1},'reason':'Move chopped voice toward center'},
        {'kind':'mix','value':{**reggae['mix'],'instrument_room_mix':.1},'reason':'Reduce instrument room amount'},
    ]
    for i, action in enumerate(actions, 1):
        action_path, next_trace = output/f'action-{i}.json', output/f'trace-{i}.json'
        d.write_json(action_path, action)
        d.edit(SimpleNamespace(trace=trace, action=action_path, output=next_trace))
        trace = next_trace
    captured, record, final, _, proof = d.audited(trace, output/'performance', 512)
    with tempfile.TemporaryDirectory(prefix='jamloom-r1-replay-') as folder:
        replay_prefix = Path(folder)/'performance'
        _, _, _, _, replay = d.audited(trace, replay_prefix, 113)
        samples, repeated = pcm(output/'performance.reggae.wav'), pcm(str(replay_prefix)+'.reggae.wav')
        if samples != repeated: raise ValueError('PCM replay mismatch')
    expected, note_id = [], 0
    for track in final['tracks']:
        for event in track['events']:
            for kind, tick in (('on',event['start_tick']), ('off',event['start_tick']+event['duration_ticks'])):
                exact = Fraction(tick*final['sample_rate']*60000, 960*final['tempo_milli_bpm'])
                frame = (exact.numerator*2+exact.denominator)//(2*exact.denominator)
                expected.append((frame,kind,note_id,track['instrument'],event['note']))
            note_id += 1
    expected.sort(key=lambda e:(e[0],e[1]=='on',e[2]))
    with (output/'performance.reggae.events.tsv').open() as f:
        actual = [(int(r['frame']),r['kind'],int(r['id']),r['instrument'],int(r['pitch']))
                  for r in csv.DictReader(f,delimiter='\t')]
    if expected != actual: raise ValueError('independent frame calculation mismatch')
    original = pcm(d.ROOT/'renders/r0-final-evaluation/rules.reggae.wav')
    if len(original) != len(samples): raise ValueError('comparison length mismatch')
    differences = [int(a)-int(b) for a,b in zip(samples,original)]
    dataset = d.export([trace], output/'examples.jsonl')
    if d.check_export(output/'examples.jsonl') != dataset: raise ValueError('dataset recheck mismatch')
    environment = {'platform':platform.platform(),'machine':platform.machine(),'python':platform.python_version()}
    if platform.system() == 'Darwin':
        environment['cpu'] = subprocess.check_output(['sysctl','-n','machdep.cpu.brand_string'],text=True).strip()
    report = {'status':'PASS','scope':'automated offline capture/replay, not expert or musical-quality evidence',
        'environment':environment,'policy_sha256':d.policy_digest(),'engine':d.reference(args.renderer),
        'master_sha256':d.digest(d.ROOT/'ai_improvisational_musician_master_spec_v1.md'),
        'source_sha256':record['asset']['sha256'],'trace':d.reference(trace),'dataset':dataset,
        'actions':[a['kind'] for a in actions],'render':proof,
        'replay':{'block_sizes':[512,113],'exact_wav':proof['wav_sha256']==replay['wav_sha256'],
            'pcm_max_error':0,'pcm_rms_error':0,'exact_events':proof['events_sha256']==replay['events_sha256'],
            'independent_instrument_events':len(actual),'independent_event_frames':'PASS'},
        'change_from_r0_reggae':{'max_pcm16_difference':max(abs(x) for x in differences),
            'rms_pcm16_difference':math.sqrt(sum(x*x for x in differences)/len(differences)),
            'interpretation':'Audio changed; musical improvement NOT RUN'},
        'human_listeners':0,'human_expert_examples':0,'model_training':'NOT RUN','paid_services_usd':0,
        'retained_wav_files':1}
    d.write_json(output/'evidence.json', report)
    print(__import__('json').dumps(report,indent=2))


if __name__ == '__main__': main()
