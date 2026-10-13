import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { SEATS, validateSession, safeUrl } from '../skills/seo-roast/lib/schema.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => fs.readFile(path.join(root, p), 'utf8');
const json = async (p) => JSON.parse(await read(p));
const plugin = await json('plugin.json');
const pkg = await json('package.json');
const market = await json('.agents/plugins/marketplace.json');
assert.equal(plugin.name, pkg.name);
assert.equal(plugin.version, pkg.version);
assert.equal(market.plugins[0].name, plugin.name);
assert.equal(market.plugins[0].source.path, './');
assert.equal(
  (await json('mcp.json')).mcpServers['base2026-public'].url,
  'https://base2026.dev/api/mcp',
);
assert.equal(
  Object.keys(pkg.dependencies || {}).length,
  0,
  'Packaged runtime must remain dependency-free',
);
const base = 'skills/seo-roast';
const experts = await json(`${base}/brains/experts.json`);
const sources = await json(`${base}/brains/sources.json`);
assert.deepEqual(
  experts.map((e) => e.id),
  SEATS,
);
assert.equal(new Set(experts.map((e) => e.handle)).size, experts.length);
let count = 0;
for (const e of experts) {
  assert(safeUrl(e.identityUrl));
  const brain = await read(`${base}/brains/${e.id}.md`);
  assert(brain.includes(e.name));
  assert(brain.includes('Knowledge and decision rules'));
  const records = sources.creators[e.id].sources;
  assert(records.length >= 3, `${e.id}: insufficient source coverage`);
  count += records.length;
  const png = await fs.readFile(path.join(root, base, 'assets', e.avatar.replace(/^\//, '')));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png[25], 6, `${e.id}: expected transparent RGBA PNG`);
  assert(png.readUInt32BE(16) >= 1000);
  assert(png.readUInt32BE(20) >= 1000);
}
validateSession(await json(`${base}/examples/demo.json`));
const html = await read(`${base}/room/index.html`);
for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g))
  await fs.access(path.join(root, base, 'room', match[1]));
for (const p of [
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'docs/ARTWORK.md',
  'docs/ATTRIBUTION.md',
  'docs/RESEARCH.md',
  'docs/assets/room-desktop.png',
  `${base}/SKILL.md`,
  `${base}/agents/openai.yaml`,
  `${base}/references/protocol.md`,
  `${base}/references/session-format.md`,
])
  await fs.access(path.join(root, p));
assert((await read(`${base}/SKILL.md`)).startsWith('---\nname: seo-roast\n'));
console.log(
  `Package ${plugin.version} verified: ${experts.length} sourced experts, ${count} references, 8 transparent portraits, self-contained skill and room.`,
);
