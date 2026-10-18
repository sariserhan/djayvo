# Tempo changes and mix automation

Recorded 2026-10-18. **Engine timing/mix implementation: PASS. E12 and overall
specification: PARTIAL. Human acceptance of these changes: NOT RUN.** The master
is unchanged. This closes the missing tempo-map and track-automation code in
§3.1; it does not close the remaining instrument, effect or quality requirements.

The shared C++17 engine now accepts step changes in tempo and smooth track
level/stereo movement. Notes, releases, vocal entrances, echo repeats, ending
validation and stems share the same timeline. The renderer precomputes map
endpoints and allocates its cursors before processing. The audio callback does
not allocate. Existing default arrangements remain unchanged; these controls
are available through native plans and validated offline CLI imports. Automatic
creative selection and app editing controls are not implemented by this change.

## Contract

Active timeline fields export as `1.3-remix` or instrumental `1.1-m0a`.
Older plans replay unchanged and reject the new fields rather than ignoring them.
Both schemas, native validation, score export, import, portability comparison and
the existing voice-transform/echo preparation tool understand the new contract.

```json
"tempo_changes": [
  {"start_tick": 30720, "tempo_milli_bpm": 108000},
  {"start_tick": 38400, "tempo_milli_bpm": 84000}
]
```

The initial `tempo_milli_bpm` applies from tick zero. Up to 64 changes must be
strictly ordered inside the musical duration, each 30–300 BPM. The final tempo
continues into echo tails. These are step changes, not continuous tempo ramps.
Source clips keep their sample duration and pitch unless their separate voice
transform fields request a change.

Each instrument track can have up to 128 `automation` points containing
`start_tick`, `gain_db` (−60..12) and `pan` (−1..1). The first point must be at
zero and match the track's base mix. Points increase within the music duration,
with at least `floor(sample_rate / 200)` frames between them (about 5 ms).
The renderer linearly interpolates stereo amplitude coefficients between
equal-power endpoints. It does not interpolate dB values or maintain constant
power throughout a pan sweep. The final coefficient holds through release tails.
Instrument-room reflections and existing hook/kick ducking retain their behavior.
There is no vocal gain/pan automation in this contract.

The constant-tempo clock retains its exact integer formula. With a tempo map,
each segment retains 32 fractional frame bits, rounded upward, before rounding
the absolute accumulated position to the nearest frame. Pre-round error is less
than `65 / 2^32` frames; an exact rational result extremely close below a half-frame
boundary could consequently select the adjacent frame. There is no per-event
rounded-duration accumulation. Long-timeline tests compare against independent
exact-rational values at four sample rates.

## Validation and gate results

| Gate | Status | Evidence |
| --- | --- | --- |
| M5 release | PASS | [10/10 suites](evidence/timeline/mac-tests.log); foundation 12 groups, remix 19 groups |
| Linux arm64 release | PASS | [10/10 suites and detailed groups](evidence/timeline/linux-build-tests.log) |
| M5 ASan/UBSan | PASS | [10/10 final-source suites](evidence/timeline/sanitizer-tests.log) |
| Timing/automation oracle | PASS | [Core details](evidence/timeline/core-details.log): 8/44.1/48/192 kHz, 65 tempo segments, crossing notes, redundant changes, independent stereo envelope, release holds and block identity |
| Source/echo/stems | PASS | [Remix details](evidence/timeline/remix-details.log): exact source region, echoes crossing tempo change, low-gain stem reconstruction and no callback allocation |
| Import and export | PASS | [90 rejected candidates, five-style replay, timeline replay](evidence/timeline/plan-import.log); [both schema versions](evidence/timeline/schema.log) |
| Actual M5 smoke script | PASS | [Fresh execution](evidence/timeline/mac-smoke.log), [M5 environment](evidence/timeline/mac-environment.json), [three-style comparison](evidence/timeline/portability-report.json) |
| M5/Linux event frames and PCM | PASS | [Measurements](evidence/timeline/measurements.json): all 40 WAVs byte-identical, maximum/RMS cross-platform PCM error zero |
| Legacy behavior | PASS | 25 old/default WAVs unchanged, including the actual owner control and four default styles |
| WebAssembly | PASS | [12 foundation groups](evidence/timeline/wasm-core.log), [four default styles, consent, invalid input and 44.1 kHz duration](evidence/timeline/wasm.log), [bundle check](evidence/timeline/bundle.log) |
| Browser audition mechanics | PASS | [Chromium/WebKit report](evidence/timeline/browser.json): eight players, no autoplay, play/seek/pause exclusivity, no console errors or horizontal overflow at 375/320 px |
| Human listening, novelty, recognizability | NOT RUN | Muted browser automation and waveform tests cannot supply these judgments |
| Expanded instruments/effects and full spec | PARTIAL | Guitar articulation, organ, pad/lead, feedback reverb/delay, other strategy breadth and formal evidence remain in [TODO](../TODO.md) |
| Learned director, phone, live infrastructure, release | NOT RUN | No new execution or deployment in this phase; prior evidence and holds remain |

Desktop Chromium and 320 px WebKit screenshots were visually inspected. The
browser plugin's required Node REPL/tool-search runtime was unavailable, so the
installed Playwright fallback was used. Checks used local `file://` playback;
this is not proof of microphone capture, deployed hosting or perceived sound.
Screenshots remain in `/tmp/djayvo-timeline-*-*.png`; assertions are committed.

## Private owner comparisons

Open [the eight-player review](../renders/timeline-20261018/review/index.html),
or run `open renders/timeline-20261018/review/index.html` from the repo root.
Listen from 0:10 for the break/level movement and from 0:20 for the return.
Four versions share the same notes and source choices: control, tempo changes,
mix movement, and both. Voice-only tracks help isolate timing. This is a labeled
developer demonstration, not a blinded evaluation or automatic composition.

| Mix | Duration | Original LUFS | Original true peak | Max / RMS change from control |
| --- | --- | --- | --- | --- |
| Control | 32 s | −23.3 | −7.0 dBFS | 0 / 0 |
| Tempo | 32.158729 s | −23.2 | −7.5 dBFS | 0.452789 / 0.035747 |
| Mix movement | 32 s | −23.7 | −7.5 dBFS | 0.159851 / 0.007739 |
| Combined | 32.158729 s | −23.6 | −7.5 dBFS | 0.449921 / 0.034519 |

PCM change compares the first 1,536,000 stereo frames at their original absolute
positions, without time alignment; longer tails are excluded and separately
reported. It measures a changed waveform, not better music. The first 20 seconds
of isolated voice, including both clean hooks, are identical in all versions;
instrument automation leaves the entire voice stem unchanged. Tempo-mapped
fragment starts after the return are 1,000,000 / 1,173,333 / 1,224,762 frames,
versus control 1,005,000 / 1,200,000 / 1,245,000 at 48 kHz.

All mix listening copies measure −22 LUFS, with true peaks −5.7 to −6.3 dBFS.
Voice-only players retain their original level. Master/stem samples stay below
the −1 dBFS ceiling and the final 100 ms are silent. Local SHA-256 records retain
every WAV and prove the master, supplied fixture and owner source unchanged.
No cloud call, new recording, reference-track training or publication occurred.

## Reproduction and toolchain

The fresh owner/fixture renders were produced by
[`render.py`](evidence/timeline/render.py); it refuses an existing destination.
Linux used the same source/candidates in `/work/timeline/build/djayvo_remix`,
with outputs at `renders/arrangement-linux/timeline-20261018`. Run
`.venv-analysis/bin/python docs/evidence/timeline/measure.py` only with a fresh
review destination; it also refuses to replace listening copies.

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
ctest --test-dir build-mac-sanitize --output-on-failure
sh scripts/web_build.sh
python3 scripts/verify_web_bundle.py
```

The new core tests also run directly in WASM:

```sh
. build-web-tools/emsdk/emsdk_env.sh
em++ core/tests/tests.cpp build-web/libdjayvo_core.a -Icore/include \
  -std=c++17 -fexceptions -sENVIRONMENT=node -sALLOW_MEMORY_GROWTH=1 \
  -sSTACK_SIZE=2097152 -sWASM_ASYNC_COMPILATION=0 -o build-web/timeline-tests.js
node build-web/timeline-tests.js
```

Actual Mac smoke uses the current Linux fixture prefix and a fresh output:

```sh
DJAYVO_PYTHON="$PWD/.venv-build/bin/python" \
DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/timeline-20261018/fixture \
DJAYVO_OUTPUT_DIR=renders/timeline-smoke-20261018 \
sh scripts/mac_smoke.sh
```

Recorded [Mac metadata](evidence/timeline/mac-environment.json) and
[additional tool versions](evidence/timeline/toolchain.json):

Mac: Apple M5 arm64, 10 cores, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1
(27A9275), SDK 27.0, Apple Clang 21.0.0, CMake 4.4.2, Python 3.14.6.
Linux: Debian arm64 in the isolated Colima profile, GCC 12.2, CMake 3.25.1,
Python 3.11.2. Original physical Intel execution remains NOT RUN.
Web: Emscripten 6.0.1, Node 22.23.1, Playwright 1.61.1, Chromium
149.0.7827.55, WebKit 26.5. Analysis: FFmpeg 9.0.2, NumPy 2.5.4,
jsonschema 4.19.2 in the existing project analysis environment. `~/mlx-env`
was not modified. Existing bounded 64-to-32-bit source-index warnings in the
WASM arrangement build remain; no new warning was introduced by this feature.
