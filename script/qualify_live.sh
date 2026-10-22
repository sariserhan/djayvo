#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ "${JAMLOOM_PHYSICAL_AUTHORIZED:-}" == yes ]] || { echo 'Set JAMLOOM_PHYSICAL_AUTHORIZED=yes only for an owner-authorized audible hardware session.' >&2; exit 2; }
if pgrep -f '^.*/Jamloom Live QA.app/Contents/MacOS/JamloomLive' >/dev/null; then echo 'A physical qualification is already running.' >&2; exit 2; fi
"$ROOT_DIR/script/build_and_run.sh" --build
BIN_DIR="$(swift build --package-path "$ROOT_DIR/apps/desktop-companion" --show-bin-path)"
MODULE_DIR="${BIN_DIR%/Products/*}/Intermediates.noindex/GeneratedModuleMaps"
[[ -f "$BIN_DIR/LiveAudio.o" && -f "$MODULE_DIR/LiveAudio.modulemap" ]] || { echo 'This QA command requires the current Xcode SwiftPM build backend.' >&2; exit 2; }
QA_DIR="$(mktemp -d "${TMPDIR:-/tmp/}jamloom-qualification.XXXXXX")"
export JAMLOOM_QUALIFICATION_APP="$QA_DIR/Jamloom Live QA.app"
mkdir -p "$JAMLOOM_QUALIFICATION_APP/Contents/MacOS"
swiftc -D DEBUG -parse-as-library -I "$MODULE_DIR" -Xcc "-fmodule-map-file=$MODULE_DIR/LiveAudio.modulemap" \
  "$ROOT_DIR/apps/desktop-companion/Sources/JamloomLive/ControlServer.swift" \
  "$ROOT_DIR/apps/desktop-companion/Sources/JamloomLive/LiveModel.swift" \
  "$ROOT_DIR/apps/desktop-companion/Sources/JamloomLive/LiveView.swift" "$ROOT_DIR/tools/qa/live_qualification.swift" \
  "$BIN_DIR/LiveAudio.o" -framework CoreAudio -framework AVFoundation -framework AppKit -lc++ -o "$JAMLOOM_QUALIFICATION_APP/Contents/MacOS/JamloomLive"
cp "$ROOT_DIR/dist/Jamloom Live.app/Contents/Info.plist" "$JAMLOOM_QUALIFICATION_APP/Contents/Info.plist"
plutil -replace CFBundleIdentifier -string com.jamloom.live.qa "$JAMLOOM_QUALIFICATION_APP/Contents/Info.plist"
plutil -replace CFBundleName -string 'Jamloom Live QA' "$JAMLOOM_QUALIFICATION_APP/Contents/Info.plist"
codesign --force --sign - "$JAMLOOM_QUALIFICATION_APP"
cd "$ROOT_DIR/apps/site"
caffeinate -dims node tests/live-physical.mjs
