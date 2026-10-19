# Source pitch-contour experiment: no demonstrated listening benefit

2026-10-19. **Technical experiment PASS; owner listening PARTIAL; production
promotion FAIL; new model training NOT RUN.** The owner answered **“No clear
difference”** to the four After piano comparisons. This is an inconclusive,
informal observation, not a positive quality result or evidence of worse music.
The candidate was removed from the default engine. The existing Mac binary and
browser studio were restored and verified; no model weights were changed.

The owner deferred Spotify/YouTube integration and prioritized natural,
expressive improvisation. That priority does not establish professional quality,
waive evaluation, or authorize another paid rental. The master is unchanged.

## Candidate and outcome

The existing Call & Response planner preserves chronological source rhythm and
accents, but cycles chord tones without following local voice pitch. The research
candidate estimates periodicity in an 80 ms window at each selected attack:
block-average downsampling near 8 kHz, DC removal, a cumulative normalized
squared-difference curve, its first sufficiently deep minimum, and interpolated
period. It rejects very quiet/short windows and pitches outside the nominal
70–450 Hz range. At most eight selected attacks are examined during planning;
no inference or analysis enters the audio callback.

Relative pitch movement is limited to seven semitones and snapped to the current
chord within MIDI 60–84. The return shifts its target by two semitones. Noise and
unvoiced attacks retain the old rhythm-only melody. This is a bounded DSP
heuristic, **not a trained musical director**, speech understanding, or a reliable
full vocal contour tracker. Consonant-led attacks and octave ambiguity remain
limitations. There is no new runtime dependency or plan schema.

Only **3, 2, 3 and 3 piano pitches** changed across the four owner takes, ordered
by seed. All note times, durations, velocities and the voice/bass/drum
stems stayed identical. The candidate therefore made a small intervention, with
no evidence that it solved the owner's broader quality problem. Do not promote
it or use these pairs as positive preference-training labels.

[Four private comparisons](http://127.0.0.1:4194/review/) remain available, with
isolated stems. Before/After masters are gain-matched to −22 LUFS; clean hooks
remain within one PCM16 step of their expected samples. The retained labels are
not a blinded trial. The owner provided no take number, timestamp or per-pair
rating.

| Owner seed | Changed pitches | Maximum PCM difference | RMS difference |
| --- | ---: | ---: | ---: |
| 4123 | 3 | 0.17367554 | 0.00487961 |
| 4124 | 2 | 0.17486572 | 0.00379547 |
| 4125 | 3 | 0.19961548 | 0.00467225 |
| 4126 | 3 | 0.19351196 | 0.00491712 |

Differences use identical absolute frames, before gain matching. They establish
changed audio, not better music.

## Gates and reproducible evidence

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Defect control | PASS | [Corrected test against old library](evidence/source-contour/defect-reproduction.log) fails because rising/falling sources produce the same melody |
| Candidate controls | PASS | Rising/falling phrases; 8/44.1/48/192 kHz; stronger harmonics, gain/DC offsets, missing voiced first attack, noise, 30/500/1000 Hz rejection, short trailing input |
| Actual Mac native | PASS | [15/15 suites](evidence/source-contour/mac-tests-final.log); final cast-only remix rerun also passes |
| Actual Linux native | PASS | [15/15 suites and fresh renders](evidence/source-contour/linux-build-tests-render.log), local Debian arm64 container on M5; physical Intel machine NOT RUN |
| ASan/UBSan candidate | PASS | [Final affected remix suite](evidence/source-contour/sanitize-tests-final.log), 127.86 seconds |
| Mac/Linux agreement | PASS | 12 plans/event traces, 65 byte-identical master/stem WAVs; maximum/RMS PCM error zero |
| Compatibility | PASS | Seven other styles unchanged; five old scores replay exactly (25 WAVs) |
| Browser-engine agreement | PASS | 21 fixture comparisons across Node/Chromium/WebKit; four additional owner native/WASM plans, event traces and masters exactly equal |
| Private review | PASS | 20 players in each Chromium/WebKit; four pairs play/seek/pause exclusively, byte ranges and private-path isolation checked, mobile view inspected |
| Source and model preservation | PASS | Master, fixture, owner source, x/y/z and prior model artifacts retain hashes; original recordings and previous comparisons preserved |
| Studio restoration | PASS | [Receipt](evidence/source-contour/restoration.json): source equals starting HEAD, restored native executable byte-identical, restored browser engine served on port 3000 |
| Owner listening | PARTIAL | “No clear difference”; informal aggregate observation only |
| Demonstrated audible benefit / promotion | FAIL | Benefit was not established; candidate excluded from default studio |
| Formal listening / professional quality | NOT RUN | No controlled preference improvement or independent production acceptance |
| New optimizer training / cloud GPU / production learned director | NOT RUN | No new rental, upload, training, checkpoint update or release |

[Measurements](evidence/source-contour/measurements.json),
[candidate hashes and starting commit](evidence/source-contour/candidate-receipt.json),
[review browser receipt](evidence/source-contour/review-browser.json) and
[owner WASM comparisons](evidence/source-contour/owner-wasm.json) retain details.

The candidate implementation and regression test are retained as a
[patch](evidence/source-contour/candidate.patch) against `50f7079`, outside the
active core. Apply it only to an isolated checkout for reproduction. Build using
CMake and run CTest there. The existing
[source-motif render script](evidence/source-motif/render.py) generates the same
four owner and eight fixture plans into a **fresh** directory; use `--plans` for
old-score replay. Its original documentation covers the flags. Never regenerate
the supplied fixture. Local candidate binaries and WASM are retained under
`renders/source-contour-20261019/candidate/`; audio is under `before/audio/`,
`after/`, `replay/`, and `renders/arrangement-linux/source-contour-20261019/`.
The earlier intermediate audio is preserved under `initial-render/`.

From the repository root, restart the restricted review with
`node docs/evidence/source-contour/serve.mjs` and check it with
`node docs/evidence/source-contour/review-check.mjs`.
`owner-wasm.mjs` explicitly uses the retained candidate WASM, so it does not
silently test the restored production engine. `measure.py` expects these fixed
research paths and a fresh review directory. Neither recipe trains a model.

Initial failures are retained: the first new test fixture omitted positive
analysis peak/RMS fields and correctly failed validation in both native and
sanitizer runs. Those test fields were corrected before the meaningful old/new
regression comparison. Two new WASM narrowing warnings were removed with a
validated size conversion; two older crop-index warnings remain. A candidate
recheck refused to replace an existing output directory; it now allocates a fresh
one. These are not musical-quality findings.

Hardware/toolchain: Apple M5, 16 GiB, macOS 26.7.1, Xcode 27.1, Apple Clang 21,
CMake 4.4.2; local analysis Python 3.15.0, FFmpeg 9.0.2, Node 22.23.1.
Linux arm64: GCC 12.2.0, CMake 3.25.1, Python 3.11.2.
Emscripten 6.0.1; Chromium 149.0.7827.55 and WebKit 26.5.
Exact [Mac](evidence/source-contour/mac-environment.json) and
[Linux](evidence/source-contour/linux-environment.log) receipts are retained.
`~/mlx-env` was not used or changed. No account keys were read. The existing
Linux container and Colima VM were returned to their stopped state; the default
Docker context was not changed. The private review server remains running.

## Training work that remains

The [existing adapter](style-training-retry.md) learned from five provisional
30-second excerpts from two files. It has no paired source/response supervision,
verified independent sessions, or positive blinded preference evidence. The
owner's earlier “getting better” applied to pretrained clips, not proof that
this adapter improved them. Training loss and waveform differences cannot close
that gap.

The next training dataset should identify the input phrase, its first recognizable
musical response, subsequent development, voice/instrument roles, and session
provenance. Preserve full musical context for review, and split by session before
making excerpts. Existing x/y permission is retained; z remains unused for
fitting or tuning. Additional complete, cleared improvisation sessions and their
local paths were requested; none have been supplied in this turn so far.

Use accepted source/response examples and real preferences to train musical
decisions or rank validated candidate plans, then compare them against the
unchanged rule planner. Instrumental style adaptation remains a separate
experiment. Preserve the validated shared-engine boundary and offline fallback.
Select future models/checkpoints by actual blinded phrase connection, groove,
development, tone, transitions and endings, with same-style seed variety checks.
Do not train a preference model on this inconclusive aggregate response.

Dataset curation, paired supervision, new training and professional-quality
acceptance remain open. Any next paid run needs a concrete bounded experiment
and the separate authorization required by AGENTS.md. This report does not
claim to have finished training or achieved human-level musical quality.
