const stages = {
  preparing: ['Getting your song ready', 'We’re preparing your request.', 0],
  queued: ['You’re in the queue', 'Your request is waiting to be processed. We’ll start your song as soon as it’s your turn.', 0],
  writing: ['Finding your sound', 'We’re shaping the words and musical direction for your song.', 1],
  composing: ['Creating your music', 'We’re bringing your song to life. This can take a few minutes.', 1],
  retrying: ['Giving your song another take', 'The first take wasn’t the right fit. We’re making another with the same favorites.', 1],
  checking: ['Checking your song', 'We’re checking how the music fits your choices.', 2],
  saving: ['Almost ready to listen', 'We’re saving your finished music.', 2],
  completed: ['Your music is ready', 'Press Play below to listen.', 3],
  failed: ['We couldn’t finish this time', 'Your earlier music is safe. Please try again.', -1],
  rejected: ['This take wasn’t the right fit', 'We couldn’t match your musical direction this time. Your favorites are saved. Please try again.', -1],
  cancelled: ['Creation stopped', 'Your earlier music is still available.', -1],
  reconnecting: ['Checking on your song', 'We’ve lost touch for a moment. We’ll update you when we reconnect.', -1],
};

/** Public-facing copy is allowlisted: never display raw provider diagnostics. */
export function generationProgress(state, phase) {
  const terminal = ['completed', 'failed', 'rejected', 'cancelled'].includes(state);
  const key = terminal ? state : (state === 'queued' ? 'queued' : state === 'reconnecting' ? 'reconnecting' :
    ['preparing', 'writing', 'composing', 'retrying', 'checking', 'saving'].includes(phase) ? phase : 'composing');
  const [title, detail, step] = stages[key];
  const active = !terminal;
  return {key, title, detail, step, active, steps: [key === 'queued' ? 'Waiting' : 'Preparing', 'Creating', 'Finishing', 'Ready']};
}

export function showGenerationProgress(root, state, phase) {
  const view = generationProgress(state, phase);
  root.hidden = false;
  root.className = 'generation-progress';
  root.dataset.state = view.key;
  root.replaceChildren();
  const art = document.createElement('div');
  art.className = 'generation-progress-art'; art.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 5; i++) art.append(document.createElement('i'));
  const copy = document.createElement('div'); copy.className = 'generation-progress-copy';
  const title = document.createElement('strong'); title.textContent = view.title;
  const detail = document.createElement('p'); detail.textContent = view.detail;
  copy.append(title, detail); copy.setAttribute('role', 'status'); copy.setAttribute('aria-atomic', 'true');
  const steps = document.createElement('ol'); steps.setAttribute('aria-label', 'Song progress');
  view.steps.forEach((label, i) => {
    const item = document.createElement('li'); item.textContent = label;
    if (i === view.step) item.setAttribute('aria-current', 'step');
    if (i < view.step) item.dataset.done = 'true';
    steps.append(item);
  });
  root.append(art, copy, steps);
}
