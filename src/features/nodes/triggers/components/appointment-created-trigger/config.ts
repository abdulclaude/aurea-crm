import { z } from "zod";

export const appointmentCreatedTriggerConfigSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required.")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
  firstAppointmentOnly: z.boolean(),
});

export type AppointmentCreatedTriggerFormValues = z.infer<
  typeof appointmentCreatedTriggerConfigSchema
>;

export function matchesAppointmentCreatedTrigger(
  data: unknown,
  appointmentCount: number,
): boolean {
  const parsed = appointmentCreatedTriggerConfigSchema.partial().safeParse(data);
  if (!parsed.success || !parsed.data.firstAppointmentOnly) return true;
  return appointmentCount === 1;
}
