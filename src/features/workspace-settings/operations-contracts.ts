import { z } from "zod";

export const workspaceDays = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const guestRequiredFields = ["EMAIL"] as const;
export const workspaceScheduleSlotMinutes = [5, 10, 15, 20, 30, 60] as const;

const scheduleSlotMinutesSchema = z.union(
  workspaceScheduleSlotMinutes.map((value) => z.literal(value)),
);

const businessHoursIntervalSchema = z
  .object({
    opensAtMinutes: z.number().int().min(0).max(1439),
    closesAtMinutes: z.number().int().min(1).max(1440),
  })
  .refine((value) => value.opensAtMinutes < value.closesAtMinutes, {
    message: "Closing time must be after opening time.",
  });

const dayBusinessHoursSchema = z
  .array(businessHoursIntervalSchema)
  .max(3)
  .superRefine((intervals, ctx) => {
    const ordered = [...intervals].sort(
      (left, right) => left.opensAtMinutes - right.opensAtMinutes,
    );
    ordered.forEach((interval, index) => {
      const previous = ordered[index - 1];
      if (previous && interval.opensAtMinutes < previous.closesAtMinutes) {
        ctx.addIssue({
          code: "custom",
          message: "Business-hour intervals cannot overlap.",
        });
      }
    });
  });

export const workspaceBusinessHoursSchema = z.object(
  Object.fromEntries(
    workspaceDays.map((day) => [day, dayBusinessHoursSchema]),
  ) as Record<(typeof workspaceDays)[number], typeof dayBusinessHoursSchema>,
);

const operationsShape = {
  businessHours: workspaceBusinessHoursSchema.nullable(),
  scheduleStartMinutes: z.number().int().min(0).max(1439).nullable(),
  scheduleEndMinutes: z.number().int().min(1).max(1440).nullable(),
  scheduleSlotMinutes: scheduleSlotMinutesSchema.nullable(),
  guestBookingEnabled: z.boolean().nullable(),
  maxGuestsPerBooking: z.number().int().min(0).max(20).nullable(),
  guestRequiredFields: z
    .array(z.enum(guestRequiredFields))
    .max(3)
    .transform((fields) => Array.from(new Set(fields)))
    .nullable(),
  showPublicEmail: z.boolean().nullable(),
  showPublicPhone: z.boolean().nullable(),
  showPublicWebsite: z.boolean().nullable(),
  showPublicAddress: z.boolean().nullable(),
};

export const workspaceOperationsValuesSchema = z
  .object(operationsShape)
  .superRefine((values, ctx) => {
    if (
      values.scheduleStartMinutes !== null &&
      values.scheduleEndMinutes !== null &&
      values.scheduleStartMinutes >= values.scheduleEndMinutes
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduleEndMinutes"],
        message: "Schedule end must be after schedule start.",
      });
    }
  });

export const requiredWorkspaceOperationsValuesSchema = z
  .object({
    businessHours: workspaceBusinessHoursSchema,
    scheduleStartMinutes: z.number().int().min(0).max(1439),
    scheduleEndMinutes: z.number().int().min(1).max(1440),
    scheduleSlotMinutes: scheduleSlotMinutesSchema,
    guestBookingEnabled: z.boolean(),
    maxGuestsPerBooking: z.number().int().min(0).max(20),
    guestRequiredFields: z
      .array(z.enum(guestRequiredFields))
      .max(3)
      .transform((fields) => Array.from(new Set(fields))),
    showPublicEmail: z.boolean(),
    showPublicPhone: z.boolean(),
    showPublicWebsite: z.boolean(),
    showPublicAddress: z.boolean(),
  })
  .refine(
    (values) => values.scheduleStartMinutes < values.scheduleEndMinutes,
    {
      path: ["scheduleEndMinutes"],
      message: "Schedule end must be after schedule start.",
    },
  );

export const saveWorkspaceOperationsSettingsSchema = z.object({
  values: workspaceOperationsValuesSchema,
  expectedVersion: z.number().int().positive().nullable(),
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export const rollbackWorkspaceOperationsSettingsSchema = z.object({
  targetVersion: z.number().int().positive(),
  expectedVersion: z.number().int().positive().nullable(),
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export type WorkspaceBusinessHours = z.infer<
  typeof workspaceBusinessHoursSchema
>;
export type WorkspaceOperationsValues = z.infer<
  typeof workspaceOperationsValuesSchema
>;
export type RequiredWorkspaceOperationsValues = z.infer<
  typeof requiredWorkspaceOperationsValuesSchema
>;
