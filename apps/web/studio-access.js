import { studioElement, studioQueryAll, studioQuery, onStudioWindow } from './studio-windows.js';
export function studioMode(active, hash) {
  if (hash === '#basic') return 'basic';
  if (hash === '#pro-demo') return 'demo';
  return active ? 'pro' : 'demo';
}

export async function attachStudioAccess() {
  // The native app verifies its signed license; Academy keeps its existing course gate.
  if (window.jamloomDesktop || !location.pathname.startsWith('/studio/')) {
    return { mode: 'pro', ownMusic: true, refresh() {} };
  }
  let active = false, unavailable = false;
  try {
    const response = await fetch('/api/pro/access', {cache: 'no-store', signal: AbortSignal.timeout(8000)});
    if (response.ok) active = (await response.json()).active === true;
    else unavailable = ![401, 403].includes(response.status);
  } catch { unavailable = true; }
  let choice = location.hash;
  try {
    if (['#basic', '#pro-demo', '#pro'].includes(choice)) sessionStorage.setItem('jamloom-studio-mode', choice);
    else choice = sessionStorage.getItem('jamloom-studio-mode') ?? choice;
  } catch { /* The URL still selects a mode when browser storage is unavailable. */ }
  const mode = studioMode(active, choice), ownMusic = mode !== 'demo';
  const banner = studioElement('studio-access');
  banner.hidden = false;
  document.documentElement.dataset.studioMode = mode;
  studioQuery('.brand-mode').textContent = mode === 'pro' ? ' / PRO' : mode === 'basic' ? ' / BASIC' : ' / PRO DEMO';
  studioElement('studio-access-title').textContent = mode === 'pro' ? 'Pro · Your music. Every control.' : mode === 'basic' ? 'Basic · Mix your music for free.' : 'Try Pro free with sample music.';
  const description = studioElement('studio-access-description');
  description.textContent = mode === 'pro' ? 'Your Pro access is active.' : mode === 'basic'
    ? 'Two decks, EQ, speed, cue, track loops, tone and echo. Try advanced controls with sample music, or upgrade to use them with your tracks.'
    : 'Explore the full deck with our included tracks. Use Basic for your own music, or unlock Pro for $49 once.';
  if (unavailable) description.textContent += ' Pro access could not be checked. Reconnect and reload if you already own Pro.';
  const basic = studioElement('studio-basic'), demo = studioElement('studio-demo');
  basic.setAttribute('aria-pressed', String(mode === 'basic'));
  demo.setAttribute('aria-pressed', String(mode === 'demo'));
  for (const [button, hash] of [[basic, '#basic'], [demo, '#pro-demo']]) button.onclick = () => {
    if ((hash === '#basic' ? 'basic' : 'demo') === mode) return;
    if (studioQuery('.deck[data-playing="true"], .sample-pad[data-playing="true"], #load-instruments:disabled, #take-wav:not([hidden])') || [...studioQueryAll('[id^="state-"]')].some(node => node.textContent !== 'Empty')) {
      if (!confirm('Switch modes and clear this session? Save any work you want to keep first. Saved files stay on your device.')) return;
    }
    location.hash = hash; location.reload();
  };
  studioElement('studio-upgrade').hidden = active;
  studioElement('studio-paid').hidden = !active;
  studioElement('studio-paid').onclick = () => {
    if (mode === 'pro') return;
    if (!confirm('Open Pro and clear this session? Save any work you want to keep first.')) return;
    location.hash = 'pro'; location.reload();
  };
  const restricted = mode === 'basic' ? '[data-studio-pro]' : mode === 'demo' ? '[data-studio-own]' : null;
  const status = studioElement('studio-access-status');
  const message = mode === 'basic' ? 'This is a Pro control. Try Pro with sample music, or upgrade to use your tracks.' : 'Pro demo uses included music. Switch to Basic for your tracks, or upgrade to Pro.';
  function refresh() {
    if (!restricted) return;
    for (const area of studioQueryAll(restricted)) {
      area.classList.add('studio-locked');
      for (const control of area.matches('input,select,button') ? [area] : area.querySelectorAll('input,select,button')) {
        if (control.matches('[data-studio-cleanup],[data-studio-layout]')) continue;
        if (!control.disabled) control.disabled = true;
        control.setAttribute('aria-describedby', 'studio-access-description');
      }
    }
  }
  if (restricted) {
    // Capture also blocks MIDI-dispatched input events before existing handlers run.
    onStudioWindow(w => {
    const guard = event => {
      const name = event.type;
      if (name === 'keydown' && event.key === 'Tab') return;
      const target = event.target;
      if (target?.nodeType !== 1 || !target.closest(restricted) || target.closest('summary,a,[data-studio-cleanup],[data-studio-layout]')) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (target.tagName === 'INPUT' && target.type === 'file') target.value = '';
      status.textContent = message;
    };
    const events = ['click', 'pointerdown', 'keydown', 'input', 'change'];
    for (const name of events) w.document.addEventListener(name, guard, true);
    const observer = new MutationObserver(refresh); observer.observe(w.document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});
    return () => { observer.disconnect(); for (const name of events) w.document.removeEventListener(name, guard, true); };
    });
    for (const area of studioQueryAll(restricted)) {
      const hint = document.createElement('span'); hint.className = 'studio-lock-note';
      hint.textContent = mode === 'basic' ? 'Pro · Try with sample music' : 'Your music · Basic or Pro upgrade';
      if (area.matches('input,button,select')) area.after(hint);
      else if (area.tagName === 'DETAILS') area.querySelector('summary').append(hint);
      else (area.querySelector(':scope > details > summary') ?? area).prepend(hint);
    }
  }
  refresh();
  return {mode, ownMusic, refresh};
}
