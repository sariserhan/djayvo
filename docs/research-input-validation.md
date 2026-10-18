# Research input validation

2026-10-18. **Validation fix: PASS. Full specification: PARTIAL.**

The optional Python speech-timing and selective-voice research tools counted
constant electrical offsets as signal. The speech worker also let an empty
decoded buffer reach inference because its RMS was NaN. Retained regression
tests against commit `1f25e46` reproduce both failures.

`analyze_words.py` now requires 32,000–80,000 finite decoded mono samples at
16 kHz and standard deviation of at least 0.001 before constructing the model.
`arrange_voice_research.py` measures variation independently in each channel,
then combines their energies using its existing 0.00001 threshold. Opposite
constant stereo offsets cannot masquerade as sound. The shared reader covers
both source and backing inputs and the comparison preparation tool.

These checks reject unusable inputs; they do not remove offsets, change accepted
PCM, classify speech or establish intelligibility. No default engine, app, model
weights, schema or dependencies changed. The original research thresholds remain
different from the native engine's thresholds. The NumPy calculations follow
[standard deviation](https://numpy.org/doc/stable/reference/generated/numpy.std.html)
and [per-axis variance](https://numpy.org/doc/stable/reference/generated/numpy.var.html)
documentation; Context7 tools were unavailable, so primary documentation was used.

| Gate | Status | Evidence |
| --- | --- | --- |
| Before-fix regression | FAIL | [Speech](evidence/research-input/word-before-final.log): DC/quiet inputs and empty decoded output reach the stub model; [voice](evidence/research-input/voice-before-final.log): four nonzero constant cases accepted |
| Speech audio tests | PASS | [Three tests](evidence/research-input/word-tests.log), including 18 silence/DC/quiet controls at 8/44.1/192 kHz, five invalid decoded buffers and unchanged accepted PCM at two/five seconds |
| Voice research tests | PASS | [Eight tests](evidence/research-input/voice-tests.log), including five mono/stereo constant cases, opposite offsets, one active channel, unchanged accepted PCM, consent, export preservation and deterministic rendering |
| Existing timing/crop integration | PASS | [No-model suite](evidence/research-input/word-integration.log): source binding, confidence, crop clearance, schema preservation, consent and overwrite protection |
| Actual pinned-model CLI rejection | PASS | 44.1 kHz constant input rejected; no timestamp file published |
| Six existing voice comparisons | PASS | 42 WAVs byte-identical: 24 mixes/stems/controls plus 18 level-matched review copies; all six complete plans and event frames identical; maximum/RMS PCM difference zero |
| Actual M5 speech inference | PASS | Owner six estimates and supplied fixture seven estimates; timestamps, confidences, language and source/model hashes exactly match previous M5 results |
| Source/master preservation | PASS | Protected master, supplied speech fixture and owner PCM retain their known SHA-256 values |
| New Linux / browser / device execution | NOT RUN | Python-only change; prior native/browser evidence retained, no new cross-platform claim |
| Existing model platform agreement | FAIL | Earlier synthetic fixture yielded seven M5 estimates versus six Linux estimates; this change does not resolve that discrepancy |
| Word accuracy / listening / M1 | NOT RUN | No manually verified word boundaries or new listener ratings |
| Production / full specification | PARTIAL | Quality, learned direction, paused infrastructure/device work and release gates remain open |

The audio-validation unit tests stub only the model and its manifest, with actual
FFmpeg decoding except for the five intentionally malformed decoded-buffer cases.
Actual local inference separately uses the existing hash-verified model and
offline worker. It does not download weights or upload recordings.

Hardware: Apple M5, ten cores, 16 GiB, macOS 26.7.1. Analysis environment:
Python 3.15.0, NumPy 2.5.4, FFmpeg 9.0.2. Speech environment: Python 3.12.13,
faster-whisper 1.2.1, CTranslate2 4.8.3, NumPy 2.5.4. Exact versions, hashes,
event agreement and inference measurements are in the
[machine report](evidence/research-input/report.json). No installations or changes
to `~/mlx-env` were needed.

Reproduce from the repository root using the existing isolated environments:

```sh
.venv-analysis/bin/python -m unittest discover -s tests -p test_word_audio.py
.venv-analysis/bin/python -m unittest discover -s tests -p test_voice_research.py
.venv-build/bin/python tests/integration/verify_word_timing.py
.venv-analysis/bin/python docs/evidence/research-input/check.py
```

The final command creates a fresh ignored `renders/research-input-*` directory;
this run is `renders/research-input-nc6iqx5u`. It compares against existing
research artifacts without rewriting original review pages, recordings or frozen
listening packets. [Execution log](evidence/research-input/verification.log).
Initial before-fix logs are also retained; their voice test reused an output
folder after unexpected acceptance, producing secondary overwrite errors. Final
before-fix tests use separate output folders and isolate the four rejection failures.
