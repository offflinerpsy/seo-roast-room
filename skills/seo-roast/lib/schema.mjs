export const SCHEMA_VERSION = 1;
export const SEATS = ['darren', 'harry', 'edward', 'neil', 'tj', 'joshua', 'kate', 'dan'];
export const STAGES = ['brief', 'evidence', 'opening', 'challenge', 'verdict'];
export const MAX_BYTES = 2 * 1024 * 1024;
const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

function need(ok, message) {
  if (!ok) throw new Error(message);
}
function str(v, label, max = 6000) {
  need(
    typeof v === 'string' && v.trim().length > 0 && v.length <= max,
    `${label}: expected non-empty text (max ${max})`,
  );
}
function list(v, label, max = 200) {
  need(Array.isArray(v) && v.length <= max, `${label}: invalid array`);
}
function choice(v, values, label) {
  need(values.includes(v), `${label}: expected ${values.join(', ')}`);
}
export function safeId(id) {
  need(typeof id === 'string' && ID.test(id), 'Invalid ID');
  return id;
}
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password;
  } catch {
    return false;
  }
}
function unique(items, label) {
  need(new Set(items).size === items.length, `${label}: duplicate IDs`);
}
function refs(ids, known, label, required = true) {
  list(ids, label, 40);
  need(!required || ids.length > 0, `${label}: evidence required`);
  unique(ids, label);
  for (const id of ids) need(known.has(id), `${label}: unknown evidence ${id}`);
}

export function validateSession(s) {
  need(s && typeof s === 'object' && !Array.isArray(s), 'Expected session object');
  need(s.schemaVersion === SCHEMA_VERSION, 'Unsupported session schema');
  safeId(s.id);
  need(Number.isInteger(s.revision) && s.revision >= 0, 'Invalid revision');
  str(s.title, 'title', 160);
  str(s.question, 'question');
  choice(s.mode, ['quick', 'council', 'consult'], 'mode');
  choice(s.language, ['en', 'ru'], 'language');
  choice(s.stage, STAGES, 'stage');
  choice(s.status, ['waiting', 'running', 'complete', 'failed'], 'status');
  need(typeof s.demo === 'boolean', 'demo must be explicit');
  for (const k of ['createdAt', 'updatedAt'])
    need(typeof s[k] === 'string' && Number.isFinite(Date.parse(s[k])), `Invalid ${k}`);
  list(s.seats, 'seats', 8);
  unique(s.seats, 'seats');
  need(s.seats.length > 0, 'Select at least one seat');
  for (const seat of s.seats) choice(seat, SEATS, 'seat');
  need(s.mode !== 'consult' || s.seats.length === 1, 'Consult requires one seat');
  need(s.mode !== 'quick' || s.seats.length <= 3, 'Quick mode allows at most three seats');
  str(s.context, 'context', 12000);
  list(s.assumptions, 'assumptions', 30);
  s.assumptions.forEach((x) => str(x, 'assumption', 1000));
  list(s.evidence, 'evidence');
  unique(
    s.evidence.map((x) => x.id),
    'evidence',
  );
  for (const e of s.evidence) {
    safeId(e.id);
    str(e.title, 'evidence title', 300);
    str(e.summary, 'evidence summary', 2000);
    choice(
      e.kind,
      ['observation', 'metric', 'practitioner', 'primary', 'hypothesis'],
      'evidence kind',
    );
    choice(e.confidence, ['high', 'medium', 'low'], 'evidence confidence');
    need(
      typeof e.retrievedAt === 'string' && Number.isFinite(Date.parse(e.retrievedAt)),
      'Evidence requires retrieval date',
    );
    need(e.url === null || safeUrl(e.url), 'Unsafe evidence URL');
    str(e.locator, 'evidence locator', 500);
  }
  const evidenceIds = new Set(s.evidence.map((e) => e.id));
  list(s.turns, 'turns', 80);
  unique(
    s.turns.map((t) => t.id),
    'turns',
  );
  for (const t of s.turns) {
    safeId(t.id);
    choice(t.seat, s.seats, 'turn seat');
    choice(t.round, ['opening', 'challenge', 'verdict'], 'round');
    str(t.text, 'turn text');
    str(t.challenge, 'turn challenge', 1200);
    choice(t.stance, ['support', 'challenge', 'conditional', 'unknown'], 'stance');
    refs(t.evidenceIds, evidenceIds, 'turn evidence', false);
    need(t.evidenceIds.length > 0 || t.stance === 'unknown', 'Unsourced turns must be unknown');
    need(
      typeof t.fictional === 'boolean' && t.fictional,
      'Expert speech must be labeled fictional',
    );
  }
  list(s.actions, 'actions', 30);
  unique(
    s.actions.map((a) => a.id),
    'actions',
  );
  for (const a of s.actions) {
    safeId(a.id);
    str(a.title, 'action title', 200);
    str(a.why, 'action why', 2000);
    choice(a.priority, ['P0', 'P1', 'P2'], 'priority');
    choice(a.confidence, ['high', 'medium', 'low'], 'action confidence');
    str(a.owner, 'action owner', 120);
    str(a.effort, 'action effort', 120);
    str(a.acceptance, 'acceptance check', 2000);
    refs(a.evidenceIds, evidenceIds, 'action evidence');
    if (a.experiment !== null) {
      for (const k of ['baseline', 'change', 'measure', 'success', 'stop', 'window'])
        str(a.experiment?.[k], `experiment ${k}`, 1500);
    }
  }
  need(s.verdict === null || (s.verdict && typeof s.verdict === 'object'), 'Invalid verdict');
  if (s.verdict) {
    choice(s.verdict.decision, ['proceed', 'test', 'hold'], 'decision');
    str(s.verdict.summary, 'verdict summary', 4000);
    str(s.verdict.dissent, 'dissent', 3000);
    str(s.verdict.unknowns, 'unknowns', 3000);
    refs(s.verdict.evidenceIds, evidenceIds, 'verdict evidence');
  }
  if (s.status === 'complete') {
    need(
      s.stage === 'verdict' && s.verdict && s.actions.length > 0,
      'Complete requires verdict and actions',
    );
    for (const seat of s.seats) {
      need(
        s.turns.some((t) => t.seat === seat && t.round === 'opening'),
        `Missing opening: ${seat}`,
      );
      if (s.mode !== 'consult')
        need(
          s.turns.some((t) => t.seat === seat && t.round === 'challenge'),
          `Missing challenge: ${seat}`,
        );
      if (s.mode === 'council')
        need(
          s.turns.some((t) => t.seat === seat && t.round === 'verdict'),
          `Missing final position: ${seat}`,
        );
    }
  }
  need(Buffer.byteLength(JSON.stringify(s)) <= MAX_BYTES, 'Session too large');
  return s;
}

export function createSession(input, id, now = new Date().toISOString()) {
  return validateSession({
    schemaVersion: 1,
    id: safeId(id),
    revision: 0,
    title: input.title,
    question: input.question,
    context: input.context || 'No additional context supplied; scope and baseline are unknown.',
    mode: input.mode || 'quick',
    language: input.language || 'en',
    seats: input.seats || ['harry', 'kate', 'tj'],
    stage: 'brief',
    status: 'waiting',
    demo: false,
    createdAt: now,
    updatedAt: now,
    assumptions: [],
    evidence: [],
    turns: [],
    actions: [],
    verdict: null,
  });
}
