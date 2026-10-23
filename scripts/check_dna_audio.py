#!/usr/bin/env python3
"""Screen a finished Music DNA song for broad style mismatch, never musical quality."""
import argparse
import json
import math
from pathlib import Path
from singing_response import digest

ROOT = Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT/'assets/manifests/dna-directions.json').read_text())
MANIFEST = json.loads((ROOT/'assets/manifests/dna-auditor.json').read_text())
MODEL = ROOT/'build-style-training/taste-auditor'


def verify_model():
    for name, sha in MANIFEST['files_sha256'].items():
        if digest(MODEL/name) != sha:
            raise ValueError('Audio auditor setup does not match the pinned manifest')


def assess(scores, target):
    ids = [d['id'] for d in POLICY['directions']] + ['soft-ballad', 'speech']
    if target not in ids or len(scores) != 4 or any(len(row) != len(ids) or any(not math.isfinite(v) for v in row) for row in scores):
        raise ValueError('Invalid style evidence')
    index = ids.index(target)
    averages = [sum(row[i] for row in scores)/len(scores) for i in range(len(ids))]
    # shortcut: conservative uncalibrated mismatch screen; validate thresholds on a listening-labelled cohort before public release.
    margin = .03
    # Parent/subgenre labels overlap. The required style must still beat unrelated styles.
    related = {'heavy-rock': ['rock'], 'rock': ['heavy-rock', 'indie'], 'indie': ['rock']}.get(target, [])
    rivals = [i for i, name in enumerate(ids) if name != target and name not in related]
    matches = sum(row[index] >= max(row[i] for i in rivals) - margin for row in scores)
    accepted = averages[index] >= .25 and averages[index] >= max(averages[i] for i in rivals)-margin and matches >= 3
    return {'accepted': accepted, 'target': target, 'matching_windows': matches, 'max_cosine_gap': margin,
            'scores': dict(sorted(zip(ids, averages), key=lambda item: -item[1])), 'windows': scores,
            'limit': 'Broad style screening only. Not a calibrated quality, singing or listener-preference score.'}


def load_auditor():
    import torch
    from transformers import ClapModel, ClapProcessor
    verify_model()
    torch.set_num_threads(4)
    processor = ClapProcessor.from_pretrained(MODEL, local_files_only=True)
    model = ClapModel.from_pretrained(MODEL, local_files_only=True).eval()
    return processor, model


def score_windows(windows, auditor):
    import numpy as np
    import torch
    if len(windows)!=4 or any(np.asarray(w).shape!=(480000,) or not np.isfinite(w).all() for w in windows):
        raise ValueError('Expected four finite ten-second windows')
    processor, model = auditor
    texts = [d['audio'] for d in POLICY['directions']] + ['A slow soft piano love ballad with gentle singing.', 'Spoken words without singing or music.']
    scores=[]
    # Check one passage at a time to bound CPU activation memory on small workers.
    with torch.inference_mode():
        for window in windows:
            inputs = processor(text=texts, audio=[window], return_tensors='pt', padding=True, sampling_rate=48000)
            result = model(**inputs)
            scores.extend((result.audio_embeds @ result.text_embeds.T).tolist())
    return scores


def score_audio(path, auditor=None):
    import numpy as np
    import soundfile as sf
    pcm, rate = sf.read(path, dtype='float32', always_2d=True)
    if rate != 48000 or pcm.shape != (120*rate, 2) or not np.isfinite(pcm).all() or np.max(np.abs(pcm)) >= 1 or np.sqrt(np.mean(pcm**2)) < .001:
        raise ValueError('Invalid full song audio')
    windows = [pcm[t*rate:(t+10)*rate].mean(axis=1) for t in (15,45,75,105)]
    return score_windows(windows, auditor or load_auditor())


def check(work):
    request = json.loads((work/'input.json').read_text())
    plan = json.loads((work/'plan.json').read_text())
    receipt = json.loads((work/'singer/complete.json').read_text())
    direction = request['direction']
    hashes = {'input_sha256': digest(work/'input.json'), 'plan_sha256': digest(work/'plan.json'),
              'audio_sha256': digest(work/'singer/singer.wav')}
    if plan['direction'] != direction or plan.get('input_sha256') != hashes['input_sha256'] or any(receipt.get(key) != hashes[key] for key in ('plan_sha256','audio_sha256')):
        raise ValueError('Song evidence does not belong to its saved favorites')
    report = {**assess(score_audio(work/'singer/singer.wav'), direction['id']), **hashes,
              'model_revision': MANIFEST['revision'], 'direction_version': POLICY['version'], 'screen_version': 1}
    with (work/'fit.json').open('x') as output:json.dump(report, output, indent=2)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(check(args.work)))
