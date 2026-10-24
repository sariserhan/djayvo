// One session owns the audio and the controls; windows only host the original panels.
const panels = [], windowBindings = new Set(), elements = new Map();
const windows = () => [window, ...panels.map(p => p.window).filter(w => w && !w.closed)];
export function studioQueryAll(selector) {
  return [...new Set([document, ...panels.flatMap(p => p.nodes)].flatMap(root => [
    ...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector),
  ]))];
}
export const studioQuery = selector => studioQueryAll(selector)[0] ?? null;
export function studioElement(id) {
  if (!id) return null;
  const cached = elements.get(id); if (cached?.isConnected) return cached;
  const node = document.getElementById(id) ?? studioQuery('#' + CSS.escape(id));
  if (node) elements.set(id, node); return node;
}
export const studioHidden = () => windows().every(w => w.document.hidden);
export const studioFocused = () => windows().some(w => w.document.hasFocus());
export function onStudioWindow(bind) {
  windowBindings.add(bind); bind(window);
}
export function onStudioHidden(callback) {
  onStudioWindow(w => {
    const check = () => { if (studioHidden()) callback(); };
    w.document.addEventListener('visibilitychange', check);
    return () => w.document.removeEventListener('visibilitychange', check);
  });
}
export function onStudioLeave(callback) {
  onStudioWindow(w => {
    const check = () => setTimeout(() => { if (!studioFocused()) callback(); }, 80);
    const hidden = () => { if (studioHidden()) callback(); };
    w.addEventListener('blur', check);
    w.document.addEventListener('visibilitychange', hidden);
    return () => { w.removeEventListener('blur', check); w.document.removeEventListener('visibilitychange', hidden); };
  });
}
// Keep meters and platters animated in a visible panel when the studio tab is covered.
export function studioAnimationFrame(callback) {
  const target = windows().find(w => !w.document.hidden) ?? window;
  let done = false;
  const run = now => { if (done) return; done = true; clearTimeout(timer); callback(now ?? performance.now()); };
  const frame = target.requestAnimationFrame(run);
  const timer = setTimeout(() => { target.cancelAnimationFrame(frame); run(); }, 200);
}
export function focusStudioControl(element) {
  if (!element) return;
  for (let parent = element; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
  const detail = element.querySelector(':scope > details.studio-panel'); if (detail) detail.open = true;
  element.ownerDocument.defaultView.focus(); element.scrollIntoView({block:'start'}); element.focus({preventScroll:true});
}

export function attachStudioWindows() {
  const root = document.getElementById('dj');
  // Moving a playing media element between documents interrupts its decoder.
  for (const id of ['audio-a', 'audio-b']) root.append(document.getElementById(id));
  const tools = document.createElement('details'); tools.className = 'studio-window-tools studio-options';
  tools.innerHTML = '<summary>Arrange your workspace <small>Detach tools into separate windows</small></summary><p>Open several tools, then drag their window title bars anywhere on your desktop. Keep this studio tab open.</p><div class="session-actions"></div><p id="studio-windows-status" role="status">One session. All your windows stay connected.</p>';
  document.querySelector('.studio-nav').after(tools);
  const actions = tools.querySelector('.session-actions'), status = tools.querySelector('[role=status]');
  const pads = document.createElement('section'); pads.id = 'rhythm-pads'; pads.setAttribute('aria-label', 'Rhythm pads'); pads.dataset.studioPro = '';
  const padHeading = document.querySelector('.pad-heading'); padHeading.before(pads); pads.append(padHeading, studioElement('drum-pads'));
  const definitions = [
    ['deck', 'Full deck', [document.querySelector('.pro-overviews'), studioElement('decks')].filter(Boolean), 1500, 960],
    ['keys', 'Keys & instruments', [studioElement('instruments')], 1000, 760],
    ['pads', 'Rhythm pads', [pads], 680, 560],
    ['sampler', 'Sampler', [studioElement('sampler')], 900, 760],
    ['voice', 'Voice response', [studioElement('performance')], 950, 850],
    ['headphones', 'Headphones', [studioElement('headphones')], 740, 700],
  ];
  const button = (label, action) => {
    const node = document.createElement('button'); node.className = 'small-button'; node.dataset.studioLayout = ''; node.textContent = label; node.onclick = action; return node;
  };
  const returnAll = button('Return all tools', () => { for (const p of panels) restore(p); }); returnAll.disabled = true;
  function refresh() { returnAll.disabled = !panels.some(p => p.window); }
  function restore(panel, closing = false) {
    const child = panel.window; if (!child) return;
    panel.window = null; clearTimeout(panel.deadline);
    // Markers can live in another detached window (pads inside the keys panel).
    panel.nodes.forEach((node, i) => panel.markers[i].after(node));
    panel.placeholder.remove(); panel.nodes[0].before(panel.bar); panel.bar.hidden = false;
    for (const dispose of panel.cleanup) dispose?.(); panel.cleanup = [];
    panel.launch.textContent = 'Detach ' + panel.title;
    if (!closing && !child.closed) child.close();
    if (closing) setTimeout(() => { if (!child.closed) child.close(); }, 0);
    status.textContent = panel.title + ' returned to the studio.'; refresh();
    document.dispatchEvent(new Event('studio:panels-moved'));
  }
  function detach(panel) {
    if (panel.window && !panel.window.closed) { panel.window.focus(); return; }
    if (panel.window) restore(panel);
    let child;
    try { child = window.open('./detached.html', 'jamloom-' + panel.id + '-' + session,
      `popup=yes,width=${panel.width},height=${panel.height},resizable=yes,scrollbars=yes`); }
    catch { /* Keep the controls in place when popups are unavailable. */ }
    if (!child) { status.textContent = 'Allow pop-up windows for this site, then try Detach again. Your tools are still here.'; return; }
    panel.window = child; panel.cleanup = []; refresh();
    panel.launch.textContent = 'Show ' + panel.title;
    status.textContent = 'Opening ' + panel.title + '…';
    let mounted = false;
    const mount = () => {
      if (mounted || child.closed || panel.window !== child) return;
      try {
        const host = child.document.getElementById('detached-content'); if (!host) return;
        mounted = true; clearTimeout(panel.deadline);
        child.document.title = panel.title + ' · Jamloom';
        child.document.documentElement.className = document.documentElement.className;
        for (const style of document.querySelectorAll('link[rel=stylesheet]')) {
          if ([...child.document.querySelectorAll('link[rel=stylesheet]')].some(link => link.href === style.href)) continue;
          const link = style.cloneNode(); link.href = style.href; child.document.head.append(link);
        }
        Object.assign(child.document.documentElement.dataset, document.documentElement.dataset);
        child.document.body.dataset.panel = panel.id;
        child.document.getElementById('detached-title').textContent = panel.title;
        child.document.getElementById('detached-return').onclick = () => restore(panel);
        child.document.getElementById('detached-studio').onclick = () => window.focus();
        if (panel.id === 'pads') {
          const help = document.createElement('p'); help.className = 'hint';
          help.append(document.createTextNode('Use Keys & instruments to enable the sound bank or adjust its level. '), button('Show keys', () => focusStudioControl(studioElement('load-instruments'))));
          host.append(help);
        }
        const description = document.getElementById('studio-access-description');
        if (description) { const note = description.cloneNode(true); note.className = 'hint'; host.before(note); }
        panel.placeholder.replaceChildren(document.createTextNode(panel.title + ' is in a separate window. '), button('Show window', () => child.focus()), button('Return here', () => restore(panel)));
        panel.markers[0].after(panel.placeholder); panel.bar.hidden = true;
        for (const node of panel.nodes) { host.append(node); const detail = node.matches('details') ? node : node.querySelector(':scope > details.studio-panel'); if (detail) detail.open = true; }
        for (const bind of windowBindings) panel.cleanup.push(bind(child));
        child.addEventListener('pagehide', () => restore(panel, true), {once:true});
        // beforeunload returns controls before the closing document releases them.
        child.addEventListener('beforeunload', () => restore(panel, true), {once:true});
        child.document.addEventListener('click', event => {
          const link = event.target.closest('a[href^="#"]'); if (!link) return;
          event.preventDefault(); focusStudioControl(studioElement(link.getAttribute('href').slice(1)));
        });
        status.textContent = panel.title + ' detached. Drag its window title bar to move it.'; child.focus();
        document.dispatchEvent(new Event('studio:panels-moved'));
      } catch { restore(panel); status.textContent = 'Could not open that tool. It has been returned to the studio.'; }
    };
    child.addEventListener('load', mount); panel.cleanup.push(() => child.removeEventListener('load', mount));
    panel.deadline = setTimeout(() => { if (!mounted) { restore(panel); status.textContent = 'The tool window could not load. Try again when the studio is available.'; } }, 10000);
    mount();
  }
  const session = crypto.randomUUID();
  for (const [id, title, nodes, width, height] of definitions) {
    const panel = {id, title, nodes, width, height, window:null, cleanup:[]};
    panel.markers = nodes.map(node => { const marker = document.createComment('Studio ' + id); node.before(marker); return marker; });
    panel.placeholder = document.createElement('div'); panel.placeholder.className = 'studio-detached-placeholder';
    panel.launch = button('Detach ' + title, () => detach(panel)); panel.launch.id = 'detach-' + id; actions.append(panel.launch);
    panel.bar = document.createElement('div'); panel.bar.className = 'studio-detach-bar';
    const local = button('↗ Detach ' + title, () => detach(panel)); local.setAttribute('aria-label', 'Detach ' + title + ' into a separate window');
    panel.bar.append(local); nodes[0].before(panel.bar); panels.push(panel);
  }
  actions.append(returnAll);
  // A closed or navigated popup must never strand a panel, even if unload was skipped.
  const checkClosed = () => { for (const panel of panels) if (panel.window?.closed) restore(panel, true); };
  let timer = setInterval(checkClosed, 500);
  window.addEventListener('pageshow', event => { if (event.persisted) timer = setInterval(checkClosed, 500); });
  window.addEventListener('pagehide', () => { for (const panel of panels) restore(panel); clearInterval(timer); });
}
