# Hip-hop composition variety

2026-10-18. **Technical implementation: PASS. Musical quality: PARTIAL;
new listening: NOT RUN.** The owner's complaint that successive hip-hop takes
reuse the same music had a concrete cause: seeds changed velocities, sample
takes and openings, while the main harmonic cycle and rhythm stayed fixed.

The shared planner now selects four minor-key chord cycles, four coordinated
kick/bass/chord rhythms and three swing amounts. Consecutive seeds rotate the
rhythm choices. A phrase repeats within the groove, then returns with bass
answers, stronger chord responses and restrained hat accents. The return
restarts the selected harmonic cycle; the ending resolves to the tonic.
All sustained pitches remain in the selected natural-minor scale.

This changes default hip-hop generation in the CLI, C ABI and rebuilt web engine.
It needs no new API, schema, asset or runtime dependency. Existing saved audio
is preserved, and explicit old scores remain replayable. The same source/seed
now produces a revised hip-hop arrangement; reproducing an older version requires
its saved score or prior engine revision. Reggae, experimental, club, baseline
and the owner's voice clips/events remain unchanged in the comparisons below.

This is a finite rule bank, not learned contextual direction. Repeated combinations
are possible. Apps currently draw random seeds; consecutive integer-seed rotation
is not a history-based duplicate filter for successive user takes. Adjacent-seed
rhythm variation and differing score structures do
not establish perceived novelty, coherence or performer-level quality. It does
not close C05/M1/M2, or add the instrument/effect roles still in the specification.

## Actual results

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Defect reproduction | PASS | New structural test fails against the preserved previous library: one harmonic cycle for 64 seeds; [log](evidence/hiphop-diversity/before-test.log) |
| Composition invariants | PASS | 64 seeds: 4 harmonic cycles, 12 drum shapes, 48 four-bar instrumental shapes; ignores velocities, sample takes, voice and intro. Recurring groove, developed return, scale membership and repeatability checked |
| Mac release / actual Linux arm64 release | PASS | 10/10 suites each; 18 native remix test groups; [Mac](evidence/hiphop-diversity/mac-tests.log), [Linux](evidence/hiphop-diversity/linux-build-tests.log) |
| Final M5 ASan/UBSan | PASS | 10/10 suites in 307.09 s; [final-source log](evidence/hiphop-diversity/sanitizer-tests.log). Earlier intermediate logs are retained separately |
| M5 smoke and portability | PASS | Actual `mac_smoke.sh` against fresh Linux results; 45 master/stem WAVs exactly identical, maximum/RMS error 0; score decisions and instrument event-frame traces agree |
| Speech fidelity | PASS | Four before/after owner voice stems byte-identical, including both clean hooks; voice clips/events unchanged |
| Saved-score replay | PASS | New engine reproduces all 8 artifacts, including 5 WAVs, from the previous owner hip-hop score; [receipt](evidence/hiphop-diversity/old-score-replay.json) |
| Unaffected styles | PASS | 20 fixture WAVs, scores and instrument traces for reggae/experimental/club/baseline match the prior renderer |
| WASM and bundle | PASS | Four default styles match native plans/events/master PCM; consent, invalid input, 44.1 kHz resampling and private-audio bundle checks pass |
| Private review page | PASS | Chromium/WebKit load 8 players, play/pause/seek and single-player exclusivity; no console errors or overflow at 1280/375/320 px |
| New human listening | NOT RUN | No listening ratings invented; automated muted playback is not a hearing test |
| Whole specification / production quality | PARTIAL | Missing features, formal evaluation and release gates remain in [the ledger](spec-status.md) |

The four owner pairs change the instrumental body from one shared pitch/timing
structure to four distinct structures. All renders are 32 seconds at 48 kHz.
Maximum / RMS waveform differences from the same-seed previous master:

| Seed | Maximum absolute difference | RMS difference |
| --- | --- | --- |
| 4123 | 0.499512 | 0.035321 |
| 4124 | 0.440247 | 0.026020 |
| 4125 | 0.539856 | 0.040368 |
| 4126 | 0.435699 | 0.030631 |

These differences are expected arrangement changes, not portability errors or
quality scores. All 45 checked WAVs stay below the -1 dBFS sample ceiling, have
zero full-scale samples and a silent final 100 ms. Four native owner renders
including stems took 0.847–1.016 s each while other checks ran; this is a small
observation, not a worst-case performance benchmark. Full measurements, hashes
and frame comparisons: [machine evidence](evidence/hiphop-diversity/measurements.json).

## Private audition

Open [four matched before/after pairs](../renders/hiphop-diversity-20261018/review/index.html).
Compare the After versions with each other from 0:05, then the returns at 0:20.
The eight review files measure -22 LUFS; measured true peaks are -4.7 to -6.1
dBFS. Versions are labeled, not blinded. Originals and stems remain beside the
review folder. This owner's speech stays local and is not cleared for independent
reviewer distribution. No new rental, voice upload, training or publication.

The review flow tested is local page → play Before → play After (Before pauses)
→ seek to 29.5 s → pause. Page identity, meaningful content, visible controls,
console health and desktop/mobile screenshots were checked. The Browser plugin's
required JavaScript execution tool was unavailable; the existing autonomous
local-validation fallback used installed Playwright. Details and screenshot paths
are in [browser evidence](evidence/hiphop-diversity/browser.json); physical Safari,
browser microphone and audible listening are **NOT RUN** in this change.

## Reproduction

Keep all existing output directories. Use a fresh name if rerunning these commands.
The supplied synthetic speech fixture must not be regenerated.

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
build-mac/djayvo_remix --input renders/voice-20261017-221411/source-pcm.wav \
  --consent --style hiphop --seed 4123 --stems --output renders/NEW/after-4123
DJAYVO_PYTHON="$PWD/.venv-build/bin/python" \
DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/hiphop-diversity-20261018/fixture \
DJAYVO_OUTPUT_DIR=renders/NEW-smoke sh scripts/mac_smoke.sh
sh scripts/web_build.sh
python3 scripts/verify_web_bundle.py
```

For the four comparison pairs, repeat owner rendering for seeds 4123–4126 using
the preserved previous renderer (`26d2b1f`) and this revision with `before-` /
`after-` prefixes. Render the existing fixture with `--style all`, `club` and
`baseline`, using `fixture`, `club`, `baseline` prefixes. Run the same new renders
in the existing Linux container under `/out/hiphop-diversity-20261018`; the source
is mounted read-only under `/src`. Native source/build lives separately under
`/work/hiphop-diversity`. Use a final-source Release build and all CTest suites.
The frozen evidence script [measure.py](evidence/hiphop-diversity/measure.py)
verifies exports, compares all PCM/plans, preserves the inputs and creates a new
exclusive review folder. It expects the four default WASM renders in `wasm/`.
The [browser check](evidence/hiphop-diversity/browser-check.mjs) exercises that page.
The [WASM check](evidence/hiphop-diversity/wasm-check.mjs) rejects an existing
output directory; set its output path to a fresh directory when repeating it. Two existing WASM
warnings about bounded source-buffer index narrowing remain recorded in its build
log; native builds introduce no warnings.

Hardware/toolchain: actual Apple M5, arm64, 16 GiB, macOS 26.7.1 (25G241),
Xcode 27.1 (27A9275), Apple Clang 21.0.0, CMake 4.4.2, isolated Python 3.14.6.
Actual local Linux arm64 container: GCC 12.2, CMake 3.25.1, Python 3.11.2;
this is not a physical Intel rerun. Emscripten 6.0.1; Node and browser versions
are retained with the evidence. `~/mlx-env` was not used or changed.
