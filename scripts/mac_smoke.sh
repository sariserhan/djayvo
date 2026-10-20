#!/bin/sh
set -eu
# Accept existing local tool configuration during the brand transition.
JAMLOOM_PYTHON="${JAMLOOM_PYTHON-${DJAYVO_PYTHON-}}"
JAMLOOM_REFERENCE_PREFIX="${JAMLOOM_REFERENCE_PREFIX-${DJAYVO_REFERENCE_PREFIX-}}"
JAMLOOM_OUTPUT_DIR="${JAMLOOM_OUTPUT_DIR-${DJAYVO_OUTPUT_DIR-}}"
if [ "$(uname -s)" != Darwin ]; then
    echo 'FAIL: run this script on the actual Mac; Linux cannot validate M0d.' >&2
    exit 1
fi
cd "$(dirname "$0")/.."
command -v cmake >/dev/null
command -v python3 >/dev/null
PYTHON=${JAMLOOM_PYTHON:-$(command -v python3)}
REFERENCE=${JAMLOOM_REFERENCE_PREFIX:-renders/m0/remix}
OUTPUT=${JAMLOOM_OUTPUT_DIR:-renders/mac-$(date +%Y%m%d-%H%M%S)}
if [ -e "$OUTPUT" ]; then
    echo "FAIL: output directory already exists; preserving recordings: $OUTPUT" >&2
    exit 1
fi
for style in hiphop reggae experimental; do
    test -f "$REFERENCE.$style.wav"
    test -f "$REFERENCE.$style.score.json"
    test -f "$REFERENCE.$style.events.tsv"
done
test -f renders/fixtures/synthetic-speech.wav
"$PYTHON" - <<'PY'
import hashlib
from pathlib import Path
expected = 'c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e'
if hashlib.sha256(Path('renders/fixtures/synthetic-speech.wav').read_bytes()).hexdigest() != expected:
    raise SystemExit('FAIL: supplied synthetic speech fixture hash differs; do not regenerate it.')
PY
# An inherited VIRTUAL_ENV can otherwise make CMake choose ~/mlx-env even
# when python3 on PATH belongs to the project environment.
cmake -S . -B build-mac -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES=arm64 -DBUILD_TESTING=ON -DPython3_EXECUTABLE="$PYTHON"
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
mkdir -p "$(dirname "$OUTPUT")"
mkdir "$OUTPUT"
./build-mac/jamloom_remix --input renders/fixtures/synthetic-speech.wav --synthetic-fixture --output "$OUTPUT/remix" --style all --stems
"$PYTHON" scripts/verify_export.py "$OUTPUT/remix"
"$PYTHON" - "$OUTPUT" <<'PY'
import json, platform, subprocess, sys
from pathlib import Path
def command(*args):
    return subprocess.check_output(args, text=True).strip()
result = {'system': platform.system(), 'machine': platform.machine(),
          'cpu_brand': command('sysctl', '-n', 'machdep.cpu.brand_string'),
          'memory_bytes': int(command('sysctl', '-n', 'hw.memsize')),
          'cpu_cores': int(command('sysctl', '-n', 'hw.ncpu')),
          'macos_version': command('sw_vers', '-productVersion'),
          'macos_build': command('sw_vers', '-buildVersion'),
          'kernel_release': platform.release(),
          'xcode': command('xcodebuild', '-version'),
          'developer_directory': command('xcode-select', '-p'),
          'sdk_version': command('xcrun', '--show-sdk-version'),
          'compiler': command('c++', '--version'),
          'cmake': command('cmake', '--version').splitlines()[0],
          'python': sys.version, 'python_executable': sys.executable,
          'renderer_binary': command('file', 'build-mac/jamloom_remix')}
Path(sys.argv[1], 'environment.json').write_text(json.dumps(result, indent=2) + '\n')
PY
"$PYTHON" scripts/compare_portability.py --reference "$REFERENCE" --candidate "$OUTPUT/remix" --candidate-metadata "$OUTPUT/environment.json" --report "$OUTPUT/portability-report.json"
echo 'Audition the three Mac renders and record real listening observations separately.'
