# Repository Guidelines

## Project Structure & Module Organization
`server.js` exposes the Express API (jobs CRUD, status updates, attachment upload) and serves everything inside `public/`. `database.js` bootstraps the SQLite schema under `data/werkstatt.db`, so keep new SQL next to the existing prepared statements. Front-end logic lives in `public/app.js`, `styles.css`, and `index.html` alongside icons and the service worker. Sample data and helper scripts belong in `data/` (e.g., `import.sh`), while runtime attachments land in the auto-created `uploads/` folder that should remain untracked.

## Build, Test, and Development Commands
- `npm install` — install Express, Multer, and better-sqlite3.
- `npm start` — run the Node server on `http://localhost:3000`, serving both SPA and API.
- `NODE_ENV=production npm start` — sanity-check production caching and logging.
- `npm test` — placeholder script; replace with real checks as coverage grows.
- `sqlite3 data/werkstatt.db < data/import.sh` — reseed demo jobs from OCR imports whenever you need realistic fixtures.

## Coding Style & Naming Conventions
Use two-space indentation and CommonJS modules on the backend. Prefer `const`/`let`, early returns, and arrow functions as in `public/app.js`. Keep API column names snake_case to match the database while exposing camelCase flags in UI state maps (e.g., `huAu`, `carCare`). Always touch SQLite through prepared statements on `db`, and guard filesystem work with `fs.existsSync`, mirroring the upload bootstrap.

## Testing Guidelines
Manual QA is still required: after `npm start`, create/edit jobs through the UI and verify `/api/jobs` responses with tools such as `curl -s http://localhost:3000/api/jobs | jq '.[0]'`. When you add automated tests, colocate them as `<feature>.test.js`, cover request validation, DB mutations, and the status sequencing helpers that order planner cards, and block merges until at least smoke tests or scripted manual steps exist.

## Commit & Pull Request Guidelines
History shows short, imperative subjects (`Revamp job cards in day view`, `Fix duplicate calendar toggle definitions`). Keep using that style, mention the scope (API/UI/DB), and reference an issue or ticket number when relevant. Pull requests should describe the feature, outline manual tests (e.g., “create job with attachments, reload”), and include visuals whenever the UI layout or colours change.

## Data Handling & Security Notes
`data/werkstatt.db` and everything under `uploads/` may contain customer data. Keep them out of commits, redact PII in bug reports, and, if you must share samples, export anonymised rows via `sqlite3` instead of copying the full database.

## Agent Directory
- **Trash Steward** — owns the Soft Delete & Papierkorb pipeline. Responsibilities: keep `trashed_at` flows consistent across API/UI, enforce the 30‑Tage Aufbewahrung (including purge jobs), and document restore scenarios before launch. Update `/api/trash` outputs whenever new fields matter for restoration, and verify floating button/Badge UX stays accessible.
- **UI Compactor** — trims the interface without breaking the current visual language. Focus on spacing, typography scales, and component density (especially clipboard + trash modals), run changes through `public/styles.css`, and keep behaviour parity (no hidden controls). When suggesting compaction work create before/after screenshots and note any keyboard navigation adjustments.
