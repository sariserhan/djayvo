import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('offline build is deterministic, binds every public byte and rejects extra files, symlinks and oversized assets', () => {
  const result = spawnSync('python3', ['-'], { cwd: fileURLToPath(new URL('../../../', import.meta.url)), encoding: 'utf8', input: `
import sys,tempfile
from pathlib import Path
sys.path.insert(0,'scripts')
from build_offline import worker_source
with tempfile.TemporaryDirectory() as folder:
    root=Path(folder)
    names=[p.name for pattern in ('*.html','*.css','*.js') for p in Path('apps/web').glob(pattern)]
    names += ['engine/djayvo_web.mjs','engine/djayvo_web.wasm','licenses/VSCO-2-CE-LICENSE.txt','licenses/VCSL-LICENSE.txt','licenses/BLACK-AND-GREEN-GUITARS-CC0.txt','licenses/EMSCRIPTEN-LICENSE.txt']
    for name in names:
        file=root/name;file.parent.mkdir(parents=True,exist_ok=True);file.write_text('public fixture')
    first=worker_source(root)
    assert first==worker_source(root) and '__DJAYVO_' not in first
    (root/'index.html').write_text('changed index')
    assert worker_source(root)!=first
    (root/'private.wav').write_text('must not ship')
    try:worker_source(root);raise AssertionError('extra file accepted')
    except ValueError:pass
    (root/'private.wav').unlink()
    (root/'app.js').unlink();(root/'app.js').symlink_to(root/'index.html')
    try:worker_source(root);raise AssertionError('symlink accepted')
    except ValueError:pass
    (root/'app.js').unlink();(root/'app.js').write_bytes(b'x'*(16*1024*1024+1))
    try:worker_source(root);raise AssertionError('oversized file accepted')
    except ValueError:pass
` });
  assert.equal(result.status, 0, result.stderr);
});
