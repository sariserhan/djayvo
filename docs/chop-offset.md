# Offset-resistant vocal pause detection

2026-10-19. **Technical fix PASS; musical benefit NOT RUN.** The shared vocal
slicer now subtracts the recording mean when measuring pause energy. Previously,
a constant electrical offset could keep the measured energy above the pause
threshold, forcing a short fallback crop even when a clear pause followed the
sound. The earlier analysis-offset fix did not cover this separate calculation.

The final change is limited to `chop_region` and its two callers in the rule
planner: onset crops and phrase fallback. The mean is calculated once during
planning. Source PCM, normalization, waveform-based edge selection, fades,
instrument events, analysis features, plan schema and renderer are unchanged.
The complete clean hook still uses the full original recording. No new dependency,
model, callback allocation or cloud processing is introduced.

## Reproduction and results

The new regression fails against the previous library
([receipt](evidence/chop-offset/before-tests.log)). It covers **48 combinations**:
8/44.1/48/192 kHz, short/extended club crops, zero/positive/negative offsets, and
onset/phrase-fallback selection. Known sound endings must survive a 10 ms internal
gap, retain attack context and yield a pause-ended crop without changing source
PCM or the complete hook. Existing no-pause, EOF, tiny-region, vocal-spacing,
source-preservation and callback-allocation checks remain active.

Six fresh PCM16 technical controls add a known 200 Hz pulse, an internal gap and
exact ±8192 integer offsets. They are **not speech** and do not replace or
regenerate the supplied synthetic-speech fixture. At 48 kHz, the first crop ends:

| Control | Sound ends | Before crop ends | After crop ends |
| --- | --- | --- | --- |
| Short, positive offset | 0.470 s | 0.338292 s | 0.475 s |
| Short, negative offset | 0.470 s | 0.340792 s | 0.475 s |
| Long, positive offset | 0.800 s | 0.518292 s | 0.805 s |
| Long, negative offset | 0.800 s | 0.520792 s | 0.805 s |

Offset controls recover the pause classification (heuristic confidence 0.65)
instead of the bounded fallback (0.3). These are heuristic labels, not measured
word-boundary probabilities. Zero-offset controls remain unchanged.

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Actual Apple M5 release | PASS | [15/15 suites](evidence/chop-offset/mac-tests.log), 41.86 s |
| Actual Linux arm64 release | PASS | [15/15 suites](evidence/chop-offset/linux-build-tests-render.log), 42.06 s; local VM, not physical Intel Linux |
| ASan/UBSan | PASS | [Final affected suite](evidence/chop-offset/sanitize-tests.log), 141.19 s |
| Existing owner/fixture music | PASS | All **65 original-input master/stem WAVs** and plans remain identical |
| Native portability | PASS | **107 exact Mac/Linux WAVs**: 101 primary master/stems plus six licensed-cohort master/stems; exact decisions and event frames, zero maximum/RMS PCM error |
| Saved-score compatibility | PASS | Eleven previous plans replay with **61 byte-identical WAVs**, including the old fallback crops |
| WASM engine | PASS | Seventeen native/WASM comparisons: seven fixture styles, four owner seeds, six controls; exact plans/events/WAVs, no observed analysis differences |
| Local web delivery | PASS | Rebuilt/audited public bundle and site copy; [HTTP hashes](evidence/chop-offset/http-engine.json) on ports 3000/4173 match the new engine |
| Broader speech behavior | PARTIAL | 140 validated plans for 20 licensed sources; one source changes crops across seven styles; no new listening judgment |
| New human quality / word accuracy | NOT RUN | No perceptual or verified word-boundary evidence supplied by these tests |
| Rendered browser / physical microphone / venue | NOT RUN | Node WASM and HTTP checks do not establish these layers |
| Full specification / production | PARTIAL | Existing M1, device, live and release gates remain open |

[Measurements](evidence/chop-offset/measurements.json) include per-file hashes,
before/after peak and PCM differences, cross-platform frame agreement, score
replays and cohort changes. The final 101 primary WAVs contain eight changed
files: master and vocal stems for the four offset controls. Instrument stems
remain unchanged. The saved-score checks preserve the old behavior explicitly;
fresh generation uses corrected pause energy.

## Broader impact and preserved alternatives

The read-only licensed-source audit keeps the original frozen evaluation study
intact. Nineteen sources have identical plans across all seven non-baseline
styles. Source `ls-1988-147956-0018` changes crops; one common end moves 373 frames
(7.771 ms) earlier. Club retains one additional pause-ended crop and changes
some clip references. Analysis, harmony, instruments, tempo and clean-hook bounds
remain identical. This is **not verified improvement in speech segmentation**.
Its existing [license and attribution scope](licensed-evaluation.md) continues
to apply; no individual study consent or new training permission is inferred.

Fresh playable club comparison:
[before](../renders/chop-offset-20261019/cohort-render/before.club.wav) /
[after](../renders/chop-offset-20261019/cohort-render/after.club.wav).
The two masters and all stems are separate from the frozen study. Linux output
is retained in `renders/arrangement-linux/chop-offset-cohort-20261019/`.

An initial candidate also centered waveform-edge selection. Its audit changed
111/140 plans across 16 sources. That extra change was removed: the final fix
retains the original edge rule for the original PCM and changes only pause energy.
Candidate logs, audit and audio remain under `candidate-centered-edges/` in this
evidence folder and `candidate-*` in the render folder. They are **not final-build
validation** or a promoted musical alternative.

Workflow failures are retained where available: the first additional WASM harness
used incorrect direction indices and could not find its requested output; it was
corrected to the existing C ABI mapping before the passing run. The first Linux
render attempt refused an already-created destination after all 15 tests passed.
Its cohort files were preserved separately, and the primary set was rendered to
a fresh destination ([final log](evidence/chop-offset/linux-render-final.log)).
The site audit initially ran from the repository root and could not find
`.next/static`; it passed from the site directory. None of these failures was
treated as passing engine evidence.

## Reproduce

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
cmake --build build-mac-sanitize --parallel 4
ctest --test-dir build-mac-sanitize -R '^remix_core$' --output-on-failure
sh scripts/web_build.sh
node apps/web/tests/wasm.mjs
node docs/evidence/chop-offset/wasm-check.mjs
```

`controls.py` creates six controls only in a fresh directory; `render-controls.py`
uses the existing CLI and refuses existing outputs. `cohort-probe.cpp` writes
native-validated diagnostic scores only in a fresh directory. The original
renderer/library and every comparison input are retained locally under
`renders/chop-offset-20261019/`. `measure.py` checks those fixed folders and
refuses to replace its report; choose fresh paths for another run.

Toolchains: Apple M5, 16 GiB, macOS 26.7.1, Xcode 27.1, Apple Clang 21.0.0,
CMake 4.4.2, Python 3.15.0, Node 22.23.1, Emscripten 6.0.1;
Linux arm64 GCC 12.2.0, CMake 3.25.1, Python 3.11.2. Actual
[Mac](evidence/chop-offset/mac-environment.json) and
[Linux](evidence/chop-offset/linux-environment.log) receipts are retained.
The local Linux container/VM are stopped afterward. No new paid compute, upload
or training occurred; `~/mlx-env`, master, source recordings and prior reviews
are preserved.

This is still energy-based slicing, not speech understanding. Nonstationary
noise, quiet consonants and ambiguous pauses need separate evidence; preserving
DC in source PCM also means this does not remove its playback transients.
