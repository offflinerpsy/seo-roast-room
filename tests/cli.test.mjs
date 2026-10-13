import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import { SessionStore } from '../skills/seo-roast/lib/store.mjs';

const execute = promisify(execFile);
const cli = fileURLToPath(new URL('../skills/seo-roast/scripts/roast.mjs', import.meta.url));
const fixture = JSON.parse(
  await fs.readFile(new URL('../skills/seo-roast/examples/demo.json', import.meta.url), 'utf8'),
);

test('real CLI creates, validates, publishes and exports a complete council through paths with spaces', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'seo roast cli '));
  const sessions = path.join(dir, 'private sessions');
  const brief = path.join(dir, 'brief.json');
  const draft = path.join(dir, 'draft.json');
  const invoke = (...args) =>
    execute(process.execPath, [cli, ...args], { cwd: dir, timeout: 10000, windowsHide: true });
  try {
    await fs.writeFile(
      brief,
      JSON.stringify({
        title: 'CLI integration',
        question: 'Evaluate the supplied fictional scenario.',
        mode: 'council',
        seats: fixture.seats,
        language: 'ru',
      }),
    );
    const made = JSON.parse(
      (await invoke('create', '--file', brief, '--sessions', sessions)).stdout,
    );
    assert.equal(made.revision, 0);
    const original = JSON.parse(await fs.readFile(made.file, 'utf8'));
    await fs.writeFile(
      draft,
      JSON.stringify({
        ...original,
        status: 'running',
        stage: 'evidence',
        evidence: fixture.evidence,
      }),
    );
    const first = JSON.parse(
      (await invoke('publish', '--file', draft, '--expected-revision', '0', '--sessions', sessions))
        .stdout,
    );
    assert.equal(first.revision, 1);
    await assert.rejects(
      invoke('publish', '--file', draft, '--expected-revision', '0', '--sessions', sessions),
      /Revision conflict/,
    );
    await fs.writeFile(
      draft,
      JSON.stringify({ ...fixture, id: made.id, revision: 1, demo: false }),
    );
    assert.match((await invoke('validate', '--file', draft)).stdout, /Valid schema/);
    const final = JSON.parse(
      (await invoke('publish', '--file', draft, '--expected-revision', '1', '--sessions', sessions))
        .stdout,
    );
    assert.equal(final.status, 'complete');
    assert.equal(final.revision, 2);
    const exported = (await invoke('report', '--file', made.file)).stdout;
    assert.match(exported, /Evidence ledger/);
    assert.match(exported, /Darren Shaw/);
    assert.match(exported, /Dissent:/);
    await assert.rejects(
      invoke('publish', '--file', draft, '--expected-revision', '2', '--sessions', sessions),
      /immutable/,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('misnamed session files cannot impersonate another session', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-roast-id-'));
  try {
    await fs.writeFile(path.join(dir, 'wrong.json'), JSON.stringify(fixture));
    const store = await new SessionStore(dir).init();
    await assert.rejects(store.read('wrong'), /filename/);
    assert.equal((await store.list()).errors.length, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test(
  'serve returns the exact session URL, directory and PID on an ephemeral port',
  { timeout: 15000 },
  async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'seo roast room link '));
    let child;
    let closed;
    let lines;
    try {
      const session = { ...fixture, id: 'linked-case', demo: false };
      await (await new SessionStore(dir).init()).create(session);
      child = spawn(
        process.execPath,
        [cli, 'serve', '--sessions', dir, '--session', session.id, '--port', '0', '--json'],
        { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
      );
      closed = once(child, 'close');
      lines = createInterface({ input: child.stdout });
      const line = await Promise.race([
        once(lines, 'line', { signal: AbortSignal.timeout(8000) }).then(([value]) => value),
        closed.then(([code]) => {
          throw new Error(`Room exited before readiness: ${code}`);
        }),
      ]);
      const ready = JSON.parse(line);
      assert.equal(ready.pid, child.pid);
      assert.equal(ready.sessionDirectory, dir);
      assert.equal(ready.sessionId, session.id);
      assert.equal(ready.url, `${ready.origin}/?session=linked-case`);
      assert.notEqual(new URL(ready.url).port, '0');
      const saved = await (await fetch(`${ready.origin}/api/sessions/${session.id}`)).json();
      assert.equal(saved.id, session.id);
      const bootstrap = await (await fetch(`${ready.origin}/api/bootstrap`)).json();
      assert.equal(bootstrap.sessionDirectory, dir);
    } finally {
      lines?.close();
      child?.kill();
      if (closed) await closed;
      await fs.rm(dir, { recursive: true, force: true });
    }
  },
);

test('serve rejects missing or unsafe session IDs before opening a room', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-roast-missing-'));
  try {
    for (const id of ['absent-session', '../escape']) {
      await assert.rejects(
        execute(
          process.execPath,
          [cli, 'serve', '--sessions', dir, '--session', id, '--port', '0', '--json'],
          { timeout: 5000, windowsHide: true },
        ),
        (error) => error.code === 1 && !error.killed && error.stdout === '',
      );
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
