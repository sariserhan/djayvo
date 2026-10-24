"""Local rhythm audition using an existing authorized phrase; not a serving default."""
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
import numpy as np
from arrange_voice_research import RATE,digest,read_pcm,write_pcm
from source_led_response import faded,rendered,stem
from assemble_sung_response import beat_grid
from local_call_edit import arrangement_options,edit,mix_calls,replace_vocal


def retime(pcm,ratio):
    if (pcm.ndim!=2 or pcm.shape[1]!=2 or not .35*RATE<=len(pcm)<=5*RATE
            or not np.isfinite(pcm).all() or not np.isfinite(ratio) or not .8<=ratio<=1.25):
        raise ValueError('Expected bounded finite source and duration ratio')
    result=subprocess.run(['ffmpeg','-v','error','-nostdin','-f','f32le','-ar',str(RATE),'-ac','2',
        '-i','pipe:0','-af',f'atempo={1/ratio:.12f}','-f','f32le','pipe:1'],
        input=pcm.astype('<f4').tobytes(),capture_output=True,check=True,timeout=30)
    output=np.frombuffer(result.stdout,dtype='<f4').reshape(-1,2).astype(np.float64)
    frames=round(len(pcm)*ratio)
    if not np.isfinite(output).all() or abs(len(output)-frames)>.08*RATE:
        raise ValueError('Tempo transform failed its finite/duration check')
    # shortcut: short atempo endpoint error is padded/faded; upgrade if listening exposes lost consonants.
    output=np.pad(output,((0,max(0,frames-len(output))),(0,0)))[:frames]
    return faded(output)


def main():
    out=Path(sys.argv[1] if len(sys.argv)>1 else 'renders/improvise-rhythm-20261023')
    out.mkdir(parents=True,exist_ok=False)
    # Measured test tone checks pitch separately from duration; it is not identity evidence.
    t=np.arange(2*RATE)/RATE
    test=faded(np.repeat((.1*np.sin(2*np.pi*180*t))[:,None],2,axis=1));saved=test.copy()
    for ratio in (.8,1.,1.25):
        transformed=retime(test,ratio)
        assert len(transformed)==round(len(test)*ratio)
        hz=np.fft.rfftfreq(len(transformed),1/RATE)[np.argmax(abs(np.fft.rfft(transformed[:,0])))]
        assert abs(hz-180)<2 and np.isfinite(transformed).all()
    np.testing.assert_array_equal(test,saved)
    for bad in (.79,1.26,float('nan')):
        try:retime(test,bad)
        except ValueError:pass
        else:raise AssertionError('Invalid duration ratio accepted')
    original=ROOT/'renders/meaning-singer-trial-20261022/original-recording'
    sha=digest(original);decoded=out/'decoded.wav'
    if sha!=json.loads((ROOT/'docs/evidence/improvise-reggae-revision/studio.json').read_text())['source_sha256']:
        raise ValueError('Original recording differs from the reviewed source')
    subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(original),'-ar',str(RATE),'-ac','2',
                    '-c:a','pcm_s16le',str(decoded)],check=True,timeout=30)
    pcm=read_pcm(decoded,(6,6))
    # ASR-assisted, manually selected complete phrase and final word, with edge margins.
    phrase=faded(pcm[round(1.94*RATE):round(3.88*RATE)])
    word=faded(pcm[round(3.42*RATE):round(3.88*RATE)])
    write_pcm(out/'phrase.wav',phrase);phrase=read_pcm(out/'phrase.wav',(.35,5))
    rows=[]
    for style,folder in [('reggae',ROOT/'renders/improvise-reggae-revision-20261023/controlled'),
                         ('house',ROOT/'renders/integrated-singer-audition-20261022/house-female'),
                         ('funk',ROOT/'renders/integrated-singer-audition-20261022/funk-male')]:
        song,receipt=rendered(folder);vocals=stem(folder,'vocals',receipt,song.shape)
        grid=beat_grid(stem(folder,'drums',receipt,song.shape),receipt['case']['bpm'])
        if grid['confidence']<.15:raise ValueError('No reliable pulse for this rhythm audition')
        beat=RATE*60/grid['bpm'];beats=round(len(phrase)/beat)
        ratio=beats*beat/len(phrase);fitted=retime(phrase,ratio)
        repeat=round((beats+.5)*beat)
        hook=np.zeros((repeat+len(word),2));hook[:len(fitted)]=fitted;hook[repeat:]+=word*.72
        work=out/style;work.mkdir();write_pcm(work/'hook.wav',hook);hook=read_pcm(work/'hook.wav',(.35,5))
        options=sorted(arrangement_options(song,vocals,hook,grid),key=lambda c:(c['mode']!='existing-gap',c['call_at']))
        selected=None
        for candidate in options:
            if not 4<=candidate['call_at']<=22:continue
            bed,estimate=song,vocals
            if candidate['replace_region']:
                bed,estimate=replace_vocal(song,vocals,*[round(t*RATE) for t in candidate['replace_region']])
            try:
                for clip in (phrase,hook):mix_calls(bed,clip,round(candidate['call_at']*RATE),estimate)
            except ValueError:continue
            selected=candidate;break
        if selected is None:
            rows.append({'style':style,'technical':'FAIL','reason':'No safe shared placement'});continue
        runs=[]
        for tag,source in [('before',out/'phrase.wav'),('after',work/'hook.wav')]:
            result=edit(folder,source,work/tag,selected['call_at'],True,replace_region=selected['replace_region'])
            assert result['outside_region_max_pcm_error']==0 and result['peak']<.98
            runs.append(result)
        assert runs[0]['artifacts']['music']==runs[1]['artifacts']['music']
        start=round(selected['call_at']*RATE)
        a=max(0,start-2*RATE);b=min(len(song),start+len(hook)+3*RATE)
        for tag in ('before','after'):
            write_pcm(work/f'{tag}-preview.wav',read_pcm(work/tag/'performance.wav',(30,45))[a:b])
        rows.append({'style':style,'technical':'PASS','song_sha256':receipt['audio_sha256'],
                     'grid':grid,'phrase_duration_ratio':ratio,'pitch_shift_semitones':0,
                     'word_repeat_offset_frames':repeat,'call_at':selected['call_at'],
                     'same_music':True,'original_recording_sha256':sha,'before':runs[0],'after':runs[1]})
    assert digest(original)==sha
    report={'technical':'PASS' if all(r['technical']=='PASS' for r in rows) else 'PARTIAL',
            'listening':'NOT RUN','serving_change':False,'pitch_duration_self_check':'PASS',
            'source_crop_seconds':[1.94,3.88],'word_crop_seconds':[3.42,3.88],
            'crop_accuracy':'ASR-assisted manual selection, listening NOT RUN',
            'ffmpeg':subprocess.run(['ffmpeg','-version'],capture_output=True,text=True,check=True).stdout.splitlines()[0],
            'runs':rows}
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'technical':report['technical'],'completed':[r['style'] for r in rows if r['technical']=='PASS']}))


if __name__=='__main__':main()
