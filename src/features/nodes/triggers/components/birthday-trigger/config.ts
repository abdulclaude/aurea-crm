import { z } from "zod";

export const birthdayTriggerConfigSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required.")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
  daysBefore: z.number().int().min(0).max(365),
});

export type BirthdayTriggerFormValues = z.infer<
  typeof birthdayTriggerConfigSchema
>;
