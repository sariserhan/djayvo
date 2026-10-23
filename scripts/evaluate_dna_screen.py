#!/usr/bin/env python3
"""Check the existing cleared catalogue; publisher genre labels are not vocal-song listening judgments."""
import argparse
import json
from pathlib import Path
import subprocess
from check_dna_audio import MANIFEST, assess, load_auditor, score_windows
from dna_direction import direction_for
from singing_response import digest

ROOT=Path(__file__).resolve().parents[1]


def evaluate(output):
    import numpy as np
    output.mkdir(parents=True,exist_ok=False)
    manifest=ROOT/'apps/web/practice-audio/manifest.json'
    report={'completed':False,'model_revision':MANIFEST['revision'],'policy_sha256':digest(ROOT/'assets/manifests/dna-directions.json'),
            'catalogue_sha256':digest(manifest),'thresholds_changed':False,'calibration':'NOT RUN',
            'limitation':'Publisher-labelled, often instrumental/hybrid tracks. Not a representative listening-labelled vocal cohort.',
            'rows':[]}
    auditor=load_auditor()
    for track in json.loads(manifest.read_text())['tracks']:
        path=ROOT/'apps/web'/track['url']
        if digest(path)!=track['sha256']:raise ValueError('Catalogue recording changed')
        result=subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(path),'-f','f32le','-ac','1','-ar','48000','-'],capture_output=True,check=True,timeout=60)
        pcm=np.frombuffer(result.stdout,dtype='<f4')
        if len(pcm)<4*480000 or not np.isfinite(pcm).all():raise ValueError('Reference needs four distinct finite passages')
        starts=np.linspace(0,len(pcm)-480000,4).astype(int)
        target=direction_for([{'reference':track['id'],'catalogue_genre':track['genre']}])['id']
        scores=score_windows([pcm[start:start+480000] for start in starts],auditor)
        row={'id':track['id'],'publisher_genre':track['genre'],'sha256':track['sha256'],'license':track['license'],'source':track['source_page'],
             'passage_seconds':[int(start)/48000 for start in starts],**assess(scores,target)}
        report['rows'].append(row)
        (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps({'id':track['id'],'target':target,'accepted':row['accepted'],'top_label':next(iter(row['scores']))}),flush=True)
    report['completed']=True
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',required=True,type=Path)
    evaluate(parser.parse_args().output)
