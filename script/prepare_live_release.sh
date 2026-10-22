#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="${1:?Usage: script/prepare_live_release.sh /path/to/signed-release-directory}"
APP="$RELEASE_DIR/Jamloom Live.app"
INFO="$APP/Contents/Info.plist"
VERSION=$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$INFO")
ARCHIVE="$RELEASE_DIR/Jamloom-Live-$VERSION-macOS.zip"
TOOLS="$ROOT_DIR/apps/desktop-companion/.build/artifacts/sparkle/Sparkle/bin"
PROFILE="${JAMLOOM_NOTARY_PROFILE:-jamloom-live-notary}"
PUBLIC_KEY=$("$TOOLS/generate_keys" --account com.jamloom.live -p)
[[ "$(/usr/libexec/PlistBuddy -c 'Print SUPublicEDKey' "$INFO")" == "$PUBLIC_KEY" ]] || { echo 'Update signing key does not match the app.' >&2; exit 1; }
codesign --verify --deep --strict "$APP"
# Never generate a distributable feed for an unnotarized or mismatched archive.
ditto -c -k --keepParent "$APP" "$ARCHIVE"
xcrun notarytool submit "$ARCHIVE" --keychain-profile "$PROFILE" --wait --output-format json > "$RELEASE_DIR/notary.json"
python3 - "$RELEASE_DIR/notary.json" <<'PY'
import json,sys
assert json.load(open(sys.argv[1]))['status']=='Accepted', 'Apple did not accept this archive'
PY
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"
spctl --assess --type execute --verbose=2 "$APP"
ditto -c -k --keepParent "$APP" "$ARCHIVE"
"$TOOLS/generate_appcast" --account com.jamloom.live --maximum-deltas 0 --download-url-prefix "https://github.com/sariserhan/jamloom/releases/download/live-v$VERSION/" "$RELEASE_DIR"
"$TOOLS/sign_update" --account com.jamloom.live --verify "$RELEASE_DIR/appcast.xml"
(cd "$RELEASE_DIR" && shasum -a 256 "Jamloom-Live-$VERSION-macOS.zip" > SHA256SUMS)
echo "Notarized archive and signed appcast ready in $RELEASE_DIR. Publication is a separate step."
