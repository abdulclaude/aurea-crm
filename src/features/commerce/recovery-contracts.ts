import { z } from "zod";

export const recoveryTargets = ["INVOICE", "MEMBERSHIP", "BOOKING"] as const;
export const recoveryCaseStatuses = [
  "OPEN",
  "IN_PROGRESS",
  "RECOVERED",
  "EXHAUSTED",
  "CANCELLED",
] as const;
export const recoveryActionTypes = [
  "SEND_EMAIL",
  "SEND_SMS",
  "GRACE_PERIOD_END",
  "ESCALATE",
  "EXPIRE_BOOKING",
  "RELEASE_BOOKING",
  "RETRY_PAYMENT",
  "CREATE_TASK",
  "DISPATCH_WORKFLOW",
] as const;

export const recoveryTargetSchema = z.enum(recoveryTargets);
export const recoveryCaseStatusSchema = z.enum(recoveryCaseStatuses);
export const recoveryActionTypeSchema = z.enum(recoveryActionTypes);

export const recoveryActionsByTarget = {
  INVOICE: [
    "SEND_EMAIL",
    "SEND_SMS",
    "ESCALATE",
    "RETRY_PAYMENT",
    "CREATE_TASK",
  ],
  MEMBERSHIP: [
    "SEND_EMAIL",
    "SEND_SMS",
    "GRACE_PERIOD_END",
    "ESCALATE",
    "RETRY_PAYMENT",
    "CREATE_TASK",
    "DISPATCH_WORKFLOW",
  ],
  BOOKING: [
    "SEND_EMAIL",
    "SEND_SMS",
    "ESCALATE",
    "EXPIRE_BOOKING",
    "RELEASE_BOOKING",
    "RETRY_PAYMENT",
    "CREATE_TASK",
  ],
} satisfies Record<
  z.infer<typeof recoveryTargetSchema>,
  readonly z.infer<typeof recoveryActionTypeSchema>[]
>;

export const recoveryPolicyUpdateSchema = z
  .object({
    target: recoveryTargetSchema,
    mode: z.enum(["INHERIT", "ENABLED", "DISABLED"]),
    name: z.string().trim().min(1).max(100),
    gracePeriodDays: z.number().int().min(0).max(90),
    maxActions: z.number().int().min(1).max(20),
    scheduleDays: z.array(z.number().int().min(0).max(365)).max(20),
    steps: z.array(z.object({ type: recoveryActionTypeSchema })).max(20),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "ENABLED" && value.scheduleDays.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduleDays"],
        message: "Add at least one recovery step.",
      });
    }
    if (value.scheduleDays.length !== value.steps.length) {
      ctx.addIssue({
        code: "custom",
        path: ["steps"],
        message: "Each scheduled day must have one action.",
      });
    }
    if (value.scheduleDays.length > value.maxActions) {
      ctx.addIssue({
        code: "custom",
        path: ["maxActions"],
        message: "The action limit cannot be lower than the schedule length.",
      });
    }
    if (new Set(value.scheduleDays).size !== value.scheduleDays.length) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduleDays"],
        message: "Scheduled days must be unique.",
      });
    }
    value.steps.forEach((step, index) => {
      const supportedTypes: readonly string[] =
        recoveryActionsByTarget[value.target];
      if (!supportedTypes.includes(step.type)) {
        ctx.addIssue({
          code: "custom",
          path: ["steps", index, "type"],
          message:
            "This action is not supported for the selected recovery target.",
        });
      }
    });
  });

export const recoveryCaseListInputSchema = z.object({
  status: z.enum(["ACTIVE", "ALL", ...recoveryCaseStatuses]).default("ACTIVE"),
  target: recoveryTargetSchema.optional(),
  ownerUserId: z.string().min(1).optional(),
  unassignedOnly: z.boolean().default(false),
  search: z.string().trim().max(120).optional(),
  cursor: z
    .object({ openedAt: z.coerce.date(), id: z.string().min(1) })
    .optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

export const recoveryCaseIdSchema = z.object({ caseId: z.string().min(1) });

export const retryRecoveryActionSchema = recoveryCaseIdSchema.extend({
  actionId: z.string().min(1),
});

export const resendRecoverySchema = recoveryCaseIdSchema.extend({
  channel: z.enum(["EMAIL", "SMS"]),
});

export const reassignRecoverySchema = recoveryCaseIdSchema.extend({
  ownerUserId: z.string().min(1).nullable(),
});

export type RecoveryActionType = z.infer<typeof recoveryActionTypeSchema>;
export type RecoveryTarget = z.infer<typeof recoveryTargetSchema>;
