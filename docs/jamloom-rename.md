# Jamloom rename — 2026-10-19

The owner approved **Jamloom** as the product name. The current browser studios,
website/account screens, authentication email subjects, installation manifest,
WAV download names, npm packages, C++ namespace/C ABI, CMake targets, WASM modules,
iOS project/scheme/app, developer scripts and current entry-point documentation
now use Jamloom. The existing waveform icons contain no old lettering and remain
unchanged. No musical algorithm, arrangement or source recording was changed.

The local application is running at http://localhost:3000/studio/dj.html.

## Compatibility and intentional historical names

- Browser IndexedDB remains `djayvo-web-v1`; existing saved sessions stay visible.
  The service-worker cache prefix remains `djayvo-studio:` so normal bounded
  updates and removal manage existing installations. PWA `id`, scope and start
  URL are unchanged. An existing offline tab can show the previous name until
  its normal update activates after studio tabs close.
- The iOS bundle identifiers remain `com.djayvo.app` and its test suffixes; the
  private Application Support directory remains `Djayvo`. Changing these would
  create a different installation or hide an existing recording library. The
  visible app, executable, scheme and source directories are Jamloom.
- Postgres retains the `djayvo_migrations` ledger. SQL migrations, auth cookies,
  database URLs, object keys, existing private audio and user records are unchanged.
  No hosted schema/data/resource was renamed or mutated.
- Server and developer tools accept existing `DJAYVO_*` environment settings as
  fallbacks for `JAMLOOM_*`. Explicit new values win, including disabling flags
  and empty private-directory settings. Legacy CMake sanitizer configuration
  enables real instrumentation unless explicitly overridden by the new option.
- Existing schema `$id` values remain stable. Original fixture text/attribution,
  asset creators, paid-trial labels, historical reports, receipts, recordings and
  old reproduction commands retain their original identities. The electronic
  generator and sustained-synth source have brand-only edits; their current
  provenance hashes were updated without regenerating audio or weakening audits.
- The immutable master is unchanged. Earlier documents under `docs/` describe
  historical checkpoints; current commands are in the root and app READMEs.
  Reproducing an old evidence script requires its recorded historical revision.
- This remains the existing `djayvo` checkout and GitHub remote. GitHub/Vercel/
  Neon/R2 resource names and domain/DNS configuration were not changed. No domain
  was purchased, no remote push/deployment occurred, and R2/Resend remain deferred.

The renamed native API uses `core/include/jamloom/jamloom_c.h` and `jamloom_*`
symbols. All repository callers are updated. A separately compiled external
consumer would need to update its includes/symbols and rebuild; an SDK binary
compatibility layer was not added.

## Gates and evidence

| Gate | Status | Evidence |
| --- | --- | --- |
| Root `npm run build` | PASS | [Build log](evidence/jamloom-rename/site-build.log): both renamed WASM targets compile, audited studio copies, Next production routes build |
| Site types, configuration/storage regressions and public bundle | PASS | [9 tests](evidence/jamloom-rename/site-unit.log), [typecheck](evidence/jamloom-rename/typecheck.log), [bundle audit](evidence/jamloom-rename/bundle-audit.json); legacy config works and explicit opt-outs win |
| Web unit regressions | PASS | [44 tests](evidence/jamloom-rename/web-unit.log) |
| Mac native C++/C ABI/integration | PASS | [15/15 suites](evidence/jamloom-rename/native-tests.log); final [asset checks](evidence/jamloom-rename/assets-final.log) |
| Legacy sanitizer option | PASS | [CMake configuration](evidence/jamloom-rename/cmake-compat.log); actual `flags.make` contains `-fsanitize=address,undefined` with legacy ON, absent with explicit new OFF |
| WASM generation | PASS | [Seven styles and validation](evidence/jamloom-rename/wasm.log) |
| Chromium and WebKit manual DJ studio | PASS | [47 checks](evidence/jamloom-rename/dj-chromium.json) and [47 checks](evidence/jamloom-rename/dj-webkit.json), including real instrument/mixer PCM and responsive controls |
| Saved-session upgrade | PASS | [Chromium](evidence/jamloom-rename/upgrade-chromium.json), [WebKit](evidence/jamloom-rename/upgrade-webkit.json): actual pre-rename export loaded through original IndexedDB, three playable mixes, byte-identical Jamloom download, responsive consent control, PWA and account names |
| Offline installation/update/removal | PASS | [11 Chromium checks](evidence/jamloom-rename/offline.json), including disconnected generation/play/download, corrupt-update rejection and retained saved music |
| Rendered identity/content/overlay/console | PASS | Both upgrade runs: Jamloom title/wordmark, meaningful content, no framework overlay or app runtime errors; desktop 1440×1000 and mobile 390×844 screenshots visually inspected |
| Before/after waveform and scheduling | PASS | [17 WAVs](evidence/jamloom-rename/audio-comparison.json) byte-identical, maximum absolute/RMS PCM differences zero, three master event traces exactly equal |
| Renamed iOS simulator Release build | PASS | [Xcode log](evidence/jamloom-rename/ios-build.log): arm64/x86_64 unsigned build; [bundle audit](evidence/jamloom-rename/ios-bundle.json) confirms name, privacy, notices and no private audio/debug controls |
| Preserved history/master/SQL/source audio | PASS | [2,161 hashes](evidence/jamloom-rename/preservation.json) unchanged |
| Initial asset provenance checks | FAIL | [Retained initial native log](evidence/jamloom-rename/native-tests-provenance-failure.log): two stale source hashes after identifier edits; corrected provenance passes without changing synthesis |
| Initial new config-test fixture | FAIL | [Retained log](evidence/jamloom-rename/site-unit-fixture-failure.log): HTTP fixture failed the earlier HTTPS guard instead of the expected outbox guard; use valid hosted URL/database to reach that guard; final 9/9 pass |
| Linux, full sanitizer execution, physical iPhone/microphone/MIDI, venue timing and listening reruns | NOT RUN | This rename does not requalify those gates or establish musical quality |
| GitHub/hosting rename, deployment, domain ownership/trademark clearance, R2/Resend | NOT RUN | Local implementation only |
| Overall production/full specification | PARTIAL | Existing musical, device, reliability and release prerequisites remain open |

[Environment](evidence/jamloom-rename/environment.json): actual Apple M5/macOS
26.7.1, Node 22.23.1, CMake 4.4.2, Apple Clang 21.0.0, Xcode 27.1,
Emscripten 6.0.1 and Playwright 1.61.1. Browser's execution tool was unavailable
after discovery; the existing authorized Playwright fallback was used. No new
build environment was installed and `~/mlx-env` was untouched.

The listening fixture is the original supplied synthetic speech; its old spoken
brand is intentionally preserved. Automated playback is not a human assessment.
An initial comparison-script assertion assumed 15 WAVs; the actual export has 17
because reggae/experimental include organ/lead stems. The corrected comparison
requires identical before/after file sets and checks every WAV.

## Reproduction

```sh
npm run build
npm --prefix apps/site test
npm --prefix apps/site run typecheck
npm --prefix apps/site run audit:bundle
node --test apps/web/tests/*.test.js
cmake -S . -B build-jamloom -DCMAKE_BUILD_TYPE=Release
cmake --build build-jamloom --parallel 4
ctest --test-dir build-jamloom --output-on-failure
node apps/web/tests/wasm.mjs
JAMLOOM_BROWSER=chromium node apps/web/tests/dj.mjs
JAMLOOM_BROWSER=webkit node apps/web/tests/dj.mjs
node apps/web/tests/offline.mjs
```

With the site running on localhost:3000 and a retained pre-rename export:

```sh
node apps/web/tests/brand-upgrade.mjs renders/jamloom-rename/before/remix
JAMLOOM_BROWSER=webkit node apps/web/tests/brand-upgrade.mjs renders/jamloom-rename/before/remix
```

The upgrade tests use isolated browser contexts and synthetic fixture exports;
they do not access the owner's browser profile. Screenshots are saved outside
Git at the paths printed in their logs. All private audio remains in `renders/`.
