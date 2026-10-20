# Jamloom R0 report — 2026-10-20

**Current follow-up:** [Fresh portability and owner listening results](r0-validation-followup.md)
close the available Mac/Linux-VM/Chromium/WebKit execution checks with exact
three-arrangement agreement. The owner rejected all four original listening
candidates as robotic: owner acceptance **FAIL**, independent study **NOT RUN**.
Overall acceptance remains **PARTIAL**. The report below is the original R0
delivery snapshot; its historical failures and milestone state are preserved.

**R0 implementation is complete; overall evidence status: PARTIAL.** The available
foundation gates pass, but the original smoke command's historical-reference
comparison fails, current Linux execution is unavailable, and no human listening
study was performed. Stop here for review. No R1 collection or model training
has started. This report does not claim improved or professional musical quality.

Branch: `main`. Base commit: `d003751`. Original R0 implementation/evidence commit:
`c7b1b6a0ae1d59cd42116877f8d7039b4f846dd3`. Changes are local; no push/deploy.

Both specifications were read completely. The user-supplied root addendum is
preserved. The original master is unchanged: SHA256
`389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2`.
The supplied synthetic speech fixture is unchanged and was not regenerated:
`c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e`.
See [source freeze](evidence/r0/source-freeze.json).

## Gates

| Gate | Status | Evidence / scope |
| --- | --- | --- |
| Versioned musical taxonomy | PASS | 35 operations, six families, parameter contracts and schema references, conditions, failure modes, native actions, actual local audio examples in [techniques.yaml](../techniques.yaml) |
| Analyzer/director/engine architecture | PASS | [Architecture and C++ type mapping](improvisation_architecture.md); reuses actual `RemixPlan`, `PerformancePlan`, `Note`, `VocalEvent`, `MixPoint` |
| Versioned plan schema and validation | PASS | [1.0-r0 schema](../schemas/performance_plan.schema.json), existing strict native schema/importer, policy validation, actual replay; [validate command](evidence/r0/validate-command.json) |
| Source/provenance validation | PASS | [Dataset schema](../datasets/manifest.schema.json), five [original/synthetic records](../datasets/examples/r0-manifest.json); fail-closed scope, consent status, evidence hashes, withdrawal/expiry and split checks |
| Three distinct executable plans | PASS | Same preserved source/seed; different notes, tempo, sections, instruments and sample placements; [plan differences](evidence/r0/evaluation.json) |
| Actual playable audio | PASS | Three 32–32.97 second masters, instrument/vocal stems, fixed-loop control, canonical replay WAVs; hashes in [artifact inventory](evidence/r0/artifacts.json) |
| DSP/native regressions | PASS | 15/15 native CTest groups on actual M5; [smoke log](evidence/r0/mac-smoke.log) |
| R0 boundary/evaluation tests | PASS | 11 unittest methods, including 34 negative-case checks; [test log](evidence/r0/r0-tests.log) |
| Exact replay and instrument scheduling | PASS | Block sizes 512/113 produce identical WAVs and event traces; independent rational calculation of every instrument on/off frame; zero max/RMS PCM difference |
| Actual Mac execution / current-build comparison | PASS | Fresh M5 release build and renders match current R0 outputs exactly for all three styles; [comparison](evidence/r0/current-mac-comparison.json). This is Mac-versus-Mac, not new cross-OS evidence |
| Original `mac_smoke.sh` historical-reference comparison | FAIL | Script exits 1 because `renders/m0/remix` has different musical decisions/instruments; [failure](evidence/r0/historical-comparison.json), [diagnosis](evidence/r0/historical-reference-diagnosis.json) |
| Current Linux / physical CPU workstation execution | NOT RUN | Docker daemon unavailable and historical `colima-djayvo` context absent; no new Linux comparison claimed |
| Current WASM / iPhone / browser / website deployment | NOT RUN | Outside R0 scope; no shared native or app implementation changed |
| Human recognition, musicality, originality, preference | NOT RUN | n=0; no ratings, confidence intervals or effect sizes fabricated; blank review materials prepared |
| Third-party reference training authorization | NOT RUN | Downloaded performances not inspected/ingested in this milestone; ingestion and training disabled |
| Model training / paid infrastructure | NOT RUN | No model or paid service used; paid-service cost $0 |
| Overall R0 evidence | PARTIAL | Implementation and local technical foundation delivered; listening/generalization/current cross-platform evidence remains open |

## Completed source files and reuse

- [scripts/r0.py](../scripts/r0.py): bounded JSON/local-asset loading, fail-closed
  dataset validation, deterministic original-signal fixtures, rule candidate
  orchestration, canonical envelope, native replay, inspector/diff and evaluation.
- [schemas/performance_plan.schema.json](../schemas/performance_plan.schema.json):
  additive versioned envelope. Existing native event and schema identities remain
  unchanged. Seed/context/timeline/notes/clips/mix are owned by `execution`, avoiding
  conflicting copies of musical state. Offline controller priority and rejection
  fallback are explicit; the shared engine retains final scheduling authority.
- [datasets/manifest.schema.json](../datasets/manifest.schema.json),
  [example ledger](../datasets/examples/r0-manifest.json),
  [setup/reproduction](../datasets/README.md), pinned validation dependency.
- [techniques.yaml](../techniques.yaml): JSON-compatible YAML 1.2. Source capture,
  sampling, rhythm, harmony, arrangement and mix. Examples reference whole original
  test performances; they are context examples, not isolated technique ablations
  or human acceptance. Unsupported formant/semantic/live operations are listed.
- [tests/integration/verify_r0.py](../tests/integration/verify_r0.py): rights, malformed
  JSON, duplicate/leaked records, unsupported policy/assets, stale evidence,
  unschedulable/overlapping actions, polyphony, exact timing, structural diversity
  and taxonomy audio checks.
- [Architecture](improvisation_architecture.md) and [evaluation protocol/template](r0-evaluation-protocol.md).

The existing C++ rule planner, strict native importer, renderer, instruments,
completion verifier, independent WAV inspector and blinded listening preparation
are reused. No separate renderer, duplicated C++ command hierarchy or ML runtime
was introduced. This intentionally establishes a measurable foundation; it does
not make the unchanged planner more creative by relabeling it as AI.

## Plans and playable outputs

All candidates use the same original synthetic speech SHA256, seed 4123 and
48,000 Hz stereo PCM16 export. The canonical plan's source boundaries retain the
original rate/frame identity; native clip/analysis frames refer to resampled PCM.

| Candidate | Plan | Local playable master | Duration | Sample peak | Replay wall time |
| --- | --- | --- | ---: | ---: | ---: |
| Hip-hop | [plan](evidence/r0/hiphop.plan.json) | [WAV](../renders/r0-final-evaluation/rules.hiphop.wav) | 32.000 s | −7.890 dBFS | 3.346 s |
| Reggae | [plan](evidence/r0/reggae.plan.json) | [WAV](../renders/r0-final-evaluation/rules.reggae.wav) | 32.000 s | −7.828 dBFS | 5.013 s |
| Experimental | [plan](evidence/r0/experimental.plan.json) | [WAV](../renders/r0-final-evaluation/rules.experimental.wav) | 32.968 s | −7.060 dBFS | 2.193 s |

The initial three-candidate generation with stems took 30.168 seconds. These are
wall times under concurrent local checks, not isolated device speed guarantees.
All masters are non-silent, have zero full-scale PCM samples and stay below the
−1 dBFS sample ceiling. Native reports record zero nonfinite samples. Independent
replay and fresh Mac build comparison both have **maximum and RMS PCM error 0**.
Every compared instrument event frame agrees exactly. Source trigger frames are
not separately exposed by the legacy TSV; full PCM identity includes their audio.

Candidate pairs changed at least five structural dimensions. Note-event Jaccard
distances were 0.996885, 0.997126 and 1.0; these are numerical event differences,
**not** perceptual novelty, enjoyment or copyright-clearance scores.

[Stock-beat control](../renders/r0-final-evaluation/control.baseline.wav) and
[blinded listening packet](../renders/r0-final-evaluation/review/listener/index.html)
are local, along with blank CSV ratings. The previous rule planner is the same
engine: canonical replay is bit-identical, so a separate previous-model comparison
would currently duplicate an arm. No improvement claim follows from that equality.

Raw WAVs remain in ignored `renders/`, preserving existing privacy conventions.
JSON plans, event traces, statistics and hashes are committed; a checkout without
the retained fixture must obtain that fixture from the existing handoff, not
regenerate it. New output paths are required on reruns to preserve all recordings.

## Commands and results

```sh
JAMLOOM_PYTHON="$PWD/.venv-build/bin/python" \
JAMLOOM_OUTPUT_DIR=renders/r0-mac-smoke sh scripts/mac_smoke.sh
# Native: 100% tests passed, 0 tests failed out of 15 (343.95 s).
# Three completed native render exports.
# Final historical comparison: FAIL, exit 1; retained without changing tolerance.

.venv-analysis/bin/python scripts/r0.py fixtures --output renders/r0-final-fixtures
.venv-analysis/bin/python scripts/r0.py evaluate \
  --manifest renders/r0-final-fixtures/manifest.json \
  --renderer build-jamloom/jamloom_remix --output renders/r0-final-evaluation
# status PASS; three actual renders/replays, exact PCM/events, diverse plans.

.venv-analysis/bin/python tests/integration/verify_r0.py
# Ran 11 tests ... OK (see committed log for exact runtime).

.venv-analysis/bin/python scripts/r0.py validate \
  renders/r0-final-evaluation/hiphop.plan.json \
  --manifest renders/r0-final-fixtures/manifest.json --renderer build-jamloom/jamloom_remix
# PASS: schema, ledger, actual native import and render.

.venv-build/bin/python scripts/compare_portability.py \
  --reference renders/r0-final-evaluation/rules --candidate renders/r0-mac-smoke/remix \
  --candidate-metadata renders/r0-mac-smoke/environment.json \
  --report docs/evidence/r0/current-mac-comparison.json
# PASS for three current Mac outputs; all byte-identical. Not a Linux rerun.
```

Inspection/diff examples are retained in [inspection](evidence/r0/hiphop-inspection.json)
and [diff](evidence/r0/hiphop-reggae-diff.json). Full commands and interpretation are
in the evaluation protocol. The original failed comparison is a stale-baseline
mismatch: the historical reggae has piano while current reggae has organ, and
experimental now adds lead; clips, sections and notes changed in earlier work.
R0 made no C++ sound changes. Replacing old music or relaxing the comparison would
hide that distinction, so the failed historical gate remains explicitly recorded.

## Hardware, dependencies and rights findings

Actual Apple M5, 10 CPU cores, 16 GiB memory; macOS 26.7.1 (25G241), arm64;
Xcode 27.1 (27A9275), SDK 27.0; Apple Clang 21.0.0; CMake 4.4.2.
Native smoke Python 3.14.6; R0 validation Python 3.15.0 with existing jsonschema
4.19.2. [Environment](evidence/r0/mac-environment.json),
[Python packages](evidence/r0/python-packages.txt). No build tool installation or
change to `~/mlx-env` was needed. A pre-existing compiler warning is retained
in the smoke log; it did not fail compilation or tests.

One native replay profile measured 4.15 s wall, 0.75 s user + 0.08 s system CPU,
31,326,208 bytes maximum RSS and 29,835,672 bytes peak memory footprint:
[profile](evidence/r0/native-profile.log). This excludes Python evaluation memory;
no sustained thermal-throttling study or first-audible streaming measurement ran.

The ledger's five records are the retained eSpeak non-person speech fixture and
four original deterministic signals. All are **local evaluation only**; opt-in
training is false and distribution is denied. They do not constitute a diverse
human corpus or unseen held-out evaluation. Recorded-user/third-party ingestion
is deliberately closed until a separately reviewed rights workflow exists.

Existing acoustic/guitar CC0 manifests and original synthesis manifests are
pinned and audited by the native suite. Source-generation tool licensing is
separate from output permissions; the eSpeak developer tool is not linked into
Jamloom. The project outbound license remains unselected. No new third-party
material, downloaded performer recording, private voice or paid cloud was used.

## Limitations and recommended next milestone

- Acoustic analysis does not establish semantic words, useful meaning, speaker
  identity, accurate speech pitch contours or human recognizability.
- Current engine input remains 2–5 seconds. 1–8-second inputs, changing meter/key,
  symbolic chord labels, formant-preserving transforms and live AI override are
  not part of this supported offline contract. Chords are explicit sounding
  notes; context confidence is zero, not a fabricated harmonic estimate.
- The corpus gate is synthetic only. Current Linux/WASM/device execution,
  independent listeners, quality statistics, real microphone diversity,
  streaming latency and venue robustness remain unproven.
- Hash/split checks reject exact leakage but do not solve near-duplicate audio
  detection or validate third-party legal rights. Future withdrawal must remove
  derived assets and rebuild any affected trained artifacts; none exists here.
- Resource policy is bounded, not a guarantee of live CPU headroom. Sample-peak
  checks are not oversampled true-peak/loudness certification.

**Recommend R1: an explicitly authorized first-party demonstration/rights-ledger
workflow**, followed by the R2 listening study. Obtain clearance and training
opt-in separately from private remix consent. Do not begin either milestone or
train a model on the existing downloads without the required authorization.
