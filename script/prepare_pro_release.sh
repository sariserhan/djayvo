#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="${1:?Usage: script/prepare_pro_release.sh /path/to/directory-containing-app}"
APP="$RELEASE_DIR/Jamloom Pro.app"
VERSION=$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$APP/Contents/Info.plist")
ARCHIVE="$RELEASE_DIR/Jamloom-Pro-$VERSION-macOS.zip"
codesign --verify --deep --strict "$APP"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ARCHIVE"
xcrun notarytool submit "$ARCHIVE" --keychain-profile "${JAMLOOM_NOTARY_PROFILE:-jamloom-live-notary}" --wait --output-format json > "$RELEASE_DIR/notary.json"
python3 - "$RELEASE_DIR/notary.json" <<'PY'
import json,sys
assert json.load(open(sys.argv[1]))['status']=='Accepted','Apple did not accept the app'
PY
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"
spctl --assess --type execute --verbose=2 "$APP"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ARCHIVE"
node --input-type=module - "$ROOT_DIR" "$RELEASE_DIR" "$VERSION" "$ARCHIVE" <<'JS'
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';import path from 'node:path';
const [root,dir,version,archive]=process.argv.slice(2),{releaseFeed}=await import(pathToFileURL(path.join(root,'apps/desktop-pro/release-feed.mjs')).href);
const bytes=await fs.readFile(archive),hash=createHash('sha256').update(bytes).digest('hex'),url=`https://github.com/sariserhan/jamloom/releases/download/pro-v${version}/Jamloom-Pro-${version}-macOS.zip`;
await fs.writeFile(path.join(dir,'releases.json'),JSON.stringify(releaseFeed(version,url,hash,bytes.length),null,2)+'\n');await fs.writeFile(path.join(dir,'SHA256SUMS'),hash+'  '+path.basename(archive)+'\n');
JS
printf 'Verified Pro installer and update feed prepared in %s\n' "$RELEASE_DIR"
