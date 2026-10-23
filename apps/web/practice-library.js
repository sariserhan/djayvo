const verifiedPracticeFiles = new WeakSet();
export const isPracticeFile = file => verifiedPracticeFiles.has(file);
// Fetch only our pinned public catalogue assets; never replace a deck with unverified bytes.
export async function practiceFile(track, signal) {
  if (!/^\.\/practice-audio\/[a-z-]+\.mp3$/.test(track.url) || !/^[a-f0-9]{64}$/.test(track.sha256)
      || !Number.isInteger(track.bytes) || track.bytes <= 0 || track.bytes > 10 * 1024 * 1024) throw new Error('Invalid practice track.');
  const response = await fetch(new URL(track.url, import.meta.url), {signal});
  if (!response.ok) throw new Error('Practice music unavailable. Reconnect or prepare offline first.');
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > track.bytes) { await reader.cancel(); throw new Error('Practice track size mismatch.'); }
    chunks.push(value);
  }
  if (size !== track.bytes) throw new Error('Incomplete practice track.');
  const file = new File(chunks, `${track.title} — ${track.artist}.mp3`, {type:'audio/mpeg'});
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))].map(n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== track.sha256) throw new Error('Practice track checksum mismatch.');
  verifiedPracticeFiles.add(file);
  return file;
}

// Partner recordings are authorized for this catalogue, not relicensed as CC0 or cached offline.
export async function partnerFile(track, signal) {
  if(!/^\/api\/aurowall\/[a-f0-9]{24}$/.test(track.url)||!Number.isSafeInteger(track.bytes)||track.bytes<=0||track.bytes>100*1024*1024)throw Error('Invalid partner track.');
  const response=await fetch(track.url,{signal});if(!response.ok||!response.body)throw Error('Aurowall music is unavailable. Reconnect and try again.');
  const reader=response.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>track.bytes){await reader.cancel();throw Error('Partner track size changed. Reload the music list.');}chunks.push(value);}
  if(size!==track.bytes)throw Error('Incomplete partner track. Try again.');
  const file=new File(chunks,`${track.title} — Aurowall.mp3`,{type:'audio/mpeg'});
  Object.defineProperty(file,'jamloomOnlineOnly',{value:true});return file;
}
