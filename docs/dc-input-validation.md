# Reject constant-offset input

2026-10-18. **Input-validation fix: PASS. Musical quality/full specification: PARTIAL.**

The core's silence check previously counted a constant electrical offset as signal
energy. A three-second PCM16 file whose every sample was 0.5 successfully produced
a mix despite containing no changing source signal. The retained
[before result](evidence/dc-input/before.json) is **FAIL**, as are all twelve
before-fix controls across three input rates and four positive/negative levels.

The shared analysis function now checks peak and mean-square variation about the
input mean against the existing silence thresholds. It does not modify source
samples, raw peak/RMS reporting, normalization, feature extraction or plans for
accepted inputs. There is one additional bounded scan and no new sample buffer,
schema, runtime dependency, model or audio-callback work. CLI, C ABI and browser
rendering all use this function. A rejected input publishes no mixes. The browser
shows the existing “silent or too quiet” error and retains previous saved sessions.

This is a constant-offset rejection check, not a general voice detector or an
audio cleanup filter. Usable audio with an offset remains accepted and unchanged.
Very quiet/noisy recordings, speech intelligibility and music quality still need
their separately defined evaluation; synthetic controls cannot supply recorded
quiet coverage or human ratings.

## Checks and boundaries

| Gate | Status | Evidence |
| --- | --- | --- |
| Before-fix reproduction | FAIL | Constant input accepted and exported; twelve rate/level cases retained |
| Native input regression | PASS | Constant ±0.5/±1 rejected at four engine rates; offset plus subthreshold variation rejected; usable offset tone accepted; source unchanged; short transient regression retained |
| Final M5 release and actual Mac smoke | PASS | 13/13 suites, actual Apple M5 environment and exact retained Linux-reference comparison |
| Final Linux arm64 release | PASS | 13/13 suites inside the existing local VM |
| M5 ASan/UBSan affected suites | PASS | Remix core, C ABI and remix integration: 3/3 in 200.55 seconds |
| CLI rejection after resampling | PASS | 12/12 cases on M5 and Linux; 8/44.1/192 kHz inputs, both polarities; no output artifacts |
| Existing owner/fixture outputs | PASS | Eight strategies including baseline × two sources: 16 unchanged WAVs, identical decisions and event frames versus saved before-fix binary; max/RMS error 0 |
| M5/Linux portability | PASS | Same 16 outputs byte-identical, exact event frames and plan decisions; max/RMS error 0 |
| Frozen recorded cohort | PASS | All 23 recorded sources accepted for hip-hop seed 4123; WAV/score/event bytes match frozen outputs; existing listening packets and forms untouched |
| Node WebAssembly | PASS | Seven styles, permission and malformed-input checks, 44.1 kHz frame counts and new DC rejection without output |
| Actual Chromium/native comparison | PASS | Seven styles have identical WAVs, plan decisions and event traces; max/RMS error 0 |
| Browser workflows | PASS | Chromium 21, WebKit 19, Firefox 19; new invalid-input error and saved-library preservation; no app console/page errors |
| Browser unit / bundle audits | PASS | 14 unit tests, updated WASM/offline hashes and audited site copy |
| New listening / M1 | NOT RUN | No new observations, recognizability scores or musical-quality claim |
| Phone execution / hosted release | NOT RUN | Paused priorities unchanged; native phone bundle was not rebuilt |

The [machine report](evidence/dc-input/report.json) and
[final sanitizer log](evidence/dc-input/sanitizer-tests.log) retain the exact scope;
a full thirteen-suite sanitizer rerun is not claimed by this change.

Evidence: [M5 smoke](evidence/dc-input/mac-smoke.log),
[M5 environment](evidence/dc-input/mac-environment.json),
[Linux suites](evidence/dc-input/linux-tests.log),
[Linux versions](evidence/dc-input/linux-environment.log),
[before/after comparisons](evidence/dc-input/mac-comparisons.json),
[Linux comparisons](evidence/dc-input/linux-comparisons.json),
[Chromium comparisons](evidence/dc-input/chromium-native.json),
[recorded cohort](evidence/dc-input/cohort.json).

The first native suites failed because two crop tests used pure constants to
represent a continuous sound. They now use continuous 220 Hz tones, preserving
the no-pause/near-EOF/fallback assertions. Initial failing logs are retained.
The obsolete sanitizer run was stopped after this fixture correction and rerun
with the corrected tests; its interrupted log is not counted as passing evidence.
An initial sanitizer command referenced a nonexistent environment-local CMake;
the existing installed CMake was used instead, without installing anything or
changing `~/mlx-env`. The site audit initially ran from the wrong directory;
the retained passing invocation runs from `apps/site`.

## Reproduction

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
.venv-build/bin/python docs/evidence/dc-input/check.py --renderer build-mac/djayvo_remix --output renders/new-dc-check
sh scripts/web_build.sh
node apps/site/scripts/prepare-studio.mjs
node apps/web/tests/wasm.mjs
# Existing local studio server at localhost:4173:
node apps/web/tests/browser.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/browser.mjs
DJAYVO_BROWSER=firefox node apps/web/tests/browser.mjs
```

Use a fresh output directory. The check script supplies explicit source-permission flags and verifies
completion receipts, never regenerates the supplied speech fixture, and records
the twelve controls separately. Its `--reference` option compares with another
run; `--legacy` preserves a deliberately failing old-binary capture. Raw audio
remains ignored under `renders/dc-input-trt3t1ta` and
`renders/arrangement-linux/dc-input-20261018`. The Linux VM is returned to stopped.
Master specification, owner recording and supplied fixture hashes are unchanged.
