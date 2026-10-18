# M0a evidence and review

Recorded **2026-10-17, America/New_York**, in
`/home/ssari/projects/djayvo`. The repository initially contained only the master
specification. It was read completely before implementation. A local Git
repository named `djayvo` was initialized; no remote was created or contacted.

**M0a technical result: PASS. Overall review status: PARTIAL.** The code, automated
tests, and actual WAV are ready for review; human listening has not been done.
This is not a musical-quality approval. Work stops at M0a.

| Validation gate | Status | Actual evidence |
| --- | --- | --- |
| Linux release build | PASS | GCC 15.2.0, CMake 3.31.6; library, renderer and tests built |
| C++ unit tests | PASS | 9/9 groups in `evidence/release-tests.log` |
| End-to-end WAV integration | PASS | Independent Python decode, score checks, CLI failure checks; CTest 2/2 overall |
| AddressSanitizer / UndefinedBehaviorSanitizer | PASS | Debug build; same CTest suites 2/2; no reported sanitizer findings |
| Musical timing and long-render drift | PASS | 100001 rational-grid points beyond 24 h within half a frame; exact onset checks |
| Note-off / release / polyphony | PASS | Scheduled onsets, ending silence, overlapping unisons, 128-voice boundary and rejection above it |
| Instrument audio correctness | PASS | Piano/bass frequency and octave checks, velocity energy, nonzero distinct drum sounds |
| Headroom and clipping | PASS | Overload limiter test; decoded demo peak -5.87654 dBFS; zero full-scale PCM samples |
| Deterministic reproduction | PASS | Same seed and executable: byte-identical WAV across 512/257 blocks; C++ float equality across 1/257/4096 blocks |
| Configurable rate/block/meter | PASS | C++ 8/44.1/48/96/192 kHz and 7/8; separate end-to-end 44.1 kHz render |
| Processing-path allocation check | PASS | No observed C++ heap allocations during a complete render |
| Dependency/license/source inventory | PASS | No third-party DSP or imported audio; exact local tool/runtime notices inventoried |
| Master specification unchanged | PASS | SHA-256 matches the pre-implementation baseline |
| Human listening and musical quality | NOT RUN | No listener observations collected |
| macOS / Apple Silicon build and output | NOT RUN | Linux environment only; reproduction instructions provided |
| iPhone/device integration | NOT RUN | Outside M0a; no UI or wrapper implemented |
| Cross-platform byte-identical synthesis | NOT RUN | Not promised; libm/compiler floating-point differences may occur |

The machine-readable summary is [evidence/report.json](evidence/report.json).
Raw [release](evidence/release-tests.log) and
[sanitizer](evidence/sanitizer-tests.log) logs retain the actual test output.
The [integration evidence](evidence/integration-validation.json) includes
independent measurements and 35 piano, 15 bass, and 47 drum notes (194 note-on/off
events total). All named gates use PASS, PARTIAL, FAIL, or NOT RUN.

## Output and measured audio

Audition `renders/m0a.wav` (local generated artifact; excluded from Git). Score
and report are `renders/m0a.score.json` and `renders/m0a.report.json`. Small copies
of the [score](evidence/m0a.score.json) and
[engine report](evidence/m0a.report.json) are retained in Git. The code is in
`core/`, with the executable in `build/djayvo_render`.

| Measurement | Decoded WAV result |
| --- | --- |
| Encoding | Stereo, signed PCM16, 48 kHz |
| Musical duration | Four 4/4 bars at 100 BPM = 9.6 s |
| Export duration | 11.6 s / 556800 frames including 2 s tail |
| File size | 2227244 bytes |
| Sample peak | 0.5083618164 / -5.87654 dBFS |
| RMS left / right | -22.80873 / -23.70774 dBFS, including tail |
| Full-scale PCM samples | 0 |
| Engine nonfinite samples | 0 |
| Demo limiter-affected samples | 0 |
| Final 100 ms peak | 0 |
| Maximum adjacent-sample step | 0.22265625 (includes intentional percussion noise transients) |

WAV SHA-256:
`e183a5a2e009e29a54e9d7e61c22b47a3648d34c8b232797fc9cc2aa9afeaaee`.
Hashes and sizes are in [evidence/artifacts.json](evidence/artifacts.json);
independent PCM statistics are in [evidence/m0a.decoded.json](evidence/m0a.decoded.json).
The mastering ceiling is -1 dBFS; no normalization is applied, and the demo
retains headroom. RMS values are not integrated LUFS or true-peak measurements.

## Reproduction

The tested CMake was installed in an isolated `/tmp` virtual environment because
the workstation lacked CMake. With CMake on PATH, run from the repository root:

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 4
ctest --test-dir build --output-on-failure
./build/djayvo_render --output renders/m0a --seed 4123
python3 scripts/inspect_wav.py renders/m0a.wav --report renders/m0a.decoded.json
```

Use `/tmp/djayvo-build-tools/bin/cmake` and
`/tmp/djayvo-build-tools/bin/ctest` in this workspace if PATH has not been set.
See [build.md](build.md) for installation, sanitizers, explicit integration
verification, and the unexecuted Mac commands. [architecture.md](architecture.md)
defines timing, synthesis, schema, mixer, and future integration boundaries;
[licenses.md](licenses.md), [dependencies.json](dependencies.json), and
`assets/manifests/m0a.json` record dependencies and source provenance.

## Known limitations and next steps

Instruments are basic procedural approximations; acoustic realism, timbral
balance, groove, and enjoyment are unassessed. The arrangement is short and fixed
in structure; seed changes alter dynamics/noise, not strategy. There is no input
WAV loader, vocal transformation, AI, external score importer, tempo map, MIDI-file
import/export, sample-rate conversion, effects chain, stems, or UI. An 8 kHz plan
cannot use pitches beyond the synthesis bandwidth. Voice count is capped at 128;
excess plans fail validation. WAV export uses PCM16 without dither and has the
RIFF size limit. The memoryless limiter can change timbre when overloaded.
Actual playback-device behavior, perceptual clicks, LUFS/true peak, mobile CPU,
and macOS numerical differences have not been evaluated. A processing-path
allocation check is not a live-audio certification.

Recommended next action is human audition using
[evaluation-protocol.md](evaluation-protocol.md) and review of these limitations.
After review and explicit authorization, M0b should load a consented 2–5 s WAV,
preserve a recognizable crop, and render the first 20–40 s vocal arrangement.
Schedule the real Mac portability checkpoint early before the core expands.
M0c, AI work, and iPhone UI remain unstarted. No further milestone is authorized
by completing this one.
