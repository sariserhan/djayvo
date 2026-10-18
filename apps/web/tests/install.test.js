import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../install.js', import.meta.url), 'utf8');
function setup(standalone = false, apple = false) {
  const button = { hidden: true }, status = { textContent: '' }, handlers = {};
  const display = { matches: standalone, addEventListener: (_, handler) => { handlers.display = handler; } };
  vm.runInNewContext(source, {
    document: { getElementById: id => id === 'install-studio' ? button : status },
    window: { addEventListener: (name, handler) => { handlers[name] = handler; } },
    navigator: { standalone: apple }, matchMedia: () => display,
  });
  return { button, status, handlers, display };
}

test('installation is optional, capability-driven and never confuses acceptance with completion', async () => {
  const { button, status, handlers, display } = setup();
  assert.equal(button.hidden, true); assert.match(status.textContent, /install menu/);
  let prompted = 0, prevented = 0;
  const offer = outcome => handlers.beforeinstallprompt({
    preventDefault: () => { prevented++; }, prompt: async () => { prompted++; },
    userChoice: Promise.resolve({ outcome }),
  });
  offer('dismissed');
  assert.equal(button.hidden, false); assert.equal(prompted, 0); assert.equal(prevented, 1);
  await button.onclick(); await button.onclick();
  assert.equal(prompted, 1); assert.equal(button.hidden, true); assert.match(status.textContent, /install menu/);
  offer('accepted'); await button.onclick();
  assert.match(status.textContent, /Finish installation/);
  handlers.appinstalled();
  assert.match(status.textContent, /was installed/); assert.equal(button.hidden, true);
  display.matches = true; handlers.display();
  assert.match(status.textContent, /open as an app/);
});

test('standalone platforms, prompt rejection and installation during a pending prompt remain honest', async () => {
  for (const [standalone, apple] of [[true, false], [false, true]]) {
    const { button, status } = setup(standalone, apple);
    assert.equal(button.hidden, true); assert.match(status.textContent, /open as an app/);
  }
  const { button, status, handlers } = setup();
  handlers.beforeinstallprompt({ preventDefault() {}, prompt: async () => { throw Error('unavailable'); } });
  await button.onclick();
  assert.equal(button.hidden, true); assert.match(status.textContent, /could not start/);
  handlers.beforeinstallprompt({ preventDefault() {}, prompt: async () => { handlers.appinstalled(); }, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  await button.onclick();
  assert.equal(button.hidden, true); assert.match(status.textContent, /was installed/);
});
