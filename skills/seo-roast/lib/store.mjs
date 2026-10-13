import { promises as fs, constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { safeId, validateSession } from './schema.mjs';
import { readJsonBounded } from './read-json.mjs';

export class SessionStore {
  constructor(directory) {
    this.directory = path.resolve(directory);
  }
  async init() {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    if ((await fs.lstat(this.directory)).isSymbolicLink())
      throw new Error('Session directory cannot be a symbolic link');
    return this;
  }
  file(id) {
    return path.join(this.directory, `${safeId(id)}.json`);
  }
  async read(id) {
    const file = this.file(id);
    const session = validateSession(await readJsonBounded(file));
    if (session.id !== id) throw new Error('Session ID does not match its filename');
    return session;
  }
  async list() {
    const names = (await fs.readdir(this.directory)).filter((x) =>
      /^[a-z0-9][a-z0-9-]{0,79}\.json$/.test(x),
    );
    const sessions = [];
    const errors = [];
    for (const name of names.slice(0, 500)) {
      try {
        sessions.push(await this.read(name.slice(0, -5)));
      } catch (e) {
        errors.push({ id: name.slice(0, -5), error: e.message });
      }
    }
    return { sessions: sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), errors };
  }
  async create(session) {
    validateSession(session);
    const file = this.file(session.id);
    // Publish only a complete file. Hard-link is an atomic create-if-absent.
    const temp = path.join(this.directory, `.${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temp, JSON.stringify(session, null, 2) + '\n', {
        mode: 0o600,
        flag: 'wx',
      });
      await fs.link(temp, file);
    } finally {
      await fs.rm(temp, { force: true });
    }
    return session;
  }
  async replace(session, expectedRevision) {
    validateSession(session);
    const file = this.file(session.id);
    const lock = `${file}.lock`;
    let handle;
    let temp;
    try {
      handle = await fs.open(
        lock,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
        0o600,
      );
      const before = await this.read(session.id);
      if (before.revision !== expectedRevision)
        throw new Error(
          `Revision conflict: expected ${expectedRevision}, current ${before.revision}`,
        );
      if (before.demo || before.status === 'complete')
        throw new Error('Completed/demo sessions are immutable; create a follow-up session');
      const next = validateSession({
        ...session,
        demo: false,
        createdAt: before.createdAt,
        revision: before.revision + 1,
        updatedAt: new Date().toISOString(),
      });
      temp = path.join(this.directory, `.${randomUUID()}.tmp`);
      await fs.writeFile(temp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      await fs.rename(temp, file);
      return next;
    } catch (e) {
      if (e.code === 'EEXIST')
        throw new Error('Session is locked by another writer; retry after it finishes');
      throw e;
    } finally {
      if (temp) await fs.rm(temp, { force: true });
      if (handle) {
        await handle.close();
        await fs.rm(lock, { force: true });
      }
    }
  }
}
