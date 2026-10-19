"""Generate a Linux-only diagnostic copy; the original full DJ suite still fails."""
from pathlib import Path
import sys

assert len(sys.argv) == 2, 'Usage: remaining-webkit.py OUTPUT_MJS_UNDER_MOUNTED_RENDERS'
s = Path('apps/web/tests/dj.mjs').read_text()
changes = {
    "from 'playwright'": "from '/work/apps/web/node_modules/playwright/index.mjs'",
    "from './instrument-fx.mjs'": "from '/work/apps/web/tests/instrument-fx.mjs'",
    "from './midi-browser.mjs'": "from '/work/apps/web/tests/midi-browser.mjs'",
    "const root = fileURLToPath(new URL('../../../', import.meta.url));": "const root = '/work/';",
    "{ status: 'PASS', browser: kind, version: browser.version(), checks,": "{ status: 'PARTIAL', scope: 'Remaining controls; known failing whole-track loop excluded', browser: kind, version: browser.version(), checks,",
}
for before, after in changes.items():
    assert s.count(before) == 1, before
    s = s.replace(before, after)
start = s.index("  await page.locator('#loop-a').click();")
end = s.index("  await set('#crossfade', 0);", start)
assert 'actual track looping' in s[start:end]
s = s[:start] + """  await page.locator('#play-a').click();
  await page.waitForFunction(() => !document.querySelector('#audio-a').paused);
  await page.locator('#rate-reset-a').click();
  check('rotating platter, pointer/keyboard jog, cue/hot-cue, pitch/reset, tempo/tap and key lock; whole-track loop excluded');
  checks.push({name: 'Whole-track repeat', status: 'NOT RUN', reason: 'Excluded from diagnostic after FAIL in full suite; no product workaround applied'});
""" + s[end:]
Path(sys.argv[1]).write_text(s)
