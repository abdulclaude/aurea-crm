import { z } from "zod";

const YEAR_IN_MINUTES = 366 * 24 * 60;

export const bookingWindowValuesSchema = z
  .object({
    opensMinutesBeforeStart: z.number().int().min(0).max(YEAR_IN_MINUTES),
    closesMinutesBeforeStart: z
      .number()
      .int()
      .min(-24 * 60)
      .max(YEAR_IN_MINUTES),
    cancellationsCloseMinutesBeforeStart: z
      .number()
      .int()
      .min(0)
      .max(YEAR_IN_MINUTES),
    blockClientCancellations: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.opensMinutesBeforeStart < values.closesMinutesBeforeStart) {
      context.addIssue({
        code: "custom",
        path: ["opensMinutesBeforeStart"],
        message: "Booking cannot close before it opens.",
      });
    }
  });

export const waitlistModes = [
  "DISABLED",
  "MANUAL",
  "OFFER_NEXT",
  "AUTO_BOOK",
] as const;
export const waitlistCreditHoldPolicies = ["NONE", "HOLD_ON_JOIN"] as const;
export const waitlistFailureFallbacks = [
  "OFFER_NEXT",
  "NOTIFY_ALL",
  "MANUAL_REVIEW",
] as const;

export const waitlistValuesSchema = z
  .object({
    mode: z.enum(waitlistModes),
    automationClosesMinutesBeforeStart: z
      .number()
      .int()
      .min(0)
      .max(YEAR_IN_MINUTES),
    maxEntries: z.number().int().min(1).max(10_000).nullable(),
    allowOverlappingReservations: z.boolean(),
    creditHoldPolicy: z.enum(waitlistCreditHoldPolicies),
    offerExpiryMinutes: z
      .number()
      .int()
      .min(1)
      .max(7 * 24 * 60)
      .nullable(),
    failureFallback: z.enum(waitlistFailureFallbacks),
  })
  .superRefine((values, context) => {
    if (values.mode === "DISABLED" && values.creditHoldPolicy !== "NONE") {
      context.addIssue({
        code: "custom",
        path: ["creditHoldPolicy"],
        message: "A disabled waitlist cannot hold credits.",
      });
    }
    if (values.mode === "DISABLED" && values.offerExpiryMinutes !== null) {
      context.addIssue({
        code: "custom",
        path: ["offerExpiryMinutes"],
        message: "A disabled waitlist cannot expire offers.",
      });
    }
    if (
      (values.mode === "OFFER_NEXT" ||
        values.failureFallback === "OFFER_NEXT") &&
      values.offerExpiryMinutes === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["offerExpiryMinutes"],
        message: "Offer-next behavior requires an offer expiry.",
      });
    }
  });

export function supportsWaitlistRuntime(
  values: z.infer<typeof waitlistValuesSchema>,
): boolean {
  return (
    values.mode !== "AUTO_BOOK" &&
    values.creditHoldPolicy === "NONE" &&
    values.failureFallback === "MANUAL_REVIEW"
  );
}

export const supportedWaitlistValuesSchema = waitlistValuesSchema.superRefine(
  (values, context) => {
    if (!supportsWaitlistRuntime(values)) {
      context.addIssue({
        code: "custom",
        message:
          "Auto-book, credit holds, and automated failure fallbacks are unavailable until their durable runtime is configured.",
      });
    }
  },
);

export const schedulingPolicyNameSchema = z.string().trim().min(1).max(120);
export const schedulingPolicyDescriptionSchema = z
  .string()
  .trim()
  .max(500)
  .nullable();
export const schedulingPolicyChangeNoteSchema = z
  .string()
  .trim()
  .max(240)
  .nullable();

export const schedulingPolicyScopeSchema = z.object({
  organizationId: z.string().min(1),
  locationId: z.string().min(1).nullable(),
});

export const createBookingWindowPolicySchema = z.object({
  name: schedulingPolicyNameSchema,
  description: schedulingPolicyDescriptionSchema.default(null),
  isDefault: z.boolean().default(false),
  effectiveFrom: z.coerce.date(),
  values: bookingWindowValuesSchema,
  changeNote: schedulingPolicyChangeNoteSchema.default(null),
});

export const createWaitlistPolicySchema = z.object({
  name: schedulingPolicyNameSchema,
  description: schedulingPolicyDescriptionSchema.default(null),
  isDefault: z.boolean().default(false),
  effectiveFrom: z.coerce.date(),
  values: supportedWaitlistValuesSchema,
  changeNote: schedulingPolicyChangeNoteSchema.default(null),
});

export const versionBookingWindowPolicySchema = z.object({
  policyId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  effectiveFrom: z.coerce.date(),
  values: bookingWindowValuesSchema,
  changeNote: schedulingPolicyChangeNoteSchema.default(null),
});

export const versionWaitlistPolicySchema = z.object({
  policyId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  effectiveFrom: z.coerce.date(),
  values: supportedWaitlistValuesSchema,
  changeNote: schedulingPolicyChangeNoteSchema.default(null),
});

export const assignSchedulingPoliciesSchema = z.object({
  serviceTypeId: z.string().min(1),
  bookingWindowPolicyId: z.string().min(1).nullable(),
  waitlistPolicyId: z.string().min(1).nullable(),
});

export const schedulingPolicyKinds = ["BOOKING_WINDOW", "WAITLIST"] as const;
export const schedulingPolicyKindSchema = z.enum(schedulingPolicyKinds);

export const schedulingPolicyReferenceSchema = z.object({
  kind: schedulingPolicyKindSchema,
  policyId: z.string().min(1),
});

export const schedulingPolicyHistorySchema = schedulingPolicyReferenceSchema;

export const archiveSchedulingPolicySchema = schedulingPolicyReferenceSchema;

export const setSchedulingPolicyDefaultSchema =
  schedulingPolicyReferenceSchema.extend({
    isDefault: z.boolean(),
  });

export const rollbackSchedulingPolicySchema =
  schedulingPolicyReferenceSchema.extend({
    targetVersion: z.number().int().positive(),
    expectedVersion: z.number().int().positive(),
    effectiveFrom: z.coerce.date(),
    changeNote: schedulingPolicyChangeNoteSchema.default(null),
  });

export const previewSchedulingPoliciesSchema = z.object({
  serviceTypeId: z.string().min(1).nullable().default(null),
  bookingWindowPolicyOverrideId: z.string().min(1).nullable().default(null),
  waitlistPolicyOverrideId: z.string().min(1).nullable().default(null),
  startsAt: z.coerce.date(),
});

export type BookingWindowValues = z.infer<typeof bookingWindowValuesSchema>;
export type WaitlistValues = z.infer<typeof waitlistValuesSchema>;
export type WaitlistMode = (typeof waitlistModes)[number];
export type SchedulingPolicyKind = (typeof schedulingPolicyKinds)[number];

export type BookingWindowPolicyVersionView = {
  id: string;
  policyId: string;
  version: number;
  schemaVersion: number;
  values: BookingWindowValues;
  effectiveFrom: Date;
  rollbackFromVersion: number | null;
  changeNote: string | null;
  createdBy: string | null;
  createdAt: Date;
};

export type WaitlistPolicyVersionView = {
  id: string;
  policyId: string;
  version: number;
  schemaVersion: number;
  values: WaitlistValues;
  effectiveFrom: Date;
  rollbackFromVersion: number | null;
  changeNote: string | null;
  createdBy: string | null;
  createdAt: Date;
};

type SchedulingPolicyDefinitionView<
  TKind extends SchedulingPolicyKind,
  TVersion,
> = {
  id: string;
  organizationId: string;
  locationId: string | null;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  kind: TKind;
  currentVersion: TVersion | null;
};

export type BookingWindowPolicyView = SchedulingPolicyDefinitionView<
  "BOOKING_WINDOW",
  BookingWindowPolicyVersionView
>;
export type WaitlistPolicyView = SchedulingPolicyDefinitionView<
  "WAITLIST",
  WaitlistPolicyVersionView
>;

export type SchedulingPolicyServiceView = {
  id: string;
  name: string;
  isActive: boolean;
  bookingWindowPolicyId: string | null;
  waitlistPolicyId: string | null;
};

export type SchedulingPolicyListView = {
  scope: { organizationId: string; locationId: string | null };
  bookingWindows: BookingWindowPolicyView[];
  waitlists: WaitlistPolicyView[];
  services: SchedulingPolicyServiceView[];
};

export type SchedulingPolicyHistoryView = Array<
  BookingWindowPolicyVersionView | WaitlistPolicyVersionView
>;
