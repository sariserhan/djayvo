# Vocal boundary revision v3

Recorded 2026-10-17, America/New_York. **Technical checks: PASS. Musical-quality
assessment of v3: NOT RUN. Overall M0: PARTIAL.** The owner accepts v2 as a
prototype and wants production quality; this pass addresses a measurable crop
problem without treating that feedback as production acceptance.

## Change and scope

The previous planner ended every onset-derived chop about 250 ms after its
start, even during continuing sound. A regression with an active tone ending
at 470 ms reproduced the premature cut before implementation. The shared
planner now retains about 10 ms of attack pre-roll and searches up to 600 ms
from the onset for two consecutive 10 ms energy windows below 15% of the
strongest RMS encountered. Search eligibility starts at 120 ms. The selected
end is in the first quiet window, then adjusted within 2 ms toward zero.

Both onset-based and phrase-fallback crops use the same selector. Without a
pause, a bounded 250 ms crop remains with lower heuristic confidence (0.3
versus 0.65). These numbers are **not calibrated speech probabilities**.
Existing overlap/80 ms clearance checks accommodate the longer crops. Complete
hooks, instrument arrangement, sample bank, effects, schemas and C ABI are
unchanged. No new dependency or learned model is introduced.

This is energy-based selection, not word recognition: pauses can occur inside
words, starts can still fall inside a syllable, and two owner-voice candidates
still need the fixed-length fallback. Instrument realism remains open.

## Evidence

[Machine-readable measurements](evidence/vocal-boundaries/report.json),
[Mac environment](evidence/vocal-boundaries/environment.json),
[Linux environment](evidence/vocal-boundaries/linux-environment.txt), and the
[regression log](evidence/vocal-boundaries/regression.log) retain the results.

| Gate | Status | Observation |
| --- | --- | --- |
| Native M5 release / ASan+UBSan | PASS | 7/7 CTest suites each; 9 foundation and 11 remix test groups |
| Linux arm64 release | PASS | 7/7 suites in the existing isolated Debian 12 container |
| Crop regression | PASS | 8, 44.1, 48 and 192 kHz: attack pre-roll, sustained pause, ignored 10 ms dip, no-pause fallback, near-EOF onset and tiny phrase bounds |
| Linux/M5 plans and event frames | PASS | Exact structural plans and compiled event traces, three styles for both supplied fixture and owner voice |
| Linux/M5 PCM | PASS | All six masters have maximum/RMS difference 0; twelve fixture stems byte-identical |
| Block-size determinism | PASS | Owner voice masters exact at 512 and 113 frames |
| Complete speech hooks | PASS | Two per style; maximum decoded error 0.000024151, within 2 PCM16 LSB after gain/fades |
| Instrument isolation | PASS | All nine owner instrument stems byte-identical to v2 |
| Audio bounds and scores | PASS | 21 WAVs decoded, zero full-scale samples, peak below −1 dBFS, final 100 ms silent; nine valid score schemas |
| Original preservation | PASS | Master specification, supplied fixture and owner source SHA-256 unchanged; previous render directories retained |
| Matched audition preparation | PASS | Twelve copies at −25 LUFS ±0.2, measured true peak below −1 dBFS; originals untouched |
| Browser playback | PASS | Metadata, muted clock advance and exclusive playback checked; see browser evidence |
| Word-boundary accuracy | PARTIAL | Energy heuristic only; no semantic word boundaries |
| Owner feedback | PARTIAL | v2 accepted as a start; no v3 feedback yet |
| v3 listening / formal quality | NOT RUN | No ratings or musical-quality claims from signal checks |
| Physical Intel rerun / iPhone / AI / live / release | NOT RUN | Linux test is arm64 on the M5 host |

On the owner's source, 10 of 12 candidates find a pause. Mean RMS in a 20 ms
window centered on the candidate end drops from **0.0394596 to 0.0155876**.
One candidate's boundary energy increases; this is an aggregate diagnostic,
not proof of intelligibility or preference. Several candidates share an ending
because their onsets occur in the same continuous phrase.

The intended changes versus v2 yield these master waveform differences on the
same timeline (normalized full scale). These are revision differences, not
portability failures:

| Style | Maximum absolute difference | RMS difference |
| --- | --- | --- |
| Hip-hop | 0.3398743 | 0.0183843 |
| Reggae | 0.2821045 | 0.0123641 |
| Experimental | 0.3977966 | 0.0148591 |

Hardware: Apple M5, 10 cores, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1
(27A9275), SDK 27.0, Apple Clang 21.0.0, CMake 4.4.2, project Python 3.14.6.
Linux: Debian 12 aarch64, kernel 6.8.0-117, GCC 12.2.0, CMake 3.25.1,
Python 3.11.2. The existing project environments were used; `~/mlx-env` was
not modified. Reference music was not used as training data or engine samples.

## Audition and reproduce

Open the local [v3 comparison page](../renders/voice-boundaries-v3/review/index.html).
It pairs v2/v3 for seed 4123 and includes six v3 alternatives (4124/4125).
Listen for truncated syllables, excessive gaps and whether longer calls fit the
groove. Record style, seed, timestamp and the desired change. Earlier reference
and arrangement auditions remain linked. Private audio stays outside Git.

The following commands describe this evidence run. Choose fresh output paths
when repeating renders or smoke tests; do not replace existing recordings.

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
cmake --build build-mac-sanitize --parallel 4
ctest --test-dir build-mac-sanitize --output-on-failure
./build-mac/djayvo_remix --input renders/voice-20261017-221411/source-pcm.wav --consent --output renders/voice-boundaries-v3/remix --style all --stems
# Repeat with --seed 4124 / 4125 and separate seed-prefixed output paths.
# Existing Linux container: /src is this checkout read-only, /out is
# renders/arrangement-linux; build directory /work/build.
# Build/test there, then render the supplied fixture to /out/boundaries-v3/remix
# and consented source to /out/boundaries-v3/voice/remix.
DJAYVO_PYTHON="$PWD/.venv-build/bin/python3" \
DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/boundaries-v3/remix \
DJAYVO_OUTPUT_DIR=renders/boundaries-smoke-mac sh scripts/mac_smoke.sh
./build-mac/djayvo_remix --input renders/voice-20261017-221411/source-pcm.wav --consent --output renders/boundaries-block113/remix --style all --block-size 113
.venv-analysis/bin/python3 docs/evidence/vocal-boundaries/prepare-audition.py
.venv-analysis/bin/python3 docs/evidence/vocal-boundaries/verify.py
```

The audition script refuses an existing review directory. The verification
script can be rerun over the retained artifacts. Logs are stored alongside it.
No formal listening-dependent tracker item is closed by these checks.
