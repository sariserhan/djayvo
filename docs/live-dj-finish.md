# Live DJ sampler and qualification — 2026-10-22

**Local implementation: PASS. Overall release: PARTIAL.** This supersedes the missing-sampler finding in [the completion audit](live-dj-completion.md). Physical testing resumed with the owner's authorization: LG Ultra HD speakers, no headphones, MacBook Air microphone, and agent-selected permitted sources. Launch remains last.

## Completed behavior

- Native microphone consent and OS permission, visible recording state, early finish or automatic four-second stop. The default system microphone is captured into bounded memory; it is not connected to live monitoring, saved to disk or uploaded.
- Play the sample through either active deck's existing output clock, effects, channel level, mute, crossfader and limiter. Stop, retrigger and clear are available in the companion and paired website. The website cannot request recording or send PCM.
- Cancelled/revoked permission requests cannot start a late recording. Panic, sleep and disconnected paired control cancel unfinished recording and stop playback. Revoking source or microphone consent clears prepared samples; an ordinary stop retains a completed pad until Clear, re-record or quit.
- Fixed-buffer C++ publication, resampling and bounded one-shot playback. Clearing waits for render acknowledgement before erasing data; re-recording retries only pads still waiting to clear. No new render-thread allocation or lock.
- Idle-sleep protection while at least one deck captures: a scoped macOS activity prevents display/system idle sleep from disconnecting monitor speakers. It ends after the last deck stops or fails; manual sleep still releases capture. Native lifecycle tests and [actual macOS assertions](evidence/live-dj-finish/wake-activity.json) pass: held for active/one-deck capture and released on Panic and no-audio stop.
- Version 0.3.0 (3), protocol 2. Older protocol-2 companions keep deck compatibility; the sampler asks for an update. Protocol-1 clients still require the matching website.
- A Mac download/setup section is ready on `/live-dj`. Its download appears only with a valid `JAMLOOM_COMPANION_DOWNLOAD_URL`, supplied at build time after release approval and notarization. No unverified public binary link is advertised.

## Evidence

| Gate | Result | Evidence / limit |
| --- | --- | --- |
| Portable mixer and sampler | PASS | [CMake tests](evidence/live-dj-finish/cmake.log), [ASan/UBSan](evidence/live-dj-finish/asan.log), [ThreadSanitizer](evidence/live-dj-finish/tsan.log); includes concurrent producer/consumer operations |
| Accelerated one-hour DSP run | PASS | [Offline soak](evidence/live-dj-finish/soak.log): two 48 kHz decks, repeated effects/transport and sampler reloads, finite bounded sum; this is not real-time hardware evidence |
| Native contracts/model/rendered UI | PASS | [Final Swift run](evidence/live-dj-finish/swift-final.log): 14 passed, one opt-in browser fixture skipped; [rendered native layout](evidence/live-dj-finish/native-layout.png) uses synthetic telemetry |
| Local browser control | PASS | [Chromium/WebKit](evidence/live-dj-finish/browser/results.json): real native HTTP, synthetic audio telemetry, sampler play/stop/clear, remote-record rejection, deck controls, gestures, stale responses, panic, four widths and axe |
| Secure-origin browser fixture | PARTIAL | [Results](evidence/live-dj-finish/secure-origin/results.json): Chromium controls pass; WebKit rejects loopback and shows fallback. This is locally served response content, not a deployed HTTPS site |
| Site build/configuration | PASS | [Build](evidence/live-dj-finish/site-build.log), [typecheck](evidence/live-dj-finish/typecheck.log), [bundle audit](evidence/live-dj-finish/bundle.log), [15 focused tests](evidence/live-dj-finish/site-tests.log) |
| Actual two-source / microphone smoke | PASS, technical | [60-second report](evidence/live-dj-finish/physical-smoke/result.json), [selected devices](evidence/live-dj-finish/physical-smoke/inventory.json). Owned `afplay` pulse source and Chromium tone source; independent mutes/crossfade, four-second microphone capture, Deck B sample trigger and erasure passed |
| Actual music and recovery | PASS, scoped | [Final 100-second report](evidence/live-dj-finish/physical-recovery-final/result.json): cleared CC0 tracks in owned afplay/Chromium; independent deck stop/restart, remote Panic/restart, source exit, heartbeat-loss stop and silent-source rejection all pass, in addition to mute/crossfade/sampler checks |
| Owner listening | PASS, scoped | [Owner response](evidence/live-dj-finish/owner-listening.json): “Audible and clean” for normal playback sections of the louder CC0 music test through LG Ultra HD. The earlier low-level tone test was too quiet to judge and does not count |
| Actual 60-minute two-source endurance | PASS, scoped | First attempt interrupted at 1,091 seconds by actual system idle sleep/output loss; [retained report and interpretation](evidence/live-dj-finish/endurance-interrupted/interpretation.json). The fresh run completed a real 3,600.01 seconds; [summary](evidence/live-dj-finish/physical-endurance/summary.json), [full report](evidence/live-dj-finish/physical-endurance/result.json). Both 48 kHz routes remained active with zero reported timing faults; maximum callbacks 0.942/0.836 ms. RSS 155.7 MiB initially, 99.9 MiB finally. Neither the interrupted attempt nor offline soak is used as the passing evidence |
| Sleep/output-loss handling | PASS, scoped stop behavior | Actual idle sleep/wake interrupted the first endurance attempt. Both routes stopped and did not silently resume capture; no claim of uninterrupted playback across sleep |
| Active-capture wake lifecycle | PASS, scoped | [Actual OS assertions](evidence/live-dj-finish/wake-activity.json): prevents idle display/system sleep only while capturing; independent stop retains it, Panic and no-audio stop release it |
| Calibrated round-trip latency, physical cable unplug/rate change, actual OS-permission denial, broad accompaniment fit | NOT RUN | Callback CPU time is not end-to-end latency. Scoped normal-playback acceptance does not certify accompaniment quality across material, all devices or calibrated latency |
| Fresh local preview | PASS | [Packaged launch](evidence/live-dj-finish/launch.log), [HTTP preview check](evidence/live-dj-finish/preview.json): native app reopened without capture; matching local site serves sampler/setup at port 4234 |
| Release candidate | PASS, local preparation | [Signed artifact and SHA-256](evidence/live-dj-finish/release.json): Apple silicon, Developer ID, hardened runtime, audio-input entitlement, secure timestamp; extracted ZIP signature verified |
| Notarization, clean install/update, public download, hosted pairing | NOT RUN | Publication and corresponding GitHub-delivered website update remain separate, last-step authorization |

The first hardware host attempted to open a route before entering its app run loop and stalled. The corrected host enters the run loop before starting capture. Process-stack sampling and cleanup of an overlapping test coincided with a timeline-discontinuity stop in both routes; the specific cause was not isolated and neither attempt counts as a pass. The subsequent isolated 60-second run passed. The native guards release source routes when a timing fault is detected.

**Owner hardware boundary:** After the louder listening acceptance, the owner explicitly kept the physical LG unplug/reconnect check deferred. Do not perform or mark that check passed.

## Reproduce locally

Silent technical checks:

```sh
swift test --package-path apps/desktop-companion
cmake -S . -B /tmp/jamloom-live-finish-build -DCMAKE_BUILD_TYPE=Release
cmake --build /tmp/jamloom-live-finish-build --target jamloom_live_source_tests jamloom_live_sample_tests
ctest --test-dir /tmp/jamloom-live-finish-build -R 'live_source|live_sample' --output-on-failure
/tmp/jamloom-live-finish-build/jamloom_live_source_tests --soak
cd apps/site
node tests/live-companion-browser.mjs
```

The browser script expects a completed site build, port 4234 free and the companion closed. Run native/browser suites separately from physical qualification: both need the same loopback port (48191). The final snapshot-enabled Swift rerun passed 14 tests with only the opt-in browser fixture skipped; this includes wake-activity start, independent stop, last stop and fault cleanup. To render native layout evidence, set `JAMLOOM_DECK_SNAPSHOT` to an absolute PNG path and optionally `JAMLOOM_DECK_HEIGHT=1500` for the Swift tests.

**Audible hardware qualification requires owner authorization and the named LG output.** It opens a visible test host using the production model/view/native engine, captures only two controlled sources in owned processes, records the default microphone once, and deletes its generated WAV after cleanup. Default/endurance mode uses generated tones; review mode uses existing CC0 Academy tracks. The wrapper keeps the display/system awake only for the test process lifetime. The production model also holds its own activity only while a deck is active, using [Apple’s scoped activity API](https://developer.apple.com/documentation/foundation/processinfo/beginactivity(options:reason:)). It never saves microphone PCM. The wrapper uses the current Xcode SwiftPM build backend. Run separately from any existing companion or qualification:

```sh
JAMLOOM_PHYSICAL_AUTHORIZED=yes ./script/qualify_live.sh
# Louder CC0 music, independent recovery and remote disconnect checks:
JAMLOOM_PHYSICAL_AUTHORIZED=yes JAMLOOM_PHYSICAL_REVIEW=yes ./script/qualify_live.sh
# The generated-source test, sustained for a real hour:
JAMLOOM_PHYSICAL_AUTHORIZED=yes JAMLOOM_PHYSICAL_SECONDS=3600 ./script/qualify_live.sh
```

## Release preparation

```sh
JAMLOOM_SIGN_IDENTITY='<Developer ID Application identity>' ./script/build_and_run.sh --release
```

This creates an isolated `dist/releases/live-0.3.0-3.*` candidate, ZIP and SHA-256; it does not upload or publish. It checks Developer ID, hardened runtime, secure timestamp and bundle signature. Audio input is the only additional entitlement, following [Apple's hardened runtime documentation](https://developer.apple.com/documentation/Security/hardened-runtime).

After the remaining hardware gates and explicit publication approval: submit the ZIP using a configured local `notarytool` keychain profile, inspect the result, staple and validate the app, rebuild the ZIP/hash, verify clean installation, publish the exact artifact, configure the HTTPS download URL, deliver the matching website through GitHub, and verify actual hosted pairing. Follow [Apple's notarization workflow](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow). Keep credentials in the local keychain; do not put them in Git or chat.
