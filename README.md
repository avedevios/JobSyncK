# JobSyncK

A Safari browser extension paired with a local Node.js backend for tracking job applications from LinkedIn and Indeed. Built as a personal productivity tool to replace manual spreadsheet tracking.

## Architecture overview

```
┌─────────────────────────────────────────────────────┐
│  Safari Extension (Manifest V3)                     │
│                                                     │
│  content.js ──► background.js (service worker)      │
│  (DOM parser)    (dedup, fetch, badge)               │
│       │                  │                          │
│  popup.js                │                          │
│  (UI / UX)               │                          │
└──────────────────────────┼──────────────────────────┘
                           │ HTTP (localhost)
                           ▼
┌─────────────────────────────────────────────────────┐
│  Node.js + Express backend                          │
│  REST API → sql.js (SQLite in-memory + file sync)   │
└─────────────────────────────────────────────────────┘
```

The extension and backend communicate over `localhost:3333`. The extension never talks to any external service — all data stays on the user's machine.

## Key technical decisions

**sql.js instead of better-sqlite3**
sql.js runs SQLite compiled to WebAssembly, which works without native bindings. This makes the backend portable — no `node-gyp`, no platform-specific compilation. The database lives in memory and is flushed to disk on every write via `fs.writeFileSync`.

**Schema migrations without a migration framework**
On startup, the database layer runs `ALTER TABLE ... ADD COLUMN` for each new column inside a `try/catch`. sql.js throws if the column already exists, so this acts as a lightweight idempotent migration — no migration files, no version table.

**Duplicate detection at two levels**
1. Exact match — by `linkedin_job_id` (extracted from URL params) or canonical job URL
2. Fuzzy match — normalized description strings compared character-by-character; jobs with ≥ 80% similarity surface a warning in the popup without blocking the save

**Fail-open on backend unavailability**
All `fetch` calls in the service worker use `AbortSignal.timeout(5000)`. If the backend is down, duplicate checks return `false` and the user can still interact with the popup — the extension degrades gracefully rather than breaking.

**SPA navigation on LinkedIn**
LinkedIn is a React SPA. The content script intercepts `history.pushState` / `replaceState`, listens to `popstate`, observes `<title>` mutations, and polls the URL every second as a last resort. On each navigation the service worker re-evaluates the badge state.

## Project structure

```
backend/
  server.js          Express REST API (CRUD for vacancies)
  database.js        sql.js init, schema, migrations, file persistence
  dashboard/         Single-page dashboard (vanilla JS/HTML)

safari-extension/
  content.js         DOM parser for LinkedIn and Indeed (unified)
  background.js      Service worker: dedup logic, save/update, tab badge
  popup.js/html/css  Extension popup UI
  tests/
    unit/            Vitest unit tests (parser, background, popup, manifest)
    property/        Property-based tests with fast-check
```

## Backend API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/vacancies` | List all jobs, ordered by `created_at DESC` |
| GET | `/vacancies/:id` | Single job |
| POST | `/vacancies` | Create — returns `201` with the created record |
| PATCH | `/vacancies/:id` | Partial update — merges with existing record |
| DELETE | `/vacancies/:id` | Delete |

## Testing

```bash
cd safari-extension
npm install
npm test
```

The test suite uses **Vitest** with **jsdom** for DOM simulation and **fast-check** for property-based testing.

Property tests verify invariants that hold for any input:
- Parser always returns non-empty strings for `role` and `company` regardless of page HTML
- Parser never mutates the DOM
- `buildPayload` always produces a valid payload shape with correct field types
- `isDuplicateUrl` is equivalent to `Array.some` for any input
- URL classifier correctly identifies job pages vs. non-job pages

Unit tests cover: DOM selector fallback chains, fetch mocking (201 / 400 / 500 / timeout / network error), duplicate detection logic, and manifest structure validation.

## Setup

**Backend**
```bash
cd backend
npm install
node server.js
# → http://localhost:3333
```

**Safari Extension**
1. Open `safari-extension/LinkedInJobSaver.xcodeproj` in Xcode
2. Build and run (⌘R)
3. Safari → Settings → Extensions → enable **JobSyncK**
4. Grant access to `linkedin.com` and `indeed.com`

## Stack

| Layer | Technology |
|-------|-----------|
| Extension | JavaScript, Manifest V3, Safari Web Extensions |
| Backend | Node.js, Express 4, sql.js (SQLite/WASM) |
| Native wrapper | Swift, Xcode |
| Tests | Vitest, jsdom, fast-check |
