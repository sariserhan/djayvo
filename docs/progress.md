# Djayvo: M0 continuation evidence

Recorded 2026-10-17, America/New_York. The owner authorized continuing without
per-step approval, then requested a Mac handoff after finishing Linux work. The
master specification is unchanged. The original M0a record is
[m0a-report.md](m0a-report.md), with its initial Git commit `02d0e18`.

**Linux and Apple M5 technical checks: PASS. Overall M0: PARTIAL.** M0b/M0c
code and three complete recordings exist. Both the supplied synthetic speech
and one owner-consented human recording now render successfully. Human-recording
listening is **PARTIAL**: the owner accepts it as a start but reports awkward
experimental passages and game-like timbres, and requests more varied openings.
Recognition ratings remain **NOT RUN**. See [voice-trial.md](voice-trial.md).
Actual Apple M5 execution is now **PASS**, with the local results in
[mac-portability.md](mac-portability.md). M1 evaluation tools and a pilot are ready, without
claiming human evidence. No iPhone UI, AI model, training, or live mode was built.

| Gate | Status | Evidence |
| --- | --- | --- |
| Linux release build | PASS | Portable C++17 library, two CLIs, C ABI |
| C++ unit tests | PASS | 9 foundation + 6 remix test groups |
| C ABI | PASS | Source compiled as C calls a real render; error bounds/ABI checked |
| End-to-end tests | PASS | Original WAV, remix integration, comparison/listening tools; CTest 6/6 |
| ASan/UBSan | PASS | Same six suites; final run has no findings |
| Input decoding/bounds | PASS | PCM16/24/32 and float32, mono/stereo, odd chunks; corruption, NaN, silence, duration and permission rejection |
| Resampling | PASS | Identity, duration, round trip, above-Nyquist rejection |
| Analysis controls | PASS | Energy, phrases, onsets, coarse tone pitch; not a speech-recognition claim |
| Clean hook preservation | PASS | Source waveform retained within gain/edge-fade/PCM tolerances |
| Source-driven arrangement | PASS | Changed input rhythm changes chops and melodic response |
| Three independent strategies | PASS | Different tempi, bass/drum/piano grammars and vocal treatment at the same seed |
| Crop/event validation | PASS | No out-of-source reads; clean hook, overlap, release, duration and numeric constraints |
| Master and stem output | PASS | Three 20–40 s masters, four non-silent stems each, score/frame trace/report |
| Audio bounds/headroom | PASS | Independent decoding of all 16 master/stem/control WAVs; zero full-scale samples; finite engine output; silent final 100 ms |
| Determinism | PASS | 48 kHz speech remixes byte-identical at 512/113 blocks; 16 kHz integration repeats too |
| Formal export schemas | PASS | Preinstalled jsonschema 4.19.2 validates M0a/all remix exports; rejects recorded-kind without consent |
| Dependencies/assets | PASS | No third-party DSP runtime; procedural instruments; optional external speech tool inventoried |
| Master specification | PASS | Original SHA-256 unchanged |
| Consented human recording technical render | PASS | One owner-supplied 4.862 s source; three masters and 12 stems decoded; [trial](voice-trial.md) |
| Human speech recognition by listeners | NOT RUN | No actual listener observations |
| Owner listening | PARTIAL | Awkward experimental passages; all styles sound game-like; varied openings requested |
| Revised vocal spacing on M5 | PASS | Release + sanitizer CTest 6/6; duplicate chop starts and clean-hook overlaps removed; `evidence/vocal-spacing/` |
| Revised arrangement Linux/Mac comparison | NOT RUN | Prior M0d proof covers the original revision |
| M0d Apple M5 execution | PASS | Native arm64 release and ASan/UBSan 6/6 each; exact plans/event frames and byte-identical Linux/Mac masters; [evidence](evidence/m0d/report.json) |
| M1 blinded quality gate | NOT RUN | Synthetic pilot only; requires diverse consented sources and reviewers |
| M2 GPU/model benchmark | NOT RUN | Quality baseline and actual model measurements remain missing |
| M3 iPhone/device | NOT RUN | Portable C ABI ready; no device/UI work claimed |
| M4 live latency | NOT RUN | No real-time input/device measurements |
| M5 production release | NOT RUN | No publication or monetization |

The first sanitizer pass exposed a test-harness allocation/deallocation mismatch:
the allocation counter replaced throwing `new` but omitted the nothrow form used
by `stable_sort`. Matching overloads fixed it; checks were not disabled. The
initial failing log is retained as `evidence/m0/sanitizer-initial-failure.log`.
Final [release](evidence/m0/release-tests.log) and
[sanitizer](evidence/m0/sanitizer-tests.log) logs supersede that run.

## Recordings and measurements

Original input: `renders/fixtures/synthetic-speech.wav`, generated from the original
project phrase, 3.21129 s at mono 22.05 kHz. It is explicitly **not a person’s
recording**. Input SHA-256:
`c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e`.

| Master | BPM | Duration | Decoded sample peak | RMS L / R, dBFS |
| --- | --- | --- | --- | --- |
| `renders/m0/remix.hiphop.wav` | 96 | 32.000 s | -7.02432 dBFS | -25.98990 / -26.80066 |
| `renders/m0/remix.reggae.wav` | 80 | 32.000 s | -6.74673 dBFS | -26.00094 / -27.09516 |
| `renders/m0/remix.experimental.wav` | 124 | 32.96775 s | -7.05592 dBFS | -25.08490 / -25.64241 |

All are stereo PCM16 at 48 kHz, including two-second release space. None reaches
the master limiter’s knee. RMS includes the tail and is not integrated LUFS or
true peak. Full source is heard from the beginning, then cropped/arranged calls
and instrumental responses enter. Per strategy, `.piano.wav`, `.bass.wav`,
`.drums.wav`, and `.vocals.wav` share the exact timeline. Each also has
`.score.json`, `.events.tsv`, and `.report.json`.

`renders/m0/remix.baseline.wav` is the repeated original-loop comparison control.
`renders/listening-pilot/listener/` contains four anonymized, RMS-matched WAVs,
the source, blank ratings, and pairwise comparisons. Organizer keys stay outside
the listener folder. No listener IDs or ratings have been invented.

[Decoded measurements](evidence/m0/decoded-audio.json),
[all artifact hashes](evidence/m0/artifacts.json),
[48 kHz comparison self-test](evidence/m0/linux-comparison-selftest.json),
[integration evidence](evidence/m0/integration-validation.json),
[schema check](evidence/m0/schema-validation.json), and
[machine-readable gates](evidence/m0/report.json) retain the observations. The
Linux comparison explicitly leaves the Apple M5 gate NOT RUN.

## Reproduction and next machine

With CMake on PATH (here: `export PATH="/tmp/djayvo-build-tools/bin:$PATH"`):

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 4
ctest --test-dir build --output-on-failure
./build/djayvo_remix --input renders/fixtures/synthetic-speech.wav --synthetic-fixture --output renders/m0/remix --style all --stems
```

The prepared synthetic input travels in `dist/djayvo-mac-handoff.tar.gz` with Git
history and the Linux reference masters. See
[mac-agent-handoff.md](mac-agent-handoff.md) for verified transfer and
`sh scripts/mac_smoke.sh`. A self-contained signal fixture can also be recreated
with `python3 scripts/make_fixture.py`; the speech generator is optional. For
real recordings, pass `--consent` only with permission to process that input.

## Remaining limitations

Timbres are basic synthetic approximations. No acoustic instrument library or
perceptual evaluation exists. Analysis is energy/onset/autocorrelation DSP with
no word boundaries or reliable semantic labels. Pitch may have octave errors.
Varispeed couples pitch/time and can alias; independent pitch/time stretching,
reverb/delay, tempo maps, external JSON import, and automatic fallback from an AI
plan are absent. Silence is explicitly rejected. Mixing is fixed per grammar,
with smooth clean-hook ducking; the soft-knee stage can color overloads.

WAV is PCM16 without dither, capped by RIFF size. Stems do not promise exact
master reconstruction. The renderer is allocation-free in tests but not a live
device certification. Exports are synchronous, not transactional/cancellable;
run the C ABI off the UI/audio thread. Public C++ buffers are caller-owned and
must remain immutable during rendering. No live, battery, device route/session,
or privacy UI behavior is claimed.

Next: audition the validated Mac renders, collect consented source clips,
and use the preregistered [evaluation protocol](evaluation-protocol.md) to find
musical defects. Improve from those observations before model experiments. The
handoff carries all work needed to continue without per-step permission pauses.
