"""Create isolated native-loop/fresh-URL probes without changing the application."""
import pathlib
import sys

source = pathlib.Path(sys.argv[1]).read_text()
destination = pathlib.Path(sys.argv[2])
destination.mkdir(parents=True, exist_ok=False)
source = source.replace("from 'playwright';", "from '/work/apps/web/node_modules/playwright/index.mjs';")
source = source.replace("const root = fileURLToPath(new URL('../../../', import.meta.url));", "const root = '/work/';")
original = "a.onended = () => { restarts++; a.pause(); a.currentTime = 0; a.play().catch(e => { window.playError = e.message; }); };"
assert source.count(original) == 1
native = source.replace(original, 'a.loop = true;')
native = native.replace('restarts > i && ', '')
fresh = source.replace("if (request.url === '/tone.wav')", "if (new URL(request.url, 'http://local').pathname === '/tone.wav')")
fresh = fresh.replace('a.src = URL.createObjectURL(file);', 'window.mediaFile = file; a.src = URL.createObjectURL(file);')
fresh = fresh.replace(original, """a.onended = () => {
          restarts++; const rate = a.playbackRate, previous = a.src; a.pause();
          a.removeAttribute('src'); a.load();
          a.src = source === 'http' ? '/tone.wav?restart=' + restarts : URL.createObjectURL(mediaFile);
          a.playbackRate = rate;
          if (previous.startsWith('blob:')) URL.revokeObjectURL(previous);
          a.play().catch(e => { window.playError = e.message; });
        };""")
for name, content in [('native', native), ('fresh', fresh)]:
    with (destination / f'{name}.mjs').open('x') as file:
        file.write(content)
print(destination)
