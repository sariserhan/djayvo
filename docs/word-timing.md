# Optional offline word timing research

2026-10-18. Local analysis execution and source-preserving crop preparation
**PASS**; timing accuracy and listening **NOT RUN**; overall analysis **PARTIAL**.
This implements optional speech analysis from specification §3.2. It does not
advance the learned musical director or waive M1 quality evidence.

Later validation hardening: [Research input checks](research-input-validation.md).
Constant offsets and empty decoded buffers are rejected before inference;
existing M5 timestamps/confidences remain unchanged. This does not resolve the
model platform disagreement or establish boundary accuracy.

`scripts/analyze_words.py` runs the pinned multilingual Whisper tiny conversion
locally on CPU int8 with four threads. It requires explicit source permission,
2–5 second PCM16 input, a hash-verified local model, bounded output and a 120-second
worker timeout. It stores timestamps/confidence, not a transcript. Python socket
connections are denied and model loading is offline; this is not an OS sandbox.
No audio upload, training, paid service or model bundling occurs.

`scripts/align_word_crops.py` proposes nearby crops with conservative padding,
confidence/length/spacing limits and exact source hash/rate/frame binding. It
preserves complete clean hooks, event timing and transformed/reversed phrases.
Native plan validation remains mandatory. Recognition confidence is not calibrated
boundary accuracy. Both tools remain optional research utilities, not browser
runtime dependencies or automatic product behavior.

[Evidence](evidence/word-timing/) includes pinned environments, model/notice hashes,
controls, render/measurement scripts and actual platform observations:

| Check | Status | Observation |
| --- | --- | --- |
| M5 CPU execution | PASS | Owner clip: six estimates, 0.307 s inference, 413,384,704-byte worker peak RSS |
| Linux arm64 VM execution | PASS | Owner clip: six estimates, 2.130 s inference, 263,012,352-byte worker peak RSS |
| Owner boundary repeat/platform agreement | PASS | Same six frame intervals; confidence differs across platforms |
| Synthetic fixture model agreement | FAIL | Seven estimates on M5 versus six on Linux; model estimates are not portable deterministic scores |
| Timing accuracy | NOT RUN | No manually verified word boundaries |
| Procedural controls | PASS | Silence rejected before inference; one white-noise control produced zero words; not broad hallucination validation |
| Crop integration | PASS | Four native-validated pairs; changed clips 5/2/4/2 for hip-hop/reggae/experimental/club |
| Audio invariants | PASS | Instrument stems/event frames and full clean-hook PCM unchanged; final silence; matched -24 LUFS, peaks below -1 dBTP |
| Browser review | PASS | 16 players in each Chromium/WebKit; metadata, muted playback and seeking; WebKit screenshot visually inspected |
| Musical improvement | NOT RUN | No listener scores inferred |

[Platform comparison](evidence/word-timing/platform-comparison.json) records model
variation separately from deterministic renderer agreement. Twenty-three aligned mix/stem WAVs and their event frames agree exactly between
M5 and Linux when replaying the same proposed plans (max/RMS PCM error 0).
Four style mixes
change by max PCM 0.298–0.399 and RMS 0.00769–0.02481; exact per-style measurements
are [recorded](evidence/word-timing/measurements.json). Private review:
`renders/word-timing-20261018/review/index.html`.

The work also fixes `prepare_voice_transforms.py` downgrading newer scores:
pitch/time and echo preparation now preserve instrument/effect schema versions.
Unit checks cover versions 1.0–1.6; four actual echo/pitch renders using 1.6 plans
passed. Full current release suites pass 13/13 on M5 and Linux. The first Linux
venv attempt failed for missing ensurepip; installing python3.11-venv inside the
isolated VM resolved it. Retained logs distinguish that failure from final runs.

M5 uses isolated `.venv-speech` Python 3.12, faster-whisper 1.2.1, CTranslate2
4.8.3 and FFmpeg 9.0.2. Linux uses its own Python 3.11 environment and FFmpeg
5.1.9; separate lock files retain transitive differences. `~/mlx-env` is unchanged.
Model revision, five file hashes and 78,205,610-byte download are pinned in
[the manifest](../assets/manifests/word-timing-tiny.json). No weights are committed.

Reproduce after preparing that pinned model/environment:

```sh
.venv-speech/bin/python scripts/analyze_words.py --input /path/to/consented.wav --consent --model build-speech-tools/faster-whisper-tiny --output /fresh/words.json
python3 scripts/align_word_crops.py --plan /path/to/score.json --words /fresh/words.json --output /fresh/candidate.json
build-mac/djayvo_remix --input /path/to/consented.wav --consent --style hiphop --plan /fresh/candidate.json --output /fresh/mix --stems
```

Implementation references: [faster-whisper](https://github.com/SYSTRAN/faster-whisper),
[CTranslate2 CPU quantization](https://opennmt.net/CTranslate2/quantization.html)
and [the pinned model repository](https://huggingface.co/Systran/faster-whisper-tiny).
Full MIT notices are retained under `ai/analysis/licenses/`. Transitive analysis
tools are development-only; any future bundled distribution requires its own
complete dependency/rights review. These permissions do not certify output quality.
