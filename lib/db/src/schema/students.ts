import {
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentsTable = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    // Auto-generated, unique admission number (e.g. ADM2026000001). Assigned
    // by the server after insert using the row's own id — see
    // artifacts/api-server/src/routes/students.ts.
    admissionNumber: text("admission_number").notNull(),
    name: text("name").notNull(),
    course: text("course").notNull(),
    year: integer("year").notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    email: text("email").notNull(),
    mobileNumber: text("mobile_number").notNull(),
    gender: text("gender").notNull(),
    address: text("address").notNull(),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("students_admission_number_idx").on(table.admissionNumber),
    uniqueIndex("students_email_idx").on(table.email),
    index("students_name_idx").on(table.name),
    index("students_course_idx").on(table.course),
    index("students_year_idx").on(table.year),
    index("students_gender_idx").on(table.gender),
  ],
);

export const insertStudentSchema = createInsertSchema(studentsTable).omit({
  id: true,
  admissionNumber: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
