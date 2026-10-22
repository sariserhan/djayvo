#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-run}"
APP_BUNDLE="$ROOT_DIR/dist/Jamloom Live.app"
CONFIGURATION=debug
INFO="$ROOT_DIR/apps/desktop-companion/Info.plist"
VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "$INFO")
BUILD=$(/usr/libexec/PlistBuddy -c "Print CFBundleVersion" "$INFO")
case "$MODE" in run|--build|--verify|--logs|--debug|--release) ;; *) echo 'usage: script/build_and_run.sh [--build|--verify|--logs|--debug|--release]' >&2; exit 2;; esac
if [[ "$MODE" == --release ]]; then
  : "${JAMLOOM_SIGN_IDENTITY:?Set JAMLOOM_SIGN_IDENTITY to a Developer ID Application identity.}"
  CONFIGURATION=release
  mkdir -p "$ROOT_DIR/dist/releases"
  RELEASE_DIR="$(mktemp -d "$ROOT_DIR/dist/releases/live-$VERSION-$BUILD.XXXXXX")"
  APP_BUNDLE="$RELEASE_DIR/Jamloom Live.app"
fi
if [[ "$MODE" != --release ]] && pgrep -x JamloomLive >/dev/null; then
  osascript -e 'tell application id "com.jamloom.live" to quit' >/dev/null 2>&1 || true
  for _ in {1..20}; do pgrep -x JamloomLive >/dev/null || break; sleep 0.1; done
  if pgrep -x JamloomLive >/dev/null; then echo 'Close Jamloom Live before rebuilding.' >&2; exit 1; fi
fi
swift build --package-path "$ROOT_DIR/apps/desktop-companion" -c "$CONFIGURATION"
BIN_DIR="$(swift build --package-path "$ROOT_DIR/apps/desktop-companion" -c "$CONFIGURATION" --show-bin-path)"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
cp "$BIN_DIR/JamloomLive" "$APP_BUNDLE/Contents/MacOS/JamloomLive"
cp "$INFO" "$APP_BUNDLE/Contents/Info.plist"
mkdir -p "$APP_BUNDLE/Contents/Resources" "$APP_BUNDLE/Contents/Frameworks"
cp "$ROOT_DIR/apps/desktop-companion/Resources/"* "$APP_BUNDLE/Contents/Resources/"
SPARKLE="$ROOT_DIR/apps/desktop-companion/.build/artifacts/sparkle/Sparkle/Sparkle.xcframework/macos-arm64_x86_64/Sparkle.framework"
ditto "$SPARKLE" "$APP_BUNDLE/Contents/Frameworks/Sparkle.framework"
# Sign nested updater code inside out; never use --deep to repair signatures.
IDENTITY=-
SIGN_OPTIONS=(--timestamp=none)
if [[ "$MODE" == --release ]]; then IDENTITY="$JAMLOOM_SIGN_IDENTITY"; SIGN_OPTIONS=(--options runtime --timestamp); fi
FRAMEWORK="$APP_BUNDLE/Contents/Frameworks/Sparkle.framework/Versions/B"
for COMPONENT in XPCServices/Downloader.xpc XPCServices/Installer.xpc Updater.app Autoupdate; do
  codesign --force --sign "$IDENTITY" "${SIGN_OPTIONS[@]}" --preserve-metadata=identifier,entitlements "$FRAMEWORK/$COMPONENT"
done
codesign --force --sign "$IDENTITY" "${SIGN_OPTIONS[@]}" "$APP_BUNDLE/Contents/Frameworks/Sparkle.framework"
if [[ "$MODE" == --release ]]; then
  codesign --force --sign "$JAMLOOM_SIGN_IDENTITY" --options runtime --timestamp --entitlements "$ROOT_DIR/apps/desktop-companion/Release.entitlements" "$APP_BUNDLE"
  codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE"
  codesign --display --verbose=4 "$APP_BUNDLE" 2> "$RELEASE_DIR/signature.txt"
  grep -q 'Authority=Developer ID Application:' "$RELEASE_DIR/signature.txt"
  grep -q 'flags=.*runtime' "$RELEASE_DIR/signature.txt"
  grep -q '^Timestamp=' "$RELEASE_DIR/signature.txt"
  plutil -lint "$APP_BUNDLE/Contents/Info.plist"
  ditto -c -k --keepParent "$APP_BUNDLE" "$RELEASE_DIR/Jamloom-Live-$VERSION-macOS.zip"
  (cd "$RELEASE_DIR" && shasum -a 256 Jamloom-Live-$VERSION-macOS.zip > SHA256SUMS)
  echo "Signed release candidate: $RELEASE_DIR (not notarized or published)"
  exit 0
fi
# Local owner preview; distribution uses the separate signed release candidate.
codesign --force --sign - "$APP_BUNDLE"
case "$MODE" in
  --build) echo "$APP_BUNDLE";;
  --debug) lldb -- "$APP_BUNDLE/Contents/MacOS/JamloomLive";;
  --logs) open -n "$APP_BUNDLE"; /usr/bin/log stream --info --predicate 'process == "JamloomLive"';;
  --verify) open -n "$APP_BUNDLE"; sleep 1; pgrep -x JamloomLive >/dev/null; echo 'Jamloom Live launched; capture remains stopped.';;
  run) open -n "$APP_BUNDLE";;
esac
