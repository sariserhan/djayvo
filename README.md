# Djayvo

**Say anything. Make music.**

Djayvo will turn short recordings of speech, laughter, and everyday sounds into
original musical performances. This repository currently implements **M0a only**:
a portable offline instrument engine and an original four-bar piano, bass, and
drum composition. Vocal remixing, AI, live input, and iPhone UI are later work.

M0a technical validation: **PASS** on Linux. Human listening: **NOT RUN**.
macOS/Apple Silicon execution: **NOT RUN**. Overall review status: **PARTIAL**
until the recording is auditioned. See [the evidence report](docs/progress.md).

Build with CMake >=3.20, a C++17 compiler, and Make or Ninja. Python >=3.9 is used
only for independent integration verification. There are no third-party engine
libraries, downloaded sound assets, paid services, or GPU requirements.

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 4
ctest --test-dir build --output-on-failure
./build/djayvo_render --output renders/m0a --seed 4123
python3 scripts/inspect_wav.py renders/m0a.wav --report renders/m0a.decoded.json
```

The renderer creates `renders/m0a.wav`, `renders/m0a.score.json`, and
`renders/m0a.report.json`. The WAV is 48 kHz, stereo PCM16: **9.6 s music + 2 s
release tail = 11.6 s**. Open it in any WAV player; on macOS use
`afplay renders/m0a.wav`. The four sections are intro, groove, variation, ending;
the harmonic progression is Am9, Fmaj7, G6, Am9. Tracks have independent rhythms,
velocities, gains, and pans. Seed changes give small deterministic variations,
not different composition strategies.

If CMake is absent, install the tested build tool in an isolated environment:

```sh
python3 -m venv .venv-build
.venv-build/bin/python -m pip install cmake==3.31.6
export PATH="$PWD/.venv-build/bin:$PATH"
```

This Linux run used `/tmp/djayvo-build-tools` for that environment. No existing
MLX/Python environment was changed. Build details and macOS commands are in
[docs/build.md](docs/build.md); design and license records are in
[docs/architecture.md](docs/architecture.md) and [docs/licenses.md](docs/licenses.md).

Generated audio/build directories are ignored by Git. Small score, measurement,
hash, and test-log evidence is retained in `docs/evidence/`. The original
`ai_improvisational_musician_master_spec_v1.md` is unchanged and remains the source
of truth, with Djayvo taking precedence as the product name.
