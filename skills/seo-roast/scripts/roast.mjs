#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createSession, validateSession } from '../lib/schema.mjs';
import { readJsonBounded as readJson } from '../lib/read-json.mjs';
import { SessionStore } from '../lib/store.mjs';
import { startServer } from '../lib/server.mjs';
import { searchBase2026 } from '../lib/base2026.mjs';
import { markdown } from '../lib/report.mjs';

const [command = 'help', ...args] = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing --${name} value`);
  return args[i + 1];
};
try {
  const directory = path.resolve(
    option('sessions') || path.join(process.cwd(), '.seo-roast', 'sessions'),
  );
  if (command === 'serve') {
    const room = await startServer({ directory, port: Number(option('port') || 4740) });
    console.log(
      `SEO Roast Room: ${room.origin}\nSessions: ${directory}\nCtrl+C stops the room. No model API calls.`,
    );
    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true;
      await room.close();
    };
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  } else if (command === 'create') {
    const input = await readJson(option('file'));
    const store = await new SessionStore(directory).init();
    const s = await store.create(
      createSession(input, `${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`),
    );
    console.log(JSON.stringify({ id: s.id, file: store.file(s.id), revision: s.revision }));
  } else if (command === 'publish') {
    const s = validateSession(await readJson(option('file')));
    const rev = option('expected-revision');
    if (rev === undefined || !/^\d+$/.test(rev)) throw new Error('--expected-revision is required');
    const store = await new SessionStore(directory).init();
    const next = await store.replace(s, Number(rev));
    console.log(JSON.stringify({ id: next.id, revision: next.revision, status: next.status }));
  } else if (command === 'validate') {
    const s = validateSession(await readJson(option('file')));
    console.log(
      `Valid schema v${s.schemaVersion}: ${s.id}, ${s.evidence.length} evidence records, ${s.turns.length} turns.`,
    );
  } else if (command === 'research') {
    console.log(
      JSON.stringify(
        await searchBase2026({
          query: option('query') || '',
          creator: option('creator') || '',
          limit: Number(option('limit') || 8),
        }),
        null,
        2,
      ),
    );
  } else if (command === 'report') {
    const s = validateSession(await readJson(option('file')));
    const experts = JSON.parse(
      await fs.readFile(new URL('../brains/experts.json', import.meta.url), 'utf8'),
    );
    console.log(markdown(s, experts));
  } else if (command === 'help') {
    console.log(
      'SEO Roast Room · Node 22+\nserve [--port 4740] [--sessions DIR]\ncreate --file brief.json [--sessions DIR]\npublish --file draft.json --expected-revision N [--sessions DIR]\nvalidate --file session.json\nreport --file session.json\nresearch --query "internal linking" [--creator harrysandersseo] [--limit 8]\n\nUse $seo-roast in Codex to run a real council. The room only watches.',
    );
  } else throw new Error(`Unknown command: ${command}`);
} catch (e) {
  console.error(`SEO Roast Room: ${e.message}`);
  process.exitCode = 1;
}
