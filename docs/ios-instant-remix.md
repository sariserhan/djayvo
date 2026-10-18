# iOS Instant Remix implementation and validation

Recorded 2026-10-18, America/New_York. **M3 and full-spec completion: PARTIAL.**
The owner's continuation authorizes the local app work. Formal music-quality,
model, live and release gates remain separate. The master specification and all
previous recordings are preserved.

## What now works

The native iPhone/iPad app records up to five seconds after explicit consent and
microphone permission, or imports a bounded audio file and selects 2–5 seconds.
It shows a waveform, generates three styles or an original club mix, supports
cancellation, playback, regeneration, favorites, persistent sessions, WAV sharing
and confirmed deletion. The SwiftUI app calls the existing C++17 engine through
its C ABI on a worker. There is no model, cloud dependency or background capture.

Completed sessions are private, excluded from backups and checked against the
native completion record, file hashes and source provenance on reload. An invalid
session is withheld from playback and preserved for explicit deletion. Cancellation removes only
the new unfinished session. Imports never replace external originals. Save marks
a favorite; completed sessions already persist. Delete all data only affects this
app's library; shared copies remain outside its control. The 50-session limit is
explicit. See [app implementation and reproduction](../apps/ios/README.md).

The app is a working development prototype. It does not establish production
music quality, intelligibility, live readiness or App Store acceptance.

## Actual failure and fix

The first simulator UI render crashed with SIGBUS when started on a Swift worker,
although the original main-thread unit render passed. The renderer embedded 128
voices, each with interpolation data, exceeding a normal worker's stack budget.
The fixed-size voice pool now allocates once during renderer construction. The
processing callback still allocates nothing. A native object-size regression and
an actual detached-worker iOS regression cover the failure.

Fresh M5 release and sanitizer suites and Linux arm64 release suites each pass
**9/9** (10 foundation and 15 remix groups). No DSP or arrangement algorithm was
changed. All 15 compared current fixture masters/stems remain byte-identical
between actual M5 and Linux execution. All three master plans and event frames
agree; maximum and RMS decoded PCM differences are **0**.

The first completed simulator app export also agrees with a Mac CLI rerender of
its exact AVFoundation-trimmed source and seed: **3/3 master WAVs byte-identical,
exact plans/event frames, max/RMS PCM difference 0**. This comparison uses the
existing synthetic fixture, not a human voice. The physical iPhone 14 Pro
exports also match the Mac byte-for-byte for all three masters, scores and event
frames; max/RMS PCM error is 0. [Physical comparison](evidence/ios-instant-remix/physical-portability.json).
The generic app C ABI marks local imports consented; that flag is not evidence of a new human dataset.

A final input review also found floating-point subtraction could reject a
nominal two-second trim such as 0.01–2.01 s. Selection validation now tolerates
sub-sample rounding, and trim frame count is derived from the selected duration
once. Physical regressions cover 0.01, 0.03 and 0.11-second starts with exact
2-second output. Stale audio delegates are ignored and session activation/player
preparation run off the main thread.

A later simulator run logged nine passing tests but Xcode did not finish its
result bundle; that run remains **PARTIAL** and its owned process was terminated.
Another run failed a new deletion test because SwiftUI exposes a nested duplicate
accessibility button; selecting the first matching confirmation control fixed
the test. The complete ten-test smoke then passed. In a final targeted run,
an automated tap on the broader consent row left the actual switch off; the
captured hierarchy confirmed the app correctly kept import disabled. The test now targets the
nested switch and asserts consent before import. The final three-test UI run
completed successfully and is recorded separately. Slow Xcode diagnostic collection was terminated after the
tests ended; functional failures remain retained. No failed attempt is counted
as a completed successful run. Tests now use per-test UUID libraries and restore
the microphone permission prompt after the denial check.

## Gate ledger

| Gate | Status | Scope/evidence |
| --- | --- | --- |
| Actual Apple M5 smoke | PASS | `sh scripts/mac_smoke.sh`, 9/9 suites, existing fixture |
| M5 ASan/UBSan | PASS | 9/9 suites, no reported findings |
| Fresh Linux arm64 | PASS | Rebuilt in isolated Debian 12 VM/container, 9/9 suites |
| M5/Linux audio/events | PASS | 15 exact WAVs; three exact master plans/frame traces; max/RMS error 0 |
| Simulator and physical iPhone/Mac audio/events | PASS | Three exact master WAVs/plans/frame traces in each comparison, from identical source/seed |
| iPhone simulator functional tests | PASS | Completed full smoke: 10/10 tests, including generation/playback/save/relaunch/share/deletion, large text and microphone denial; final physical six-test rerun covers exact two-second trims; final three-test simulator UI rerun also passes |
| iPad simulator flow | PASS | Generation, playback, favorite, relaunch and share-sheet presentation; one completed UI test |
| Physical iPhone integration | PASS | iPhone 14 Pro, six tests: worker generation, deterministic club, cancellation, persistence, tamper checks and input bounds |
| Physical UI automation | FAIL | Two attempts timed out enabling automation before UI tests began; engine integration passes separately; no app UI failure inferred |
| Physical optimized timing/CPU/memory | PASS | Three measured trials after warmup: 1.812–1.846 s for all three styles; CPU 1.797–1.807 s; peak physical memory 52,611–55,953 kB |
| Native record/import UI implementation | PASS | Consent, microphone prompt, bounded capture/import/trim, error and lifecycle handling implemented |
| Physical microphone/routes/lifecycle | NOT RUN | No ambient recording started; actual capture, headphones/Bluetooth, calls, lock and Settings revocation need device observations |
| Static Release bundle | PASS | Unsigned and locally development-signed Release builds audited; notices, privacy, icon and absence of Debug/private audio checked; injected WAV negative test rejected |
| Signed Release installation | PASS | Installed as an update on the actual phone, preserving its library |
| Signed Release launch attempt | FAIL | CoreDevice request denied because the phone locked again; no Release UI execution inferred |
| Accessibility | PARTIAL | Dynamic Type, labels and large-text simulator privacy test; full VoiceOver/contrast/touch/device review missing |
| Persistent data/privacy behavior | PARTIAL | Verified engine/library recovery/deletion and simulator flow; external share destination/low storage/power loss not certified |
| Hosted CI | NOT RUN | Recipe committed locally; no push or hosted result |
| Club v8 listening and formal M1 | NOT RUN | Earlier v4 piano/drum acceptance does not rate this revision; diverse consented sources and independent reviewers absent |
| Models/live/release | NOT RUN | No training/model benchmark/live capture/publication/paid service started |

The [machine-readable gate report](evidence/ios-instant-remix/report.json) and
sanitized excerpts live in [evidence/ios-instant-remix](evidence/ios-instant-remix/).
Raw logs, generated audio and `.xcresult` bundles remain local under `renders/ios-validation/`. Failed runs
are retained rather than replaced by successful retries.

## Device and toolchain

- Actual Mac: Apple M5, arm64, 10 CPU cores, 16 GiB, macOS 26.7.1 (25G241).
- Xcode 27.1 (27A9275), Apple Clang 21.0.0, macOS SDK 27.0;
  iOS/iOS Simulator SDK 27.1. CMake 4.4.2, isolated build Python 3.14.6.
- Actual phone: iPhone 14 Pro (A16, 6 CPU cores), iOS 27.0.1 (24A446),
  development-signed build. Device identifiers and signing credentials stay out
  of committed evidence.
- Simulators: iPhone 18 Pro and iPad Pro 13-inch (M5), iOS 27.0 (24A434).
  These are simulators, not extra physical devices.
- Linux: actual Debian 12 aarch64 execution in Colima `djayvo`, GCC 12.2.0,
  CMake 3.25.1, Python 3.11.2. The isolated VM was stopped after validation.
- XcodeGen 2.46.0 only generates the checked-in Xcode project. SwiftUI,
  AVFoundation, CryptoKit and UIKit are Apple platform dependencies outside the
  shared C++17 core. No third-party runtime/SDK is added.

One functional Debug phone run took **8.855 seconds** to select the first three
seconds of the fixture, generate all three styles and verify their exports.
This is a single unoptimized development observation. A separate **optimized
Debug** build (`GCC_OPTIMIZATION_LEVEL=s`, `SWIFT_OPTIMIZATION_LEVEL=-O`) measured
three trials after one warmup: **1.845648, 1.811586 and 1.827247 seconds** wall time
(mean 1.828161 s), **1.806504, 1.797454 and 1.801769 seconds** CPU time, and
**55,953, 52,611 and 52,906 kB** peak physical memory. The measured block includes
trim, three renders, local export, hash verification and cleanup; initial input
decoding is outside it. These are actual phone observations, with raw metrics in
[the evidence](evidence/ios-instant-remix/physical-performance.json).
There is no regression baseline or representative p95 claim from three trials;
this is not a Release benchmark, sustained-load result or quality rating.
Simulator measurements are not phone-performance evidence. Battery, thermal behavior and oldest-supported-
phone performance remain unmeasured.

## Reproduce without losing recordings

Use fresh output/result paths. Never regenerate the supplied speech fixture.

```sh
PATH="$PWD/.venv-build/bin:$PATH" DJAYVO_PYTHON="$PWD/.venv-build/bin/python" \
  DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/ios-core-v9/remix \
  DJAYVO_OUTPUT_DIR=renders/mac-ios-recheck sh scripts/mac_smoke.sh

DJAYVO_SIMULATOR_ID=YOUR_AVAILABLE_SIMULATOR_ID \
  DJAYVO_IOS_OUTPUT=renders/ios-recheck sh scripts/ios_smoke.sh

# With an unlocked, paired development phone and your own development team:
xcodebuild test -project apps/ios/Djayvo.xcodeproj -scheme Djayvo \
  -destination 'platform=iOS,id=YOUR_DEVICE_ID' -derivedDataPath build-ios-physical \
  -parallel-testing-enabled NO -resultBundlePath renders/ios-physical-recheck.xcresult \
  DEVELOPMENT_TEAM=YOUR_TEAM -allowProvisioningUpdates
```

For the same optimized development benchmark (three measured trials, one warmup):

```sh
xcodebuild test -project apps/ios/Djayvo.xcodeproj -scheme Djayvo \
  -destination 'platform=iOS,id=YOUR_DEVICE_ID' -derivedDataPath build-ios-measured \
  -parallel-testing-enabled NO -only-testing:DjayvoTests/PerformanceTests \
  -resultBundlePath renders/ios-metrics-recheck.xcresult \
  GCC_OPTIMIZATION_LEVEL=s SWIFT_OPTIMIZATION_LEVEL=-O \
  DEVELOPMENT_TEAM=YOUR_TEAM -allowProvisioningUpdates
xcrun xcresulttool get test-results metrics --path renders/ios-metrics-recheck.xcresult
```

Functional tests attach their synthetic source, WAVs, scores and event traces to
`.xcresult` for independent comparison. Export them with
`xcrun xcresulttool export attachments --path RESULT.xcresult --output-path NEW_DIRECTORY`;
the manifest maps exported names to artifact names. The retained final device
artifacts are under `renders/ios-validation/physical-verified-export/`. To repeat
the direct phone/Mac comparison, render its `source.wav` with the Mac CLI,
`--consent --style all --seed 4123`, into a fresh prefix, then use
`scripts/compare_portability.py` against the retained phone prefix. Synthetic
provenance is explicit despite the generic app's consent flag.

Debug UI tests use the existing synthetic fixture and a separate `Djayvo-UI-Tests`
library. They do not record the microphone or modify the normal app's recordings.
The permission-denial test resets/denies microphone authorization, then restores
the permission prompt without granting access. Older denial-test runs may require
restoring permission in Settings. Release has neither
the fixture nor `--ui-testing` controls. The privacy policy remains a
[draft](privacy-policy-draft.md) until public owner/contact details and review.

The remaining criteria are tracked in [TODO](../TODO.md),
[spec coverage](spec-coverage.md), [release readiness](release-readiness.md) and
[the live research protocol](live-research-protocol.md). No missing listener,
consent, beta, hardware-route or release evidence has been invented.


## Review on your own phone

The locally signed Release build is installed on the iPhone and contains no
test speech or private references. Automatic launch was denied when the phone
locked again; open it yourself after unlocking.
To try your own speech, open Djayvo, confirm that you have permission, tap Record,
allow microphone access and speak for 2–5 seconds. Capture stops at five seconds.
Choose Make Music or Make a club mix, then play each result. Share opens the
system destination picker; nothing is automatically published. Listen for
recognizability, cuts through words, groove, instrument realism and endings.
Report style, timestamp and desired change; no automated metric can supply that
judgment. You can restore your usual Auto-Lock setting after device testing.

For the existing Blood Club direction comparison on the Mac, use the preserved
[v7/v8 listening page](../renders/voice-club-v8/review/index.html). Reference
tracks are for local analysis/audition only; none is sampled, trained on or
shipped. Earlier owner acceptance applies to the earlier prototype/v4 instruments.
