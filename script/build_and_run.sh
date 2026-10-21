#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-run}"
APP_BUNDLE="$ROOT_DIR/dist/Jamloom Live.app"
case "$MODE" in run|--build|--verify|--logs|--debug) ;; *) echo 'usage: script/build_and_run.sh [--build|--verify|--logs|--debug]' >&2; exit 2;; esac
if pgrep -x JamloomLive >/dev/null; then
  osascript -e 'tell application id "com.jamloom.live" to quit' >/dev/null 2>&1 || true
  for _ in {1..20}; do pgrep -x JamloomLive >/dev/null || break; sleep 0.1; done
  if pgrep -x JamloomLive >/dev/null; then echo 'Close Jamloom Live before rebuilding.' >&2; exit 1; fi
fi
swift build --package-path "$ROOT_DIR/apps/desktop-companion"
BIN_DIR="$(swift build --package-path "$ROOT_DIR/apps/desktop-companion" --show-bin-path)"
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
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>14.2</string>
<key>NSPrincipalClass</key><string>NSApplication</string>
<key>NSAudioCaptureUsageDescription</key><string>Jamloom captures only the audio process you select, to apply local effects. It does not record or upload that audio.</string>
</dict></plist>
PLIST
# Local owner preview only; Developer ID signing and notarization are separate release gates.
codesign --force --sign - "$APP_BUNDLE"
case "$MODE" in
  --build) echo "$APP_BUNDLE";;
  --debug) lldb -- "$APP_BUNDLE/Contents/MacOS/JamloomLive";;
  --logs) open -n "$APP_BUNDLE"; /usr/bin/log stream --info --predicate 'process == "JamloomLive"';;
  --verify) open -n "$APP_BUNDLE"; sleep 1; pgrep -x JamloomLive >/dev/null; echo 'Jamloom Live launched; capture remains stopped.';;
  run) open -n "$APP_BUNDLE";;
esac
