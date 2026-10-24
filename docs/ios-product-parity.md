# iOS product parity — 2026-10-21

**Latest update, 2026-10-23:** optional native cloud Improvise and the shared professional DJ console supersede the original two-tab/no-upload/no-bundled-audio scope below. Signed 0.4.1 candidate, current phone/iPad checks and explicit remaining gates are in [the completion report](project-completion-20261023.md#professional-native-dj-console--041-candidate). Earlier evidence below remains historical.

The latest continuation advances available local work into iOS, following the
owner's non-iOS → iOS → launch order. Listening and physical checks remain deferred.
No provider rental, live charge, model training, push, deployment or upload occurs.
The master specifications, supplied fixture and existing recordings are preserved.

## Implemented

- Improvisation accepts 1–15-second recordings/import selections and 15/30/45/60-second
  output choices. The additive C ABI reuses the existing duration-aware planner;
  old API calls and saved sessions retain their original behavior. Recording stops
  at fifteen seconds, on background/interruption, or explicitly. No autoplay.
- Music DNA produces two original 30–180-second instrumental variations through
  the same C++ composition engine used by the browser. It supports cancellation,
  private persistence, favorite marking, playback, WAV sharing, deletion, and
  opt-in reuse of a chosen variation's settings. It does not train a model.
- Native catalogue choices use the same committed CC0 metadata as the web, with
  exact track identities, love/like/avoid, weights, and transparent genre scores.
  Titles never imply audio analysis. No catalogue audio is bundled or downloaded.
- Both tabs share one render/playback owner and library. Backgrounding, tab changes,
  audio interruptions, lost routes and media resets stop audio appropriately.
  A new composition publishes library metadata only after both outputs and their
  hashes are verified. Cancelled/failed renders remove only their new session.
- Optional existing-account sign-in uses Better Auth's existing endpoints and an
  ephemeral URLSession. Cookies/passwords are not written to disk. Requests use
  the exact configured origin, refuse redirects, have time and byte bounds, and
  keep private responses uncached. Release uses only `https://www.jamloom.com`.
  Debug tests may use explicit loopback origins; this is absent from Release.
- Account balance comes from the server ledger. Profile load/save/delete is
  explicit; compare-and-swap revisions prevent overwriting another device's work.
  Authentication is not required for local music. Profiles and credit history are
  the only account data in this increment; recordings are never uploaded.
- StoreKit recovery checks account/product/verification, posts the signed transaction
  for independent server verification, and finishes only after durable acknowledgment.
  A different account's unfinished transaction remains untouched and does not block
  matching transactions. An updates listener and explicit retry preserve recovery.
  New purchases remain hard-gated closed.
- `/api/payments/apple/notifications` verifies both the Apple notification and nested
  refund transaction, accepts only the configured sandbox app, and applies the existing
  idempotent receipt hold/refund ledger. Refunds arriving before grants block later
  credit minting. Refund reversals return a retryable failure pending manual ledger
  reconciliation; they never automatically regrant credits. No subscriptions are sold.
  The callback is permitted through coming-soon, while account/product APIs stay gated.
- Privacy declarations and the Release audit now cover optional account identifiers,
  email, preferences and purchase history. The audit checks exact catalogue metadata,
  required-reason declarations and absence of audio, UI-test and StoreKit fixtures.

## Validation

Committed technical receipts are in [evidence/ios-product-parity](evidence/ios-product-parity/).
Private WAVs and complete xcresult bundles remain ignored under
`renders/ios-parity-20261021/`. All simulator playback was muted. Screenshots retain the verified
[iPhone composition](evidence/ios-product-parity/iphone-music-dna.png) and
[iPad composition](evidence/ios-product-parity/ipad-music-dna.png) surfaces.

| Gate | Status | Evidence |
|---|---|---|
| Shared C++ core | PASS | 17/17 CTest groups; additive taste ABI cancellation/refusal/identity; ASan/UBSan taste and C ABI groups |
| Simulator/WASM identity | PASS | Both 30-second A/B whole WAV files match byte for byte; hashes and inputs in `ios-wasm-parity-final.json` |
| Maximum durations | PASS | 15-second source → 60-second club render and two 180-second Music DNA outputs, including persistence verification |
| Native account ↔ actual backend | PASS | iPad simulator URLSession, actual Better Auth cookies and disposable local Postgres: verified sign-in, balance, catalogue profile save/load/delete, revoked server session; synthetic ledger lot, no Apple receipt claim |
| Backend regression | PASS | 40 site unit tests, real HTTP owner isolation/profile revision checks, actual Postgres refund/replay/out-of-order grant refusal, production build and client-secret audit |
| Unsigned device Release | PASS | Current Release compiles; bundle audit passes at 50,604,188 bytes, with correct privacy/catalogue/licenses and no Debug/StoreKit/audio fixtures |
| Local StoreKit | PASS | Real SKTestSession product retrieval, account-token rejection, failed-delivery recovery and acknowledgment-before-finish; `storekit-signed-tests.json` |
| Simulator UI | PASS, scoped | Three corrected iPhone flows; two final iPad flows covering composition, explicit play/stop on tab change, save/relaunch/share and denied microphone/import recovery; `recovery-tests.json`, `ipad-tests.json` |

The initial full simulator run had 19 passes, one opt-in HTTP skip and two UI
failures. The failures exposed grouped SwiftUI Form buttons sharing actions and
keyboard-obscured preference controls. Independent button styling and explicit
keyboard dismissal fixed those paths; all three iPhone regression flows then passed.
The initial iPad composition selector assumed a phone `TabBar`; the test now
addresses the first matching Music DNA tab on either layout. The wide iPad
consent switch test targets its actual switch control and waits for the bound value. The shared audio owner
also invalidates pending activation/preparation when stopped or leaving a tab.
Initial evidence is retained. Two failed iPad runs stalled in Xcode result
collection after their tests finished; their logs are retained and those cleanup
processes were stopped. The final iPad run and StoreKit run both exited successfully
with complete xcresult summaries. This is not an all-green initial run.

The unsigned StoreKit attempts failed with no local products/transactions. Adding
the scheme fixture alone did not fix it. A locally ad-hoc-signed simulator app
reported the correct `com.djayvo.app` identity and passed the same test. The smoke
script and README now use that configuration for simulator tests; Release remains
unsigned for local bundle inspection. No SDK regression is claimed, no verification
result was fabricated, and no test was skipped to obtain this pass.

Reproduce from the repository root (use fresh result paths):

```sh
ctest --test-dir build-finish --output-on-failure
ctest --test-dir build-duration-sanitize -R 'taste|c_abi' --output-on-failure
xcodebuild test -project apps/ios/Jamloom.xcodeproj -scheme Jamloom \
  -destination 'platform=iOS Simulator,name=iPhone 18 Pro' \
  -derivedDataPath build-ios-parity -parallel-testing-enabled NO \
  -resultBundlePath renders/ios-parity-repeat.xcresult CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-
xcrun xcresulttool export attachments --path renders/ios-parity-repeat.xcresult \
  --output-path renders/ios-parity-repeat-attachments
node scripts/compare_ios_taste.mjs renders/ios-parity-repeat-attachments
python3 scripts/verify_ios_bundle.py \
  build-ios-parity-release/Build/Products/Release-iphoneos/Jamloom.app
```

The comparison requires the current `build-web/jamloom_web.mjs` build. Backend
checks use Node 22. From `apps/site`, the real native-account harness is:

```sh
JAMLOOM_TEST_DATABASE_URL=postgresql://127.0.0.1/postgres \
node --import tsx tests/ios-account-http.mjs \
  ../../build-ios-parity/Build/Products/Jamloom_iphonesimulator27.1-arm64.xctestrun \
  SIMULATOR_UUID ../../renders/ios-account-repeat
```

It creates and drops only its own disposable database, uses synthetic account
mail, and never touches the hosted account database.

## Remaining acceptance

**PARTIAL** overall. Earlier musical-quality rejection remains **FAIL**. Human
listening, manual accessibility, physical microphone/routes/battery/thermal/session
qualification are **NOT RUN** in this increment by the owner's deferral. Simulator
playback is muted and does not count as listening.

Real App Store sandbox receipts, server notification delivery, App Store products,
production verification/net proceeds and end-to-end paid provider execution remain
**NOT RUN**. The new backend routes are local-only until an authorized GitHub deployment.
The existing coming-soon, quality and purchase holds stay active. No native cloud
submission is enabled while the backend generation service remains rehearsal-only;
quoted paid generation and actual provider parity require those external gates.

Model selection/training still requires quality evidence and reviewed, permissioned
expert data. Launch operations remain last. These limitations are not test failures
that can be removed by changing the acceptance criteria.

## Documentation checked

Context7 was unavailable. Platform behavior was checked against Apple's official
[ephemeral URLSession](https://developer.apple.com/documentation/foundation/urlsessionconfiguration/ephemeral),
[streamed response](https://developer.apple.com/documentation/foundation/urlsession/bytes(for:delegate:)),
[unfinished transactions](https://developer.apple.com/documentation/storekit/transaction/unfinished),
[transaction updates](https://developer.apple.com/documentation/storekit/transaction/updates),
[local StoreKit tests](https://developer.apple.com/documentation/storekittest/sktestsession/buyproduct(identifier:options:)),
[server notifications](https://developer.apple.com/documentation/appstoreservernotifications/responsebodyv2decodedpayload),
and [Better Auth usage](https://better-auth.com/docs/basic-usage), alongside the installed SDK.
