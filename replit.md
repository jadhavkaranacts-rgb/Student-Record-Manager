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
- API: Express 5
- File storage: Replit Object Storage (GCS-backed) for student photos, via presigned URL uploads
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4` on frontend schemas, pinned zod v3.25.76 for generated api-zod package), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → `@workspace/api-client-react` (React Query hooks)
- Frontend: React + Vite, shadcn/ui, react-hook-form
- Build: esbuild (CJS/ESM bundle for API server)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for the students/activity-logs/analytics/storage REST contract
- `lib/db/src/schema/students.ts`, `lib/db/src/schema/activityLogs.ts` — Drizzle schema (source of truth for DB structure)
- `artifacts/api-server/src/routes/students.ts` — CRUD + analytics endpoints
- `artifacts/api-server/src/routes/activityLogs.ts` — activity log listing
- `artifacts/api-server/src/routes/storage.ts` — presigned upload URL + object serving (student photos)
- `artifacts/api-server/src/lib/objectStorage.ts`, `objectAcl.ts` — Object Storage client wrapper and ACL framework (do not modify GCS client setup)
- `lib/object-storage-web/` — shared `useUpload` hook / `ObjectUploader` component for browser uploads
- `artifacts/student-management/src/hooks/use-photo-upload.ts` — wraps `useUpload`, validates size/type, returns the objectPath to store on the student record
- `artifacts/student-management/src/pages/` — Dashboard, StudentsList, StudentFormPage (create/edit)

## Architecture decisions

- Photo upload uses Replit Object Storage via a two-step presigned-URL flow: `POST /api/storage/uploads/request-url` (JSON metadata) returns a presigned GCS URL and an `objectPath` (e.g. `/objects/uploads/<uuid>`); the browser then `PUT`s the file bytes directly to GCS. The `objectPath` is what's stored as `student.photoUrl`; it's resolved to a servable URL as `` `/api/storage${photoUrl}` `` (see `getPhotoSrc` in `lib/utils.ts`). This replaced an earlier local-disk/multer implementation because autoscale deployments get a fresh disk on every redeploy — uploaded photos were silently lost after the next deploy. There is no user auth in this app, so the upload/serve routes are intentionally left unprotected (internal admin tool, not public UGC) — do not add multer or local disk storage back for this feature.
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

- Do not add `format: email`, `format: uri`, or a `multipart/form-data` request body to `lib/api-spec/openapi.yaml` — all break Orval codegen against the pinned zod v3.25.76 (see `.agents/memory/orval-zod-codegen-pitfalls.md`). Use plain bounded strings instead (e.g. the presigned `uploadURL` field is `type: string`, not `format: uri`).
- A shadcn `Select` bound to react-hook-form via `Controller` can show its placeholder even when `field.value` is correct, if the value is populated asynchronously (e.g. an edit form after `form.reset()` on fetch). Fix: add `key={field.value || "unset"}` to the `Select`. See `.agents/memory/radix-select-async-reset.md`.
- Always run `pnpm --filter @workspace/api-server run typecheck` after touching `students.ts` — the create and update paths both need the `dateOfBirth` Date→string conversion; it's easy to fix only one.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
