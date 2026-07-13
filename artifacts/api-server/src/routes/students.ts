import { Router, type IRouter } from "express";
import { and, asc, desc, count, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, studentsTable } from "@workspace/db";
import {
  CreateStudentBody,
  UpdateStudentBody,
  ListStudentsQueryParams,
} from "@workspace/api-zod";
import { uploadPhoto } from "../lib/uploads";
import { recordActivity } from "../lib/activityLog";

const router: IRouter = Router();

// The generated Zod schemas coerce OpenAPI `format: date` fields into JS
// `Date` objects, but the Drizzle column is stored as a plain "YYYY-MM-DD"
// string -- normalize before writing.
function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const SORTABLE_COLUMNS = {
  name: studentsTable.name,
  admissionNumber: studentsTable.admissionNumber,
  course: studentsTable.course,
  year: studentsTable.year,
  createdAt: studentsTable.createdAt,
} as const;

router.get("/students", async (req, res) => {
  const parsed = ListStudentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { search, course, year, gender, page, pageSize, sortBy, sortOrder } =
    parsed.data;

  const filters: SQL[] = [];
  if (search) {
    const like = `%${search}%`;
    filters.push(
      or(
        ilike(studentsTable.name, like),
        ilike(studentsTable.email, like),
        ilike(studentsTable.admissionNumber, like),
      )!,
    );
  }
  if (course) filters.push(eq(studentsTable.course, course));
  if (year !== undefined) filters.push(eq(studentsTable.year, year));
  if (gender) filters.push(eq(studentsTable.gender, gender));

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const sortColumn = sortBy ? SORTABLE_COLUMNS[sortBy] : studentsTable.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(studentsTable)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(studentsTable).where(whereClause),
  ]);

  res.json({
    data: rows,
    total: totalResult[0]?.value ?? 0,
    page,
    pageSize,
  });
});

router.get("/students/analytics/summary", async (_req, res) => {
  const [totalResult, byCourse, byYear, byGender] = await Promise.all([
    db.select({ value: count() }).from(studentsTable),
    db
      .select({ label: studentsTable.course, count: count() })
      .from(studentsTable)
      .groupBy(studentsTable.course)
      .orderBy(desc(count())),
    db
      .select({ label: sql<string>`${studentsTable.year}::text`, count: count() })
      .from(studentsTable)
      .groupBy(studentsTable.year)
      .orderBy(studentsTable.year),
    db
      .select({ label: studentsTable.gender, count: count() })
      .from(studentsTable)
      .groupBy(studentsTable.gender)
      .orderBy(desc(count())),
  ]);

  res.json({
    totalStudents: totalResult[0]?.value ?? 0,
    byCourse,
    byYear,
    byGender,
  });
});

router.get("/students/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid student id" });
    return;
  }
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(student);
});

router.post("/students", async (req, res) => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid student data" });
    return;
  }
  const input = parsed.data;

  const [existingEmail] = await db
    .select({ id: studentsTable.id })
    .from(studentsTable)
    .where(eq(studentsTable.email, input.email));
  if (existingEmail) {
    res.status(400).json({ error: "A student with this email already exists" });
    return;
  }

  try {
    const student = await db.transaction(async (tx) => {
      // Insert with a temporary unique placeholder to satisfy the NOT NULL +
      // UNIQUE constraint, then patch in the real admission number derived
      // from the row's own id once we know it.
      const placeholder = `PENDING-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const [inserted] = await tx
        .insert(studentsTable)
        .values({
          ...input,
          dateOfBirth: toDateOnlyString(input.dateOfBirth),
          admissionNumber: placeholder,
        })
        .returning();
      if (!inserted) throw new Error("Failed to insert student");

      const admissionNumber = `ADM${new Date().getFullYear()}${String(inserted.id).padStart(6, "0")}`;
      const [updated] = await tx
        .update(studentsTable)
        .set({ admissionNumber })
        .where(eq(studentsTable.id, inserted.id))
        .returning();
      if (!updated) throw new Error("Failed to finalize admission number");
      return updated;
    });

    await recordActivity(
      "create",
      "student",
      student.id,
      `Added student ${student.name} (${student.admissionNumber})`,
    );

    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ error: "Failed to create student" });
  }
});

router.put("/students/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid student id" });
    return;
  }

  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid student data" });
    return;
  }
  const input = parsed.data;

  const [existing] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  if (input.email && input.email !== existing.email) {
    const [existingEmail] = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.email, input.email));
    if (existingEmail) {
      res.status(400).json({ error: "A student with this email already exists" });
      return;
    }
  }

  const [updated] = await db
    .update(studentsTable)
    .set({
      ...input,
      dateOfBirth: input.dateOfBirth ? toDateOnlyString(input.dateOfBirth) : undefined,
    })
    .where(eq(studentsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  await recordActivity(
    "update",
    "student",
    updated.id,
    `Updated student ${updated.name} (${updated.admissionNumber})`,
  );

  res.json(updated);
});

router.delete("/students/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid student id" });
    return;
  }

  const [deleted] = await db
    .delete(studentsTable)
    .where(eq(studentsTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  await recordActivity(
    "delete",
    "student",
    id,
    `Dropped student ${deleted.name} (${deleted.admissionNumber})`,
  );

  res.status(204).send();
});

router.post("/students/upload-photo", uploadPhoto.single("photo"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No photo file provided" });
    return;
  }
  res.json({ photoUrl: `/api/uploads/${req.file.filename}` });
});

export default router;
