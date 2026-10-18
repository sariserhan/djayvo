# Djayvo for iPhone and iPad

Local Instant Remix prototype, iOS 17+. SwiftUI and AVFoundation call the existing
C++17 C ABI on a worker; no audio engine is duplicated in Swift. No account,
network SDK, analytics, paid provider or background microphone capability.

Open `Djayvo.xcodeproj` in Xcode. The committed project needs no package download.
`project.yml` is its source; regenerate only after project membership/settings
changes using the already-installed XcodeGen 2.46.0:

```sh
xcodegen generate --spec apps/ios/project.yml
xcodebuild build -project apps/ios/Djayvo.xcodeproj -scheme Djayvo \
  -configuration Release -destination 'generic/platform=iOS' \
  -derivedDataPath build-ios-device CODE_SIGNING_ALLOWED=NO
```

For development/device use, select your own signing team in Xcode or pass
`DEVELOPMENT_TEAM=YOUR_TEAM` on the command line. Do not commit signing files or
credentials. An unsigned build is not an installable release or a device test.
No App Store app has been registered/submitted by this implementation.

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
xcodebuild test -project apps/ios/Djayvo.xcodeproj -scheme Djayvo \
  -destination 'platform=iOS Simulator,id=SIMULATOR_UUID' \
  -derivedDataPath build-ios -parallel-testing-enabled NO \
  -resultBundlePath renders/ios-validation/new-run.xcresult CODE_SIGNING_ALLOWED=NO
```

The same checks are available through `sh scripts/ios_smoke.sh` after setting
`DJAYVO_SIMULATOR_ID`; `DJAYVO_IOS_OUTPUT` may select a fresh evidence directory.
The Release audit also verifies privacy declarations, licenses and absence of
Debug controls/recordings. Use a new result path each run. Tests exercise real render/export/hashes,
consent, bounds, cancellation, recovery, persistence, tamper rejection and
UI generation/playback/save/relaunch/share-sheet presentation/deletion. Simulator audio
playback is functional evidence, not listening or physical routing evidence.

## Product behavior

Confirm permission for the sound. Record up to five seconds, or import a local
2–15 second audio file (64 MB maximum, 1–2 channels, 8–192 kHz) and select 2–5
seconds. Imports decode through AVFoundation, are downmixed to mono, and selected
samples are written to a new PCM16 WAV. External originals are never overwritten.
Make Music produces the three original strategies; the separate club action
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
- `DjayvoApp`: consent, capture/import, trim, generation, library and share sheet.

The shared voice pool is allocated once during renderer construction. Its old
inline allocation exceeded normal mobile worker stack budgets; moving it to
heap storage preserves allocation-free processing and sample output.

The six integration tests and measured three-style generation have run on an
actual iPhone 14 Pro; see the report for exact evidence. This is not a live
performance engine. M1 listening, physical permission/routes,
battery/thermal testing, accessibility review, public policy/contact details,
beta acceptance and release approval remain separate gates. See
[the validation report](../../docs/ios-instant-remix.md) and
[release readiness](../../docs/release-readiness.md).
