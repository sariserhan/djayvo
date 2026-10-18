import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySession } from '../library.js';

test('funk sessions verify complete hashed artifacts and reject mislabeled or corrupted files', async () => {
  const files = await Promise.all(['wav', 'score.json', 'report.json', 'events.tsv'].map(async ext => {
    const blob = new Blob([`test ${ext}`]);
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return { name: `funk.${ext}`, blob, sha256: Buffer.from(digest).toString('hex') };
  }));
  const session = { id: 'test', created: 1, style: 'funk', files };
  assert.equal(await verifySession(session), true);
  assert.equal(await verifySession({ ...session, style: 'club' }), false);
  assert.equal(await verifySession({ ...session, files: files.slice(1) }), false);
  assert.equal(await verifySession({ ...session, files: [files[0], files[0], ...files.slice(2)] }), false);
  assert.equal(await verifySession({ ...session, files: [{ ...files[0], blob: new Blob(['changed']) }, ...files.slice(1)] }), false);
});
