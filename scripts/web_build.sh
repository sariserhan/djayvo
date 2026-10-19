#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
EMSDK_PATH="${DJAYVO_EMSDK:-$PWD/build-web-tools/emsdk}"
if [ ! -f "$EMSDK_PATH/emsdk_env.sh" ]; then
  echo 'Install the isolated SDK as described in apps/web/README.md.' >&2
  exit 1
fi
. "$EMSDK_PATH/emsdk_env.sh"
if [ -x "$PWD/.venv-build/bin/cmake" ]; then PATH="$PWD/.venv-build/bin:$PATH"; export PATH; fi
emcmake cmake -S . -B build-web -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF
cmake --build build-web --target djayvo_web djayvo_live -j 4
mkdir -p dist/web/engine dist/web/licenses
cp apps/web/*.html apps/web/*.css apps/web/*.js apps/web/manifest.webmanifest apps/web/icon.svg apps/web/icon-180.png apps/web/icon-192.png apps/web/icon-512.png dist/web/
cp build-web/djayvo_web.mjs build-web/djayvo_web.wasm build-web/djayvo_live.wasm dist/web/engine/
cp assets/licenses/*.txt dist/web/licenses/
cp "$EMSDK_PATH/upstream/emscripten/LICENSE" dist/web/licenses/EMSCRIPTEN-LICENSE.txt
for notice in libc/musl/COPYRIGHT libcxx/LICENSE.TXT libcxxabi/LICENSE.TXT libunwind/LICENSE.TXT compiler-rt/LICENSE.TXT; do
  printf '\n\nBundled runtime notice: %s\n\n' "$notice" >> dist/web/licenses/EMSCRIPTEN-LICENSE.txt
  cat "$EMSDK_PATH/upstream/emscripten/system/lib/$notice" >> dist/web/licenses/EMSCRIPTEN-LICENSE.txt
done
python3 scripts/build_offline.py dist/web
printf '%s\n' 'Built dist/web. Start with: python3 scripts/web_serve.py'
