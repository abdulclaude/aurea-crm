import { z } from "zod";

export const addWaiverSchema = z.object({
  name: z.string().trim().min(1, "Waiver name is required").max(200),
  content: z.string().trim().min(1, "Waiver content is required"),
  document: z
    .custom<File>(
      (value) => typeof File !== "undefined" && value instanceof File,
      { message: "Waiver PDF is required" },
    )
    .refine((file) => file.type === "application/pdf", "Only PDF files are supported")
    .refine(
      (file) => file.size <= 16 * 1024 * 1024,
      "PDF must be 16 MB or smaller",
    ),
  isRequired: z.boolean(),
  requiresMinor: z.boolean(),
});

export type AddWaiverValues = z.infer<typeof addWaiverSchema>;
