# SimpleInvoice

A full-stack invoice management app built for the 101 Digital Full Stack Engineer assessment: authentication, a searchable/filterable/sortable/paginated invoice list, invoice detail, and invoice creation.

- **Frontend**: React 18 + TypeScript + Vite + MUI
- **Backend**: NestJS + TypeScript + TypeORM + PostgreSQL, JWT auth, Swagger/OpenAPI
- **Repo structure**: monorepo (`frontend/`, `backend/`, root `docker-compose.yml`)

## Table of Contents

- [Architecture](#architecture)
- [API](#api)
- [Running with Docker (single command)](#running-with-docker-single-command)
- [Running without Docker](#running-without-docker)
- [Default login credentials](#default-login-credentials)
- [Seeding](#seeding)
- [Testing](#testing)
- [Design decisions / assumptions](#design-decisions--assumptions)
- [Value-add (beyond the stated requirements)](#value-add-beyond-the-stated-requirements)
- [Known limitations](#known-limitations)
- [Scope for improvement](#scope-for-improvement)

## Architecture

```
simple-invoice/
├── backend/            NestJS REST API
│   └── src/
│       ├── auth/       JWT login, /auth/me, guard, strategy
│       ├── users/      User entity + lookup service
│       ├── invoices/   entities, calculations, service, controller, DTOs, validators
│       ├── health/     GET /health (liveness/readiness)
│       ├── config/     single source of env validation
│       ├── common/     global exception filter, money/currency helpers
│       └── database/   TypeORM DataSource, migrations, seed script
├── frontend/           React SPA
│   └── src/
│       ├── api/        axios client + typed endpoint wrappers
│       ├── auth/       AuthContext, ProtectedRoute
│       ├── pages/      Login, Invoice List, Invoice Detail, Create/Edit Invoice
│       ├── components/ InvoiceTable, InvoiceFilters, InvoiceForm, StatusBadge, AppLayout
│       └── hooks/      useInvoices (data fetching), useDebouncedValue
└── docker-compose.yml  postgres + backend + frontend, one command
```

**Backend auth**: JWT access tokens (`@nestjs/jwt` + `passport-jwt`), bcrypt-hashed passwords, a global `ValidationPipe` and exception filter so every endpoint returns the same structured error shape. Token expiry is configurable via `JWT_EXPIRES_IN` (seconds), defaulting to `3600`.

**Business logic** (`backend/src/invoices/invoices.calculations.ts`, pure/unit-tested functions):
```
subTotal      = quantity × rate
taxAmount     = subTotal × (tax% / 100)
totalAmount   = subTotal + taxAmount − discount
balanceAmount = totalAmount − totalPaid
```
`Overdue` is **never persisted** — the database only stores `Draft | Pending | Paid`. It is derived at read time (`if status != Paid AND dueDate < today → "Overdue"`), including when filtering the list (`GET /invoices?status=Overdue` translates to `status != 'Paid' AND dueDate < CURRENT_DATE`, not a literal column match).

## API

No global route prefix — paths are exactly as specified: `POST /auth/login`, `GET /auth/me`, `GET /invoices`, `GET /invoices/:id`, `POST /invoices`, plus `GET /health` (unauthenticated, used by Docker healthchecks) and `PATCH /invoices/:id` (edit a Draft invoice — a post-assessment addition, see Value-add below). Full interactive documentation (request/response schemas, query params, status codes) is served at **`/api/docs`** once the backend is running.

`GET /invoices` response shape:
```json
{ "data": [ /* invoices */ ], "paging": { "page": 1, "pageSize": 10, "total": 36 } }
```
Each invoice nests `customer: { fullname, email, mobileNumber, address }` and `items: [{ id, name, quantity, rate }]`.

## Running with Docker (single command)

```bash
cp .env.example .env
docker compose up --build
```

| Service | Container port | Host port (default) |
|---|---|---|
| frontend (nginx) | 80 | `5173` → http://localhost:5173 |
| backend (Nest) | 3000 | `3000` → http://localhost:3000 |
| db (Postgres) | 5432 | `5432` |

The backend runs pending migrations automatically on boot. **Seed the database** (one-time) — the compiled seed script already lives inside the running container, so this needs nothing on your host beyond Docker itself (no local Node/npm install):

```bash
docker compose exec backend node dist/database/seed/seed.js
```

(If you'd rather run it from your host with `npm run seed` instead — e.g. because you already have Node installed and prefer the dev workflow — that works too: `cd backend && cp .env.example .env` — matching `DATABASE_HOST=localhost`/`DATABASE_PORT=5432` to the compose defaults — then `npm install && npm run seed`.)

Then open http://localhost:5173 and log in.

## Running without Docker

**Database**: install PostgreSQL locally, or just run `docker compose up -d db` for the database only.

**Backend**:
```bash
cd backend
cp .env.example .env   # adjust DATABASE_* to your local Postgres
npm install
npm run migration:run
npm run seed
npm run start:dev      # http://localhost:3000, Swagger at /api/docs
```

**Frontend** (separate terminal):
```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:3000
npm install
npm run dev             # http://localhost:5173
```

## Default login credentials

A reviewer account is seeded automatically:

| Email | Password |
|---|---|
| `reviewer@example.com` | `Reviewer@12345` |

## Seeding

`npm run seed` (from `backend/`) creates the reviewer user plus 36 invoices with varied statuses, dates, amounts, and customers — including at least one overdue invoice and one due today, so search/filter/sort/pagination are all meaningful to try. **Idempotent**: safe to run more than once (it skips anything that already exists by email/invoice number rather than erroring or duplicating).

## Testing

**Backend** (`cd backend`):
- `npm run test` — unit tests for invoice total calculations, Overdue derivation, due-date validation, and the unique-invoice-number conflict path (both create and edit).
- `npm run test:e2e` — a real integration suite: boots the actual Nest app against a **real Postgres connection** (point `DATABASE_*` at a disposable test database first), runs real migrations, and exercises the full HTTP stack with supertest — login, create → list → detail, duplicate-invoice-number 409, invalid due-date 400, the Overdue-filter query logic, and the full edit-a-Draft-invoice flow (including rejecting an edit on a non-Draft invoice). No mocked services.

**Frontend** (`cd frontend`):
- `npm run test` — Jest + React Testing Library: list search/filter/sort/pagination interactions, create/edit-form field-by-field validation and successful submission, detail-page field rendering (including the Edit button's Draft-only visibility), login validation and redirect-to-default-home-screen, and the auth redirect-to-login guard.

**CI**: `.github/workflows/ci.yml` runs lint + both test suites (backend against a real Postgres service container) and the frontend build on every push.

## Design decisions / assumptions

- **Customer embedded on the Invoice row** (not a separate `customers` table) — the spec allows either; embedding avoids a join on every list/detail read for what is, in this assessment, a single invoice-per-customer-record model.
- **One line item per invoice** (per spec §2.1.4), but items live in their own `invoice_items` table (FK to invoice) so the schema already supports multiple items without a future migration.
- **`currencySymbol` is derived server-side** from `currency` (a small code→symbol map) — the create form only collects the currency code, matching the spec's field table.
- **Date-range filter (`fromDate`/`toDate`) applies to `invoiceDate`** — the spec lists these params without specifying which date field; invoice date was chosen as the more common convention for this param in invoicing systems.
- **JWT stored in browser storage, not an httpOnly cookie** — per the spec's own wording ("securely store the token on the client side"). This is simple and sufficient here but carries an XSS-exfiltration surface; httpOnly cookie + refresh-token rotation would be the production-grade upgrade, intentionally out of scope (the spec explicitly says advanced auth hardening isn't required).
- **Migrations, not `synchronize: true`** — schema changes are committed, reviewable SQL, not inferred at runtime.
- **Edit pre-fills "Tax %" by back-computing it from the stored tax amount** (`totalTax / invoiceSubTotal * 100`), since only the computed amount is persisted, not the original percentage — a cosmetic rounding artifact is possible for non-round original percentages, but every save recomputes totals fresh from whatever percentage is in the field, so this never affects correctness.

## Value-add (beyond the stated requirements)

- **Editing Draft invoices** — not part of the original spec's four required features; added afterwards on request. `PATCH /invoices/:id` edits a Draft invoice's fields (customer, item, dates, currency, tax, discount), recomputing all totals server-side exactly like creation. Any other status (`Pending`/`Paid`) returns **409 Conflict**, enforced both server-side and client-side (the Edit button only appears for Draft invoices, and direct navigation to the edit URL for a non-Draft invoice is also blocked). Does **not** add a way to change an invoice's status — intentionally out of scope. Create and Edit share one `InvoiceForm` component.
- `GET /health` — real liveness/readiness check (verifies the DB connection), used as the actual Docker healthcheck for the backend container, not just "is the port open."
- `helmet`, gzip response compression, and basic rate limiting (`@nestjs/throttler`) on the API.
- Debounced search input, loading skeletons, and a designed empty state (not a bare "Loading…" row) on the invoice list.
- Currency-aware amount formatting via a single shared `Intl.NumberFormat`-based helper (not duplicated between the list and detail views).
- Click-to-sort column headers (not just a dropdown), with `aria-sort` / keyboard-accessible controls.
- Search/filter/sort/page state is synced to the URL query string — back/forward and bookmarking a filtered view both work.
- A "Print Invoice" view on the detail page: a dedicated print stylesheet strips the app chrome and page background, removes the card's shadow/border for a full-bleed layout, sets sensible page margins, and keeps the invoice from splitting across a page break.
- `.github/workflows/ci.yml` — lint + both test suites run on every push, including a real Postgres service container for the backend e2e suite.
- Database indexes on every column the spec requires sort/filter/search on (`status`, `invoiceDate`, `dueDate`, `totalAmount`, `customerFullname`), plus a DB-level `CHECK` constraint enforcing `dueDate >= invoiceDate` as defense-in-depth alongside the API-level validation.
- Backend: `create()`/`update()` share one `computeInvoiceFields()` helper (`backend/src/invoices/invoices.service.ts`) for the totals/field-mapping logic instead of each carrying its own copy — a newly-editable field only ever needs adding in one place.
- Frontend: route-based code splitting (`React.lazy`) — the production bundle was one 476 KB chunk regardless of which page a user visits; Invoice Detail/Create/Edit now split into separate chunks (~29 KB total) fetched only when actually navigated to, confirmed in a real browser, not just inferred from the build output.
- Frontend: `React.memo` on the invoice table/filters with stabilized (`useCallback`) props — typing in the search box no longer re-renders a 100-row table on every keystroke, only once the debounced fetch actually resolves.

## Known limitations

- No invoice deletion, payment recording, or multi-user ownership scoping — the spec's four features (auth, list, detail, create) plus editing Draft invoices (added afterwards) are what's implemented; nothing beyond that was assumed as required.
- No password-reset/forgot-password flow (spec explicitly says advanced auth isn't required for this assessment).
- Single reviewer account is seeded; no registration flow.
- `invoice_items` supports multiple items at the data layer, but the API and UI only ever create/show exactly one (per spec).

## Scope for improvement

Ideas intentionally left out of this submission — either stretch goals beyond what was asked, or natural next steps if this app continued past the assessment:

- Invoice deletion, payment recording (partial/full payments against `totalPaid`), and multi-user ownership scoping.
- httpOnly-cookie + refresh-token rotation for the JWT instead of browser storage (see Design decisions above for why the simpler approach was used here).
- Password-reset/forgot-password and a registration flow, beyond the single seeded reviewer account.
- A way to transition an invoice's status (e.g. mark Pending as Paid) — deliberately not added alongside the Draft-edit feature, since it wasn't asked for.
- CSV export of the current filtered/sorted invoice list.
- A stats/dashboard aggregate endpoint (e.g. total outstanding, count by status) for a summary view above the invoice list.
- Light/dark theme toggle.
