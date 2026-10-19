# Validated offline plan replay and fallback

2026-10-18. The engine previously wrote JSON scores but could not consume them.
The CLI accepts an existing or edited `1.0-remix` score, validates it and
renders the actual proposed notes and voice events through the same C++ clock.
No model/provider call, training, cloud upload or paid service is involved.
This completes a local prerequisite for constrained direction; M1/M2 remain open.

## Usage

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 4
# Choose a fresh output prefix and the source used to create this score.
./build/djayvo_remix --input /path/to/source.wav --consent \
  --style hiphop --seed 4123 --sample-rate 48000 \
  --plan /path/to/remix.hiphop.score.json --output renders/replayed --stems
python3 scripts/verify_export.py renders/replayed
```

Plan seed, style, source hash and sample rate must match the explicit request.
`--style all` is ambiguous and rejected with `--plan`. Source consent comes from
the caller, never the document. Use `--synthetic-fixture` only for generated
non-person inputs. The original recording is read and preserved.

An invalid plan normally fails before export. Add **`--plan-fallback`** only when
you want rejection to select the existing deterministic rule planner for the
requested style/seed. It makes one attempt, no retries or model calls. Consent,
bad source audio, export collisions, write failures and cancellation do not get
silently retried. This is a rule-planner fallback, not the stock-beat evaluation
control (which remains `--style baseline`).

Completed imports include `planning.mode` (`imported` or `fallback`) and
`planning.candidate_sha256` in the completion record. The hash is null when a
candidate cannot be read within the file budget. Detailed rejection messages
appear on stderr without echoing document contents. Ordinary rule exports retain
their previous completion format. `verify_export.py` checks the optional receipt.
The completion record itself is local metadata, not a cryptographic signature.

## Boundary

The parser is confined to the offline CLI, using C++17 standard-library code.
The shared engine gains an optional native plan/receipt argument and revalidates
that plan against the actual source before publication. The existing C ABI and
apps keep their default rule workflow. No allocation/parser/provider code runs
inside the render callback; no third-party runtime dependency was added.

- Regular local file only; maximum 4 MiB, 16 nested levels, 100,000 parsed values
  and 128 characters per string. These import limits can be stricter than the
  schema's theoretical note count. Strings in this schema are printable ASCII;
  escaped ASCII is supported. Other Unicode and control strings are rejected.
- Reject duplicate keys (after escape decoding), unknown fields, trailing data,
  malformed/nonfinite numbers, wrong types, fractional integer fields and
  unsupported versions, instruments, sound banks or actions.
- Verify original/processed source length/rate/hash, explicit permission kind,
  request identity, clip IDs and the fixed hook-duck setting.
- Reuse native validation for tempo, bars, section coverage, 20–40 s duration,
  2–5 s source, event/sample bounds, note releases, room tails, mix levels,
  128 instrument voices, 16 source voices and at least one clean hook.
- Sustained pitched notes must belong to the declared natural minor key, or
  major key in version **1.7-remix**. Older versions reject major; see
  [mode validation and current evidence](session-modes.md). Short
  chromatic notes up to half a quarter note are allowed, including the existing
  baseline's passing tone. This is a limited tonal constraint, not proof of good
  harmony, phrase intelligibility or musical coherence.

Analysis fields remain bounded caller-provided features tied to the source hash;
the importer does not claim their estimates are ground truth. The native file
path also analyzes the actual input and rejects silence. A plan cannot point to
an external instrument, audio asset, executable or network URL.

## Evidence

| Gate | Status | Evidence |
| --- | --- | --- |
| Native M5 release | PASS | 10/10 suites; actual `scripts/mac_smoke.sh` against preserved Linux reference |
| Linux arm64 release | PASS | 10/10 suites in existing isolated VM/container |
| M5 address/undefined-behavior sanitizers | PASS | 10/10 suites; parser and render path exercised without sanitizer findings |
| Five-style round trip | PASS | 40 artifacts (WAVs, scores, reports, events) identical after import at a different render block size |
| Edited musical plan | PASS | Changed note velocity survives export and changes PCM; imported content is actually rendered |
| Adversarial rejection / fallback | PASS | 50 invalid candidates rejected without output; explicit fallback produces rule-identical PCM; permission and overwrite checks pass |
| Actual owner recording | PASS | Club v8 replay and five WAVs unchanged; owner source stays local |
| Cross-platform events / waveforms | PASS | Four plans/event traces match; 20 Mac/Linux WAV pairs exact; maximum and RMS PCM error zero |
| WebAssembly regression | PASS | Build, consent, malformed input and four styles run; four native/WASM masters and event traces exact; public bundle contains no private audio |
| New listening / model inference | NOT RUN | No new composition quality or intelligence claim |

Sanitizer execution is recorded separately in [the test log](evidence/plan-import/sanitizer-tests.log).
The final warning-only parser cleanup also passed a focused
[sanitizer rerun](evidence/plan-import/final-sanitizer-import.log).
The [specification ledger](spec-status.md) retains the unfinished features and gates.

- [Import regression summary](evidence/plan-import/import-tests.json), [test implementation](../tests/integration/verify_plan_import.py)
- [JSON Schema validation](evidence/plan-import/schema-validation.json): nine scores, seven completion records and invalid receipt rejection using existing isolated jsonschema 4.19.2
- [Machine-readable gate summary](evidence/plan-import/report.json)
- [M5 smoke](evidence/plan-import/mac-smoke.log), [environment](evidence/plan-import/mac-environment.json), [historical-reference comparison](evidence/plan-import/mac-portability.json)
- [Linux tests](evidence/plan-import/linux-tests.log), [environment / source-freeze check](evidence/plan-import/linux-freeze-environment.log)
- [Current comparisons and 20 WAV hashes](evidence/plan-import/comparison.json)
- [Owner completion receipt](evidence/plan-import/owner-completion.json)
- [WebAssembly execution](evidence/plan-import/wasm-test.log), [bundle audit](evidence/plan-import/web-bundle.log)

M5 environment and exact compiler/SDK versions are captured above. Linux uses
the existing pinned Debian image, GCC 12.2.0, CMake 3.25.1 and Python 3.11.2;
it runs on the M5's local arm64 VM, not the unavailable physical Intel machine.
No package installation or modification to `~/mlx-env`. Two pre-existing
32-bit index-conversion warnings in `core/arrangement/remix.cpp` remain in the
WASM build log; there are no new importer warnings under the native strict check.
Evaluation source freezing now includes CLI headers as well as implementation files.

The new private artifacts are under `renders/plan-import-20261018/`,
`renders/plan-import-owner-20261018/` and
`renders/arrangement-linux/plan-import-20261018/`. Existing recordings, old
renders and the supplied synthetic speech fixture are preserved. The master
specification is unchanged. Replayed audio is not a new listening-quality result.

Subsequent extension: [bounded independent voice pitch/time](voice-transforms.md)
adds `1.1-remix` fields with clean-hook/work limits. Legacy exports remain 1.0;
the current integration suite rejects 59 candidates and includes transformed replay.

[Version 1.2 tempo echo](vocal-echo.md) adds optional bounded repeat controls.
The current integration suite rejects 70 invalid candidates and checks echo replay,
stem identity, clean-hook protection and sparse comparison selection.
