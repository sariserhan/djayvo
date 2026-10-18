# Djayvo: Apple M5 agent handoff

Continue without per-step approval. The owner authorized autonomous continuation
and asked to finish Linux work, then move to the Mac. Read `AGENTS.md` and the
complete master specification. Never modify the master; its SHA-256 is
`389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2`.

Update 2026-10-17: actual Apple M5 portability is **PASS**. See
[mac-portability.md](mac-portability.md) for the completed run, exact environment,
reproduction commands, and listening/recording next steps. The original Linux
handoff below is retained as historical context. Human quality remains **NOT RUN**.

Subsequent owner feedback is **PARTIAL** and led to an
[acoustic/arrangement revision](acoustic-review.md), tested natively on M5.
The transferred Linux references belong to the older engine. A subsequent
[arrangement revision](arrangement-review.md) has fresh **PASS** results against
actual Linux arm64 execution in an isolated local VM/container: exact plans/events
and 15 identical WAVs. Native M5 release and sanitizer suites pass 7/7 each.
This does not rerun the original physical Intel machine. Preserve the old
references and the owner's recordings. Read `docs/progress.md` for current gates.

Current v4 adds recorded piano dynamics and alternate piano/drum takes. See
[instrument-articulation.md](instrument-articulation.md): fresh M5/Linux checks
are **PASS**, with 18 matching WAVs; v4 listening remains **NOT RUN**.

For this revision, run the smoke test with `DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/articulation-v4/remix`
and a new `DJAYVO_OUTPUT_DIR`. The script now rejects existing output directories;
its default is timestamped. Do not compare the revised music to historical M0
renders as a portability test. All unchanged instructions below describe the
original transfer/checkpoint.

## Current state

Linux has working C++17 M0a instruments and M0b/M0c source-driven remixing:
three grammars, slicing, clean-hook preservation, WAV/stems, score JSON, source
SHA-256, frame traces, native validation, and C ABI. Release and ASan/UBSan CTest
suites are 6/6 PASS. See `docs/progress.md` and `docs/evidence/m0/`. No human
listening, real-person recording, Mac compile, GPU inference, or device result
has been claimed. No model or UI exists.

The fixture is **synthetic speech**, not consented human speech. External eSpeak
NG 1.52.0 generated original project text: “Say anything. Make music. This is
Djayvo.” Duration 3.21129 s, mono 22.05 kHz; SHA-256:
`c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e`.
The GPL developer executable/data is not linked or bundled. The actual WAV and
provenance travel in the transfer: **do not regenerate it** for comparison. The
Mac does not need eSpeak installed.

Known Mac: Apple M5, 16 GB unified memory, Xcode/developer account, verified MLX
environment in `~/mlx-env`. Keep it unchanged. A matrix demo is not a music-model
benchmark. No SSH host/address was provided and no remote access was attempted.

## Transfer and setup

Linux output `dist/djayvo-mac-handoff.tar.gz` has a SHA-256 sidecar. It contains
committed Git history, this handoff, synthetic input, and three Linux master
WAVs/scores/reports/frame traces. Audio stays outside Git. After transferring:

```sh
shasum -a 256 -c djayvo-mac-handoff.tar.gz.sha256
tar -xzf djayvo-mac-handoff.tar.gz
git clone --branch main djayvo-transfer/repository.bundle djayvo
cp -R djayvo-transfer/renders djayvo/renders
cd djayvo
```

Compare the checksum with the supplied sidecar. If a checkout already exists,
use a new sibling directory or carefully import the bundle; preserve user work.
If cloning an eventual remote, copy the same reference `renders/` separately.

## Run M0d on the actual M5

Use Xcode's toolchain. If CMake is missing, install the tested tool in a new
project environment, never `~/mlx-env`:

```sh
python3 -m venv .venv-build
.venv-build/bin/python -m pip install cmake==3.31.6
export PATH="$PWD/.venv-build/bin:$PATH"
sh scripts/mac_smoke.sh
```

The script rejects Linux, builds native arm64, runs all tests including C ABI,
renders the exact fixture, records CPU/compiler/platform, and compares Linux/Mac
plan decisions, compiled event frames, duration, and PCM. Outputs are
`renders/mac/remix.*` and `renders/mac/portability-report.json`. Decisions/event
frames must match exactly. PCM tolerances: maximum absolute error <=0.001, RMS
error <=0.0001. Hashes may differ. Apple M5 gate PASS requires a real
Darwin/arm64/Apple M5 environment record and successful comparisons.

Record actual toolchain/OS/results in new evidence. Investigate differing
analysis decisions at their threshold; do not loosen frame comparisons to hide
failures. Fix failures and rerun relevant checks before claiming PASS. Run a Mac
sanitizer build if supported by the actual toolchain.

## Listening and continuation

```sh
afplay renders/fixtures/synthetic-speech.wav
afplay renders/mac/remix.hiphop.wav
afplay renders/mac/remix.reggae.wav
afplay renders/mac/remix.experimental.wav
```

Have the owner audition and record observations. The existing single-source
pilot has no observations. `scripts/prepare_listening.py` prepares blinded,
RMS-matched candidates and blank ratings/pairwise forms. Follow
`docs/evaluation-protocol.md`: M1 requires diverse consented recordings and real
blinded responses. Do not infer recognizability, enjoyment, realism, or audible
style distinction from code alone.

The continuation instruction removes permission pauses, not evidence gates.
Advance work with valid prerequisites and keep missing observations open.
Avoid model training, cloud spending, publishing, App Store submission, and
artist/voice imitation. Improve timbre/arrangements from actual defects, then
test real consented input. AI planning needs the quality baseline and measured
Mac experiments. Future iPhone integration must use the tested C ABI
`djayvo_render_file` on a worker thread; do not duplicate the tick clock in Swift.
Only claim an iPhone app after an actual build/device test.
