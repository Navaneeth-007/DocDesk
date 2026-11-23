# Architecture and product choices

## Product slice

DocDesk is an intentionally small team notebook: a persistent rich-text page, lightweight text import, Markdown export, and a clearly visible read-only share relationship. The interface keeps document navigation and the open page together, makes save state visible, and keeps the demo account switcher in the workspace sidebar.

## Implementation

- **UI:** plain HTML, CSS, and browser JavaScript. `contenteditable` plus browser formatting commands covers the requested basic formatting without a large editor dependency.
- **Server:** Node's built-in HTTP server exposes a small JSON API and serves the static app.
- **Storage:** locally, a JSON document file contains title, rich-text HTML, owner, shared member names, and timestamps. With `DATABASE_URL`, the app uses PostgreSQL for deployed storage.
- **Identity/access:** three fixed demo members selected in the UI. The API checks ownership or shared membership on reads, limits edits and sharing to owners, and exposes shared documents as read-only.
- **Import/export:** `.txt` and `.md` files up to 1 MB are parsed in the browser. Text is escaped before creating HTML; headings and simple bullets receive basic structure. The editor exports headings, basic inline emphasis, lists, quotes, and safe links to Markdown.

## Priorities and tradeoffs

The time went to the core lifecycle and understandable access behavior instead of real-time co-editing, account provisioning, and a broad file conversion pipeline. PostgreSQL can retain deployed data across the ephemeral Render filesystem. The local JSON store is readable and durable for a single instance, but should be replaced by PostgreSQL for deployment. Production authentication and a vetted HTML sanitizer are also required before handling untrusted users.

## Next 2–4 hours

Add proper account/session handling and expand automated API coverage around imports and export. Then add autosave conflict detection and collaboration indicators.
