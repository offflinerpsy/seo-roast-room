# Session format v1

Use the executable validator in `lib/schema.mjs`. A complete worked fixture lives at `examples/demo.json`; it is fictional and must not be presented as client evidence.

## Brief input
Required strings: `title` (max 160), `question` (max 6000). Optional `context` (max 12000), `mode` (`quick|council|consult`), `language` (a language name or tag, max 80 characters, no control characters; default `auto`), `seats` (known IDs; quick ≤3, consult exactly1). `auto` means match the user's request. Existing `en` and `ru` sessions remain valid. The interface and report headings are English; brief text, contributions and findings preserve the requested language. CLI `create` assigns ID, timestamps, revision0, empty arrays, `verdict:null`, `stage:brief`, `status:waiting`, `demo:false`.

## Session
Fields: `schemaVersion:1`, `id`, integer `revision`, `title`, `question`, `context`, `mode`, `language`, selected `seats`, `stage` (`brief|evidence|opening|challenge|verdict`), `status` (`waiting|running|complete|failed`), boolean `demo`, ISO `createdAt/updatedAt`, string array `assumptions`, arrays `evidence/turns/actions`, and nullable `verdict`.

IDs use lowercase letters, digits and hyphens, start alphanumeric, max80. Duplicate IDs and dangling evidence references are rejected. Dates must parse. URLs must be http(s) without credentials or null. JSON size ≤2MiB. Unknown metric values belong in the narrative; never substitute zero.

Evidence fields: `id`, `title`, `summary`, `kind` (`observation|metric|practitioner|primary|hypothesis`), `confidence` (`high|medium|low`), ISO `retrievedAt`, nullable `url`, `locator` (precise page section, inspected element, row range, file or tool receipt). An external claim is not a site observation.

Turn fields: `id`, selected `seat`, `round` (`opening|challenge|verdict`), `text`, `challenge`, `stance` (`support|challenge|conditional|unknown`), `evidenceIds`, `fictional:true`. Unsourced turns must have `stance:unknown`.

Action fields: `id`, `title`, `why`, `priority` (`P0|P1|P2`), `confidence`, `owner`, `effort`, `acceptance`, nonempty `evidenceIds`, `experiment` (null or object with nonempty `baseline`, `change`, `measure`, `success`, `stop`, `window`).

Verdict: `decision` (`proceed|test|hold`), `summary`, `dissent`, `unknowns`, nonempty `evidenceIds`.

## Writing
Create a session once. Read its current file, copy to a separate draft, append research and round outputs, update stage/status. Run `validate --file DRAFT`, then `publish --file DRAFT --expected-revision N --sessions DIR`. Publish assigns the next revision and update time. It retains creation time and disallows changes to demo/completed sessions. On an interrupted writer, inspect the `.json.lock` before recovering it; do not delete a live writer's lock.

The viewer polls no model; SSE announces filesystem changes. `report --file SESSION` outputs Markdown; the viewer exports the same report. Keeping research notes in private work files is encouraged. Never include secrets in evidence locators.
