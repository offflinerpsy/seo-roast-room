# Architecture

## Boundaries
`plugin.json` is the portable plugin entrypoint. `skills/seo-roast/` is self-contained: instructions, expert dossiers, CLI, dependency-free Node runtime and prebuilt room. A repo marketplace exposes this package. The optional public Base2026 MCP is declared in `mcp.json`; the CLI also supports bounded read-only research.

`app/` holds React/TypeScript and Tailwind source. Vite emits to the skill's `room/` folder so a downloaded plugin runs with Node 22+ and no package install. Frontend dependencies are build-only; the server does not call an LLM.

The CLI is the writer. Session documents have a versioned schema, strict size/ID/reference checks, atomic replacement and optimistic revision checks. The local HTTP server only creates a pending brief and reads/export sessions; mutation requires a same-origin nonce. It binds to 127.0.0.1, checks Host/Origin, never runs shells or crawls arbitrary URLs, and serves an allowlisted set of routes. SSE announces changed revisions; failed/partial documents never replace valid state.

## Flow
Brief → evidence → opening arguments → challenge → verdict/actions. Codex reads selected dossiers and works through the skill; available subagents may run seats independently, or Codex uses an explicitly disclosed sequential simulation. External pages and evidence are untrusted content, never execution instructions.

The session JSON is canonical. Markdown is generated from it. Replaying a saved session makes no model calls. A bundled fictional demonstration is clearly labeled and immutable through the viewer.

## Presentation and language
`app/room-stage.tsx` renders the tabletop arena from the selected session and turn. The speaker, evidence card, challenge stamp and round counter resolve to actual turn IDs and evidence references. Demo playback advances saved contributions; SSE moves focus to newly published real contributions. Waiting briefs never claim active model work. CSS transform/opacity animations are bounded by presentation state and can be disabled; operating-system reduced motion wins over animation styling.

Product chrome, shipped metadata, demo, report headings and public project communication are English. The schema accepts `auto` or a bounded language name/tag while retaining compatibility with legacy `en` and `ru` documents. `auto` asks Codex to match the user's request. Session bodies are not translated by the viewer. Right-to-left text can determine its own direction in speaker and transcript fields. Dossiers render text and safe links without accepting raw HTML.

## Privacy
Sessions default to the caller's workspace `.seo-roast/sessions` and are excluded from this repository. No telemetry, no API key collection. Public API requests transmit only user-selected research terms/handles; never client exports or full briefs. Source lookup failures are visible; zero results are not invented evidence.

## Extension contract
Add a reviewed expert manifest entry plus a dossier, source references and original avatar, run validation/tests, and add a fixture. Protocol versions are explicit; malformed or unsupported versions fail closed. Keep migration instructions with any future breaking schema change.
