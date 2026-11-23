# DocDesk

A small workspace for drafting and sharing team documents. It covers the everyday loop: create, format, save, reopen, import, share, and export.

## Live demo

[Open DocDesk](https://docdesk-akms.onrender.com/)

## Run locally

Requirements: Node.js 20 or newer.

```sh
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Run automated checks with `npm test`.

Without `DATABASE_URL`, documents are stored in `data/documents.json` and survive local restarts. If `DATABASE_URL` is set, DocDesk uses PostgreSQL and creates its table at startup.

## Try the product

1. Create a document, give it a title, and type in the page. Changes save automatically.
2. Use the toolbar for bold, italic, underline, headings, and lists.
3. Select **Import** to import a `.txt` or `.md` file (maximum 1 MB). Markdown headings and simple bullet lines are converted. Import can replace the open document or create a new one.
4. Select **Share**, invite a different seeded member, then switch to that member in the sidebar. The shared document appears with a shared label and is read-only for them.
5. Select **Markdown** to download a `.md` copy with headings, emphasis, lists, quotes, and safe links.

Seeded members: Avery Chen, Jordan Lee, Sam Rivera. This is a demo identity switcher, not real authentication. Avery owns a new document; sharing is explicit and persisted.

## Deployment notes

The included [render.yaml](render.yaml) deploys the free web service and a free PostgreSQL database in Singapore. Create a Blueprint from this repository and apply its plan. The service runs `npm ci` and `npm start`, listens on Render's `PORT`, has a `/health` check, and reads the database connection string through Render's internal environment wiring.

Render free web service filesystems are temporary, so configure PostgreSQL if you want documents to remain after restarts and idle spin-down. Render's free PostgreSQL currently expires after 30 days, and free web services sleep after 15 minutes of inactivity. See [Render's free service details](https://render.com/docs/free). These limits are suitable for a short-lived reviewer demo, not permanent storage.

## Scope and limitations

- Supports `.txt` and `.md` imports only; no DOCX or attachment uploads.
- One owner can edit; shared members can read. There are no invitations, user accounts, roles, or concurrent editing.
- Demo identity is selected in the UI and sent to the API; this is not authentication and must not be used for private documents.
- Rich text is stored as HTML. A small server-side allowlist filters markup; production use should add real authentication and a mature HTML sanitizer.
- There is no undo history beyond the browser editor's native behavior, comments, or offline mode.

See [ARCHITECTURE.md](ARCHITECTURE.md), [AI_WORKFLOW.md](AI_WORKFLOW.md), and [SUBMISSION.md](SUBMISSION.md).
