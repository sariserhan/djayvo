# R0 validation follow-up — 2026-10-20

**R0 implementation and available portability checks: PASS. Overall acceptance:
PARTIAL. Owner listening acceptance of the original R0 packet: FAIL.**

This follows the owner's request to finish the remaining R0 checks. It adds
fresh execution evidence and records actual listening feedback. No engine,
planner, schema, model, dependency or master specification was changed. No
training, cloud spending or publication occurred.

R0 implementation commit: `c7b1b6a0ae1d59cd42116877f8d7039b4f846dd3`.
Source checkout tested: `b163094c2aafb95279ceffa7f72c3f621366867d`.
The follow-up evidence commit is available with
`git log -1 --format=%H -- docs/r0-validation-followup.md`.

## Validation gates

| Gate | Status | Current evidence |
| --- | --- | --- |
| R0 taxonomy, schema, provenance and rules baseline | PASS | Original implementation unchanged; all 11 R0 tests rerun successfully |
| Mac build and native tests | PASS | Actual M5 release configuration/build; 15/15 test groups, 29.62 seconds |
| Mac smoke against current R0 reference | PASS | Complete smoke command exits zero using its existing explicit reference override |
| Linux native build and tests | PASS | Fresh GCC build in existing Debian arm64 container on Colima Linux VM; 15/15 groups, 31.38 seconds |
| Linux rendering/export validation | PASS | Three actual arrangements and stems; all 26 completion-manifest artifacts verified |
| Chromium/WebKit WASM execution | PASS | Actual browser workers render the three R0 arrangements; existing test also exercises four other styles |
| Plan/event/PCM agreement | PASS | All three arrangements match R0 on all four execution targets; 1,002 instrument-event rows per target agree exactly; maximum/RMS PCM error zero; WAVs byte-identical |
| Historical M0 versus current planner comparison | FAIL | Original failure preserved: different musical decisions and instruments, not the same plan; historical files/tolerances unchanged |
| Owner listening acceptance | FAIL | One owner reports all four blinded candidates awkward and robotic, including voices and instruments |
| Independent listener study / quality thresholds | NOT RUN | No independent panel, numeric ratings, recognition score, confidence intervals or effect sizes |
| Physical Intel Linux workstation / iPhone | NOT RUN | Linux evidence is arm64 virtualization on the Mac; phone work remains paused |
| Python R0 harness on Linux | NOT RUN | Container lacks jsonschema; harness reran on Mac, native Linux suite passed separately |
| Fresh WASM compilation | NOT RUN | Existing bundled WASM executed; its hash recorded, no recompilation required for this unchanged core |
| Model training / paid services / deployment | NOT RUN | No new model or infrastructure spend |

Reports and exact logs are in [evidence/r0-followup](evidence/r0-followup/).
The prior [R0 report](r0-report.md) remains the full implementation inventory.

## Portability interpretation

The earlier Docker failure was caused by the existing local VM being stopped.
Starting the existing `djayvo` Colima profile restored the container and toolchain;
no Linux image download or dependency installation was needed. The container's
repository mount is read-only. Its existing output mount was used with a new
directory, preserving old recordings. The container and VM were stopped again
after validation; the user's original `desktop-linux` Docker context is unchanged.

Mac: Apple M5, 10 CPU cores, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1
(27A9275), SDK 27.0, Apple Clang 21.0.0, CMake 4.4.2, Python 3.14.6.
Linux: Debian 12 aarch64, kernel 6.8.0-117-generic, GCC 12.2.0,
CMake 3.25.1, Python 3.11.2, existing VM configured with 2 CPUs/3 GiB.
Browser tests: Node 22.23.1, Playwright 1.61.1,
Chromium 149.0.7827.55 and WebKit 26.5.

The current reference is the preserved R0 output, not a replacement for M0 music.
Hip-hop/reggae have 1,536,000 frames and experimental 1,582,452 frames at 48 kHz.
Exact decisions, instrument event frames and WAV bytes match on Mac, Linux,
Chromium and WebKit. The independent rational timing checks also pass in the
R0 tests. This is offline rendering evidence, not measured physical output latency
or uninterrupted venue playback.

The initial browser command used `/studio/`, which Next redirected to `/studio`;
the test's relative worker URL then resolved incorrectly. Repeating with the
actual `/studio/index.html` entry point passed. The failed log is retained.
No application/security setting was changed. An auxiliary Linux metadata probe
found `file` unavailable; the retained metadata records the executable SHA-256 and
ELF header directly instead of installing a diagnostic utility.

## Actual listening feedback and diagnosis

The owner reviewed the existing four-candidate packet at
`http://127.0.0.1:4195/`, block `23719ea28e95b1e222c4df87`, and said:

> all of them are awkard, too robotic the voice and background instruments and everything are too robotic

[Feedback record](evidence/r0-followup/owner-feedback.json). This is one actual
owner observation covering all four candidates, not four independent listeners.
No candidate was accepted. No recognition judgment, numerical rating or comparative
preference was supplied; blank response CSVs remain blank.

[Arrangement inspection](evidence/r0-followup/arrangement-diagnostics.json)
establishes:

- The source is the retained synthetic speech fixture. It is suitable for exact
  regression testing, but limited as a natural-voice quality example.
- All 25 vocal events across the three arrangements use rate 1, no pitch shift,
  no stretch and no reverse. The renderer's known formant/stretch limitations
  therefore cannot explain these particular outputs via those transforms.
- All bass notes, all reggae/experimental drum notes and all experimental lead
  notes start on the sixteenth-note grid. Piano timing and note velocities already
  vary, so the engine is not simply using constant velocity everywhere.
- Reggae uses the original synthesized organ; experimental includes synthesized
  lead. Other tracks use the existing sampled instruments. The owner rejected
  the overall instrument sound; correct note scheduling does not resolve that.

These are observed properties and candidates for investigation, **not proven
perceptual causes**. Synthetic speech does not explain away the instrument
criticism. Adding random timing or a model would not establish improvement.

Recommended next quality work: compare isolated voices/instruments, examine
repeated attacks and note releases, and evaluate restrained groove/articulation
changes against the unchanged baseline. Preserve phrase identity and purposeful
rhythm; do not add arbitrary jitter merely to avoid a grid. Require real listening
acceptance before claiming an improvement or moving to learned-planner training.

## Natural-voice diagnostic, not an improved version

A separate packet is available at **http://127.0.0.1:4196/**. It renders the same
unchanged engine with the owner's previously consented 4.862-second speech,
three arrangements and a stock-loop control. Original consent covers local
analysis/remixing/private audition only. This is not third-party ingestion,
independent-review distribution or training data.

Source hash, generated file hashes and paths are retained in `artifacts.json`;
raw voice and WAVs remain local/ignored. The existing completion verifier and
listening preparation verify the exports and source linkage. Both listening pages
and all five WAVs per page were fetched over loopback and matched local bytes.
Natural-voice musical quality is **NOT RUN** until the owner actually evaluates
this separate packet. No better-sounding result is claimed.

## Reproduction

From the repository root, use fresh output directories on reruns:

```sh
JAMLOOM_PYTHON="$PWD/.venv-build/bin/python" \
JAMLOOM_REFERENCE_PREFIX=renders/r0-final-evaluation/rules \
JAMLOOM_OUTPUT_DIR=renders/r0-portability-mac-20261020 \
sh scripts/mac_smoke.sh

.venv-analysis/bin/python tests/integration/verify_r0.py

colima start --profile djayvo
docker --context colima-djayvo start djayvo-portability
docker --context colima-djayvo exec djayvo-portability sh -c \
  'cmake -S /src -B /tmp/jamloom-r0-20261020 -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=ON -DPython3_EXECUTABLE=/usr/bin/python3 &&
   cmake --build /tmp/jamloom-r0-20261020 --parallel 2 &&
   ctest --test-dir /tmp/jamloom-r0-20261020 --output-on-failure'
docker --context colima-djayvo exec djayvo-portability sh -c \
  'mkdir /out/r0-portability-20261020 &&
   /tmp/jamloom-r0-20261020/jamloom_remix --input /src/renders/fixtures/synthetic-speech.wav --synthetic-fixture --output /out/r0-portability-20261020/remix --style all --stems &&
   python3 /src/scripts/verify_export.py /out/r0-portability-20261020/remix'

JAMLOOM_STUDIO_URL=http://127.0.0.1:3000/studio/index.html \
node apps/web/tests/browser-render.mjs
JAMLOOM_BROWSER=webkit \
JAMLOOM_STUDIO_URL=http://127.0.0.1:3000/studio/index.html \
node apps/web/tests/browser-render.mjs
```

Browser runs print their output directories. Compare each three-style prefix
using `scripts/compare_portability.py --reference renders/r0-final-evaluation/rules
--candidate PREFIX --candidate-metadata ENVIRONMENT_JSON --report NEW_REPORT_JSON`.
Use the Node executable recorded in the preceding R1 reports for exact version
selection. Stop only the container/VM started for this check after completion.

Natural-voice diagnostic:

```sh
build-mac/jamloom_remix --input renders/voice-20261017-221411/source-pcm.wav \
  --consent --output renders/r0-natural-voice-diagnostic-20261020/remix --style all --stems
build-mac/jamloom_remix --input renders/voice-20261017-221411/source-pcm.wav \
  --consent --output renders/r0-natural-voice-diagnostic-20261020/control --style baseline --stems
.venv-build/bin/python scripts/prepare_listening.py \
  --renders renders/r0-natural-voice-diagnostic-20261020/remix \
  --baseline-renders renders/r0-natural-voice-diagnostic-20261020/control \
  --source renders/voice-20261017-221411/source-pcm.wav \
  --output renders/r0-natural-voice-diagnostic-20261020/review
```

This completes the available R0 technical revalidation. Musical acceptance
remains failed for the reviewed set; no training or broader milestone completion
is inferred.
