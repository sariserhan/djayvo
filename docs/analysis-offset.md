# Preserve phrase analysis when recordings contain a constant offset

2026-10-19. **Technical fix PASS; musical improvement NOT RUN.** The shared
analyzer now measures attacks, pauses and rough pitch on centered samples.
It reuses the recording mean already calculated by the silence gate. Source
PCM, raw peak/RMS reporting and peak-safe playback normalization stay intact.
This applies to native CLI/C ABI and the rebuilt browser WASM engine; there
is no new API, dependency, model or audio-callback work.

Previously, the analyzer rejected pure electrical offset but included that
offset when analyzing usable sound. The resulting envelope could hide pauses,
lose attacks or invent voicing in noise. That can change the musical response
even when the underlying phrase is identical. The new regression fails against
the preserved previous library and passes after the fix.

## Measured behavior

A local test copy of the owner's already-consented recording adds exactly
8192 to every signed PCM16 sample in both channels (+0.25 full scale). No sample
clips; the original is untouched. This is an artificial offset control, not
another independent recording or evidence of a faulty physical microphone.

| Analysis | Old analyzer on offset control | Corrected analyzer on offset control |
| --- | --- | --- |
| Attacks | 6, including a false attack at frame 0 | 15, exactly matching the unmodified source |
| Phrase start/end | 0 / 233376 | 46560 / 164640, exactly matching the unmodified source |
| Rough pitch | 148.148148 Hz | 145.454545 Hz, matching the unmodified source |

The pitch comparison establishes offset invariance, not ground-truth pitch
accuracy. The existing autocorrelation heuristic can still make octave errors.
The control's master changes by maximum 0.2574462891 and RMS 0.0158160249
normalized PCM at identical frames. Those values measure change, not quality.
All **65 original-input master/stem WAVs remain byte-identical** before/after.
All **70 new master/stem WAVs match exactly between Mac and Linux**: maximum
and RMS differences zero, with exact musical decisions and event frames.
Six previous Call & Response scores replay with 30 identical master/stem WAVs.

Playable local files:

- [Owner Call & Response mix](../renders/analysis-offset-20261019/after/owner-4123.call_response.wav)
  and [piano stem](../renders/analysis-offset-20261019/after/owner-4123.call_response.piano.wav): unchanged audio.
- Artificial-offset control's piano response
  [before](../renders/analysis-offset-20261019/before/offset.call_response.piano.wav) /
  [after](../renders/analysis-offset-20261019/after/offset.call_response.piano.wav):
  original render levels, not loudness-matched and not a blinded listening trial.

The existing [Blood Club A/B/C comparison](http://127.0.0.1:4195/review/) and
training checkpoints are unaffected. No new training, upload or rental occurred.

## Gates and evidence

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Defect reproduction | PASS | [Old-library regression failure](evidence/analysis-offset/before-tests.log); attacks change under offset |
| Analysis regression | PASS | Five rates (8/16/44.1/48/192 kHz), two signal amplitudes, positive/negative offsets, exact attacks/boundaries, noise voicing, raw levels/gain and unchanged input |
| Apple M5 native | PASS | [15/15 suites](evidence/analysis-offset/mac-tests.log), 35.36 s |
| Linux arm64 native | PASS | [15/15 suites and renders](evidence/analysis-offset/linux-build-tests-render.log), 36.17 s; local isolated VM, not the physical Intel computer |
| ASan/UBSan | PASS | [Affected remix suite](evidence/analysis-offset/sanitize-tests.log), 141.49 s |
| Portability and saved-score replay | PASS | [Measurements](evidence/analysis-offset/measurements.json): 13 native comparisons, 70 exact WAVs, six old-score replays |
| WASM engine | PASS | Seven fixture strategies plus four owner seeds and offset control: 12 native/WASM comparisons, exact event frames and PCM |
| Public bundle preparation | PASS | Rebuilt WASM, offline manifest and audited site studio; private audio remains excluded |
| Local engine delivery | PASS | [HTTP receipts](evidence/analysis-offset/http-engine.json): ports 3000 and 4173 serve the exact rebuilt WASM hash; existing tabs may need a reload |
| Rendered browser / physical microphone | NOT RUN | Node WASM execution is not browser interaction or microphone evidence |
| New owner listening / formal musical improvement | NOT RUN | Automated checks cannot establish either |
| Overall musical improviser / production readiness | PARTIAL | Existing M1, independent training data, live/device and release gates remain open |

The first strict WASM score-byte assertion failed on the offset control:
`pitch_confidence` differed by **2.220446049250313e-16**. Inspection found no
other field difference; WAV bytes were already identical. The corrected check
requires exact plan decisions, onset/phrase arrays, event frames and WAVs, and
measures numeric analysis fields with a 1e-12 bound. This follows the existing
portability policy of separating analysis arithmetic from musical decisions;
no frame or PCM threshold was relaxed. The [initial failure](evidence/analysis-offset/owner-wasm-initial.log)
and [final result](evidence/analysis-offset/owner-wasm.json) are retained.
An initial control-generation assertion incorrectly assumed mono input; the
owner's source is stereo. It failed before creating any file and was corrected
to preserve both channels. Linux uses the existing `colima-djayvo` context;
its container and VM were returned to their stopped state after validation.

Hardware/toolchain: Apple M5, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1
(27A9275), Apple Clang 21.0.0, CMake 4.4.2, Python 3.15.0, Node 22.23.1,
Emscripten 6.0.1. Linux: Debian arm64, GCC 12.2.0, CMake 3.25.1, Python
3.11.2. [Mac receipt](evidence/analysis-offset/mac-environment.json) and
[Linux receipt](evidence/analysis-offset/linux-environment.log) retain versions.
The master, supplied synthetic speech and owner original hashes remain exact;
`~/mlx-env` was not used or changed.

## Reproduce and limits

From the repository root:

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
sh scripts/web_build.sh
node apps/web/tests/wasm.mjs
node docs/evidence/analysis-offset/wasm-check.mjs
```

Fresh native exports use the existing
`docs/evidence/source-motif/render.py --renderer PATH --output NEW_DIRECTORY`;
`--plans OLD_DIRECTORY` replays saved scores. The offset control transformation
and hashes are in [control.json](evidence/analysis-offset/control.json). Load the
stereo PCM16 source, add 8192 in signed 32-bit arithmetic, assert every sample
remains in [-32768,32767], and write a **new** PCM16 WAV with the original format.
Render it with `--consent --style call_response --stems --seed 4123` using old
and new binaries. Never replace the source or regenerate the supplied fixture.
The preserved old renderer is `renders/analysis-offset-20261019/djayvo_remix`.
[measure.py](evidence/analysis-offset/measure.py) checks the recorded folders
and refuses to overwrite its existing report; use new paths for a fresh run.

This is analysis centering, not destructive audio repair or a new musical
director. It does not remove DC from playback, change raw-level mix controls,
redesign crop zero-crossing selection, handle changing offset/noise, or solve
semantic word boundaries. General pitch accuracy and musical creativity remain
separate work. The frozen evaluation cohort and all previous review audio are
preserved; no new perceptual benefit is claimed for the unchanged owner mixes.
