import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readJsonBounded } from '../skills/seo-roast/lib/read-json.mjs';
import { MAX_BYTES } from '../skills/seo-roast/lib/schema.mjs';

const temp = (fn) => async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-roast-input-'));
  try {
    await fn(t, dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
};
test(
  'bounded reader accepts regular JSON and rejects missing, malformed and oversized data',
  temp(async (t, dir) => {
    const file = path.join(dir, 'input.json');
    await fs.writeFile(file, '{"valid":true}');
    assert.deepEqual(await readJsonBounded(file), { valid: true });
    await assert.rejects(readJsonBounded(dir), /regular file/);
    await assert.rejects(readJsonBounded(path.join(dir, 'missing')), /ENOENT/);
    await fs.writeFile(file, 'not json');
    await assert.rejects(readJsonBounded(file), SyntaxError);
    await fs.writeFile(file, Buffer.alloc(MAX_BYTES + 1, 32));
    await assert.rejects(readJsonBounded(file), /too large/);
  }),
);
test(
  'bounded reader rejects a final symlink',
  temp(async (t, dir) => {
    const file = path.join(dir, 'target.json');
    const link = path.join(dir, 'link.json');
    await fs.writeFile(file, '{}');
    try {
      await fs.symlink(file, link, 'file');
    } catch (e) {
      if (e.code === 'EPERM') {
        t.skip('File symlinks require OS permission');
        return;
      }
      throw e;
    }
    await assert.rejects(readJsonBounded(link), /regular file/);
  }),
);
test(
  'bounded reader rejects a FIFO promptly',
  { skip: process.platform === 'win32', timeout: 3000 },
  temp(async (t, dir) => {
    const fifo = path.join(dir, 'fifo.json');
    await promisify(execFile)('mkfifo', [fifo]);
    await assert.rejects(readJsonBounded(fifo), /regular file/);
  }),
);
test(
  'byte limit still applies if the regular file grows after it is opened',
  temp(async (t, dir) => {
    const file = path.join(dir, 'growing.json');
    await fs.writeFile(file, '{}');
    const actualOpen = fs.open;
    fs.open = async (...args) => {
      const handle = await actualOpen(...args);
      if (args[0] !== file) return handle;
      const actualRead = handle.read.bind(handle);
      let grown = false;
      handle.read = async (...params) => {
        const result = await actualRead(...params);
        if (!grown) {
          grown = true;
          await fs.appendFile(file, Buffer.alloc(MAX_BYTES, 32));
        }
        return result;
      };
      return handle;
    };
    try {
      await assert.rejects(readJsonBounded(file), /too large/);
    } finally {
      fs.open = actualOpen;
    }
  }),
);
