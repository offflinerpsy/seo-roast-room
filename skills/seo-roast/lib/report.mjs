export function markdown(s, experts = []) {
  const names = Object.fromEntries(experts.map((e) => [e.id, e.name]));
  const refs = (ids) => ids.map((id) => `[${id}]`).join(' ');
  const lines = [
    `# ${s.title}`,
    '',
    s.demo
      ? '> FICTIONAL DEMO. No live site was audited.'
      : '> AI-generated expert simulations. Not the people, their statements, or endorsements.',
    '',
    `Status: ${s.status} · Mode: ${s.mode} · Updated: ${s.updatedAt}`,
    '',
    '## Brief',
    s.question,
    '',
    s.context,
    '',
    '## Assumptions',
    ...(s.assumptions.length ? s.assumptions.map((x) => `- ${x}`) : ['None recorded.']),
  ];
  for (const round of ['opening', 'challenge', 'verdict']) {
    const turns = s.turns.filter((t) => t.round === round);
    if (!turns.length) continue;
    lines.push('', `## ${round[0].toUpperCase() + round.slice(1)}`);
    for (const t of turns)
      lines.push(
        '',
        `### ${names[t.seat] || t.seat} — fictional seat`,
        t.text,
        '',
        `Challenge / change of mind: ${t.challenge}`,
        '',
        `Stance: ${t.stance} · ${refs(t.evidenceIds)}`,
      );
  }
  if (s.verdict)
    lines.push(
      '',
      '## Decision',
      `**${s.verdict.decision.toUpperCase()}** — ${s.verdict.summary}`,
      '',
      `Dissent: ${s.verdict.dissent}`,
      '',
      `Unknowns: ${s.verdict.unknowns}`,
      refs(s.verdict.evidenceIds),
    );
  lines.push('', '## Action plan');
  for (const a of s.actions) {
    lines.push(
      '',
      `### ${a.priority} · ${a.title}`,
      a.why,
      '',
      `Owner: ${a.owner} · Effort: ${a.effort} · Confidence: ${a.confidence}`,
      '',
      `Acceptance: ${a.acceptance}`,
      refs(a.evidenceIds),
    );
    if (a.experiment) for (const [k, v] of Object.entries(a.experiment)) lines.push(`- ${k}: ${v}`);
  }
  lines.push('', '## Evidence ledger');
  for (const e of s.evidence)
    lines.push(
      '',
      `### ${e.id} · ${e.title}`,
      e.summary,
      '',
      `Type: ${e.kind} · Confidence: ${e.confidence} · Retrieved: ${e.retrievedAt}`,
      `Locator: ${e.locator}`,
      e.url ? `Source: ${e.url}` : 'Source: supplied/local evidence; no public URL.',
    );
  lines.push(
    '',
    'No promised rankings, indexation, traffic or AI citations. Acceptance is implementation and measurement, not a forecast.',
    '',
  );
  return lines.join('\n');
}
