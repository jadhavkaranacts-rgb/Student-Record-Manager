# Student Management System

A back-office web app for school registrars to manage student records: add, edit, list, and drop students, with photo uploads, admission-number auto-generation, search/filter/pagination, and enrollment analytics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000; proxied at `/api`)
- `pnpm --filter @workspace/student-management run dev` — run the frontend (proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (run after editing `lib/api-spec/openapi.yaml`)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (already provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, multer (photo uploads to local disk)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4` on frontend schemas, pinned zod v3.25.76 for generated api-zod package), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → `@workspace/api-client-react` (React Query hooks)
- Frontend: React + Vite, shadcn/ui, react-hook-form
- Build: esbuild (CJS/ESM bundle for API server)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for the students/activity-logs/analytics REST contract (photo upload is intentionally NOT in this spec — see Gotchas)
- `lib/db/src/schema/students.ts`, `lib/db/src/schema/activityLogs.ts` — Drizzle schema (source of truth for DB structure)
- `artifacts/api-server/src/routes/students.ts` — CRUD + analytics + photo upload endpoint
- `artifacts/api-server/src/routes/activityLogs.ts` — activity log listing
- `artifacts/api-server/uploads/` — uploaded student photos (served at `/api/uploads/<filename>`), lives outside `dist/` so it survives rebuilds
- `artifacts/student-management/src/pages/` — Dashboard, StudentsList, StudentFormPage (create/edit)

## Architecture decisions

- Photo upload is a plain, non-OpenAPI-documented Express route (`POST /api/students/upload-photo`, multer, field name `photo`, 5MB limit, jpeg/png/webp/gif) returning `{ photoUrl }`. It was deliberately kept out of the OpenAPI spec — see Gotchas for why — and the frontend calls it directly via `fetch`, not a generated hook.
- Admission numbers are generated inside the same DB transaction as the insert: a temporary placeholder is inserted first, then updated to `ADM<year><6-digit padded id>` once the row's `id` is known.
- `dateOfBirth` is stored as a Drizzle string-mode `date` column but Orval's generated Zod schema coerces `format: date` to a JS `Date` — the students route explicitly converts back to a `"YYYY-MM-DD"` string before insert/update.

## Product

- **Dashboard** (`/`) — total students, top course, largest year, gender split, course distribution chart, recent activity feed.
- **Students** (`/students`) — searchable, filterable (course/year/gender), paginated table of all students with edit/drop actions.
- **Add/Edit Student** (`/students/new`, `/students/:id`) — form for personal details, academic enrollment, and photo upload; drop (delete) with confirmation.
- Every create/update/delete is recorded to an activity log surfaced on the dashboard.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do not add `format: email` or a `multipart/form-data` request body to `lib/api-spec/openapi.yaml` — both break Orval codegen against the pinned zod v3.25.76 (see `.agents/memory/orval-zod-codegen-pitfalls.md`). Use plain bounded strings for emails, and keep file uploads as a hand-written route outside the spec.
- A shadcn `Select` bound to react-hook-form via `Controller` can show its placeholder even when `field.value` is correct, if the value is populated asynchronously (e.g. an edit form after `form.reset()` on fetch). Fix: add `key={field.value || "unset"}` to the `Select`. See `.agents/memory/radix-select-async-reset.md`.
- Always run `pnpm --filter @workspace/api-server run typecheck` after touching `students.ts` — the create and update paths both need the `dateOfBirth` Date→string conversion; it's easy to fix only one.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
