import { studioElement, focusStudioControl } from './studio-windows.js';
// Reveal controls without replacing their DOM or disturbing active playback.
export function revealStudioControl(element) {
  if (!element) return;
  if (element.ownerDocument !== document) element.ownerDocument.defaultView.focus();
  for (let parent = element; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS') parent.open = true;
  }
  const panel = element.querySelector(':scope > details.studio-panel');
  if (panel) panel.open = true;
}

// Expand the existing workspace without rebuilding media elements or the audio graph.
export function attachStudioView(root, button, status) {
  function revealHash(hash) {
    const target = studioElement(hash.slice(1));
    if (!target) return;
    if (target.ownerDocument !== document) { focusStudioControl(target); return target; }
    revealStudioControl(target);
    return target;
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) revealHash(link.getAttribute('href'))?.focus({preventScroll:true});
  });
  window.addEventListener('hashchange', () => revealHash(location.hash)?.scrollIntoView({block:'start'}));
  revealHash(location.hash);
  let mode = '', previousScroll = 0;
  const outside = new Map();
  const coachButton = studioElement('studio-coaching');
  function coaching() {
    const panel = root.querySelector('.academy-coach');
    coachButton.hidden = !mode || !panel;
    coachButton.textContent = panel?.hidden ? 'Show coaching' : 'Hide coaching';
    coachButton.setAttribute('aria-expanded', String(!!panel && !panel.hidden));
  }
  root.addEventListener('studio:coaching-ready', coaching);
  coachButton.addEventListener('click', () => {
    const panel = root.querySelector('.academy-coach');
    if (panel) { panel.hidden = !panel.hidden; coaching(); }
  });
  const nativeAvailable = () => !!root.requestFullscreen && document.fullscreenEnabled;
  function show(next, message = '') {
    const leaving = mode && !next, entering = !mode && next;
    mode = next;
    if (entering) for (const node of root.parentElement.children) {
      if (node !== root) { outside.set(node, node.inert); node.inert = true; }
    }
    if (leaving) { for (const [node, inert] of outside) node.inert = inert; outside.clear(); }
    const panel = root.querySelector('.academy-coach');
    if (panel) {
      if (!mode) panel.hidden = false;
      else if (entering) panel.hidden = !!(panel.querySelector('#academy-load')?.hidden);
    }
    coaching();
    root.classList.toggle('studio-expanded', !!mode);
    document.body.classList.toggle('studio-expanded-page', !!mode);
    root.dataset.studioView = mode || 'window';
    button.setAttribute('aria-pressed', String(!!mode));
    button.textContent = mode === 'fullscreen' ? 'Exit fullscreen' : mode ? 'Exit expanded view' : nativeAvailable() ? 'Fullscreen studio' : 'Expand studio';
    status.textContent = message || (mode === 'fullscreen' ? 'Fullscreen · Esc to exit' : mode ? 'Expanded view · Esc to exit' : 'Layout adapts to your screen.');
    if (leaving) {
      button.focus({preventScroll:true});
      window.scrollTo({top:previousScroll, behavior:'instant'});
    }
  }
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      if (document.fullscreenElement === root) await document.exitFullscreen();
      else if (mode) show('');
      else {
        previousScroll = window.scrollY;
        if (nativeAvailable()) {
          try {
            await root.requestFullscreen();
            show(document.fullscreenElement === root ? 'fullscreen' : '');
          } catch {
            show('expanded', 'Browser fullscreen was unavailable. Expanded view · Esc to exit.');
          }
        } else show('expanded');
        root.scrollTop = 0;
      }
    } catch {
      status.textContent = 'Could not leave fullscreen. Use Esc or your browser’s fullscreen control.';
    } finally { button.disabled = false; if (!mode) button.focus({preventScroll:true}); }
  });
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === root) show('fullscreen');
    else if (mode === 'fullscreen') show('');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mode === 'expanded') { event.preventDefault(); show(''); }
  });
  show('');
}
