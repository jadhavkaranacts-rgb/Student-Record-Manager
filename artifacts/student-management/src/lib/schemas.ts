import { z } from "zod";
import { Gender } from "@workspace/api-client-react";

export const studentSchema = z.object({
  name: z.string().min(1, "Name is required").max(150, "Name is too long"),
  course: z.string().min(1, "Course is required").max(100, "Course is too long"),
  year: z.coerce.number().min(1, "Year must be at least 1").max(8, "Year cannot exceed 8"),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date < new Date();
  }, "Date of birth must be a valid date in the past"),
  email: z.string().email("Invalid email address").min(3).max(150),
  mobileNumber: z.string().min(7, "Mobile number too short").max(20, "Mobile number too long"),
  gender: z.nativeEnum(Gender, { errorMap: () => ({ message: "Please select a valid gender" }) }),
  address: z.string().min(1, "Address is required").max(500, "Address is too long"),
  photoUrl: z.string().nullable().optional(),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
