#!/bin/sh
set -eu
if [ "$(uname -s)" != Darwin ]; then
    echo 'FAIL: run this script on the actual Mac; Linux cannot validate M0d.' >&2
    exit 1
fi
cd "$(dirname "$0")/.."
command -v cmake >/dev/null
command -v python3 >/dev/null
test -f renders/fixtures/synthetic-speech.wav
cmake -S . -B build-mac -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES=arm64
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
./build-mac/djayvo_remix --input renders/fixtures/synthetic-speech.wav --synthetic-fixture --output renders/mac/remix --style all --stems
python3 - <<'PY'
import json, platform, subprocess
from pathlib import Path
result = {'system': platform.system(), 'machine': platform.machine(),
          'cpu_brand': subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string'], text=True).strip(),
          'compiler': subprocess.check_output(['c++', '--version'], text=True).splitlines()[0]}
Path('renders/mac/environment.json').write_text(json.dumps(result, indent=2) + '\n')
PY
python3 scripts/compare_portability.py --reference renders/m0/remix --candidate renders/mac/remix --candidate-metadata renders/mac/environment.json --report renders/mac/portability-report.json
echo 'Audition the three Mac renders and record real listening observations separately.'
