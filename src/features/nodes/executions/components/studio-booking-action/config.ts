import { z } from "zod";

export const studioBookingOperationSchema = z.enum([
  "CHECK_IN",
  "MARK_NO_SHOW",
  "JOIN_WAITLIST",
  "LEAVE_WAITLIST",
]);

export const studioBookingActionFormSchema = z.object({
  operation: studioBookingOperationSchema,
  classSource: z.enum(["SELECTED", "VARIABLE"]),
  classId: z.string().trim().min(1, "Choose a class or add a class variable."),
  className: z.string().trim().max(200).optional(),
  clientSource: z.enum(["SELECTED", "VARIABLE"]),
  clientId: z
    .string()
    .trim()
    .min(1, "Choose a member or add a member variable."),
  clientName: z.string().trim().max(200).optional(),
  variableName: z
    .string()
    .trim()
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, "Use a valid variable name."),
});

export type StudioBookingActionFormValues = z.infer<
  typeof studioBookingActionFormSchema
>;

export const STUDIO_BOOKING_OPERATION_LABELS = {
  CHECK_IN: "Check member in",
  MARK_NO_SHOW: "Mark member as a no-show",
  JOIN_WAITLIST: "Add member to waitlist",
  LEAVE_WAITLIST: "Remove member from waitlist",
} as const satisfies Record<
  z.infer<typeof studioBookingOperationSchema>,
  string
>;

export function studioBookingActionDefaults(
  values: Partial<StudioBookingActionFormValues> = {},
): StudioBookingActionFormValues {
  return {
    operation: values.operation ?? "CHECK_IN",
    classSource: values.classSource ?? "VARIABLE",
    classId: values.classId ?? "{{triggerData.classId}}",
    className: values.className,
    clientSource: values.clientSource ?? "VARIABLE",
    clientId: values.clientId ?? "{{triggerData.clientId}}",
    clientName: values.clientName,
    variableName: values.variableName ?? "studioAction",
  };
}
