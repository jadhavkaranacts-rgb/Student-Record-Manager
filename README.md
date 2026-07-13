# Student Record Manager

## Project Overview

Student Record Manager is a full-stack back-office web application for school registrars to manage student records. It provides a REST API backed by PostgreSQL and a React single-page frontend for day-to-day administration.

**Features implemented:**

- Create, read, update, and delete (CRUD) student records
- Auto-generated, unique admission numbers (format `ADM<year><6-digit id>`, e.g. `ADM2026000001`), assigned server-side on creation
- Student photo upload (JPEG/PNG/WEBP/GIF, 5MB max) with disk storage and static serving
- Server-side validation of all student input (name, course, year, date of birth, email, mobile number, gender, address)
- Full-text search across name, email, and admission number
- Filtering by course, year, and gender
- Sortable, paginated student listing
- Aggregate analytics: total students, and breakdowns by course, year, and gender
- Activity log recording every create/update/delete action, surfaced on a dashboard feed
- Dashboard with key metrics, course distribution chart, and recent activity feed

## Tech Stack

- **Frontend framework:** React 19 + Vite 7 (TypeScript), routed with [Wouter](https://github.com/molefrog/wouter)
- **Backend framework:** Express 5 (TypeScript, ESM), with `pino`/`pino-http` for structured logging
- **Database:** PostgreSQL, accessed via [Drizzle ORM](https://orm.drizzle.team/) (`drizzle-orm/node-postgres`)
- **Authentication:** None — the app has no login/auth layer; all endpoints are unauthenticated
- **UI libraries:** shadcn/ui components built on Radix UI primitives, Tailwind CSS v4, `lucide-react` icons, `recharts` for charts, `sonner` for toasts
- **Forms & validation:** `react-hook-form` + `@hookform/resolvers` on the frontend; Zod schemas (generated from the OpenAPI spec via [Orval](https://orval.dev/)) on the backend
- **File uploads:** `multer` (local disk storage)
- **API contract & codegen:** OpenAPI 3.1 spec (`lib/api-spec/openapi.yaml`) → Orval generates a typed React Query client (`lib/api-client-react`) and Zod request/response schemas (`lib/api-zod`)
- **Data fetching:** `@tanstack/react-query`
- **Monorepo tooling:** pnpm workspaces, TypeScript project references

## Prerequisites

This project is built and run on Replit's Node.js 24 module. Verified versions in this environment:

```
Node.js: v24.13.0
pnpm:    v10.26.1
```

The repository does not pin an exact version via `.nvmrc` or `package.json#engines`; use Node.js 24.x and pnpm 10.x for compatibility. **pnpm is required** — the root `package.json` has a `preinstall` guard that fails if you try to install with `npm` or `yarn`.

## Installation

This is a pnpm monorepo (workspaces defined in `pnpm-workspace.yaml`: `artifacts/*`, `lib/*`, `scripts`), not a repo with separate frontend/backend projects to install independently. A single install at the root installs every package in the workspace.

```bash
git clone <repository-url>
cd <project>
pnpm install
```

No further per-package install step is needed — the API server (`artifacts/api-server`) and frontend (`artifacts/student-management`) are installed together as workspace packages.

## Environment Variables

| Variable | Required by | Description |
|---|---|---|
| `DATABASE_URL` | API server, Drizzle config | PostgreSQL connection string used to connect to the database and to run schema migrations. |
| `PORT` | API server, frontend dev server | Port the respective server listens on. The API server and the Vite dev server each read their own `PORT` (they run as separate processes/services). |
| `BASE_PATH` | Frontend (Vite config) | Base URL path the frontend app is served under (used to configure Vite's `base` and asset paths). |
| `LOG_LEVEL` | API server (optional) | Pino log level for the API server. Defaults to `"info"` if not set. |
| `NODE_ENV` | API server, frontend | Standard Node environment flag (`development`/`production`); affects logging format and dev-only Vite plugins. |
| `SESSION_SECRET` | Provisioned in this environment (currently unused) | No code in this project currently reads or requires this variable. |

There is no `.env.example` file in the repository; on Replit these variables are provisioned automatically. If running elsewhere, set `DATABASE_URL` to a reachable Postgres instance and export `PORT`/`BASE_PATH` for each service before starting it.

## Database Setup

The application uses two tables, defined with Drizzle ORM in `lib/db/src/schema/`.

### `students`

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | Primary key |
| `admission_number` | `text` | `NOT NULL`, unique (assigned server-side after insert) |
| `name` | `text` | `NOT NULL` |
| `course` | `text` | `NOT NULL` |
| `year` | `integer` | `NOT NULL` |
| `date_of_birth` | `date` | `NOT NULL` |
| `email` | `text` | `NOT NULL`, unique |
| `mobile_number` | `text` | `NOT NULL` |
| `gender` | `text` | `NOT NULL` |
| `address` | `text` | `NOT NULL` |
| `photo_url` | `text` | Nullable |
| `created_at` | `timestamptz` | `NOT NULL`, default `now()` |
| `updated_at` | `timestamptz` | `NOT NULL`, default `now()`, updated on row update |

Indexes: unique index on `admission_number`, unique index on `email`, plus non-unique indexes on `name`, `course`, `year`, and `gender` (to support search/filter/sort).

### `activity_logs`

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | Primary key |
| `action` | `text` | `NOT NULL` (e.g. `create`, `update`, `delete`) |
| `entity_type` | `text` | `NOT NULL` (e.g. `student`) |
| `entity_id` | `integer` | Nullable, references the affected record's id (no DB-level foreign key) |
| `description` | `text` | `NOT NULL` |
| `created_at` | `timestamptz` | `NOT NULL`, default `now()` |

Index: on `created_at` (supports the recent-activity feed ordering).

There are no foreign key constraints between the two tables — `activity_logs.entity_id` is a loose reference kept only for display purposes so that log entries persist even after a student record is deleted.

### CREATE TABLE statements

```sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    admission_number TEXT NOT NULL,
    name TEXT NOT NULL,
    course TEXT NOT NULL,
    year INTEGER NOT NULL,
    date_of_birth DATE NOT NULL,
    email TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    gender TEXT NOT NULL,
    address TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX students_admission_number_idx ON students (admission_number);
CREATE UNIQUE INDEX students_email_idx ON students (email);
CREATE INDEX students_name_idx ON students (name);
CREATE INDEX students_course_idx ON students (course);
CREATE INDEX students_year_idx ON students (year);
CREATE INDEX students_gender_idx ON students (gender);

CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX activity_logs_created_at_idx ON activity_logs (created_at);
```

### Applying the schema

The schema is managed with Drizzle Kit rather than hand-written SQL migrations:

```bash
pnpm --filter @workspace/db run push
```

This pushes the schema defined in `lib/db/src/schema/` directly to the database referenced by `DATABASE_URL` (development-oriented workflow; no migration files are checked in).

## Running the Application

The API server and frontend are separate services and are started independently.

```bash
# Backend (builds then runs the Express API)
pnpm --filter @workspace/api-server run dev

# Frontend (Vite dev server)
pnpm --filter @workspace/student-management run dev
```

Other useful root-level commands:

```bash
pnpm run typecheck   # typecheck all workspace packages
pnpm run build       # typecheck + build all packages
```

And per-package codegen (run after editing `lib/api-spec/openapi.yaml`):

```bash
pnpm --filter @workspace/api-spec run codegen
```

## API Overview

All routes are mounted under the `/api` prefix. Full machine-readable contract lives in `lib/api-spec/openapi.yaml`.

### Health

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/healthz` | Health check; returns `{ status: "ok" }` |

### Students

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/students` | List students with optional `search`, `course`, `year`, `gender` filters, `sortBy`/`sortOrder`, and `page`/`pageSize` pagination |
| POST | `/api/students` | Create a new student; auto-generates the admission number and records an activity log entry |
| GET | `/api/students/:id` | Fetch a single student by id |
| PUT | `/api/students/:id` | Update an existing student (partial update); records an activity log entry |
| DELETE | `/api/students/:id` | Drop (delete) a student; records an activity log entry |
| GET | `/api/students/analytics/summary` | Aggregate counts: total students, and breakdowns by course, year, and gender |
| POST | `/api/students/upload-photo` | Upload a student photo (multipart/form-data, field name `photo`); returns `{ photoUrl }`. Not part of the OpenAPI spec — a hand-written route consumed directly via `fetch` on the frontend. |

### Activity

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/activity-logs` | List recent activity log entries, paginated |

### Static files

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/uploads/:filename` | Serves uploaded student photos from disk |

## Folder Structure

```
.
├── artifacts/
│   ├── api-server/                  # Express backend
│   │   ├── src/
│   │   │   ├── app.ts               # Express app: middleware, static uploads, router mount, error handler
│   │   │   ├── index.ts             # Entry point: reads PORT, starts the HTTP server
│   │   │   ├── routes/              # health.ts, students.ts, activityLogs.ts, index.ts (router aggregation)
│   │   │   └── lib/                 # uploads.ts (multer config), activityLog.ts, logger.ts
│   │   └── uploads/                 # Uploaded photo files (created at runtime, outside dist/)
│   ├── student-management/          # React frontend
│   │   └── src/
│   │       ├── pages/                # Dashboard.tsx, StudentsList.tsx, StudentFormPage.tsx, not-found.tsx
│   │       ├── components/           # layout/ (app shell/nav) and ui/ (shadcn components)
│   │       ├── hooks/                # use-photo-upload.ts, use-debounce.ts, use-toast.ts
│   │       └── lib/                  # schemas.ts (frontend Zod schemas), utils.ts
│   └── mockup-sandbox/              # Design/preview sandbox artifact (not part of the product)
├── lib/
│   ├── db/                          # Drizzle schema, connection, and drizzle-kit config
│   │   └── src/schema/               # students.ts, activityLogs.ts, index.ts
│   ├── api-spec/                    # openapi.yaml (source of truth for the REST contract) + Orval config
│   ├── api-zod/                     # Generated Zod request/response schemas (from openapi.yaml)
│   └── api-client-react/            # Generated React Query hooks + TypeScript types (from openapi.yaml)
├── scripts/                          # Misc workspace scripts (e.g. post-merge setup)
├── pnpm-workspace.yaml               # Workspace package globs + shared dependency catalog
├── package.json                      # Root scripts (typecheck, build) and pnpm-only install guard
└── replit.md                         # Project notes: architecture decisions, gotchas, user preferences
```

## Deployment

This project is deployed via Replit's autoscale deployment target (`[deployment]` block in `.replit`, `deploymentTarget = "autoscale"`, `router = "application"`). Each service (API server, frontend) is defined as a separate artifact with its own build/run configuration:

- **API server:** built with `pnpm --filter @workspace/api-server run build` (esbuild → `dist/index.mjs`), then run in production with `node --enable-source-maps artifacts/api-server/dist/index.mjs`. Production health check: `GET /api/healthz`.
- **Frontend:** built with `pnpm --filter @workspace/student-management run build` (Vite → `dist/public`), then served as static files with client-side routing rewrites (`/* → /index.html`).

To deploy, use Replit's Deploy/Publish action from the workspace, which builds and promotes both services to their production environment. If deploying outside Replit, provision a PostgreSQL database, set `DATABASE_URL`, run `pnpm --filter @workspace/db run push` to create the schema, build both services with `pnpm run build`, then run the API server and serve the frontend's static build behind a reverse proxy that routes `/api/*` to the API server and everything else to the frontend's static files.

## Troubleshooting

- **`DATABASE_URL must be set. Did you forget to provision a database?`** — The API server and Drizzle config both require `DATABASE_URL`. Ensure a PostgreSQL database is provisioned and the connection string is exported before starting the server or running `pnpm --filter @workspace/db run push`.
- **`PORT environment variable is required but was not provided.`** — Both the API server and the Vite dev server read `PORT` from the environment and refuse to start without it. Export `PORT` explicitly when running a service outside of Replit's managed workflows.
- **`BASE_PATH environment variable is required but was not provided.`** (frontend only) — The Vite config requires `BASE_PATH` to compute the app's base URL/asset paths. Set it to `/` for a root-mounted deployment.
- **"Use pnpm instead" error on install** — The root `package.json` has a `preinstall` script that blocks `npm install`/`yarn install`. Always use `pnpm install`.
- **Gender field on Edit Student appears blank even though the record has a gender saved** — This was a known Radix `Select` display quirk when the form is populated asynchronously; it has been fixed in this codebase by keying the `Select` on its bound value. If you see it recur after further changes, ensure the `Select` component still has a `key` prop tied to the field's current value.
- **Photo upload fails with "Only JPEG, PNG, WEBP, or GIF images are allowed" or a 400 for large files** — The upload endpoint only accepts those MIME types and enforces a 5MB size limit; convert or resize the image before uploading.
- **"A student with this email already exists"** — The `email` column has a uniqueness constraint; each student must have a distinct email address.

## License

MIT
