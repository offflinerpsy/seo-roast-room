# Initial implementation review

Review date: 2026-10-13. Maintainer review, not an independent external security audit. The optional GSD review workflow was not applicable because this repository has no GSD phase structure; ordinary code inspection, adversarial tests and browser checks were used instead.

## Resolved before release

- Custom session directories were not preserved by the UI's Codex handoff. Bootstrap now supplies the actual directory; copied instructions pass it to every CLI operation. Browser regression coverage uses a nondefault directory.
- Browser print previously exported only the active tab. A dedicated print-only report now includes all rounds, evidence, actions, experiments, dissent and unknowns even during partial replay.
- A valid session in a mismatched filename could impersonate another listing entry. The store now rejects mismatched IDs and exposes the invalid-file state.
- Host rejection test initially used fetch, which overwrote the supplied Host. Replaced it with a real raw HTTP request; the server boundary is now exercised accurately.
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
