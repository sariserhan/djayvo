#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-run}"
APP_BUNDLE="$ROOT_DIR/dist/Jamloom Live.app"
CONFIGURATION=debug
case "$MODE" in run|--build|--verify|--logs|--debug|--release) ;; *) echo 'usage: script/build_and_run.sh [--build|--verify|--logs|--debug|--release]' >&2; exit 2;; esac
if [[ "$MODE" == --release ]]; then
  : "${JAMLOOM_SIGN_IDENTITY:?Set JAMLOOM_SIGN_IDENTITY to a Developer ID Application identity.}"
  CONFIGURATION=release
  mkdir -p "$ROOT_DIR/dist/releases"
  RELEASE_DIR="$(mktemp -d "$ROOT_DIR/dist/releases/live-0.3.0-3.XXXXXX")"
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
cat > "$APP_BUNDLE/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>JamloomLive</string>
<key>CFBundleIdentifier</key><string>com.jamloom.live</string>
<key>CFBundleName</key><string>Jamloom Live</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.3.0</string>
<key>CFBundleVersion</key><string>3</string>
<key>LSMinimumSystemVersion</key><string>14.2</string>
<key>NSPrincipalClass</key><string>NSApplication</string>
<key>NSMicrophoneUsageDescription</key><string>Record a short microphone sample only when you press Record. It stays in memory until you clear it or quit.</string>
<key>NSAudioCaptureUsageDescription</key><string>Jamloom captures only the audio processes you select for its two decks, to mix and apply local effects. It does not record or upload that audio.</string>
</dict></plist>
PLIST
if [[ "$MODE" == --release ]]; then
  codesign --force --sign "$JAMLOOM_SIGN_IDENTITY" --options runtime --timestamp --entitlements "$ROOT_DIR/apps/desktop-companion/Release.entitlements" "$APP_BUNDLE"
  codesign --verify --strict --verbose=2 "$APP_BUNDLE"
  codesign --display --verbose=4 "$APP_BUNDLE" 2> "$RELEASE_DIR/signature.txt"
  grep -q 'Authority=Developer ID Application:' "$RELEASE_DIR/signature.txt"
  grep -q 'flags=.*runtime' "$RELEASE_DIR/signature.txt"
  grep -q '^Timestamp=' "$RELEASE_DIR/signature.txt"
  plutil -lint "$APP_BUNDLE/Contents/Info.plist"
  ditto -c -k --keepParent "$APP_BUNDLE" "$RELEASE_DIR/Jamloom-Live-0.3.0-macOS.zip"
  (cd "$RELEASE_DIR" && shasum -a 256 Jamloom-Live-0.3.0-macOS.zip > SHA256SUMS)
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
