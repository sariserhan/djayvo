# Live DJ controls and deck — 2026-10-22

**Local implementation/tests PASS; owner live-audio acceptance PARTIAL.** The owner reports that only native output level works, on both the Mac app and website, and requests DJ deck controls. [Exact feedback](evidence/live-deck/owner-feedback.json). The exact playing process, output and control state were not supplied, so the original hardware symptom is not conclusively diagnosed or marked resolved.

## Change

- Native app and paired website now use a live-source platter, source readout, output meter, grouped EQ/filter/echo, roll/percussion pads and prominent Stop/Panic. The source app still owns play/pause/seek; the platter is a monitor, not a scratch or transport control. Source permission, output selection, explicit Start, disconnect and error cleanup remain intact.
- Native control changes reach the engine immediately through the model property observer, including website changes. Applying controls no longer depends on a view's change observer. An engine rejection is surfaced instead of ignored. App entry, model and view are separate files.
- Bypass previously leaves output level active while removing all effects, matching the reported symptom but not proving that it caused the owner's trial. Both surfaces now show **FX BYPASSED** explicitly. Moving an effect or using a performance pad turns effects back on; moving master volume preserves bypass. Deliberately selecting bypass still works.
- Website edits use the latest control values and a revision guard. A status request that predates an edit cannot reset that edit. Polling waits while controls are being sent; an earlier command response cannot overwrite newer status or Stop.
- The debug owner preview includes **Website pairing → Copy code and open local preview**, using the already-authorized `http://127.0.0.1:4234` origin. The production pairing button and origin allowlist are unchanged. The local server serves the new production build without database access or public deployment.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Swift control/security tests | PASS | Eight executed; optional long-running browser fixture skipped in ordinary suite, separately run below. [Log](evidence/live-deck/swift-tests.log). Tests exercise native and authenticated HTTP changes reaching the engine setter, every effect leaving bypass, master preserving bypass, invalid values and engine errors. |
| Native layout | PASS, rendered fixture | [1080×820 layout](evidence/live-deck/native-layout.png) from an AppKit-hosted SwiftUI view with synthetic source/status; no capture. It is not evidence of physical routing. |
| Per-effect PCM regression | PASS | `core/tests/live_source_tests.cpp`: independent low/mid/high attenuation, level scaling, filter/bypass restoration, echo tail, retained beat roll and pulse-locked percussion all alter generated PCM. Optimized and AddressSanitizer/UBSan runs pass; existing finite-headroom/layout/pulse/silence checks remain. No speaker output. |
| Website + native HTTP | PASS | [Chromium/WebKit results](evidence/live-deck/browser.json), [desktop](evidence/live-deck/web-desktop.png), [320 px](evidence/live-deck/web-mobile.png). Actual native loopback server with synthetic telemetry, every numeric effect and bypass recovery, forced delayed status during edits, Stop, origin/token guards, disconnect handoff and browser fallback. No overflow at 1440/390/320 px; zero WCAG A/AA axe violations. Browser output muted. |
| Site build, typecheck, bundle audit | PASS | [Build](evidence/live-deck/site-build.log). Audit checked 29 client files, no server secrets; retained WASM hash `31c08301a66dcd4350c6da2fa5dbfe336ed352b3873483238e131f9301b937d9`. |
| Packaged app launch | PASS | [Build/launch](evidence/live-deck/launch.log); opened stopped. Local `/live-dj` HTTP 200. |
| Owner source/output retest | NOT RUN | Original complaint remains open until effects are heard in the owner's live setup. No automated OS permission grants or source capture. |
| Hosted deployment, public installer, notarization | NOT RUN | Local ad-hoc owner build only. |

The first browser run caught a label association mistake in the new markup (an `output` element preceded its slider); the value is now a non-labelable span and browser/axe checks pass. The first native image-renderer attempt produced a blank ScrollView; the retained evidence uses an AppKit host and asserts rendered color diversity. A stale CMake cache referenced the former `djayvo` directory; standalone header-only test compilation avoided modifying that historical build.

## Reproduce

From the repository root, with the companion closed before loopback tests:

```sh
swift test --package-path apps/desktop-companion
JAMLOOM_DECK_SNAPSHOT=/tmp/jamloom-live-deck-native.png swift test --package-path apps/desktop-companion --filter ControlModelTests/testDeckLayoutSnapshot
c++ -std=c++17 -O2 -Icore/include core/tests/live_source_tests.cpp -o /tmp/jamloom-live-deck-dsp
/tmp/jamloom-live-deck-dsp
c++ -std=c++17 -g -fsanitize=address,undefined -fno-omit-frame-pointer -Icore/include core/tests/live_source_tests.cpp -o /tmp/jamloom-live-deck-dsp-asan
/tmp/jamloom-live-deck-dsp-asan
```

From `apps/site`: `DATABASE_URL='' npm run build`, `npm run typecheck`, `npm run audit:bundle`, then `node --import tsx tests/live-companion-browser.mjs` (port 4234 must be free). The fixture never captures system audio. Build/run the real stopped companion afterward with `./script/build_and_run.sh --verify` from the repository root.

For the owner retest: select the permitted playing app/output, confirm consent and start. Pull low-pass down to 700 Hz: the sound should become muffled and **FX ON** remain visible. Return to 18,000 Hz, test echo, then Stop/Panic and check source restoration. For website controls, use the local-preview pairing button and paste the copied code into the local page. Do not count the synthetic tests as this listening check.
