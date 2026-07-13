---
name: Orval/zod codegen pitfalls in this workspace
description: Non-obvious OpenAPI-to-TS codegen failures encountered with the pinned Orval + zod v3.25.76 toolchain used by @workspace/api-spec, and the Drizzle date-column mismatch that follows from one of them.
---

## format: email breaks codegen
Orval generates `zod.email()`-style method calls for `format: email` string schemas, which don't exist on the pinned zod v3.25.76 (that API landed in later zod versions). Fix: don't use `format: email` in the OpenAPI spec; use a plain `type: string` with reasonable `minLength`/`maxLength` bounds instead, and validate email format client-side/manually if needed.

## Multipart file-upload bodies break codegen
An OpenAPI path with a `multipart/form-data` request body (file upload) causes Orval to generate a `TS2308` duplicate-export collision on the body type name, plus references to the `File`/`Blob` DOM globals that don't exist in the `api-zod` package's tsconfig (no `dom` lib). Fix: don't model file-upload endpoints in the OpenAPI spec at all. Implement them as a plain, undocumented Express route (e.g. multer single-file field) returning a small JSON body (`{ photoUrl }`), and call it directly via `fetch` from the frontend instead of a generated hook.

## format: date coerces to JS Date, but Drizzle date columns are strings
Orval turns an OpenAPI `format: date` string schema into `zod.coerce.date()` in the generated Zod schema, so the parsed value becomes a JS `Date` object. Drizzle's `date` column (string mode) expects a `"YYYY-MM-DD"` string for insert/update. Any route that inserts/updates a date-typed column from generated input must explicitly convert the `Date` back to a date-only string before passing it to Drizzle — remember to apply this on **both** the create and update code paths (it's easy to fix only one and have typecheck miss the other if the field is optional on update).
