"""Recreate the isolated probes from the unchanged pre-fix diagnostic."""
from pathlib import Path
import subprocess
import sys

assert len(sys.argv) == 2, 'Usage: variants.py NEW_OUTPUT_DIRECTORY'
p = subprocess.check_output(['git', 'show', 'e6b2a5a:apps/web/tests/media-restart.mjs'], text=True)
p = p.replace("from 'playwright'", "from '/work/apps/web/node_modules/playwright/index.mjs'")
p = p.replace("const root = fileURLToPath(new URL('../../../', import.meta.url));", "const root = '/work/';")
blob = p.replace("['blob', 'file', 'input', 'http']", "['blob']")
simple = blob.replace('for (const time of [8, 15, 8, 20, 8, 9.45]) a.currentTime = time;', '')
simple = simple.replace('for (const rate of [1.1, 1, 1.1]) a.playbackRate = rate;', '')
simple = simple.replace('a.preservesPitch = false; a.preservesPitch = true;', '').replace('), 1.1);', '), 1);')
metadata = p.replace('window.state = state;', 'window.state = state; a.preload = "metadata";')
late = metadata.replace('ctx.createMediaElementSource(a).connect(meter);', '')
late = late.replace('try { await ctx.resume(); await a.play(); }',
    'try { if (!window.connected) { ctx.createMediaElementSource(a).connect(meter); window.connected = true; } await ctx.resume(); await a.play(); }')
variants = {
    'fixed-rate': blob.replace('for (const rate of [1.1, 1, 1.1])', 'for (const rate of [1, 1, 1])').replace('), 1.1);', '), 1);'),
    'pitch-off': blob.replace('a.preservesPitch = false; a.preservesPitch = true;', 'a.preservesPitch = false;'),
    'plain-media': blob.replace('ctx.createMediaElementSource(a).connect(meter);', '').replace('peak() > .01', 'a.currentTime > .05'),
    'deferred-end': blob.replace('a.onended = () => { restarts++; a.pause(); a.currentTime = 0; a.play().catch(e => { window.playError = e.message; }); };',
        'a.onended = () => setTimeout(() => { restarts++; a.pause(); a.currentTime = 0; a.play().catch(e => { window.playError = e.message; }); }, 0);'),
    'wait-seek': blob.replace('a.currentTime = 0; a.play().catch(e => { window.playError = e.message; });',
        'a.addEventListener("seeked", () => a.play().catch(e => { window.playError = e.message; }), { once: true }); a.currentTime = 0;'),
    'simple': simple,
    'reload': blob.replace('restarts++; a.pause(); a.currentTime = 0; a.play().catch',
        'restarts++; const rate = a.playbackRate; a.pause(); a.load(); a.playbackRate = rate; a.play().catch'),
    'natural': simple.replace('frames = rate * 60', 'frames = rate * 1').replace('a.currentTime = 59.9;', '')
        .replace("await page.waitForFunction(() => a.currentTime > 59 && !a.seeking, null, { timeout: 5000 });", ''),
    'preload-auto': p.replace('window.state = state;', 'window.state = state; a.preload = "auto";'),
    'preload-metadata': metadata,
    'late-graph': late,
    'late-graph-none': late.replace('a.preload = "metadata"', 'a.preload = "none"'),
}
current = Path('apps/web/tests/media-restart.mjs').read_text()
current = current.replace("from 'playwright'", "from '/work/apps/web/node_modules/playwright/index.mjs'")
current = current.replace("const root = fileURLToPath(new URL('../../../', import.meta.url));", "const root = '/work/';")
current = current.replace("['blob', 'file', 'input', 'http']", "['blob']")
needle = 'await page.evaluate(() => a.pause()); row.iterations++;'
assert current.count(needle) == 1
for wait in [False, True]:
    code = '''const beforeRate = await page.evaluate(async () => {
          const before = a.currentTime;
          PAUSE
          a.playbackRate = 1; await a.play(); return before;
        });
        await page.waitForFunction(before => a.currentTime > before + .05 && peak() > .01, beforeRate, { timeout: 5000 });
        await page.evaluate(() => a.pause()); row.iterations++;'''
    pause = 'await new Promise(resolve => { a.addEventListener("pause", resolve, { once: true }); a.pause(); });' if wait else 'a.pause();'
    variants['rate-wait-pause' if wait else 'rate-immediate'] = current.replace(needle, code.replace('PAUSE', pause))
resume = variants['rate-wait-pause'].replace(
    'await new Promise(resolve => { a.addEventListener("pause", resolve, { once: true }); a.pause(); });\n          a.playbackRate = 1; await a.play();',
    'const paused = new Promise(resolve => { a.addEventListener("pause", resolve, { once: true }); a.pause(); });\n          a.playbackRate = 1; await paused; await a.play();')
resume = resume.replace("['blob']", "['blob', 'file', 'input', 'http']")
variants['rate-wait-resume'] = resume
variants['rate-wait-resume-bounded'] = resume.replace('await a.play(); return before;',
    'await Promise.race([a.play(), new Promise((_, reject) => setTimeout(() => reject(new Error("Rate resume timed out")), 5000))]); return before;')
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
for name, source in variants.items():
    assert source != p and source.count('const root =') == 1
    (out / (name + '.mjs')).write_text(source)
print(out)
