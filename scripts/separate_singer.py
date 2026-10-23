#!/usr/bin/env python3
"""Local, pinned separation to leave musical space for the user's sample."""
import argparse
import json
from pathlib import Path
import time

import numpy as np
from arrange_voice_research import RATE
import wave
from singing_response import digest as model_digest

ROOT = Path(__file__).resolve().parents[1]


def separate(singer, output):
    output = Path(output)
    if output.exists():
        raise FileExistsError('Preserving existing separation')
    source_hash = model_digest(singer)
    if Path(singer).stat().st_size > 24_000_000:
        raise ValueError('Singer exceeds the two-minute audio limit')
    with wave.open(str(singer), 'rb') as audio:
        if audio.getparams()[:3] != (2, 2, RATE) or audio.getnframes() not in (30*RATE, 120*RATE) or audio.getcomptype() != 'NONE':
            raise ValueError('Expected a 30-second or two-minute stereo PCM singer')
        original = np.frombuffer(audio.readframes(audio.getnframes()), dtype='<i2').reshape(-1, 2).astype(np.float32)/32768
    manifest = json.loads((ROOT/'assets/manifests/singer-separation.json').read_text())
    checkpoint = ROOT/'build-style-training/separator/hdemucs_high_trained.pt'
    if model_digest(checkpoint) != manifest['sha256']:
        raise ValueError('Separator checkpoint mismatch')
    import torch
    import torchaudio
    if torchaudio.__version__.split('+')[0] != manifest['torchaudio']:
        raise ValueError('Use the pinned singer environment for separation')
    torch.set_num_threads(4)
    torch.manual_seed(0)
    started = time.monotonic()
    model = torchaudio.models.hdemucs_high(sources=['drums', 'bass', 'other', 'vocals'])
    model.load_state_dict(torch.load(checkpoint, map_location='cpu', weights_only=True))
    model.eval()
    audio = torchaudio.functional.resample(torch.from_numpy(original.T.copy()).float(), RATE, 44100)
    reference = audio.mean(0)
    mean, scale = reference.mean(), reference.std().clamp_min(1e-5)
    audio = (audio-mean)/scale
    size, overlap = 6*44100, 44100
    stems = torch.zeros(4, 2, audio.shape[-1]); weights = torch.zeros(audio.shape[-1])
    with torch.inference_mode():
        for start in range(0, audio.shape[-1], size-overlap):
            stop = min(start+size, audio.shape[-1]); length = stop-start
            chunk = torch.nn.functional.pad(audio[:, start:stop], (0, size-length))
            prediction = model(chunk[None])[0, :, :, :length]*scale + mean/4
            fade = torch.ones(length)
            if start: fade[:min(overlap,length)] = torch.linspace(0,1,min(overlap,length))
            if stop < audio.shape[-1]: fade[-overlap:] = torch.linspace(1,0,overlap)
            stems[:, :, start:stop] += prediction*fade
            weights[start:stop] += fade
        assert torch.all(weights>0)
        stems /= weights
        stems = torchaudio.functional.resample(stems, 44100, RATE)[..., :len(original)]
    output.mkdir(parents=True); (output/'.partial').touch()
    hashes = {}
    for name, index in [('vocals',3), ('drums',0)]:
        pcm = stems[index].T.numpy()
        assert pcm.shape == original.shape and np.isfinite(pcm).all() and np.max(np.abs(pcm)) < 4
        np.save(output/f'{name}.npy', pcm, allow_pickle=False)
        hashes[name] = model_digest(output/f'{name}.npy')
    if model_digest(singer) != source_hash:
        raise ValueError('Singer changed during analysis; retaining incomplete output')
    report = {'technical':'PASS','source_sha256':source_hash,'model_sha256':manifest['sha256'],
              'stems':hashes,'sample_rate':RATE,'frames':len(original),'device':'cpu',
              'seconds':time.monotonic()-started,'separation_quality':'NOT RUN: estimated stems can contain bleed'}
    (output/'complete.json').write_text(json.dumps(report,indent=2)+'\n'); (output/'.partial').unlink()
    print('PASS: local singer/drum estimates saved',flush=True)


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();separate(a.input,a.output)
