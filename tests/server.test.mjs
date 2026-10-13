import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { request } from 'node:http';
import { startServer } from '../skills/seo-roast/lib/server.mjs';

test('loopback room supports private briefs, replay and export with CSRF protections', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-roast-http-'));
  const room = await startServer({ directory, port: 0 });
  try {
    const r = await fetch(`${room.origin}/api/bootstrap`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('access-control-allow-origin'), null);
    const data = await r.json();
    assert.equal(data.experts.length, 8);
    assert.ok(data.sessions.find((x) => x.demo));
    assert.equal(
      (await fetch(`${room.origin}/api/bootstrap`, { headers: { Origin: 'https://evil.example' } }))
        .status,
      403,
    );
    const hostileHost = await new Promise((resolve, reject) => {
      const req = request(
        `${room.origin}/api/bootstrap`,
        { headers: { Host: 'evil.example' } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(hostileHost, 403);
    assert.equal(
      (await fetch(`${room.origin}/api/bootstrap`, { headers: { 'Sec-Fetch-Site': 'cross-site' } }))
        .status,
      403,
    );
    const brief = {
      title: 'Private canary',
      question: 'Should we improve service pages?',
      mode: 'quick',
      seats: ['harry', 'kate', 'tj'],
      language: 'en',
    };
    assert.equal(
      (
        await fetch(`${room.origin}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(brief),
        })
      ).status,
      403,
    );
    const post = await fetch(`${room.origin}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Roast-Token': data.token,
        Origin: room.origin,
      },
      body: JSON.stringify(brief),
    });
    assert.equal(post.status, 201);
    const s = await post.json();
    assert.equal(s.status, 'waiting');
    assert.equal(s.demo, false);
    const read = await (await fetch(`${room.origin}/api/sessions/${s.id}`)).json();
    assert.equal(read.title, 'Private canary');
    const md = await (await fetch(`${room.origin}/api/sessions/demo/report.md`)).text();
    assert.match(md, /FICTIONAL DEMO/);
    const demo = await (await fetch(`${room.origin}/api/sessions/demo/session.json`)).json();
    assert.equal(demo.demo, true);
    const dossier = await (await fetch(`${room.origin}/api/experts/harry`)).json();
    assert.match(dossier.markdown, /Harry Sanders/);
    assert.equal((await fetch(`${room.origin}/api/sessions/%2E%2E%2Fsecret`)).status, 404);
    assert.equal((await fetch(`${room.origin}/unknown`)).status, 404);
    const abort = new AbortController();
    const events = await fetch(`${room.origin}/api/events`, { signal: abort.signal });
    assert.match(events.headers.get('content-type'), /text\/event-stream/);
    const reader = events.body.getReader();
    const first = await reader.read();
    assert.match(new TextDecoder().decode(first.value), /ready/);
    abort.abort();
  } finally {
    await room.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
test('binding to a public address is rejected', async () => {
  await assert.rejects(startServer({ host: '0.0.0.0' }), /loopback/);
});

test('briefs preserve split UTF-8 characters and reject oversized bodies', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-roast-utf8-'));
  const room = await startServer({ directory, port: 0 });
  try {
    const { token } = await (await fetch(`${room.origin}/api/bootstrap`)).json();
    const headers = {
      'Content-Type': 'application/json',
      'X-Roast-Token': token,
      Origin: room.origin,
    };
    const body = Buffer.from(
      JSON.stringify({
        title: 'Привет, SEO',
        question: 'Проверить стратегию',
        context: 'Я'.repeat(12000),
      }),
    );
    const split = body.indexOf(Buffer.from('П')) + 1;
    const response = await new Promise((resolve, reject) => {
      const req = request(`${room.origin}/api/sessions`, { method: 'POST', headers }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks)) }),
        );
      });
      req.on('error', reject);
      req.write(body.subarray(0, split));
      setTimeout(() => req.end(body.subarray(split)), 25);
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.title, 'Привет, SEO');
    assert.equal(response.body.context, 'Я'.repeat(12000));
    const tooLarge = await fetch(`${room.origin}/api/sessions`, {
      method: 'POST',
      headers,
      body: ' '.repeat(128001),
    });
    assert.equal(tooLarge.status, 413);
  } finally {
    await room.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
