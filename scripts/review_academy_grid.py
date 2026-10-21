"""Prepare candidate beat-grid evidence for owner listening, not verified downbeats/keys."""
import hashlib
import json
from pathlib import Path
import subprocess
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE = 16000
HOP = 160


def grid_candidate(envelope, beat_seconds=.5):
    times = np.arange(len(envelope)) * HOP / RATE
    offsets = np.arange(0, beat_seconds, .01)
    scores = [float(np.interp(np.arange(offset, times[-1], beat_seconds), times, envelope).mean()) for offset in offsets]
    return float(offsets[int(np.argmax(scores))]), max(scores)


def tempo_candidates(envelope):
    centered = envelope - envelope.mean()
    if float(np.dot(centered, centered)) < 1e-12:
        return []
    correlation = np.correlate(centered, centered, 'full')[len(centered)-1:]
    correlation /= np.arange(len(centered), 0, -1)
    correlation /= correlation[0]
    peaks = [lag for lag in range(25, min(134, len(correlation)-1))
             if correlation[lag] > .2 and correlation[lag] > correlation[lag-1]
             and correlation[lag] > correlation[lag+1]]
    return [dict(bpm=round(60/(lag*HOP/RATE), 3), correlation=float(correlation[lag]))
            for lag in sorted(peaks, key=lambda lag: correlation[lag], reverse=True)[:6]]


# Independent lag search must recover known pulse trains without receiving a BPM label.
for interval, expected in [(50, 120), (60, 100)]:
    reference = np.zeros(6000)
    reference[13::interval] = 1
    assert any(abs(row['bpm']-expected) < .001 and row['correlation'] > .99
               for row in tempo_candidates(reference))
assert tempo_candidates(np.zeros(6000)) == []


pulses = np.zeros(1000)
pulses[13::50] = 1
assert abs(grid_candidate(pulses)[0] - .13) < .001


if __name__ == '__main__':
    folder = ROOT/'build-academy-review'
    folder.mkdir(exist_ok=True)
    rows = []
    for track in json.loads((ROOT/'apps/site/public/academy-audio/manifest.json').read_text())['tracks']:
        source = ROOT/'apps/site/public'/track['url'].lstrip('/')
        assert hashlib.sha256(source.read_bytes()).hexdigest() == track['sha256']
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source), '-ar', str(RATE), '-ac', '1', '-f', 'f32le', '-'])
        pcm = np.frombuffer(raw, dtype='<f4')
        # Positive low-frequency spectral change is a candidate kick onset, not a musical downbeat.
        frames = np.lib.stride_tricks.sliding_window_view(pcm, 1024)[::HOP]
        spectrum = np.abs(np.fft.rfft(frames * np.hanning(1024), axis=1))
        frequencies = np.fft.rfftfreq(1024, 1/RATE)
        energy = spectrum[:, (frequencies >= 35) & (frequencies <= 200)].sum(axis=1)
        onsets = np.maximum(0, np.diff(energy, prepend=energy[0]))
        offset, score = grid_candidate(onsets)
        # Window timestamps refer to their centers; retain that offset explicitly.
        phase = (offset + 512/RATE) % .5
        review = pcm.copy() * .7
        tick = .10*np.sin(2*np.pi*1200*np.arange(400)/RATE)*np.exp(-np.arange(400)/60)
        for second in np.arange(phase, len(pcm)/RATE, .5):
            start = round(second*RATE)
            review[start:start+len(tick)] += tick[:len(review)-start]
        assert np.isfinite(review).all() and abs(review).max() < 1
        output = folder/(track['id']+'-candidate-grid.wav')
        with wave.open(str(output), 'wb') as wav:
            wav.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
            wav.writeframes((review*32767).astype('<i2').tobytes())
        rows.append(dict(id=track['id'],source_sha256=track['sha256'],author_bpm=120,
                         candidate_beat_offset_seconds=phase,method='positive 35-200 Hz spectral change, 64 ms Hann window, 10 ms hop',
                         review_file=str(output.relative_to(ROOT)),review_sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                         independent_tempo=dict(status='PARTIAL',method='normalized onset autocorrelation; independent 45-240 BPM search; 10 ms lag resolution',candidates=tempo_candidates(onsets),limit='Periodicities include subdivisions and half/double tempo; this is not a confirmed musical beat annotation'),downbeat_phrase_and_key='NOT RUN',owner_listening='NOT RUN'))
    (ROOT/'docs/evidence/academy-release/grid-candidates.json').write_text(json.dumps(rows, indent=2)+'\n')
    print(json.dumps(rows, indent=2))
