# Security and privacy

The room binds only to `127.0.0.1`. Host, Origin and Fetch Metadata checks reduce cross-origin and DNS-rebinding exposure; writes additionally require a per-process nonce and JSON. There is no CORS wildcard, model key storage, telemetry, server-side target crawler or shell execution endpoint. HTTP routes are allowlisted. Treat it as a local tool, not a hardened multi-user service; do not put it behind a public proxy.

Sessions and drafts may contain confidential client material. Keep `.seo-roast/` ignored and out of shared folders. Exports contain the evidence you supplied: inspect them before sharing. Public Base2026 lookup sends only the explicitly requested query/handle and is not automatic brief upload. Same-machine processes and users with filesystem permissions remain inside the trust boundary.

The schema blocks unsafe URL schemes, credential-bearing URLs, path traversal IDs, dangling evidence references and incomplete completion. Atomic revision checks prevent lost writes between cooperating CLI writers. They do not make model conclusions factual or protect against a malicious process with direct filesystem access.

An interrupted process may leave `<session>.json.lock`. Check that the owning task has stopped, preserve the current JSON/draft, validate them, then remove only that stale lock and retry from the current revision. Never remove another live writer's lock.

For sensitive security reports, use GitHub's private vulnerability reporting when enabled, or contact the maintainer privately through the public GitHub profile. Do not publish secrets or real client data in an issue. Ordinary bugs use the public template.
