# Initial implementation review

## v0.2.0 follow-up

English presentation and multilingual output are independent. The old persisted RU interface choice cannot override the English product default. Language values are bounded and reject control characters; legacy session values remain valid. No private-session migration or translation is performed.

Arena review fixed stacking that obscured the felt, restored mobile-only navigation visibility and made manual next-turn selection update focus even when the revealed-turn count is unchanged. New published real turns move the spotlight to the latest contribution. Motion is controlled by actual presentation state, supports pause/off and honors reduced motion. Dossier formatting uses safe text nodes and validated HTTP(S) links, never raw HTML.

Browser regressions cover evidence-card provenance, challenge stamps, real speaker changes, reduced motion, English defaults with a legacy preference, an explicit Spanish brief, live Spanish council text and complete print/export output. No dependency or network boundary was added for animation.

Review date: 2026-10-13. Maintainer review, not an independent external security audit. The optional GSD review workflow was not applicable because this repository has no GSD phase structure; ordinary code inspection, adversarial tests and browser checks were used instead.

## Resolved before release

- Added the officially supported `.codex-plugin/plugin.json` fallback with explicit version/skills metadata and a legacy MCP configuration. Codex 0.145.0 reports version `0.1.0` and discovers `seo-roast-room:seo-roast`. The first discovery probe incorrectly searched for the bare name; it was corrected to account for the plugin namespace. Installation alone is not treated as skill-discovery proof.

- Custom session directories were not preserved by the UI's Codex handoff. Bootstrap now supplies the actual directory; copied instructions pass it to every CLI operation. Browser regression coverage uses a nondefault directory.
- Browser print previously exported only the active tab. A dedicated print-only report now includes all rounds, evidence, actions, experiments, dissent and unknowns even during partial replay.
- A valid session in a mismatched filename could impersonate another listing entry. The store now rejects mismatched IDs and exposes the invalid-file state.
- File-input review prompted a shared descriptor-bounded reader: reject links/special files, use nonblocking/no-follow open where supported, verify the opened regular file identity, and cap bytes actually read even if the file grows. Runtime regressions cover regular/malformed/oversized/growing files, symlinks and POSIX FIFOs.
- Host rejection test initially used fetch, which overwrote the supplied Host. Replaced it with a real raw HTTP request; the server boundary is now exercised accurately.
- Brief POST bodies are assembled as bounded bytes before UTF-8 decoding, preserving Cyrillic characters split across transport chunks. The byte ceiling accommodates schema-valid multilingual input; oversized bodies still return 413.
- Enlarged portrait labels and restricted the mobile navigation control to its intended breakpoint after screenshot review.

## Verified boundaries

Loopback binding; strict Host/Origin/Fetch Metadata checks; write nonce; no CORS wildcard; allowlisted routes; no HTTP shell/crawler/model endpoint; bounded research calls; URL/ID/evidence validation; atomic create and optimistic locked replacement; immutable completed sessions; no real source transcripts in the package; React text rendering instead of raw HTML.

## Remaining limits

- Local filesystem peers are trusted; this is not a public multi-user server.
- Validation proves structure and references, not the truth of model conclusions.
- Live model reasoning still requires Codex. The viewer cannot start Codex directly.
- Initial expert knowledge is a dated, bounded public sample. Original work can change or disappear.
- Independent seat execution depends on the host; sequential simulation is explicitly disclosed when needed.
- Claude support, voice and automatic GitHub/Linear synchronization are not implemented.
