export async function searchBase2026({ query = '', creator = '', limit = 8 }, transport = fetch) {
  if (
    typeof query !== 'string' ||
    query.length > 200 ||
    typeof creator !== 'string' ||
    creator.length > 100 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 20
  )
    throw new Error('Invalid bounded research query');
  const response = await transport('https://base2026.dev/api/mcp', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search_sources',
        arguments: { query, ...(creator ? { creator_handle: creator } : {}), limit },
      },
    }),
  });
  if (!response.ok)
    throw new Error(`Base2026 unavailable: HTTP ${response.status}. No evidence was imported.`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 512000) {
      await reader.cancel();
      throw new Error('Research response exceeds size limit');
    }
    chunks.push(value);
  }
  const rpc = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (rpc.error || rpc.result?.isError)
    throw new Error('Base2026 research failed; do not treat this as no matching sources');
  const data =
    rpc.result?.structuredContent ??
    JSON.parse(rpc.result?.content?.find((x) => x.type === 'text')?.text || '{}');
  if (!Array.isArray(data.results)) throw new Error('Unexpected Base2026 response');
  return {
    retrievedAt: new Date().toISOString(),
    query,
    creator,
    total: data.total,
    results: data.results.map((s) => ({
      id: s.source_id,
      title: s.title,
      creator: s.creator?.handle,
      originalUrl: s.source_url,
      base2026Url: s.source_page_url,
      excerpt: s.evidence_excerpt,
      publishedDate: s.published_date,
      kind: 'practitioner',
      note: 'Attributed practitioner claim; not independent verification.',
    })),
  };
}
