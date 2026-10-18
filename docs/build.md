# Reproducible builds

The continuation adds `djayvo_remix`, C-ABI smoke tests, and a total of **six**
CTest suites in the original continuation, now **seven** including asset integrity.
Current native M5 release/sanitizer and Linux arm64 runs pass all seven; see
[workflow-hardening.md](workflow-hardening.md). For the current engine, also read
[remix-architecture.md](remix-architecture.md) and
[mac-agent-handoff.md](mac-agent-handoff.md).

Validated Linux environment: x86_64, GCC/G++ 15.2.0, CMake 3.31.6, GNU Make 4.4.1,
Python 3.14.4, glibc 2.43. Project requirements are CMake >=3.20, C++17, and
Python >=3.9 for the integration test. No Python package is needed for tests.
If Python is absent, CMake builds the engine/unit test but omits integration;
that is a partial validation, not a full M0a test run.

That x86_64 environment is the original checkpoint. Current validation uses
native M5 and Debian 12 aarch64 (GCC 12.2/CMake 3.25.1). Hardware/toolchain records
are linked in [the current report](workflow-hardening.md). The committed
Linux/macOS CI matrix is prepared; hosted execution is **NOT RUN**.
Optional actual-M4A integration requires installed FFmpeg/ffprobe:
`python3 tests/integration/verify_recording.py --renderer build-mac/djayvo_remix`.

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 4
ctest --test-dir build --output-on-failure
./build/djayvo_tests
./build/djayvo_render --output renders/m0a --seed 4123 --sample-rate 48000 --block-size 512
python3 scripts/inspect_wav.py renders/m0a.wav --report renders/m0a.decoded.json
```

For an isolated CMake install if it is missing:

```sh
python3 -m venv .venv-build
.venv-build/bin/python -m pip install cmake==3.31.6
export PATH="$PWD/.venv-build/bin:$PATH"
```

To run the end-to-end check explicitly and retain its JSON evidence:

```sh
python3 tests/integration/verify_render.py --renderer build/djayvo_render --output renders/verification
```

This renders identical seeds with different block sizes, a different seed,
and a 44.1 kHz variant; decodes PCM independently; and tests malformed CLI values
and a destination that cannot be created. `validation.json` records the gates.
Byte equality is scoped to a fixed executable/toolchain, not promised across
libm implementations.

Sanitizer build (GCC/Clang):

```sh
cmake -S . -B build-sanitize -DCMAKE_BUILD_TYPE=Debug -DDJAYVO_SANITIZERS=ON
cmake --build build-sanitize --parallel 4
ctest --test-dir build-sanitize --output-on-failure
```

On macOS, use Xcode's C++ toolchain and a CMake installation. The actual M5
checkpoint is now complete; the following commands are also available for M0a:

```sh
cmake -S . -B build-mac -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES=arm64
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
./build-mac/djayvo_render --output renders/m0a-mac --seed 4123
python3 scripts/inspect_wav.py renders/m0a-mac.wav --report renders/m0a-mac.decoded.json
afplay renders/m0a-mac.wav
```

For M0d compare score JSON, onset/offset frame calculations, output duration,
test results, peak/RMS, and decoded waveform error between machines. Do not use
different WAV hashes alone as evidence of a portability failure. The source has
no architecture-specific intrinsics or OS dependencies. Actual macOS execution
is recorded; iPhone/device testing remains NOT RUN.

After intentionally changing a score or synthesis formula, re-render and update
hashes/measurements alongside a reviewed evidence report. The immutable baseline
specification SHA-256 is
`389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2`.
