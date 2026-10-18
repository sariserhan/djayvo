const DB_NAME = 'djayvo-web-v1';
export const MAX_SESSIONS = 10;

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('mixes', { keyPath: 'id' });
    request.onerror = () => reject(new Error('Browser storage is unavailable. Download mixes to keep them.'));
    request.onblocked = () => reject(new Error('Close other Djayvo tabs, then reload.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transaction(mode, action) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('mixes', mode);
      const request = action(tx.objectStore('mixes'));
      tx.oncomplete = () => resolve(request?.result);
      tx.onabort = tx.onerror = () => reject(new Error('Could not save your mixes. Download them before leaving this page.'));
    });
  } finally { db.close(); }
}

export async function loadSessions() {
  const records = await transaction('readonly', store => store.getAll());
  return records.map(record => ({ ...record, files: Array.isArray(record.files) ? record.files.map(({ bytes, ...file }) => ({
    ...file, blob: bytes instanceof ArrayBuffer
      ? new Blob([bytes], { type: file.name?.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream' }) : file.blob,
  })) : record.files }));
}
export const deleteSession = id => transaction('readwrite', store => store.delete(id));
export const deleteAllSessions = () => transaction('readwrite', store => store.clear());

export async function saveSession(session) {
  // WebKit ephemeral storage rejects Blobs; bounded ArrayBuffers work in both engines.
  const record = { ...session, files: await Promise.all(session.files.map(async file => ({
    name: file.name, sha256: file.sha256, bytes: await file.blob.arrayBuffer(),
  }))) };
  const db = await open();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('mixes', 'readwrite');
      const store = tx.objectStore('mixes');
      let full = false;
      const count = store.count();
      count.onsuccess = () => {
        if (count.result >= MAX_SESSIONS) { full = true; tx.abort(); }
        else store.add(record);
      };
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(new Error(full
        ? 'Your library is full. Download these mixes, or delete an older session to make room.'
        : 'Browser storage is full or unavailable. Download these mixes before leaving.'));
    });
  } finally { db.close(); }
}

export async function verifySession(session) {
  if (!session || typeof session.id !== 'string' || !Number.isFinite(session.created)
    || !Array.isArray(session.files) || ![4, 12].includes(session.files.length)) return false;
  const styles = ['club', 'funk'].includes(session.style) ? [session.style] : session.style === 'three' ? ['hiphop', 'reggae', 'experimental'] : [];
  const expected = styles.flatMap(style => ['wav', 'score.json', 'report.json', 'events.tsv'].map(ext => `${style}.${ext}`));
  if (expected.length !== session.files.length) return false;
  for (const name of expected) {
    const file = session.files.find(file => file.name === name);
    if (!file || !(file.blob instanceof Blob) || file.blob.size <= 0 || file.blob.size > 8000000) return false;
    const digest = await crypto.subtle.digest('SHA-256', await file.blob.arrayBuffer());
    const hex = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
    if (hex !== file.sha256) return false;
  }
  return true;
}
