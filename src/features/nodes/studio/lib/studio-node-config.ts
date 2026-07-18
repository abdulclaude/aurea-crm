import { z } from "zod";

const variableNameSchema = z
  .string()
  .min(1, "Variable name is required")
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
    message:
      "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
  });

const optionalTextSchema = z.string().trim().optional();

export const memberClassCountTriggerConfigSchema = z.object({
  variableName: variableNameSchema,
  targetCount: z
    .number()
    .int("Class count must be a whole number")
    .positive("Class count must be greater than zero"),
});

export type MemberClassCountTriggerConfig = z.infer<
  typeof memberClassCountTriggerConfigSchema
>;

export const clientTagTriggerConfigSchema = z.object({
  variableName: variableNameSchema,
  tag: optionalTextSchema,
});

export type ClientTagTriggerConfig = z.infer<
  typeof clientTagTriggerConfigSchema
>;

export const classBookedTriggerConfigSchema = z.object({
  variableName: variableNameSchema,
  triggerTiming: z.enum(["BOOKED", "ONE_HOUR_BEFORE"]).optional(),
  serviceTypeIds: z.array(z.string().trim().min(1)).optional(),
  serviceTypeNames: z.array(z.string().trim().min(1)).optional(),
  classSeriesIds: z.array(z.string().trim().min(1)).optional(),
  classSeriesNames: z.array(z.string().trim().min(1)).optional(),
  classId: optionalTextSchema,
  className: optionalTextSchema,
  firstBookingOnly: z.boolean().optional(),
});

export type ClassBookedTriggerConfig = z.infer<
  typeof classBookedTriggerConfigSchema
>;

export const memberCheckedInTriggerConfigSchema = z.object({
  variableName: variableNameSchema,
  firstCheckInOnly: z.boolean(),
});

export type MemberCheckedInTriggerConfig = z.infer<
  typeof memberCheckedInTriggerConfigSchema
>;

export const membershipExpiringTriggerConfigSchema = z.object({
  variableName: variableNameSchema,
  daysBefore: z.number().int().min(0).max(365),
  membershipKind: z.enum(["ANY", "SUBSCRIPTION", "PACKAGE"]),
});

export type MembershipExpiringTriggerConfig = z.infer<
  typeof membershipExpiringTriggerConfigSchema
>;

export const pricingOptionCreditTriggerConfigSchema = z.object({
  variableName: variableNameSchema,
  creditThreshold: z.number().int().min(0).max(1000),
  pricingOptionIds: z.array(z.string().trim().min(1)),
  pricingOptionNames: z.array(z.string().trim().min(1)).optional(),
});

export type PricingOptionCreditTriggerConfig = z.infer<
  typeof pricingOptionCreditTriggerConfigSchema
>;

export const sendSmsConfigSchema = z
  .object({
    clientId: optionalTextSchema,
    to: optionalTextSchema,
    message: z.string().trim().min(1, "Message is required"),
    purpose: z.enum(["MARKETING", "ONE_TO_ONE"]).default("ONE_TO_ONE"),
  })
  .superRefine((value, context) => {
    if (!value.clientId && !value.to) {
      context.addIssue({
        code: "custom",
        message: "Choose a client or enter a phone number",
        path: ["clientId"],
      });
    }
  });

export type SendSmsConfig = z.infer<typeof sendSmsConfigSchema>;

type ClassBookedEvent = {
  classId: string;
  className: string;
  serviceTypeId: string | null;
  classSeriesId: string | null;
  bookingCount: number;
  triggerTiming?: "BOOKED" | "ONE_HOUR_BEFORE";
};

export function matchesClassBookedTrigger(
  data: unknown,
  event: ClassBookedEvent,
): boolean {
  const parsed = classBookedTriggerConfigSchema.partial().safeParse(data);
  if (!parsed.success) return true;

  const classId = parsed.data.classId?.trim();
  const className = parsed.data.className?.trim().toLocaleLowerCase();
  const serviceTypeIds = parsed.data.serviceTypeIds ?? [];
  const classSeriesIds = parsed.data.classSeriesIds ?? [];
  const configuredTiming = parsed.data.triggerTiming ?? "BOOKED";
  const eventTiming = event.triggerTiming ?? "BOOKED";

  if (configuredTiming !== eventTiming) return false;
  if (parsed.data.firstBookingOnly && event.bookingCount !== 1) return false;
  if (classId && classId !== event.classId) return false;
  if (
    serviceTypeIds.length > 0 &&
    (!event.serviceTypeId || !serviceTypeIds.includes(event.serviceTypeId))
  ) {
    return false;
  }
  if (
    classSeriesIds.length > 0 &&
    (!event.classSeriesId || !classSeriesIds.includes(event.classSeriesId))
  ) {
    return false;
  }
  if (className && className !== event.className.trim().toLocaleLowerCase()) {
    return false;
  }

  return true;
}

export function matchesMemberCheckedInTrigger(
  data: unknown,
  attendanceCount: number,
): boolean {
  const parsed = memberCheckedInTriggerConfigSchema.partial().safeParse(data);
  if (!parsed.success || !parsed.data.firstCheckInOnly) return true;
  return attendanceCount === 1;
}
