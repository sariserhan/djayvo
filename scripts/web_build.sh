#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
EMSDK_PATH="${JAMLOOM_EMSDK:-${DJAYVO_EMSDK:-$PWD/build-web-tools/emsdk}}"
if [ -x "$PWD/.venv-build/bin/cmake" ]; then PATH="$PWD/.venv-build/bin:$PATH"; export PATH; fi
PATH="$PWD/build-web-tools/python-env/bin:$PWD/build-web-tools/cmake-env/bin:$PATH"; export PATH
if ! python3 -c 'import sys; sys.exit(sys.version_info < (3, 10))'; then
  python3 -m venv build-web-tools/bootstrap
  build-web-tools/bootstrap/bin/python -m pip install --disable-pip-version-check 'uv==0.13.2'
  UV_PYTHON_INSTALL_DIR="$PWD/build-web-tools/python" \
    UV_CACHE_DIR="$PWD/build-web-tools/uv-cache" \
    build-web-tools/bootstrap/bin/uv venv --python 3.12.13 build-web-tools/python-env
  # Forget system Python cached before the new environment existed.
  hash -r
fi
python3 -c 'import sys; assert sys.version_info >= (3, 10), "Emscripten requires Python 3.10+"'
if ! command -v cmake >/dev/null 2>&1; then
  python3 -m venv build-web-tools/cmake-env
  build-web-tools/cmake-env/bin/python -m pip install --disable-pip-version-check 'cmake==3.31.6'
  PATH="$PWD/build-web-tools/cmake-env/bin:$PATH"; export PATH
fi
if [ ! -f "$EMSDK_PATH/emsdk_env.sh" ]; then
  # Vercel can restore nested dependency caches without the SDK sources.
  mkdir -p "$EMSDK_PATH"
  git -C "$EMSDK_PATH" init --quiet
  git -C "$EMSDK_PATH" fetch --depth 1 https://github.com/emscripten-core/emsdk.git tag 6.0.1
  git -C "$EMSDK_PATH" checkout --detach FETCH_HEAD
fi
if [ ! -f "$EMSDK_PATH/.emscripten" ]; then
  "$EMSDK_PATH/emsdk" install 6.0.1
  "$EMSDK_PATH/emsdk" activate 6.0.1
fi
. "$EMSDK_PATH/emsdk_env.sh"
emcc --version | head -n 1 | grep -F ' 6.0.1 ' >/dev/null || {
  echo 'Jamloom requires Emscripten 6.0.1; activate it in JAMLOOM_EMSDK.' >&2
  exit 1
}
emcmake cmake -S . -B build-web -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF
cmake --build build-web --target jamloom_web jamloom_live -j 4
# Remove only obsolete generated engines when upgrading an existing checkout.
rm -f dist/web/engine/djayvo_web.mjs dist/web/engine/djayvo_web.wasm dist/web/engine/djayvo_live.wasm
mkdir -p dist/web/engine dist/web/licenses
cp apps/web/*.html apps/web/*.css apps/web/*.js apps/web/manifest.webmanifest apps/web/icon.svg apps/web/icon-180.png apps/web/icon-192.png apps/web/icon-512.png dist/web/
cp build-web/jamloom_web.mjs build-web/jamloom_web.wasm build-web/jamloom_live.wasm dist/web/engine/
cp assets/licenses/*.txt dist/web/licenses/
cp "$EMSDK_PATH/upstream/emscripten/LICENSE" dist/web/licenses/EMSCRIPTEN-LICENSE.txt
for notice in libc/musl/COPYRIGHT libcxx/LICENSE.TXT libcxxabi/LICENSE.TXT libunwind/LICENSE.TXT compiler-rt/LICENSE.TXT; do
  printf '\n\nBundled runtime notice: %s\n\n' "$notice" >> dist/web/licenses/EMSCRIPTEN-LICENSE.txt
  cat "$EMSDK_PATH/upstream/emscripten/system/lib/$notice" >> dist/web/licenses/EMSCRIPTEN-LICENSE.txt
done
python3 scripts/build_offline.py dist/web
printf '%s\n' 'Built dist/web. Start with: python3 scripts/web_serve.py'
