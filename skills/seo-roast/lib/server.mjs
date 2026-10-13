import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { createSession, safeId, validateSession } from './schema.mjs';
import { SessionStore } from './store.mjs';
import { markdown } from './report.mjs';

const skillRoot = fileURLToPath(new URL('../', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const briefKeys = ['title', 'question', 'context', 'mode', 'language', 'seats'];

export async function startServer({
  directory,
  port = 4740,
  host = '127.0.0.1',
  includeDemo = true,
} = {}) {
  if (host !== '127.0.0.1') throw new Error('The room only binds to loopback');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
  const store = await new SessionStore(
    directory || path.join(process.cwd(), '.seo-roast', 'sessions'),
  ).init();
  const experts = JSON.parse(
    await fs.readFile(path.join(skillRoot, 'brains', 'experts.json'), 'utf8'),
  );
  const demo = includeDemo
    ? validateSession(
        JSON.parse(await fs.readFile(path.join(skillRoot, 'examples', 'demo.json'), 'utf8')),
      )
    : null;
  const nonce = randomBytes(24).toString('hex');
  const peers = new Set();
  let last = '';
  let origin;
  let scanning = false;
  const sockets = new Set();
  const json = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
  };
  const load = async (id) => (id === 'demo' && demo ? demo : store.read(safeId(id)));
  const listing = async () => {
    const { sessions, errors } = await store.list();
    return {
      sessions: [...sessions, ...(demo ? [demo] : [])].map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        stage: s.stage,
        updatedAt: s.updatedAt,
        revision: s.revision,
        demo: s.demo,
      })),
      errors,
    };
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    try {
      const allowedHosts = new Set([
        `127.0.0.1:${server.address().port}`,
        `localhost:${server.address().port}`,
      ]);
      if (!allowedHosts.has(req.headers.host)) return json(res, 403, { error: 'Untrusted Host' });
      const requestOrigin = `http://${req.headers.host}`;
      if (req.headers.origin && req.headers.origin !== requestOrigin)
        return json(res, 403, { error: 'Cross-origin access denied' });
      if (req.headers['sec-fetch-site'] === 'cross-site')
        return json(res, 403, { error: 'Cross-site access denied' });
      const url = new URL(req.url, requestOrigin);
      const p = decodeURIComponent(url.pathname);
      if (req.method === 'POST' && p === '/api/sessions') {
        if (
          req.headers['x-roast-token'] !== nonce ||
          req.headers.origin !== requestOrigin ||
          !req.headers['content-type']?.startsWith('application/json')
        )
          return json(res, 403, { error: 'A same-origin room token is required' });
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 128000) return json(res, 413, { error: 'Brief too large' });
          chunks.push(chunk);
        }
        const input = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)),
        );
        if (
          !input ||
          typeof input !== 'object' ||
          Object.keys(input).some((k) => !briefKeys.includes(k))
        )
          return json(res, 400, { error: 'Unknown brief fields' });
        const session = createSession(
          input,
          `${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`,
        );
        await store.create(session);
        return json(res, 201, session);
      }
      if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
      if (p === '/api/health') return json(res, 200, { ok: true, version: '0.1.0' });
      if (p === '/api/bootstrap')
        return json(res, 200, {
          experts,
          token: nonce,
          sessionDirectory: store.directory,
          ...(await listing()),
        });
      if (p === '/api/sessions') return json(res, 200, await listing());
      if (p === '/api/events') {
        if (peers.size >= 24) return json(res, 429, { error: 'Too many live clients' });
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        });
        res.write('event: ready\ndata: {}\n\n');
        peers.add(res);
        req.on('close', () => peers.delete(res));
        return;
      }
      const match = p.match(/^\/api\/sessions\/([a-z0-9-]+)(?:\/(report\.md|session\.json))?$/);
      if (match) {
        const session = await load(match[1]);
        if (match[2] === 'report.md') {
          res.writeHead(200, {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="${session.id}-report.md"`,
          });
          return res.end(markdown(session, experts));
        }
        if (match[2])
          res.setHeader('Content-Disposition', `attachment; filename="${session.id}.json"`);
        return json(res, 200, session);
      }
      const brain = p.match(/^\/api\/experts\/([a-z]+)$/);
      if (brain && experts.some((e) => e.id === brain[1]))
        return json(res, 200, {
          markdown: await fs.readFile(path.join(skillRoot, 'brains', `${brain[1]}.md`), 'utf8'),
        });
      let file;
      if (/^\/portraits\/[a-z]+\.(png|webp)$/.test(p))
        file = path.join(skillRoot, 'assets', p.slice(1));
      else if (p === '/' || p === '/index.html') file = path.join(skillRoot, 'room', 'index.html');
      else if (/^\/assets\/[a-zA-Z0-9_.-]+$/.test(p))
        file = path.join(skillRoot, 'room', p.slice(1));
      else return json(res, 404, { error: 'Not found' });
      const data = await fs.readFile(file);
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    } catch (e) {
      if (!res.headersSent)
        json(res, e.code === 'ENOENT' ? 404 : 400, {
          error:
            e.code === 'ENOENT'
              ? 'Not found. Build the room with npm run build if this is a source checkout.'
              : 'Invalid request or session data. Validate the session using the CLI.',
        });
      else res.end();
    }
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  origin = `http://${host}:${server.address().port}`;
  const timer = setInterval(async () => {
    if (scanning) return;
    scanning = true;
    try {
      const data = await listing();
      const fingerprint = JSON.stringify(data);
      if (fingerprint !== last) {
        last = fingerprint;
        for (const peer of peers)
          peer.write(
            `event: changed\ndata: ${JSON.stringify({ updatedAt: new Date().toISOString() })}\n\n`,
          );
      } else for (const peer of peers) peer.write(': heartbeat\n\n');
    } catch {
      for (const peer of peers) peer.write('event: failure\ndata: {}\n\n');
    } finally {
      scanning = false;
    }
  }, 1200);
  timer.unref();
  const close = async () => {
    clearInterval(timer);
    for (const peer of peers) peer.end();
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  };
  return { server, store, origin, close };
}
