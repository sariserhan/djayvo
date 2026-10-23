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
  const banner = document.getElementById('studio-access');
  banner.hidden = false;
  document.documentElement.dataset.studioMode = mode;
  document.querySelector('.brand-mode').textContent = mode === 'pro' ? ' / PRO' : mode === 'basic' ? ' / BASIC' : ' / PRO DEMO';
  document.getElementById('studio-access-title').textContent = mode === 'pro' ? 'Pro · Your music. Every control.' : mode === 'basic' ? 'Basic · Mix your music for free.' : 'Try Pro free with sample music.';
  const description = document.getElementById('studio-access-description');
  description.textContent = mode === 'pro' ? 'Your Pro access is active.' : mode === 'basic'
    ? 'Two decks, EQ, speed, cue, track loops, tone and echo. Try advanced controls with sample music, or upgrade to use them with your tracks.'
    : 'Explore the full deck with our included tracks. Use Basic for your own music, or unlock Pro for $49 once.';
  if (unavailable) description.textContent += ' Pro access could not be checked. Reconnect and reload if you already own Pro.';
  const basic = document.getElementById('studio-basic'), demo = document.getElementById('studio-demo');
  basic.setAttribute('aria-pressed', String(mode === 'basic'));
  demo.setAttribute('aria-pressed', String(mode === 'demo'));
  for (const [button, hash] of [[basic, '#basic'], [demo, '#pro-demo']]) button.onclick = () => {
    if ((hash === '#basic' ? 'basic' : 'demo') === mode) return;
    if (document.getElementById('music-rights').checked || document.querySelector('.deck[data-playing="true"], .sample-pad[data-playing="true"], #load-instruments:disabled, #take-wav:not([hidden])') || [...document.querySelectorAll('[id^="state-"]')].some(node => node.textContent !== 'Empty')) {
      if (!confirm('Switch modes and clear this session? Save any work you want to keep first. Saved files stay on your device.')) return;
    }
    location.hash = hash; location.reload();
  };
  document.getElementById('studio-upgrade').hidden = active;
  document.getElementById('studio-paid').hidden = !active;
  document.getElementById('studio-paid').onclick = () => {
    if (mode === 'pro') return;
    if (!confirm('Open Pro and clear this session? Save any work you want to keep first.')) return;
    location.hash = 'pro'; location.reload();
  };
  const restricted = mode === 'basic' ? '[data-studio-pro]' : mode === 'demo' ? '[data-studio-own]' : null;
  const status = document.getElementById('studio-access-status');
  const message = mode === 'basic' ? 'This is a Pro control. Try Pro with sample music, or upgrade to use your tracks.' : 'Pro demo uses included music. Switch to Basic for your tracks, or upgrade to Pro.';
  function refresh() {
    if (!restricted) return;
    for (const area of document.querySelectorAll(restricted)) {
      area.classList.add('studio-locked');
      for (const control of area.matches('input,select,button') ? [area] : area.querySelectorAll('input,select,button')) {
        if (control.hasAttribute('data-studio-cleanup')) continue;
        if (!control.disabled) control.disabled = true;
        control.setAttribute('aria-describedby', 'studio-access-description');
      }
    }
  }
  if (restricted) {
    // Capture also blocks MIDI-dispatched input events before existing handlers run.
    for (const name of ['click', 'pointerdown', 'keydown', 'input', 'change']) document.addEventListener(name, event => {
      if (name === 'keydown' && event.key === 'Tab') return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(restricted) || target.closest('summary,a,[data-studio-cleanup]')) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (target instanceof HTMLInputElement && target.type === 'file') target.value = '';
      status.textContent = message;
    }, true);
    for (const area of document.querySelectorAll(restricted)) {
      const hint = document.createElement('span'); hint.className = 'studio-lock-note';
      hint.textContent = mode === 'basic' ? 'Pro · Try with sample music' : 'Your music · Basic or Pro upgrade';
      if (area.matches('input,button,select')) area.after(hint);
      else if (area.tagName === 'DETAILS') area.querySelector('summary').append(hint);
      else (area.querySelector(':scope > details > summary') ?? area).prepend(hint);
    }
  }
  refresh();
  if (restricted) new MutationObserver(refresh).observe(document.getElementById('dj'), {
    subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'],
  });
  return {mode, ownMusic, refresh};
}
