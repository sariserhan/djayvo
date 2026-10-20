# Q0 — Phrase boundaries and response timing

2026-10-20. **Technical execution PASS. Overall Q0 PARTIAL.
New listening acceptance NOT RUN. Earlier rejected packets remain FAIL.**

This isolated experiment follows the original-score study. It addresses a
measured transition issue, not a proven dominant cause of robotic music.
The control reserves three bars (6.429 seconds at 112 BPM) for every vocal
call, regardless of source activity. The owner's 4.862-second recording has
approximately 2.43 seconds of activity under the diagnostic RMS threshold;
the existing engine's broader phrase bounds cover 0.97–3.43 seconds.
Consequently, the same fixed call space includes leading/trailing silence and
unused time before the response. Whether that space is musically inappropriate
requires listening. Direct agent audio perception remains unavailable.

## Experiment and safeguards

The control is the previous **hybrid-phrased** master, reused byte for byte.
It has not been accepted by a listener. The candidate uses the same instruments,
notes, harmony, expressive velocities, note lengths, tempo and mixing settings.
Only vocal boundaries and section timing change, together in this experiment;
their individual perceptual effects are not isolated.

`scripts/q0_phrase_form.py` measures per-channel energy in 10 ms windows and
unions the detected activity with **all** existing analyzed phrase intervals.
It adds 120 ms of padding on either side. If the proposed interval retains
less than 99.5% of original PCM energy or lasts under 500 ms, it falls back
to the complete recording. Original audio and the original full-source clip
remain intact; an additional clip supplies both untransformed calls.
This is activity detection, not semantic word segmentation.

Each call receives enough whole bars for that interval plus 80 ms. Subsequent
sections move together onto bar boundaries. Bass/kick attacks remain aligned.
Only closed hats at velocity 44 or lower in removed call bars may be deleted.
The transform rejects a change that would remove other notes or cut a sustained
note. It requires the exact frozen 16-bar form, source hash, recorded-source
consent and compatible original/processed frame counts.

## Measured changes

All controls run for 36.786 seconds including their decay tail and start the
first instrumental response at 10.714 seconds. No source required fallback.
The following percentages describe original PCM energy, not word preservation.

| Source | Call bars, before → after | Retained energy | First response | New duration |
|---|---|---|---|---|
| Owner speech | 3 → 2 | 99.9844% | 8.571 s | 32.500 s |
| ls-2277-149896-0026 | 3 → 3 | 99.9920% | 10.714 s | 36.786 s |
| ls-2035-147960-0013 | 3 → 1 | 99.9452% | 6.429 s | 28.214 s |
| ls-2086-149220-0047 | 3 → 2 | 99.9790% | 8.571 s | 32.500 s |
| Commons laughter | 3 → 1 | 99.8074% | 6.429 s | 28.214 s |

The five controls contain 2,170 instrument event rows; candidates contain
2,122 after removing 24 quiet hat notes (48 on/off rows). Both sets have zero
independent event-frame errors. These measurements establish scheduling
agreement, not acoustic attack latency. Event velocity/timing distributions,
crop coordinates, removed notes, native reports and waveform differences are
stored in [machine-readable evidence](evidence/q0-phrase-form/).

All five raw master introductions are bit-identical through the first two bars.
Later common-prefix waveform deltas are nonzero. Four candidates have shorter
durations, so these deltas prove a change; they are not aligned musical-error
scores or evidence of improvement. Each candidate master, event TSV and score
is identical when replayed with block sizes 512 and 113.

## Listen and reproduce

[Private local comparison](http://127.0.0.1:4202/) contains the original source
and two blind candidates per input. Start with `owner-speech`, comparing natural
speech, the transition into the instrumental response, and any missing quiet
words. Ratings are optional, initially blank and downloaded locally. The
organizer key is outside the served directory. No new listening feedback has
been collected.

Local outputs:

- `renders/q0-phrase-form-20261020/<source>/candidate.<style>.wav`
- Matching `.piano.wav`, `.guitar.wav`, `.bass.wav`, `.drums.wav`, `.vocals.wav`
- Matching `.score.json`, `.events.tsv`, `.report.json`, plus `phrase-form.json`
- Controls: `renders/q0-authored-v2-20261020/<source>/hybrid-phrased.<style>.wav`

The style suffixes retain native strategy metadata; this experiment keeps the
previous explicitly authored 112 BPM score. Packet identity:
`3f57d0c800b1f86c83f595caf05c8ba472d6d99309cd6e0bef8e6109f58a7fea`.

From the repository root, choose fresh output directories for a rerun:

```sh
.venv-q0/bin/python tests/integration/verify_q0.py
.venv-q0/bin/python scripts/q0_phrase_trial.py \
  --output renders/q0-phrase-form-20261020
.venv-analysis/bin/python scripts/q0_phrase_evidence.py \
  --trial renders/q0-phrase-form-20261020 --output docs/evidence/q0-phrase-form
.venv-q0/bin/python -m http.server 4202 --bind 127.0.0.1 \
  --directory renders/q0-phrase-form-20261020/listener
```

In a second terminal:

```sh
Q0_REVIEW_URL=http://127.0.0.1:4202/ Q0_CANDIDATES=2 node tests/q0_review_browser.mjs
```

## Validation gates and limits

| Gate | Result | Evidence / limitation |
|---|---|---|
| Authorized inputs | PASS | Five existing source hashes and permission records revalidated |
| Native renders and stems | PASS | Five masters, 25 instrument/vocal stems, five replay masters |
| Plan import and reproduction | PASS | Exported plans match submissions and regenerate exactly |
| Event-frame agreement | PASS | All 4,292 control/candidate rows have zero error |
| Block-size determinism | PASS | Five exact WAV/score/TSV replays at 512/113 |
| PCM/headroom | PASS | 30 decoded masters/stems non-silent, no full-scale samples; zero master limiter interventions |
| Loudness comparison | PASS | Ten mixes within 0.01 LU of −23 LUFS; highest true peak −6.34 dBTP |
| Automated regression | PASS | 12 Q0 tests, including 16/48 kHz coordinates, padding, energy fallback, consent/hash and note-loss rejection |
| Control preservation | PASS | All 372 inventoried files from the prior study retain their hashes |
| Browser form/decode | PASS | Chromium/WebKit, mobile width, missing ratings, download, automatic pause, key isolation and no external requests |
| Browser physical playback | PARTIAL | Chromium muted clock advances; known headless WebKit clock limitation; no physical audition inferred |
| Actual Apple M5 rendering | PASS | Existing frozen native shared-core binary executed |
| Fresh Linux/iPhone/WASM tests | NOT RUN | No result inferred from Mac execution |
| Speech completeness and musical improvement | NOT RUN | Energy retention cannot prove every quiet word survived or that transitions improved |
| Earlier owner quality acceptance | FAIL | Previous rejections retained; this packet has no listener acceptance yet |
| Q0 success criterion | PARTIAL | Controlled outputs exist; substantially less robotic music remains unproven |

The initial new invariant test correctly rejected deletion of the contrast
section's velocity-44 hats because the first guard only allowed velocity 34.
The guard now admits the frozen score's quiet hats up to 44 and tests rejection
of stronger hits and other notes. All tests pass after correction; no rendered
trial failed or was overwritten.

Actual environment: Apple M5, 16 GiB RAM, macOS 26.7.1 (25G241), Xcode 27.1,
Apple Clang 21.0.0, CMake 4.4.2, Python 3.14.6, FFmpeg 9.0.2. Exact versions
are retained in `toolchain.json`. The renderer/core were not rebuilt or changed;
their hashes and both immutable specifications are recorded in `preservation.json`.

No new dependencies, sample licenses, training, reference-audio incorporation,
cloud calls, spending or production changes. Existing CC0 instrument assets and
authorized source conditions remain as documented in the prior study; the
private owner recording must not be published. The finite musical vocabulary,
instrument realism and repeated broad form remain weaknesses. The next Q0
decision requires comparative listening; this study is not grounds to promote
the planner or begin a later milestone.
