import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectReplayWav } from '../apps/web/mix-replay.js';

function tool(name, args, input, maxOutput = 65536) {
  return new Promise((resolve, reject) => {
    const child = spawn(name, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), failure;
    const fail = error => { failure ??= error; child.kill('SIGKILL'); };
    const timer = setTimeout(() => fail(Error('Audio decoder exceeded its 30-second deadline')), 30000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.stdout.on('data', data => { if (stdout.length + data.length > maxOutput) fail(Error('Decoder output exceeded its bound')); else stdout = Buffer.concat([stdout, data]); });
    child.stderr.on('data', data => { if (stderr.length < 65536) stderr = Buffer.concat([stderr, data.subarray(0, 65536 - stderr.length)]); });
    child.stdin.on('error', () => {}); // Decoder rejection may close its input before the bounded write finishes.
    child.stdin.end(input);
    child.on('close', code => { clearTimeout(timer); if (failure || code !== 0) reject(failure ?? Error('Unsupported or malformed compressed source')); else resolve(stdout); });
  });
}

export async function replayAudio(bytes, rate) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 100 * 1024 * 1024 || !Number.isInteger(rate) || rate < 32000 || rate > 192000) throw Error('Invalid decoder input');
  if (bytes.subarray(0, 4).toString() === 'RIFF') {
    inspectReplayWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)); return bytes;
  }
  // Only bounded local MP3/FLAC demuxers may run; no URLs, playlists or additional input protocols.
  const input = ['-protocol_whitelist', 'pipe', '-format_whitelist', 'mp3,flac', '-i', 'pipe:0'];
  const metadata = JSON.parse(await tool('ffprobe', ['-v', 'error', ...input, '-show_entries', 'stream=codec_type,channels,sample_rate,duration', '-of', 'json'], bytes));
  const streams = metadata.streams?.filter(stream => stream.codec_type === 'audio');
  if (streams?.length !== 1 ||
      ![1, 2].includes(streams[0].channels) || !Number.isFinite(Number(streams[0].sample_rate)) ||
      Number(streams[0].sample_rate) < 8000 || Number(streams[0].sample_rate) > 192000 ||
      Number(streams[0].duration) > 300) throw Error('Compressed source exceeds replay bounds');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jamloom-replay-audio-'));
  try {
    const file = path.join(directory, 'decoded.wav');
    await tool('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', ...input, '-map', '0:a:0',
      '-vn', '-sn', '-dn', '-t', '300.001', '-fs', '134217728', '-ac', '2', '-ar', String(rate),
      '-c:a', 'pcm_f32le', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1', '-n', file], bytes);
    const stat = await fs.stat(file);
    if (stat.size >= 127 * 1024 * 1024) throw Error('Decoded source exceeds 128 MiB');
    const canonical = await fs.readFile(file);
    inspectReplayWav(canonical.buffer.slice(canonical.byteOffset, canonical.byteOffset + canonical.byteLength));
    return canonical;
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
