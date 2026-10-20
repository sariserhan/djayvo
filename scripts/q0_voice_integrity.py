#!/usr/bin/env python3
"""Independently reconstruct untransformed 48 kHz vocal stems; no recognition claim."""
import argparse
import json
import math
from pathlib import Path
import wave
import numpy as np

from q0_audit import digest, write
from q0_measure_comparisons import pcm


def check(plan_path, source, stem, output):
    if output.exists():
        raise ValueError('Choose a fresh evidence file')
    plan = json.loads(plan_path.read_text())
    if (plan['source']['consent_confirmed'] is not True or digest(source) != plan['source']['sha256']
            or plan['sample_rate'] != 48000 or plan.get('tempo_changes')):
        raise ValueError('Expected consented hash-matched fixed-tempo 48 kHz plan')
    with wave.open(str(source)) as wav:
        if wav.getsampwidth()!=2 or wav.getframerate()!=48000 or wav.getnchannels() not in (1, 2):
            raise ValueError('This independent check excludes resampled/other-format input')
        mono = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(np.float64)
        mono = (mono.reshape(-1, wav.getnchannels()).mean(axis=1)/32768).astype(np.float32)
    rate, values = pcm(stem)
    if rate != 48000:
        raise ValueError('Unexpected stem rate')
    actual = np.asarray(values).reshape(-1, 2)
    expected = np.zeros(actual.shape, dtype=np.float64)
    clips = {c['id']:c for c in plan['voice_clips']}
    intervals = []
    denominator = plan['ticks_per_quarter']*plan['tempo_milli_bpm']
    for event in plan['voice_events']:
        if (event['rate']!=1 or event['reverse'] or event.get('pitch_semitones',0)!=0 or
                event.get('time_stretch',1)!=1 or event.get('echo_ticks',0)):
            raise ValueError('This check only supports untransformed calls')
        clip = clips[event['clip_id']]
        lo, hi = clip['start_frame'], clip['end_frame']
        start = (event['start_tick']*rate*60000+denominator//2)//denominator
        stop = start+hi-lo
        if not 0 <= lo < hi <= len(mono) or stop > len(expected):
            raise ValueError('Source or destination bounds')
        if any(start < b and stop > a for a,b in intervals):
            raise ValueError('Overlapping calls require a different oracle')
        intervals.append((start,stop))
        frames = np.arange(hi-lo, dtype=np.float64)
        envelope = np.clip(np.minimum(frames, hi-lo-1-frames)/(rate*.003),0,1)
        signal = mono[lo:hi].astype(np.float64)*envelope
        gain = 10**(event['gain_db']/20)*plan['analysis']['normalization_gain']
        for c, pan in enumerate((math.cos((event['pan']+1)*math.pi/4),
                                 math.sin((event['pan']+1)*math.pi/4))):
            expected[start:stop,c] = signal*gain*pan
    if np.max(np.abs(expected)) > .8*10**(plan['mix']['master_target_peak_dbfs']/20):
        raise ValueError('This check excludes limiting')
    # Match the native float output and lround PCM16 quantization.
    scaled = expected.astype(np.float32).astype(np.float64)*32767
    quantized = np.copysign(np.floor(np.abs(scaled)+.5),scaled).astype(np.int32)
    delta = actual.astype(np.int32)-quantized
    maximum = int(np.max(np.abs(delta)))
    if maximum > 1:
        raise ValueError(f'Unexpected vocal processing: {maximum} PCM16 units')
    write(output, {'technical': 'PASS', 'source_sha256': digest(source),
        'plan_sha256': digest(plan_path), 'stem_sha256': digest(stem),
        'frames_checked': len(actual), 'call_intervals_frames': intervals,
        'maximum_pcm16_error': maximum, 'different_samples': int(np.count_nonzero(delta)),
        'method': 'Independent source mono fold-down, clip coordinates, 3 ms fades, normalization/pan gain and PCM16 quantization',
        'limits': '48 kHz PCM16 source, no transformations/overlaps/limiting. Does not test intelligibility, musicality or mix masking.',
        'human_quality': 'NOT RUN'})
    print(f'PASS: {len(actual)} vocal frames, maximum error {maximum} PCM16 units')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('plan', 'source', 'stem', 'output'):
        p.add_argument('--'+name, type=Path, required=True)
    a = p.parse_args()
    check(a.plan, a.source, a.stem, a.output)
