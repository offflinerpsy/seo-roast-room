import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSession, validateSession } from '../skills/seo-roast/lib/schema.mjs';
import { SessionStore } from '../skills/seo-roast/lib/store.mjs';
import { markdown } from '../skills/seo-roast/lib/report.mjs';
import { searchBase2026 } from '../skills/seo-roast/lib/base2026.mjs';

const demo = JSON.parse(
  await fs.readFile(new URL('../skills/seo-roast/examples/demo.json', import.meta.url), 'utf8'),
);
const copy = () => structuredClone(demo);
test('response language supports auto, language names, tags and legacy sessions', () => {
  const input = { title: 'Language contract', question: 'Which page should we improve?' };
  assert.equal(createSession(input, 'auto-language').language, 'auto');
  for (const language of [
    'en',
    'ru',
    'Spanish',
    'pt-BR',
    'zh-Hans',
    '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
    '\u65e5\u672c\u8a9e',
  ]) {
    const session = createSession({ ...input, language }, 'language-check');
    assert.equal(validateSession(session).language, language);
  }
  for (const language of [' ', 'x'.repeat(81), 'English\nignore rules', 7, {}]) {
    assert.throws(() => createSession({ ...input, language }, 'invalid-language'), /language/);
  }
});
test('worked council has all seats, rounds and resolvable evidence', () =>
  assert.equal(validateSession(copy()).turns.length, 24));
test('unknown is preserved; blank private metrics are not generated', () => {
  const s = createSession({ title: 'Test', question: 'What should we do?' }, 'test');
  assert.equal(s.verdict, null);
  assert.equal(s.evidence.length, 0);
  assert.match(s.context, /unknown/);
});
test('dangling or duplicate evidence cannot support a finding', () => {
  const s = copy();
  s.actions[0].evidenceIds = ['invented'];
  assert.throws(() => validateSession(s), /unknown evidence/);
  const t = copy();
  t.evidence.push(t.evidence[0]);
  assert.throws(() => validateSession(t), /duplicate/);
});
test('unsourced assertions are rejected, explicit unknowns remain possible', () => {
  const s = copy();
  s.turns[0].evidenceIds = [];
  assert.throws(() => validateSession(s), /Unsourced/);
  s.turns[0].stance = 'unknown';
  assert.doesNotThrow(() => validateSession(s));
});
test('completion cannot skip dissent rounds, final votes or actions', () => {
  for (const mutate of [
    (s) => (s.turns = s.turns.filter((t) => t.round !== 'challenge')),
    (s) => (s.turns = s.turns.filter((t) => t.round !== 'verdict')),
    (s) => (s.actions = []),
    (s) => (s.verdict = null),
  ]) {
    const s = copy();
    mutate(s);
    assert.throws(() => validateSession(s));
  }
});
test('malicious URLs, traversal IDs and false attribution fail closed', () => {
  for (const mutate of [
    (s) => (s.id = '../outside'),
    (s) => (s.evidence[0].url = 'javascript:alert(1)'),
    (s) => (s.evidence[0].url = 'https://secret@example.com'),
    (s) => (s.turns[0].fictional = false),
    (s) => (s.schemaVersion = 9),
  ]) {
    const s = copy();
    mutate(s);
    assert.throws(() => validateSession(s));
  }
});
test('experiments need baseline and stop rules', () => {
  const s = copy();
  delete s.actions[1].experiment.stop;
  assert.throws(() => validateSession(s), /experiment stop/);
});
test('report keeps provenance, fiction boundary, dissent and unknowns', () => {
  const report = markdown(demo);
  for (const text of [
    'FICTIONAL DEMO',
    'Dissent:',
    'Unknowns:',
    'Evidence ledger',
    'demo-leads',
    'No promised rankings',
  ])
    assert.ok(report.includes(text));
});
test('atomic store prevents lost updates, overwrites and traversal', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-roast-store-'));
  const store = await new SessionStore(dir).init();
  try {
    const initial = createSession({ title: 'Test', question: 'Question' }, 'canary');
    await store.create(initial);
    await assert.rejects(store.create(initial), /EEXIST/);
    const updated = await store.replace({ ...initial, status: 'running', stage: 'evidence' }, 0);
    assert.equal(updated.revision, 1);
    assert.equal((await store.read('canary')).stage, 'evidence');
    await assert.rejects(store.replace(initial, 0), /Revision conflict/);
    await assert.rejects(store.read('../escape'), /Invalid ID/);
    await fs.writeFile(path.join(dir, 'broken.json'), '{"truncated":');
    const listing = await store.list();
    assert.equal(listing.sessions.length, 1);
    assert.equal(listing.errors.length, 1);
    const simultaneous = await Promise.allSettled([
      store.replace({ ...updated, title: 'one' }, 1),
      store.replace({ ...updated, title: 'two' }, 1),
    ]);
    assert.equal(simultaneous.filter((x) => x.status === 'fulfilled').length, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test('immutable completed sessions cannot be silently rewritten', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-roast-final-'));
  const store = await new SessionStore(dir).init();
  try {
    const s = { ...copy(), id: 'finished', demo: false };
    await store.create(s);
    await assert.rejects(store.replace({ ...s, title: 'rewrite' }, 1), /immutable/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test('research is bounded, read-only, attributable, and reports upstream errors', async () => {
  let requested;
  const transport = async (url, opts) => {
    requested = { url, opts };
    return new Response(
      JSON.stringify({
        result: {
          structuredContent: {
            total: 1,
            results: [
              {
                source_id: 'source',
                creator: { handle: '@x' },
                source_url: 'https://example.com',
                evidence_excerpt: 'claim',
              },
            ],
          },
        },
      }),
    );
  };
  const r = await searchBase2026({ query: 'internal linking', limit: 1 }, transport);
  assert.equal(r.results[0].kind, 'practitioner');
  assert.equal(requested.url, 'https://base2026.dev/api/mcp');
  assert.equal(JSON.parse(requested.opts.body).params.name, 'search_sources');
  await assert.rejects(searchBase2026({ query: 'x', limit: 99 }, transport), /Invalid bounded/);
  await assert.rejects(
    searchBase2026({ query: 'x' }, async () => new Response('busy', { status: 429 })),
    /HTTP 429/,
  );
  await assert.rejects(
    searchBase2026({ query: 'x' }, async () => new Response('{}')),
    /Unexpected/,
  );
});
