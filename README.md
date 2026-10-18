# Djayvo

**Say anything. Make music.**

Djayvo turns short recordings into source-driven musical performances. The
portable C++17 prototype loads a 2–5 s WAV, finds energetic phrases and onsets,
preserves a clean hook, and renders three original 20–40 s arrangements:
hip-hop, reggae, and experimental, plus an explicit electronic club strategy. Each has independent piano, bass, drums, and
sampled source events, plus score JSON, frame trace, measurements, and optional
stems. No model, GPU, paid service, or third-party DSP library is required.

Track past work, open issues and future milestones in [TODO.md](TODO.md).

Latest musical work: [original club direction](docs/club-direction.md), with
bass-led drops, electronic drums, chord textures and three different openings.
[Listen locally](renders/voice-club-v7/review/index.html). Use `--style club`
(C ABI strategy 5); `all` keeps the original three styles. Nine M5/Linux test
suites pass, and the new cross-OS WAVs match exactly. Listening to this revision
is **NOT RUN**, and production quality remains **PARTIAL**.


**M0 overall: PARTIAL.** Earlier acoustic development: the owner has
auditioned a consented source and requested less game-like instruments and more
creative openings. The acoustic strategies use 53 cleared instrument recordings,
including three piano dynamics and alternate piano/drum takes, plus varied
openings, section breaks and pause-aware vocal crops. Owner review is **PARTIAL**:
fine as a start, with production quality still to improve. The owner specifically
reports v4 piano/drums “are fine”; formal evaluation is **NOT RUN**. Fresh Linux/M5 plans and event frames match;
six masters and twelve fixture stems are byte-identical. See
[instrument revision](docs/instrument-articulation.md), [current evidence](docs/progress.md)
and [Mac agent handoff](docs/mac-agent-handoff.md).

The [local recording workflow](docs/workflow-hardening.md) now converts a consented
M4A/WAV, renders all three styles/stems and creates a listening page in a fresh
folder. Exports are cancellable and include verified completion records. M5,
Linux and 33 offline benchmark renders pass; hosted CI execution is **NOT RUN**.

[Evaluation preparation](docs/evaluation-batch.md) now freezes a consent/source
ledger and engine/rubric hashes, renders three seeds and creates distinct blinded
packets. At that checkpoint eight M5/Linux test suites passed. The actual one-source pilot is complete;
the diverse dataset and independent human listening remain missing.

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 4
ctest --test-dir build --output-on-failure

# Original procedural test input; no external tools needed.
python3 scripts/make_fixture.py --output renders/fixtures/signal.wav
./build/djayvo_remix --input renders/fixtures/signal.wav --synthetic-fixture --output renders/demo/remix --style all --stems

# A recording you have permission to process locally:
./build/djayvo_remix --input /path/to/your-recording.wav --consent --output renders/my-remix --style all --stems
```

`--consent` confirms permission for that recording. `--synthetic-fixture` labels
generated non-person input; it must not claim consent for human audio. Processing
is local, with no recording, upload, or telemetry service. Original files are
unchanged, including protection against output/source aliases.
Choose a fresh output prefix for every run: existing exports are never replaced.
Check `PREFIX.complete.json` with `python3 scripts/verify_export.py PREFIX` before
consuming files. Ctrl-C cancels the CLI; interrupted `.partial` folders are
preserved if the process is killed before it can clean up.

Prepared speech demonstration:

- `renders/fixtures/synthetic-speech.wav` — original synthetic input
- `renders/m0/remix.hiphop.wav` — 96 BPM, 32 s
- `renders/m0/remix.reggae.wav` — 80 BPM, 32 s
- `renders/m0/remix.experimental.wav` — 124 BPM, 32.97 s

Each prefix also has `.piano.wav`, `.bass.wav`, `.drums.wav`, `.vocals.wav`,
`.score.json`, `.report.json`, and `.events.tsv`. `--style baseline` creates an
original fixed-loop control for listening comparisons. `renders/listening-pilot/`
contains level-matched anonymous candidates and blank response forms. These are
preparation artifacts, not listening results.

If CMake is missing, isolate the tested tool without touching an ML environment:

```sh
python3 -m venv .venv-build
.venv-build/bin/python -m pip install cmake==3.31.6
export PATH="$PWD/.venv-build/bin:$PATH"
```

The current Mac uses installed CMake and a separate `.venv-build` Python. The C interface
is `core/include/djayvo/djayvo_c.h`. Python >=3.9 is only for developer tools and
tests. The optional speech-fixture generator uses an external eSpeak NG
executable, which is not linked into Djayvo.

[Build commands](docs/build.md) · [Architecture](docs/architecture.md) ·
[Remix contract and limitations](docs/remix-architecture.md) ·
[Licenses](docs/licenses.md) · [Evaluation protocol](docs/evaluation-protocol.md)

Private audio, builds, and transfer bundles are ignored by Git. A small pinned
CC0 instrument bank is compiled into the engine with its license notices,
provenance, and hashes. The master specification remains unchanged.
