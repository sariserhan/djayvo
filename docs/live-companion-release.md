# Downloadable Mac companion — 2026-10-22

Owner request authorizes this companion's download and matching website delivery.
This does not release paid generation, iOS or certify the remaining physical gates.

## Implementation — PASS

Jamloom Live 0.4.0 (4), Apple silicon, macOS 14.2+. Branded app icon,
native Settings (button and ⌘,) for current output, source/microphone consent,
sample erasure, website disconnect, version and update preferences. Consent and
capture remain stopped by default; only the update-check preference persists.

Sparkle 2.10.0 is pinned; nested helpers/framework are signed inside out.
Signed feeds and archives are required, with signature validation before extraction.
Checks defer while either deck or microphone is active or awaiting permission.
An updater session blocks new capture/recording; a final termination guard prevents
an installer from interrupting a set that started after a deferred update.
Automatic checks are opt-in; automatic downloading/installation is disabled.
The private update key stays in Keychain under account `com.jamloom.live`.

`/live-dj` is publicly accessible and linked from the coming-soon landing page. It links the versioned public GitHub ZIP and release notes by default.
The existing HTTPS environment override still supports a deliberate rollout override.
No audio, recordings, training material or credentials are part of the release.

## Verification

- PASS: 18 Swift tests (16 passed, optional fixture/snapshot tests skipped; the
  browser fixture was exercised separately), including update/capture exclusion.
- PASS: actual packaged Settings opens, version 0.4.0 and enabled update button;
  missing-feed error is visible and recoverable. Corrected an initial Sparkle
  signed-feed configuration error before distribution.
- PASS: site build/typecheck and ten configuration tests; Chromium/WebKit native
  HTTP controls, privacy, recovery, four widths and accessibility.
- PASS: Apple notarization Accepted, stapled ticket, nested signatures and Gatekeeper
  verified after public download; SHA256 matches the published checksum.
- PASS: real signed in-app download/install/relaunch from a synthetic older test
  version (0.3.9 build 3) to the public 0.4.0 build 4 in a separate owned copy.
  Signed hosted feed accepted; tampered feed rejected. Update-check preference
  persists across quit/relaunch and was restored to off.
- PASS: all seven GitHub jobs on release source `406189d`, including Academy,
  macOS/Linux sanitizers, Swift tests and cross-platform comparison.
- PASS: actual anonymous production landing → Live DJ → download link, 1440/390/320
  widths and axe. Found and fixed the global coming-soon redirect; only `/live-dj`
  is exempted. Improvisation and paid-generation routes remain gated.
- PASS: actual production Chromium page paired with the installed notarized app,
  read its stopped state, kept mixer controls disabled without capture, and
  disconnected. No microphone or system capture was started for this check.
- Installed the downloaded verified app at `/Applications/Jamloom Live.app`.
  Capture and microphone remain stopped. No paywall or new pricing was enabled.

Evidence: [release checks](evidence/live-companion-release/).
Prior real-audio evidence remains in [Live DJ finish](live-dj-finish.md).
Physical unplug remains explicitly deferred. No new audio-quality claim is made.

## Release maintenance

1. Increment `CFBundleShortVersionString` and strictly increase `CFBundleVersion`
   in `apps/desktop-companion/Info.plist`; update the website default version/URL.
2. Run native tests and website checks. Close Jamloom before tests using port 48191.
3. `JAMLOOM_SIGN_IDENTITY=<local-identity> script/build_and_run.sh --release`.
4. `script/prepare_live_release.sh <printed-release-directory>` submits to Apple,
   requires Accepted, staples/validates, rebuilds ZIP and checksum, then signs the
   feed using the key matching the app. Profile defaults to `jamloom-live-notary`;
   override with `JAMLOOM_NOTARY_PROFILE`. Credentials remain in local Keychain.
5. Publish the verified ZIP and SHA256SUMS to GitHub release `live-v<version>`.
   Publish the generated `appcast.xml` as the `live-updates` release asset only
   after the versioned archive is available. That stable feed URL is embedded in
   installed apps. Never edit signed XML without regenerating its signature.
6. Deliver the matching web change through GitHub, then verify live links, hashes,
   Gatekeeper, stopped launch and signed update/install/relaunch on an owned copy.

Preserve the update key securely for future releases; never rotate/delete it casually.
Existing 0.3.0 and older builds need one manual download because they predate Sparkle.

## Published artifacts

- [Download page](https://www.jamloom.com/live-dj)
- [Versioned release and checksum](https://github.com/sariserhan/jamloom/releases/tag/live-v0.4.0)
- [Signed feed](https://github.com/sariserhan/jamloom/releases/download/live-updates/appcast.xml)
- SHA256: `198d96dc809efc7caeb272b976e036f4e2da79204390d3a73d267ceae07d356f`.
- Website source: `9092dbf` (public preview gate); app source: `406189d`.
- No unrelated pending landing redesign or headphones CSS was deployed.
