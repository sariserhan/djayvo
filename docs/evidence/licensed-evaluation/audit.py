"""Audit all frozen attempts and blind packets; never generate human ratings."""
from pathlib import Path
import csv,hashlib,json,sys
sys.path.insert(0,'scripts')
from verify_export import verify_export
root=Path('renders/licensed-evaluation-validated-20261018')
report=json.loads((root/'report.json').read_text());freeze=json.loads((root/'freeze.json').read_text())
assert hashlib.sha256((root/'freeze.json').read_bytes()).hexdigest()==report['freeze_sha256']
assert freeze['training_authorized'] is False and freeze['distribution_authorized'] is False
shapes={};packet_count=0;audio_count=0;keys=set();sources={c['id']:c for c in freeze['dataset']['clips']}
for row in report['records']:
    folder=root/row['clip_id']/str(row['seed']);clip=sources[row['clip_id']]
    if row['kind']=='silence':
        assert clip['source_kind']=='synthetic' and row['expected_rejection']=='PASS';continue
    # Never silently omit failed attempts from the technical denominator.
    if row['packet']!='PASS':continue
    for prefix,styles in [('remix',('hiphop','reggae','experimental')),('control',('baseline',))]:
        verify_export(folder/prefix,styles)
        for style in styles:
            plan=json.loads((folder/f'{prefix}.{style}.score.json').read_text());audio_count+=1
            assert plan['source']['sha256']==clip['sha256']
            if style!='baseline':
                assert sum(e['clean'] for e in plan['voice_events'])>=2
                # Normalize tonic and omit instrument choice, velocity, sample take, voice and intro.
                shape=sorted((e['start_tick'],e['duration_ticks'],e['note']-plan['key']['tonic_midi'])
                    for t in plan['tracks'] for e in t['events'] if 7680<=e['start_tick']<23040)
                shapes.setdefault((row['clip_id'],style),set()).add(hashlib.sha256(json.dumps(shape).encode()).hexdigest())
    listener=folder/'blinded/listener';key=json.loads((folder/'blinded/organizer-key.json').read_text())
    assert key['block_id'] not in keys;keys.add(key['block_id']);packet_count+=1
    assert (listener/'ATTRIBUTION.txt').read_text().startswith(clip['license']['attribution'])
    page=(listener/'index.html').read_text();assert page.count('<audio ')==5
    assert all(s not in page for s in ('hiphop','reggae','experimental','baseline','organizer-key'))
    for name,known in [('responses.csv',{'clip_id','block_id','code'}),('pairs.csv',{'clip_id','block_id','left_code','right_code'})]:
        for answer in csv.DictReader((listener/name).open()):assert all(not v for k,v in answer.items() if k not in known)
    for code,identity in key['codes'].items():assert hashlib.sha256((listener/(code+'.wav')).read_bytes()).hexdigest()==identity['sha256']
summary={'technical_batch':report['status'],'dataset_readiness':report['dataset_readiness'],
    'repository_commit':freeze['repository_commit'],'freeze_sha256':report['freeze_sha256'],'source_clips':len(sources),
    'rendered_mix_wavs':audio_count,'blind_packets':packet_count,'human_ratings':0,
    'per_style_technical_counts':report['per_style_technical_counts'],
    'source_style_unique_shapes':{clip+':'+style:len(values) for (clip,style),values in shapes.items()},
    'shape_scope':'Three fixed seeds; four-bar event structures normalized by tonic, ignoring instrument/voice/velocity/take. Not perceptual novelty.',
    'listening':'NOT RUN','production_quality':'PARTIAL','attribution_and_blank_forms':'PASS'}
Path('docs/evidence/licensed-evaluation/audit.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='source_style_unique_shapes'},indent=2))
assert report['status']=='PASS','Technical batch has retained failures; investigate all attempts'
