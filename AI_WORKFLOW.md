# AI workflow note

## Tools used

OpenAI Codex assisted with interpreting the brief, outlining a deliberately narrow product slice, and drafting implementation and documentation.

## Where it helped

AI accelerated the initial UI/API scaffold, repetitive styles, and the first pass of the local store and test. It also helped keep the implementation aligned with the requested owner/shared distinction and reviewer setup flow.

## Judgment and changes

The output was reviewed and adjusted to keep local setup small while adding only the `pg` runtime dependency for PostgreSQL hosting. Shared access is read-only in the UI and API, imports are limited to `.txt`/`.md`, imported text is escaped, and the JSON store's single-instance limit is documented. A server-side HTML cleanup and persistence test were added rather than assuming browser-side controls were sufficient.

## Verification

The automated checks cover persistence after reopening the store, removal of executable markup, and owner/shared API behavior. A browser walkthrough verified create/edit, save and reopen, Markdown import/export, sharing, and read-only access after switching accounts. The implementation has not been independently security audited; the architecture note identifies the production gaps.
