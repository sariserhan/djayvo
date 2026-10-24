# Jamloom for iPhone and iPad

Improvise, Music DNA and the shared professional DJ studio, iOS 17+. SwiftUI and AVFoundation call the existing
C++17 C ABI on a worker; no audio engine is duplicated in Swift. Optional Better Auth sign-in syncs explicitly selected preferences and ledger balance. Local audio requires no account and is never automatically uploaded. Purchases and cloud generation remain closed.

Open `Jamloom.xcodeproj` in Xcode. Its build step prepares the shared WebAssembly studio; the first build downloads the pinned Emscripten toolchain. Xcode 27.1 enables foldable division-aware layouts; older compilers retain responsive iPhone/iPad layouts.
`project.yml` is its source; regenerate only after project membership/settings
changes using the already-installed XcodeGen 2.46.0:

```sh
sh scripts/web_build.sh
python3 scripts/prepare_ios_studio.py
xcodegen generate --spec apps/ios/project.yml
xcodebuild build -project apps/ios/Jamloom.xcodeproj -scheme Jamloom \
  -configuration Release -destination 'generic/platform=iOS' \
  -derivedDataPath build-ios-device CODE_SIGNING_ALLOWED=NO
```

For development/device use, select your own signing team in Xcode or pass
`DEVELOPMENT_TEAM=YOUR_TEAM` on the command line. Do not commit signing files or
credentials. An unsigned build is not an installable release or a device test.
No App Store app has been registered/submitted by this implementation. The Debug scheme uses the local `LocalCredits.storekit` fixture; it is excluded from Release and is not evidence of real Apple sandbox delivery.

Debug tests require the **existing** transferred fixture at
`renders/fixtures/synthetic-speech.wav`; a build step verifies its exact hash
and copies it to Debug only. Never regenerate it. Release contains no test
speech, private recordings or reference tracks. The `--ui-testing` Debug
argument exposes a synthetic import button and uses a separate library. Each
automated test supplies a fresh UUID namespace, retained through its relaunches;
UI tests preserve a user's normal library. It is absent in Release.

```sh
xcrun simctl list devices available
# Replace SIMULATOR_UUID with an available simulator's ID.
xcodebuild test -project apps/ios/Jamloom.xcodeproj -scheme Jamloom \
  -destination 'platform=iOS Simulator,id=SIMULATOR_UUID' \
  -derivedDataPath build-ios -parallel-testing-enabled NO \
  -resultBundlePath renders/ios-validation/new-run.xcresult CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-
```

Simulator tests use local ad-hoc signing so StoreKit sees the correct bundle identity;
this does not use a distribution certificate or contact App Store Connect.
The same checks are available through `sh scripts/ios_smoke.sh` after setting
`JAMLOOM_SIMULATOR_ID`; `JAMLOOM_IOS_OUTPUT` may select a fresh evidence directory.
The smoke script skips the two `testLiveFavoriteAutocompleteWithoutAnAccount` and
`testLiveYouTubePlaylistImportWithoutAnAccount` UI checks. Run those explicitly with
`-only-testing:JamloomUITests/FlowTests/<test name>` against the published service;
they require internet and available public catalogue/playlist data.
The Release audit also verifies privacy declarations, licenses, catalogue metadata and absence of
Debug controls/recordings/StoreKit fixtures. Use a new result path each run. Tests exercise real render/export/hashes,
consent, bounds, cancellation, recovery, persistence, tamper rejection and
UI generation/playback/save/relaunch/share-sheet presentation/deletion. Simulator audio
playback is functional evidence, not listening or physical routing evidence.

## Product behavior

Confirm permission for the sound. Record up to fifteen seconds, or import a local
1–15 second audio file (64 MB maximum, 1–2 channels, 8–192 kHz) and select 1–15
seconds. Choose a 15/30/45/60-second output; arrangements finish on musical boundaries. Imports decode through AVFoundation, are downmixed to mono, and selected
samples are written to a new PCM16 WAV. External originals are never overwritten.
Local instrumental previews produce the three original strategies; the separate club action
produces the original electronic arrangement. Regeneration uses a fresh seed.

The UI shows an indeterminate generation indicator: the C API supports
cancellation but does not report sample-by-sample progress. No invented progress
percentage is displayed. Leaving the foreground cancels active generation and
stops recording/playback; interruption or headphone disconnection stops audio.
Nothing automatically restarts the microphone.

Completed sessions remain locally until deletion/uninstall, limited to 50
sessions. Save marks a favorite; Share opens the system sheet with only one WAV.
Use Remix this sound to reload a saved session's source after relaunch. Permission
must be reaffirmed in each app launch. The library is excluded from backups;
losing the device/uninstalling loses unexported audio. Partial/tampered sessions
are withheld from playback, counted and removable through Delete all local data.
Abandoned capture scratch files are removed at launch; cancellation removes only
the new unfinished generation folder. Sharing does not automatically publish.

## Architecture and known limits

- `AudioInput`: bounded decode, mono preparation, waveform and sample trim.
- `RemixEngine`: C ABI lifetimes/cancellation and completion/source/artifact hashes.
- `RemixLibrary`: private UUID sessions, atomic metadata and scoped deletion.
- `AppModel`/`AudioSession`: worker rendering, serialized session activation,
  user-initiated microphone, bounded recording and playback/lifecycle state.
- `JamloomApp`: consent, capture/import, trim, generation, library and share sheet.

The shared voice pool is allocated once during renderer construction. Its old
inline allocation exceeded normal mobile worker stack budgets; moving it to
heap storage preserves allocation-free processing and sample output.

The six integration tests and measured three-style generation have run on an
actual iPhone 14 Pro; see the report for exact evidence. The local remix renderer
is offline; the DJ studio uses the shared Web Audio/WebAssembly performance engine.
M1 listening, physical permission/routes,
battery/thermal testing, accessibility review, public policy/contact details,
beta acceptance and release approval remain separate gates. See
[the validation report](../../docs/ios-instant-remix.md) and
[release readiness](../../docs/release-readiness.md).

## Music DNA and account sync

Choose your instruments, energy, tempo, novelty and 30–180-second duration, then
compose two variations. Cleared catalogue selections preserve track identities,
ratings and weights; genre evidence is metadata only. Use a variation's settings
next time only through its explicit button. Save/share/delete use the same private
library as improvisation. Corrupt or partial exports are withheld.

Account sign-in is optional and uses memory-only cookies. Profile loading replaces
the draft only when an account profile exists; saving/deletion uses revision checks.
A conflict requires loading the newer account version. The app never silently uploads
audio or local preferences. Sign in again after app termination. `Retry pending purchases`
requires a configured sandbox verifier and leaves transactions unfinished until the
server acknowledges delivery. New purchases are disabled until release gates pass.

See [current implementation, evidence and remaining gates](../../docs/ios-product-parity.md).

## Native professional studio (0.4.1)

The bundled console reuses the web/Pro DSP, waveforms, jog wheels, mixer,
beat grids, cue pads and effects. Music loads cleared practice tracks, an
explicitly selected local file, or a saved native mix into either deck. The
private loopback host serves bundled assets only; saved audio crosses an
explicit native bridge. Landscape keeps both decks and the mixer together;
portrait stacks them, and iPad exposes more performance controls. Playback
stops on tab changes, interruptions and backgrounding. Touch and hold a set
hot cue to clear it.

Cloud Improvise uses the same service contract as the website, with separate
audio-upload consent, sign-in, a confirmed quote and recoverable jobs. Public
generation remains gated; this client does not enable the service. Local
instrumental previews continue to work without an account. Device results and
remaining listening/release gates are in the dated completion report.
