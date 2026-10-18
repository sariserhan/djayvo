# Djayvo: actual Apple M5 portability

Recorded 2026-10-17, America/New_York, in the existing checkout. Engine base:
`1cb2e92`. Initial tracked working tree was clean. No clone, history import,
fixture regeneration, or writes to `~/mlx-env` were performed. The complete
master specification was read and its original SHA-256 remains unchanged.

**M0d portability: PASS. Overall M0: PARTIAL.** Human listening and a consented
human source test are **NOT RUN**. Automated results establish technical behavior,
not musical quality. No later AI, iPhone, live, or production gate was advanced.

## Actual environment

Apple M5, native arm64, 10 CPU cores, 17,179,869,184 bytes (16 GiB) memory.
macOS 26.7.1 (25G241); kernel 25.6.0. Xcode 27.1 (27A9275), SDK 27.0,
Apple Clang 21.0.0 (clang-2100.3.34.2). CMake 4.4.2 and Python 3.14.6 were
already installed; no build-tool installation was necessary. A fresh
`.venv-build` isolates the test interpreter. Full values and executable
architecture are in [environment.json](evidence/m0d/environment.json).

The initial smoke run passed, but CMake discovered Python inside the inherited
MLX environment despite the Python executable on PATH being outside it. The
smoke script now explicitly passes the selected interpreter to CMake, supports
`DJAYVO_PYTHON`, enables tests, verifies the supplied fixture hash before building,
and records OS, hardware, toolchain, and binary architecture. The initial and
final logs are retained. No engine changes or numerical tolerance changes were
needed. The complete release run was repeated with the project interpreter.

## Gates and numerical results

| Gate | Status | Actual evidence |
| --- | --- | --- |
| Transfer checksum and preserved fixture | PASS | Supplied sidecar verified; 14 render/provenance files copied without overwriting conflicts; `transfer.json` |
| Native arm64 release | PASS | `mac-smoke.log`; Mach-O arm64 binary |
| Unit, C ABI, integration, tooling | PASS | Release CTest 6/6; 9 foundation and 6 remix C++ groups included |
| Address/undefined behavior sanitizers | PASS | Native Debug CTest 6/6, no findings; `sanitizer.log` |
| Linux/Mac decisions and event frames | PASS | All three complete score objects equal, including analysis and mix; exact event TSV bytes |
| Linux/Mac waveform comparison | PASS | All three master WAVs byte-identical; maximum and RMS PCM error both zero |
| 512/113-frame block determinism | PASS | All three masters byte-identical on the M5 |
| Independent audio decoding | PASS | 16 non-silent master/stem/control WAVs; zero full-scale samples; silent final 100 ms |
| Blinded synthetic pilot preparation | PASS | Four RMS-matched coded files, original source, blank response and pairwise forms |
| Human recording test | NOT RUN | Owner requested help recording; no source supplied at report time |
| Human recognizability, enjoyment, audible variety | NOT RUN | No observations collected |
| M1 blinded quality baseline | NOT RUN | Synthetic pilot is not the required human dataset |
| M2 model, M3 iPhone, M4 live, M5 release | NOT RUN | Prerequisites remain open |

| Style | Event rows | Frames at 48 kHz | Seconds | Max / RMS PCM error | Peak dBFS | RMS L / R dBFS |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| Hip-hop | 394 | 1,536,000 | 32 | 0 / 0 | -7.02432 | -25.98990 / -26.80066 |
| Reggae | 402 | 1,536,000 | 32 | 0 / 0 | -6.74673 | -26.00094 / -27.09516 |
| Experimental | 648 | 1,582,452 | 32.96775 | 0 / 0 | -7.05592 | -25.08490 / -25.64241 |

Event rows refer to compiled instrument events. Voice decisions/timing are also
checked through complete score equality. PCM error uses normalized PCM16 sample
differences; permitted max <=0.001 and RMS <=0.0001 were unchanged. These results
apply to the supplied fixture, seed 4123, and this toolchain. Loudness is unweighted
full-file RMS, not integrated LUFS or true peak. No audible-glitch claim is made.

Machine-readable evidence: [gates](evidence/m0d/report.json),
[Linux comparison](evidence/m0d/portability-report.json),
[complete score comparison](evidence/m0d/analysis-comparison.json),
[block comparison](evidence/m0d/block113-comparison.json),
[decoded audio](evidence/m0d/decoded-audio.json),
[artifact hashes](evidence/m0d/artifacts.json).

## Reproduce

From the repository root, with the transferred `renders/` already present:

```sh
python3 -m venv .venv-build
DJAYVO_PYTHON="$PWD/.venv-build/bin/python3" sh scripts/mac_smoke.sh
cmake -S . -B build-mac-sanitize -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_OSX_ARCHITECTURES=arm64 -DDJAYVO_SANITIZERS=ON \
  -DBUILD_TESTING=ON -DPython3_EXECUTABLE="$PWD/.venv-build/bin/python3"
cmake --build build-mac-sanitize --parallel 4
ctest --test-dir build-mac-sanitize --output-on-failure
./build-mac/djayvo_remix --input renders/fixtures/synthetic-speech.wav \
  --synthetic-fixture --output renders/mac-block113/remix --style all \
  --stems --block-size 113
.venv-build/bin/python3 scripts/compare_portability.py \
  --reference renders/mac/remix --candidate renders/mac-block113/remix \
  --candidate-metadata renders/mac/environment.json \
  --report renders/mac-block113/comparison.json
```

Smoke reruns replace generated `renders/mac/remix.*` outputs. Keep personal
recordings and ratings in separate directories. The transferred Linux references
and input are never output destinations. Existing recordings were preserved on
import; conflicting destination contents would abort the copy.

## Audition and record your voice

For a simple unblinded M0 review, play the source then each full performance at a
comfortable volume:

```sh
afplay renders/fixtures/synthetic-speech.wav
afplay renders/mac/remix.hiphop.wav
afplay renders/mac/remix.reggae.wav
afplay renders/mac/remix.experimental.wav
```

Record the playback setup and, for each style, whether the original phrase is
clear, the groove is steady, instruments clash, the ending feels complete, and
any clicks/harshness/imbalance (include timestamps). Note your favorite and why.
Use PASS/PARTIAL/FAIL for actual observations; leave unheard aspects NOT RUN.

For the prepared blinded pilot, use only `renders/mac-listening-pilot/listener/`:
listen to `source.wav`, then the coded WAVs, and fill `responses.csv` and
`pairs.csv`. Keep `organizer-key.json` concealed until ratings are complete.
The forms are blank; preparation does not count as listening evidence. Follow
[evaluation-protocol.md](evaluation-protocol.md) before formal M1 evaluation.

To record your own 2–5 second phrase, open QuickTime Player, choose
**File > New Audio Recording**, select your microphone, press Record, speak,
then Stop and **File > Save**. Save locally in Downloads as
`djayvo-my-voice.m4a` and provide the actual path. QuickTime steps follow
[Apple's guide](https://support.apple.com/guide/quicktime-player/record-audio-qtpf25d6f827/10.5/mac/26).
UI control was unavailable in this session; no microphone recording was started.

The owner requested testing their own consented speech locally. Once supplied,
preserve the original, convert a copy to PCM16 WAV, render all three strategies
with `--consent` into a new ignored `renders/` directory, decode/check outputs,
then ask for actual observations. Do not commit private audio or transcripts.
Human evidence remains NOT RUN until those steps occur.
