#!/usr/bin/env python3
"""Check the x/y evidence and single-reference CLI; run with .venv-analysis Python."""
from pathlib import Path
import hashlib
import json
import platform
import subprocess
import sys
import tempfile


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


script = Path('docs/evidence/reference-analysis/analyze.py')
results = []
with tempfile.TemporaryDirectory(prefix='djayvo-reference-check-') as directory:
    fresh = Path(directory) / 'unused'
    source = Path.home() / 'Downloads/x.mp3'
    existing = Path('docs/evidence/reference-x')
    before = {p.name: digest(p) for p in existing.iterdir() if p.is_file()}
    for label, args, message in (
        ('input without output', ['--input', str(source)], 'must be supplied together'),
        ('output without input', ['--output', str(fresh)], 'must be supplied together'),
        ('missing input', ['--input', str(Path(directory)/'missing.mp3'), '--output', str(fresh)], 'existing audio file'),
        ('existing output', ['--input', str(source), '--output', str(existing)], 'new directory'),
    ):
        run = subprocess.run([sys.executable, str(script), *args], capture_output=True, text=True)
        assert run.returncode == 2 and message in run.stderr, (label, run.stderr)
        assert not fresh.exists()
        results.append({'check': label, 'status': 'PASS'})
    assert before == {p.name: digest(p) for p in existing.iterdir() if p.is_file()}
    for name in ('x', 'y'):
        source = Path.home() / 'Downloads' / f'{name}.mp3'
        expected = json.loads(Path(f'docs/evidence/reference-{name}/analysis.json').read_text())
        assert digest(source) == expected[name]['sha256']
        destination = Path(directory) / name
        subprocess.run([sys.executable, str(script), '--input', str(source), '--output', str(destination)], check=True)
        assert json.loads((destination/'analysis.json').read_text()) == expected
        assert digest(source) == expected[name]['sha256']
        results.append({'check': f'{name}: full-file measurement repeatability and unchanged source', 'status': 'PASS'})

master = Path('ai_improvisational_musician_master_spec_v1.md')
assert digest(master) == '389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2'
import numpy
import scipy
import matplotlib
report = {'checks': results, 'master_unchanged': 'PASS', 'direct_listening': 'NOT RUN',
          'environment': {'python': sys.version, 'machine': platform.machine(),
                          'macos': platform.mac_ver()[0], 'numpy': numpy.__version__,
                          'scipy': scipy.__version__, 'matplotlib': matplotlib.__version__,
                          'ffmpeg': subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0]}}
Path('docs/evidence/reference-analysis/xy-verification.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
