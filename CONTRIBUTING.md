# Contributing

Open an issue describing the user-visible problem and a reproducible example. A failing fixture is more useful than a large refactor. Keep Claude integration out of the initial release scope.

## New expert
1. Verify identity and relevant public creator records in Base2026 (or clearly justify an additional primary-source corpus).
2. Review enough distinct sources to establish a useful lens. Record actual sources, dates, limits and uncertainty; do not claim comprehensive knowledge from a profile blurb.
3. Add the entry to `skills/seo-roast/brains/experts.json`, a detailed `<id>.md`, and source references in `sources.json`. Distinguish attributed ideas from your authored interpretation and character.
4. Add an original transparent cartoon portrait and record its source references/prompt in `docs/ARTWORK.md`. Never copy a source photograph into the package or imply endorsement.
5. Update `SEATS`, responsive seating layout, mode constraints and fixtures intentionally. The initial table supports eight; adding a ninth requires UI/protocol work, not only JSON.
6. Run build, tests, package validation and desktop/mobile UI checks. Submit a PR with evidence and the strongest remaining limitation.

## Code changes
`npm ci`, `npm run build`, `npm test`, `npm run check`, `npm run format:check`, `npm run test:ui`. Use `npm run format` for readable source formatting. UI changes require updated prebuilt room artifacts and screenshots. Dependencies are locked; runtime server/CLI remains Node-only. Test meaningful failure boundaries: interrupted writes, evidence provenance, concurrency, network failure, accessibility and live updates.

Keep client data, tokens, credentials, private transcripts and `.local/` out of patches. Preserve attribution. Version breaking session changes; never reinterpret existing evidence silently. Use concise commits and link a GitHub issue; maintainers may cross-link Linear tasks.
