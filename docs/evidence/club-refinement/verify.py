#!/usr/bin/env python3
"""Independent snapshot checks against actual native/Linux exports; no listening claims."""
from pathlib import Path
import hashlib
import json
import math
import sys
import wave
import numpy as np
from scipy.signal import butter, sosfilt
import jsonschema
sys.path.insert(0,str(Path('scripts').resolve()))
from compare_portability import compare
from inspect_wav import inspect
from verify_export import verify_export

out=Path('docs/evidence/club-refinement')
root=Path('renders/voice-club-v8/final');linux=Path('renders/arrangement-linux/club-v8')
def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def pcm(path):
    with wave.open(str(path),'rb') as f:
        return f.getframerate(),np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,f.getnchannels()).astype(np.float64)/32768

def difference(a,b):
    ar,x=pcm(a);br,y=pcm(b);assert ar==br and x.shape==y.shape
    delta=x-y;maximum=float(np.max(np.abs(delta)));rms=float(np.sqrt(np.mean(delta*delta)))
    assert maximum<=.001 and rms<=.0001
    return {'status':'PASS','maximum_pcm_error':maximum,'rms_pcm_error':rms,'byte_identical_wav':digest(a)==digest(b)}

protected={
    'ai_improvisational_musician_master_spec_v1.md':'389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2',
    'renders/fixtures/synthetic-speech.wav':'c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e',
    'renders/voice-20261017-221411/source-pcm.wav':'7b23204717e1f114ebb25821ba4847416af336278fc0ee22275481d330950427',
    str(Path.home()/'Downloads/djayvo-my-voice.m4a'):'24059b23a8a9b6f0de55b5854feee81675c31cbf92b305ce5dac5052a0547ec4',
    str(Path.home()/'Downloads/blood_club.mp3'):'12cad3d3b5d66383d69207630d09d66d5203d963ab48d0f0ade7d1ee32672188',
}
for path,expected in protected.items():assert digest(path)==expected,path
schemas={n:json.loads(Path(f'schemas/{n}.schema.json').read_text()) for n in ('remix-plan','export-completion')}
exports=[]
for directory,prefixes in [(root,('remix','seed4124','seed4125','block113','fixture','legacy')),
                           (linux,('owner','seed4124','seed4125','fixture','legacy')),
                           (Path('renders/voice-club-v8/mac-fixture'),('remix',))]:
    for prefix in prefixes:
        record=verify_export(directory/prefix);jsonschema.validate(record,schemas['export-completion'])
        for item in record['artifacts']:
            if item['suffix'].endswith('.score.json'):
                jsonschema.validate(json.loads(Path(str(directory/prefix)+item['suffix']).read_text()),schemas['remix-plan'])
        exports.append({'prefix':str(directory/prefix),'status':'PASS','artifacts':len(record['artifacts'])})
comparisons={};stems={}
for label,a,b in [('owner',linux/'owner',root/'remix'),('fixture',linux/'fixture',root/'fixture'),
                  ('seed4124',linux/'seed4124',root/'seed4124'),('seed4125',linux/'seed4125',root/'seed4125'),
                  ('block113',root/'remix',root/'block113')]:
    comparisons[label]=compare(str(a)+'.club',str(b)+'.club')
    if label in ('owner','fixture','block113'):
        for stem in ('piano','bass','drums','vocals'):
            stems[label+'.'+stem]=difference(str(a)+f'.club.{stem}.wav',str(b)+f'.club.{stem}.wav')
legacy={};reconstruction={}
def reconstruction_error(prefix):
    rate,master=pcm(str(prefix)+'.wav')
    summed=sum(pcm(str(prefix)+'.'+stem+'.wav')[1] for stem in ('piano','bass','drums','vocals'))
    error=master-summed
    return {'maximum_pcm_error':float(np.max(np.abs(error))),'rms_pcm_error':float(np.sqrt(np.mean(error*error)))}
for style in ('hiphop','reggae','experimental'):
    legacy[style]=compare(f'renders/voice-articulation-v4/remix.{style}',str(root/f'legacy.{style}'))
    reconstruction[style]={'previous':reconstruction_error(f'renders/voice-articulation-v4/remix.{style}'),
                           'current':reconstruction_error(root/f'legacy.{style}')}
    comparisons['legacy-fixture-'+style]=compare(str(linux/f'legacy.{style}'),f'renders/voice-club-v8/mac-fixture/remix.{style}')
    for stem in ('piano','bass','drums','vocals'):
        stems['legacy-fixture-'+style+'.'+stem]=difference(str(linux/f'legacy.{style}.{stem}.wav'),f'renders/voice-club-v8/mac-fixture/remix.{style}.{stem}.wav')
reconstruction['club']={'previous':reconstruction_error('renders/voice-club-v7/final/remix.club'),
                        'current':reconstruction_error(root/'remix.club')}
for r in reconstruction.values():assert r['current']['maximum_pcm_error']<=2/32768
measurements={p.name:inspect(p) for p in root.glob('*.club*.wav') if not p.name.startswith('block113')}
for m in measurements.values():assert m['full_scale_samples']==0 and m['last_100ms_peak']==0 and m['peak_dbfs']<=-1
plan=json.loads((root/'remix.club.score.json').read_text());rate,audio=pcm(root/'remix.club.wav')
low=sosfilt(butter(4,[20,150],btype='bandpass',fs=rate,output='sos'),audio.mean(axis=1))
sections=[]
for s in plan['sections']:
    start=round(s['start_bar']*4*60/140*rate);end=round((s['start_bar']+s['bars'])*4*60/140*rate)
    region=audio[start:end];power=float(np.mean(region*region));mono=region.mean(axis=1)
    sections.append({**s,'start_seconds':start/rate,'rms_dbfs':10*math.log10(max(power,1e-30)),
                     'mono_20_150hz_energy_fraction':float(np.mean(low[start:end]**2)/max(np.mean(mono**2),1e-30))})
_,source=pcm('renders/voice-20261017-221411/source-pcm.wav');source=source.mean(axis=1)
_,voice=pcm(root/'remix.club.vocals.wav');hook_errors=[]
for event in plan['voice_events']:
    if not event['clean']:continue
    clip=plan['voice_clips'][event['clip_id']]
    assert clip['start_frame']==0 and clip['end_frame']==len(source)
    start=round(event['start_tick']*rate*60000/(140000*960))
    gain=10**(event['gain_db']/20)*plan['analysis']['normalization_gain']*2**-.5
    x=voice[start:start+len(source),0][200:-200];expected=source[200:-200]*gain
    error=float(np.max(np.abs(x-expected)));assert error<2/32768
    hook_errors.append(error)
assert len(hook_errors)==2
reports=[json.loads((root/f'{prefix}.club.report.json').read_text()) for prefix in ('remix','seed4124','seed4125','fixture')]
assert all(r['instrument_bank']=='electronic-v2' and r['limited_samples']==r['nonfinite_samples']==0 for r in reports)
env=json.loads((out/'environment.json').read_text())
assert env['system']=='Darwin' and env['machine']=='arm64' and 'Apple M5' in env['cpu_brand']
test_logs=('release-final-tests.log','linux-tests-renders.log','sanitizer-tests.log')
for log in test_logs:assert '100% tests passed' in (out/log).read_text()
assert json.loads((out/'browser-playback.json').read_text())['media_decode_seek_and_muted_playback']=='PASS'
source_files=sorted(p for folder in ('core','tools','scripts','schemas','tests') for p in Path(folder).rglob('*')
                    if p.suffix in ('.cpp','.c','.h','.inc','.py','.json') and '__pycache__' not in str(p))
result={'gates':{'m5_execution':'PASS','linux_arm64_execution':'PASS','native_release_suites':'PASS',
    'asan_ubsan_suites':'PASS','linux_release_suites':'PASS','audition_playback':'PASS','plans_and_event_frames':'PASS',
    'waveform_comparison':'PASS','original_style_masters_preserved':'PASS','stem_identity_and_reconstruction':'PASS','bounds_and_clean_hooks':'PASS',
    'schemas_and_export_hashes':'PASS','protected_inputs_unchanged':'PASS','club_listening':'NOT RUN',
    'reference_style_similarity':'NOT RUN','production_quality':'PARTIAL','formal_m1':'NOT RUN','iphone':'NOT RUN','release':'NOT RUN'},
    'environment':env,'comparisons':comparisons,'stem_comparisons':stems,'legacy_regression':legacy,'stem_reconstruction':reconstruction,
    'musical_changes':{'bass_drums_implementation':'PASS','transitions_implementation':'PASS','vocal_selection_implementation':'PASS',
                       'bass_drums_listening':'NOT RUN','transitions_listening':'NOT RUN','vocal_clarity_listening':'NOT RUN'},
    'measurements':measurements,'sections':sections,'clean_hook_maximum_pcm_errors':hook_errors,
    'exports':exports,'protected_input_hashes':protected,'engine_binary_sha256':digest('build-mac/djayvo_remix'),
    'vocal_candidates':plan['voice_clips'],'vocal_event_count':len(plan['voice_events']),
    'instrument_manifest_sha256':digest('assets/manifests/electronic-v2.json'),
    'verification_logs':list(test_logs),'source_file_sha256':{str(p):digest(p) for p in source_files}}
(out/'report.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'gates':result['gates'],'sections':sections,'clean_hook_maximum_pcm_errors':hook_errors},indent=2))
