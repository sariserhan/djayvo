const button = document.getElementById('install-studio');
const status = document.getElementById('install-status');
const display = matchMedia('(display-mode: standalone)');
const guidance = 'Use your browser’s install menu if available. On iPhone or iPad, use Share → Add to Home Screen; on Mac Safari, File → Add to Dock.';
let pending = null;
let installed = false;

function refresh() {
  const standalone = display.matches || navigator.standalone === true;
  button.hidden = standalone || installed || !pending;
  status.textContent = standalone ? 'Jamloom is open as an app.'
    : installed ? 'Jamloom was installed. Open it from your device’s apps.'
    : pending ? 'Add Jamloom to your device for quick access.' : guidance;
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pending = event;
  refresh();
});
window.addEventListener('appinstalled', () => {
  installed = true; pending = null; refresh();
});
display.addEventListener('change', refresh);
button.onclick = async () => {
  const request = pending;
  if (!request) return;
  pending = null; button.hidden = true;
  try {
    await request.prompt();
    const { outcome } = await request.userChoice;
    refresh();
    if (!installed && !display.matches && navigator.standalone !== true && outcome === 'accepted') {
      status.textContent = 'Finish installation in your browser, then open Jamloom from your device’s apps.';
    }
  } catch {
    refresh();
    if (!installed && !display.matches && navigator.standalone !== true) {
      status.textContent = `Installation could not start. ${guidance}`;
    }
  }
};
refresh();
