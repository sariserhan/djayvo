const enable = document.getElementById('offline-enable');
const remove = document.getElementById('offline-remove');
const status = document.getElementById('offline-status');
const scope = new URL('./', location.href).href;
const prefix = `djayvo-studio:${scope}:`;
const supported = 'serviceWorker' in navigator && 'caches' in window && window.isSecureContext;

async function refresh() {
  if (!supported) {
    enable.disabled = true;
    status.textContent = 'Offline storage is unavailable in this browser. You can still use the studio online.';
    return;
  }
  const registration = (await navigator.serviceWorker.getRegistrations()).find(item => item.scope === scope);
  const stored = (await caches.keys()).some(key => key.startsWith(prefix));
  const available = stored && !!(registration?.active || registration?.waiting);
  enable.disabled = available;
  remove.hidden = !registration && !stored;
  status.textContent = available
    ? 'Studio saved for offline use. Reopen this page to use the saved copy. Updates apply after all studio tabs close.'
    : 'Save the studio once while online, then reopen it without a connection. Browser cleanup may remove the saved copy.';
}

enable.onclick = async () => {
  enable.disabled = true; remove.disabled = true;
  status.textContent = 'Saving the studio and instruments…';
  try {
    const registration = await navigator.serviceWorker.register(new URL('service-worker.js', scope), { scope, updateViaCache: 'none' });
    const worker = registration.installing;
    if (worker) await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Offline setup timed out')), 75000);
      function finish(error) {
        clearTimeout(timer); worker.removeEventListener('statechange', changed);
        error ? reject(error) : resolve();
      }
      function changed() {
        if (['installed', 'activated'].includes(worker.state)) finish();
        else if (worker.state === 'redundant') finish(new Error('Offline setup failed'));
      }
      worker.addEventListener('statechange', changed); changed();
    });
    await refresh();
  } catch {
    enable.disabled = false;
    status.textContent = 'Could not save the offline studio. Check your connection and available browser storage, then try again. Your mixes are unchanged.';
  } finally { remove.disabled = false; }
};

remove.onclick = async () => {
  enable.disabled = remove.disabled = true;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) if (registration.scope === scope) await registration.unregister();
    for (const key of await caches.keys()) if (key.startsWith(prefix)) await caches.delete(key);
    await refresh();
    status.textContent = 'Offline studio removed. Your saved mixes are unchanged. Reopen this page online before saving another offline copy.';
  } catch {
    status.textContent = 'Could not remove the offline studio. Try again. Your mixes are unchanged.';
  } finally { enable.disabled = false; remove.disabled = false; }
};

refresh().catch(() => {
  enable.disabled = true;
  status.textContent = 'Browser storage is unavailable. You can still use the studio online.';
});
