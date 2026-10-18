# Djayvo: first consented owner voice trial

Recorded 2026-10-17, America/New_York. Engine/evidence base commit `64e4185`.
The owner requested local testing of their own speech and confirmed the recording
was ready. No recording, transcript, or detailed source analysis is committed.
The original M4A remains unchanged in Downloads. All private artifacts are in
ignored `renders/voice-20261017-221411/`; nothing was uploaded or used for training.

| Gate | Status | Evidence |
| --- | --- | --- |
| Input duration and conversion | PASS | 4.862 s, stereo AAC at 32 kHz converted to stereo PCM16 at 48 kHz; 233,376 frames |
| Direct Apple-converted WAV ingestion | FAIL | Converter emits WAVE_FORMAT_EXTENSIBLE (0xfffe); current engine supports classic PCM/float WAV headers |
| Standard PCM header repacking | PASS | Python wave rewrote the container; decoded parameters and every PCM byte verified identical |
| Recorded-source consent and provenance | PASS | All scores identify recorded input, confirmed consent, and matching source SHA-256 |
| Three master renders | PASS | Hip-hop 32 s, reggae 32 s, experimental 32.96775 s |
| Master/stem decoding and bounds | PASS | All 15 files non-silent, zero full-scale samples, silent final 100 ms; engine reports zero nonfinite samples |
| Original preservation | PASS | M4A hash checked before and after conversion/rendering |
| Owner listening | PARTIAL | Owner says it is okay as a start, with awkward parts, especially experimental; all styles sound game-like |
| Recognizability and formal quality ratings | NOT RUN | No explicit recognition rating or blinded scores |
| Overall M0 | PARTIAL | One technically valid human source does not establish musical quality or the M1 dataset |

Decoded master peaks: hip-hop -5.58884 dBFS, reggae -5.98568 dBFS,
experimental -7.86140 dBFS. These are sample peaks, not true peak. Silent final
samples do not establish an aesthetically satisfying ending or absence of clicks
elsewhere. No new cross-platform comparison is claimed for this private source.

The initial rejection and workaround are retained privately as `render.log`,
`render-pcm.log`, `source-provenance.json`, and `pcm-conversion.json`. Full decoded
measurements are `decoded-audio.json`. No decoder code or tolerances were changed;
the import workflow normalizes the container to an already supported format.

## Reproduce the import and render

Choose a new output directory to preserve previous audio and observations.
This example intentionally refuses to reuse an existing directory:

```sh
mkdir renders/my-next-voice-trial && \
afconvert -f WAVE -d LEI16@48000 \
  "$HOME/Downloads/djayvo-my-voice.m4a" \
  renders/my-next-voice-trial/source-apple.wav
```

Normalize the PCM container without changing its samples:

```sh
.venv-build/bin/python3 - <<'PY'
import wave
from pathlib import Path
folder = Path('renders/my-next-voice-trial')
output = folder / 'source-pcm.wav'
with wave.open(str(folder / 'source-apple.wav'), 'rb') as source:
    params = source.getparams()
    pcm = source.readframes(source.getnframes())
assert params.sampwidth == 2 and params.comptype == 'NONE'
with output.open('xb') as file:
    with wave.open(file, 'wb') as destination:
        destination.setparams(params)
        destination.writeframes(pcm)
with wave.open(str(output), 'rb') as check:
    assert check.getparams() == params
    assert check.readframes(check.getnframes()) == pcm
PY
./build-mac/djayvo_remix --input renders/my-next-voice-trial/source-pcm.wav \
  --consent --output renders/my-next-voice-trial/remix --style all --stems
```

Use `--consent` only for a recording with permission to process it locally.
The engine currently accepts 2–5 seconds for remix planning.

## Owner audition

Owner feedback received 2026-10-17: "there are some awkard parts but as a start
it is okay, we can continue". Follow-up identifies experimental as the main
problem, synthetic/game-like instruments across all styles, and a request for
creative openings that do not always start with the untouched recording. This
authorizes further refinement, not a quality PASS or model-training gate.

The first targeted correction reserves both clean-hook intervals from other
vocal chops and removes duplicate chop start frames after offbeat quantization.
Revised files are in `renders/voice-review2/`; originals are preserved.
On the owner source, overlapping chops fall from 3/3/9 to zero for
hip-hop/reggae/experimental, and reggae's seven extra simultaneous starts are
removed. Instruments are unchanged in this revision. Release and ASan/UBSan
CTest pass 6/6 each, including a new regression for 2/3/5-second hooks and
actual vocal-stem preservation. Block sizes 512/113 yield identical revised
WAVs. See `docs/evidence/vocal-spacing/` for logs and measured differences.
The new arrangement has not been rendered on Linux; the original M0d comparison
remains historical evidence for the previous revision. Revised human listening
is NOT RUN. Timbre and creative openings remain the next requested work.

Play these one at a time, from the repository root:

```sh
afplay renders/voice-20261017-221411/source-pcm.wav
afplay renders/voice-20261017-221411/remix.hiphop.wav
afplay renders/voice-20261017-221411/remix.reggae.wav
afplay renders/voice-20261017-221411/remix.experimental.wav
```

Report whether your phrase is clear, which version you prefer, whether the
instruments fit together, and any harshness, clicks, imbalance, or awkward ending
(include approximate timestamps). Record playback setup and PASS/PARTIAL/FAIL
for observed aspects. Leave unheard aspects NOT RUN. This is an unblinded M0
trial, not a formal M1 quality result.
