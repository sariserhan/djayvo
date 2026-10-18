#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != Darwin ]; then
    echo 'FAIL: iOS validation requires the actual Mac/Xcode.' >&2
    exit 1
fi
: "${DJAYVO_SIMULATOR_ID:?Set DJAYVO_SIMULATOR_ID from xcrun simctl list devices available}"
OUTPUT=${DJAYVO_IOS_OUTPUT:-renders/ios-$(date +%Y%m%d-%H%M%S)}
if [ -e "$OUTPUT" ]; then
    echo "FAIL: preserving existing evidence: $OUTPUT" >&2
    exit 1
fi
mkdir -p "$OUTPUT"
xcodebuild test -project apps/ios/Djayvo.xcodeproj -scheme Djayvo \
    -destination "platform=iOS Simulator,id=$DJAYVO_SIMULATOR_ID" \
    -derivedDataPath build-ios -parallel-testing-enabled NO \
    -resultBundlePath "$OUTPUT/tests.xcresult" CODE_SIGNING_ALLOWED=NO > "$OUTPUT/tests.log" 2>&1
xcodebuild build -project apps/ios/Djayvo.xcodeproj -scheme Djayvo \
    -configuration Release -destination 'generic/platform=iOS' \
    -derivedDataPath build-ios-device CODE_SIGNING_ALLOWED=NO > "$OUTPUT/release.log" 2>&1
python3 scripts/verify_ios_bundle.py build-ios-device/Build/Products/Release-iphoneos/Djayvo.app > "$OUTPUT/bundle.json"
xcrun xcresulttool get test-results summary --path "$OUTPUT/tests.xcresult" > "$OUTPUT/tests.json"
echo "PASS: simulator tests and unsigned device compilation; evidence: $OUTPUT"
echo 'Physical microphone/routes/battery, listening and production release are separate gates.'
