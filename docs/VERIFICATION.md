# v0.2.0 verification

Date: **2026-10-13**. Tests use synthetic data. No client website was audited to produce the demonstration.

| Check | Observed result |
| --- | --- |
| Windows, Node 24.9.0 | 19 runtime/CLI tests passed; 2 OS capability skips (file symlink privilege and POSIX FIFO) |
| Ubuntu WSL, Node 22.23.3 | All 21 runtime/CLI tests passed, no skips |
| Chromium | 6 scenarios passed: source-driven motion/reduced motion, responsive room, multilingual briefs, complete print, replay and live multilingual publishing |
| Geometry/screenshots | 320, 390, 768, 1024 and 1440 px; eight portraits load; no horizontal page overflow |
| Build/types/format/package | Passed; eight dossiers, 42 references and eight transparent portraits present |
| Live public Base2026 CLI lookup | Two attributed Harry Sanders results for `internal linking`; retrieval 2026-10-13T07:22:39Z |
| GitHub installation | v0.1.0 previously installed and verified; v0.2.0 installed-package verification follows publication of the candidate |
| Codex 0.145.0 discovery | Enabled namespaced skill `seo-roast-room:seo-roast` verified for v0.1.0; new version verification pending |
| Private-data scan | No ignored sessions, `.local`, node_modules, credential files or obvious key patterns in the publication set |
| Hosted CI | **Blocked before any job steps** by an account-level GitHub Actions restriction; not green |

## What the tests exercise

Real CLI create → publish → revision conflict → complete → report → immutable final; evidence/round gates; preserved dissent and unknowns; experiments; bad URLs/IDs; atomic competing writers; invalid session files; opened-descriptor byte bounds including growing files; real Linux symlink/FIFO rejection; Host/Origin/Fetch Metadata/nonce boundaries; public binding rejection; research failure handling; arbitrary language names/tags with bounded validation; English UI despite legacy RU preferences; explicit Spanish brief handoff; unmodified Spanish output through live publishing and Markdown; source-card and dossier dialogs; turn-linked animation, pause, step, restart and reduced motion; printing all report sections during partial replay.

The isolated Linux Node archive came from the official Node.js distribution and matched SHA-256 `df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de`. No global Linux runtime was installed or replaced.

## Evidence and limits

- Published screenshots: [desktop](assets/room-desktop.png), [mobile](assets/room-mobile.png).
- Local full viewport evidence: ignored `.local/evidence/room-*.png`. CI uploads its own artifacts when jobs can run.
- [Hosted CI blocker](https://github.com/offflinerpsy/seo-roast-room/issues/2), [initial blocked run](https://github.com/offflinerpsy/seo-roast-room/actions/runs/38363160651).
- [Review and fixes](REVIEW.md), [research coverage](RESEARCH.md), [artwork provenance](ARTWORK.md).

These checks establish package/runtime behavior, not the factual correctness of a future model-generated SEO audit. Browser testing used Windows Chromium; Linux browser and the full hosted OS/version matrix have not run. No independent penetration test, actual client analytics integration, Claude adapter or public OpenAI-directory approval is claimed.
