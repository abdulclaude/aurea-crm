import { z } from "zod";

export const createTaskFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  dueAmount: z.number().int().positive().max(3650),
  dueUnit: z.enum(["MINUTES", "HOURS", "DAYS"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  clientId: z.string().optional(),
  assigneeId: z.string().optional(),
  variableName: z
    .string()
    .min(1, "Variable name is required.")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Use letters, numbers, underscores, or dollar signs.",
    }),
});

export type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;
