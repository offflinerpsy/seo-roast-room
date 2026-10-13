import { promises as fs, constants } from 'node:fs';
import { MAX_BYTES } from './schema.mjs';

/** Reject links/special files and bound bytes read from the opened descriptor. */
export async function readJsonBounded(file) {
  if (!file) throw new Error('--file is required');
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink())
    throw new Error('Input must be a regular file, not a link or special file');
  if (before.size > MAX_BYTES) throw new Error('Input too large');
  // NONBLOCK prevents a raced FIFO open from hanging; NOFOLLOW is used where supported.
  const handle = await fs.open(
    file,
    constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0),
  );
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino)
      throw new Error('Input changed or is not a regular file');
    if (opened.size > MAX_BYTES) throw new Error('Input too large');
    const chunks = [];
    let total = 0;
    for (;;) {
      const buffer = Buffer.alloc(Math.min(65536, MAX_BYTES + 1 - total));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      total += bytesRead;
      if (total > MAX_BYTES) throw new Error('Input too large');
      chunks.push(buffer.subarray(0, bytesRead));
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } finally {
    await handle.close();
  }
}
