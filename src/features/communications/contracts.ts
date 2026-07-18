import { z } from "zod";

export const COMMUNICATION_CHANNEL_STATES = [
  "NOT_REQUESTED",
  "AWAITING_CUSTOMER_INFORMATION",
  "AWAITING_COMPLIANCE",
  "AWAITING_DNS",
  "PROVISIONING",
  "ACTIVE",
  "DEGRADED",
  "SUSPENDED",
  "FAILED",
  "CANCELLATION_GRACE_PERIOD",
  "RELEASE_SCHEDULED",
  "RELEASED",
] as const;

export const communicationChannelStateSchema = z.enum(
  COMMUNICATION_CHANNEL_STATES,
);
export type CommunicationChannelState = z.infer<
  typeof communicationChannelStateSchema
>;

export const communicationChannelSchema = z.enum(["EMAIL", "SMS", "VOICE"]);
export type CommunicationChannel = z.infer<typeof communicationChannelSchema>;

export const communicationProfileUpdateSchema = z
  .object({
    fallbackEmailEnabled: z.boolean(),
    spendCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    smsMonthlySpendLimit: z.string().regex(/^\d+(?:\.\d{1,4})?$/).nullable(),
    voiceMonthlySpendLimit: z
      .string()
      .regex(/^\d+(?:\.\d{1,4})?$/)
      .nullable(),
    voiceMaxCallDurationSeconds: z.number().int().min(60).max(14_400).nullable(),
    numberReleaseGraceDays: z.number().int().min(0).max(365).nullable(),
    allowedSmsCountries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(250),
    allowedVoiceCountries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(250),
    voiceForwardingNumber: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/)
      .nullable(),
    voicemailEnabled: z.boolean(),
    recordingEnabled: z.boolean(),
    recordingRetentionDays: z.number().int().min(1).max(3_650).nullable(),
    recordingLegalAcknowledged: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.recordingEnabled && !value.recordingLegalAcknowledged) {
      ctx.addIssue({
        code: "custom",
        path: ["recordingLegalAcknowledged"],
        message: "Recording requires an explicit legal acknowledgement.",
      });
    }
    if (value.recordingEnabled && !value.recordingRetentionDays) {
      ctx.addIssue({
        code: "custom",
        path: ["recordingRetentionDays"],
        message: "Recording requires an explicit retention period.",
      });
    }
  });

export type CommunicationProfileUpdate = z.infer<
  typeof communicationProfileUpdateSchema
>;

export const resendDnsRecordSchema = z
  .object({
    record: z.string().optional(),
    type: z.string().min(1),
    name: z.string().min(1),
    value: z.string().min(1),
    status: z.string().optional(),
    priority: z.union([z.number().int(), z.string()]).optional(),
    ttl: z.union([z.number().int().positive(), z.string()]).optional(),
  })
  .passthrough();

export const resendDnsRecordsSchema = z.array(resendDnsRecordSchema).max(50);

export const twilioPhoneNumberStatusSchema = z.enum([
  "PENDING",
  "PROVISIONING",
  "ACTIVE",
  "DEGRADED",
  "SUSPENDED",
  "RELEASE_SCHEDULED",
  "RELEASING",
  "RELEASED",
  "FAILED",
]);

export type TwilioPhoneNumberStatus = z.infer<
  typeof twilioPhoneNumberStatusSchema
>;

export const twilioNumberCapabilitiesSchema = z.object({
  sms: z.boolean(),
  voice: z.boolean(),
}).refine((value) => value.sms || value.voice, {
  message: "Select at least one phone-number capability.",
});

export const twilioNumberSearchSchema = z.object({
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  numberType: z.enum(["local", "mobile", "tollFree"]),
  areaCode: z.string().trim().regex(/^\d{2,8}$/).optional(),
  contains: z.string().trim().regex(/^\d{2,12}$/).optional(),
  capabilities: twilioNumberCapabilitiesSchema,
  limit: z.number().int().min(1).max(20).default(10),
});

export const twilioNumberPurchaseSchema = z.object({
  quoteId: z.string().min(1),
  confirmPurchase: z.literal(true),
  idempotencyKey: z.string().trim().min(8).max(200),
});

export const outboundVoiceCallSchema = z.object({
  clientId: z.string().min(1),
  idempotencyKey: z.string().trim().min(8).max(200),
});

export const voiceForwardingVerificationSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

export const twilioComplianceRegistrationSchema = z.object({
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  channel: z.enum(["SMS", "VOICE", "BOTH"]),
  programType: z.string().trim().min(1).max(80),
  numberType: z.enum(["local", "mobile", "tollFree"]),
  addressSid: z.string().regex(/^AD[a-fA-F0-9]{32}$/).nullable(),
  bundleSid: z.string().regex(/^BU[a-fA-F0-9]{32}$/).nullable(),
  identitySid: z.string().regex(/^RI[a-fA-F0-9]{32}$/).nullable(),
  messagingServiceSid: z.string().regex(/^MG[a-fA-F0-9]{32}$/).nullable(),
  campaignSid: z.string().trim().min(1).max(80).nullable(),
});

export const communicationProvisioningSafeInputSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({
      kind: z.literal("RESEND_DOMAIN_CREATE"),
      domain: z.string().trim().toLowerCase().min(3).max(253),
    }),
    z.object({
      kind: z.literal("RESEND_DOMAIN_REFRESH"),
      emailDomainId: z.string().min(1),
    }),
    z.object({
      kind: z.literal("RESEND_DOMAIN_VERIFY"),
      emailDomainId: z.string().min(1),
    }),
    z.object({
      kind: z.literal("RESEND_DOMAIN_DELETE"),
      emailDomainId: z.string().min(1),
    }),
    z.object({
      kind: z.literal("TWILIO_SUBACCOUNT_CREATE"),
      friendlyName: z.string().trim().min(1).max(64),
    }),
    z.object({
      kind: z.literal("TWILIO_NUMBER_PURCHASE"),
      quoteId: z.string().min(1),
    }),
    z.object({
      kind: z.literal("TWILIO_NUMBER_RELEASE"),
      phoneNumberId: z.string().min(1),
    }),
    z.object({
      kind: z.literal("TWILIO_COMPLIANCE_VERIFY"),
      registrationId: z.string().min(1),
    }),
  ],
);

const LEGAL_CHANNEL_TRANSITIONS: Record<
  CommunicationChannelState,
  readonly CommunicationChannelState[]
> = {
  NOT_REQUESTED: [
    "AWAITING_CUSTOMER_INFORMATION",
    "AWAITING_COMPLIANCE",
    "AWAITING_DNS",
    "PROVISIONING",
  ],
  AWAITING_CUSTOMER_INFORMATION: [
    "AWAITING_COMPLIANCE",
    "PROVISIONING",
    "SUSPENDED",
    "FAILED",
  ],
  AWAITING_COMPLIANCE: ["PROVISIONING", "SUSPENDED", "FAILED"],
  AWAITING_DNS: ["PROVISIONING", "ACTIVE", "SUSPENDED", "FAILED"],
  PROVISIONING: ["ACTIVE", "DEGRADED", "SUSPENDED", "FAILED"],
  ACTIVE: [
    "DEGRADED",
    "SUSPENDED",
    "FAILED",
    "CANCELLATION_GRACE_PERIOD",
  ],
  DEGRADED: [
    "ACTIVE",
    "SUSPENDED",
    "FAILED",
    "CANCELLATION_GRACE_PERIOD",
  ],
  SUSPENDED: ["ACTIVE", "PROVISIONING", "CANCELLATION_GRACE_PERIOD"],
  FAILED: ["PROVISIONING", "SUSPENDED"],
  CANCELLATION_GRACE_PERIOD: ["ACTIVE", "RELEASE_SCHEDULED"],
  RELEASE_SCHEDULED: ["ACTIVE", "RELEASED", "FAILED"],
  RELEASED: [],
};

export function canTransitionCommunicationChannel(
  from: CommunicationChannelState,
  to: CommunicationChannelState,
): boolean {
  return from === to || LEGAL_CHANNEL_TRANSITIONS[from].includes(to);
}

export const communicationRuleChannelSchema = z.enum(["EMAIL", "SMS"]);
export const communicationRulePurposeSchema = z.enum([
  "MARKETING",
  "TRANSACTIONAL",
  "ONE_TO_ONE",
  "SYSTEM",
]);

const communicationRuleVersionCommonSchema = z.object({
  purpose: communicationRulePurposeSchema,
  isEnabled: z.boolean(),
  scheduleOffsetMinutes: z.number().int().min(-525_600).max(525_600),
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export const communicationRuleVersionValuesSchema = z.discriminatedUnion(
  "channel",
  [
  communicationRuleVersionCommonSchema.extend({
    channel: z.literal("EMAIL"),
    subject: z.string().trim().min(1).max(998),
    textBody: z.string().trim().min(1).max(100_000).nullable(),
    htmlBody: z.string().trim().min(1).max(250_000).nullable(),
  }).refine((value) => value.textBody !== null || value.htmlBody !== null, {
    message: "Email rules require a text or HTML body.",
    path: ["textBody"],
  }),
  communicationRuleVersionCommonSchema.extend({
    channel: z.literal("SMS"),
    subject: z.null(),
    textBody: z.string().trim().min(1).max(1_600),
    htmlBody: z.null(),
  }),
  ],
);

export const communicationRuleValuesSchema = z.intersection(
  z.object({
    name: z.string().trim().min(1).max(120),
    eventKey: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z][a-z0-9_.-]{1,119}$/),
  }),
  communicationRuleVersionValuesSchema,
);

export const createCommunicationRuleSchema = communicationRuleValuesSchema;

export const versionCommunicationRuleSchema = z.object({
  ruleId: z.string().min(1).max(128),
  expectedVersion: z.number().int().positive(),
  values: communicationRuleVersionValuesSchema,
});

export const cloneCommunicationRuleSchema = z.object({
  ruleId: z.string().min(1).max(128),
  name: z.string().trim().min(1).max(120),
  eventKey: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_.-]{1,119}$/),
});

export const archiveCommunicationRuleSchema = z.object({
  ruleId: z.string().min(1).max(128),
});

export const previewCommunicationRuleSchema = z.object({
  subject: z.string().max(998).nullable(),
  textBody: z.string().max(100_000).nullable(),
  htmlBody: z.string().max(250_000).nullable(),
  variables: z.record(z.string().min(1).max(80), z.string().max(10_000)).default({}),
});

export const communicationRuleSnapshotSchema = z.object({
  ruleId: z.string().trim().min(1),
  versionId: z.string().trim().min(1),
  version: z.number().int().positive(),
  eventKey: z.string().trim().min(1),
  channel: communicationRuleChannelSchema,
  purpose: communicationRulePurposeSchema,
  scheduleOffsetMinutes: z.number().int(),
});

export const communicationControlsListSchema = z.object({
  query: z.string().trim().max(200).default(""),
  includeInactive: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
});

export const createCommunicationSuppressionSchema = z.object({
  channel: z.enum(["EMAIL", "SMS", "APP"]),
  scope: z.enum(["MARKETING", "ALL"]),
  reason: z.enum([
    "UNSUBSCRIBE",
    "COMPLAINT",
    "HARD_BOUNCE",
    "SMS_STOP",
    "INVALID_DESTINATION",
    "MANUAL",
  ]),
  destination: z.string().trim().min(1).max(500),
  expiresAt: z.coerce.date().nullable().default(null),
});

export const revokeCommunicationSuppressionSchema = z.object({
  id: z.string().min(1).max(128),
});

export const createMailboxBlocklistEntrySchema = z.object({
  matchType: z.enum(["ADDRESS", "DOMAIN"]),
  value: z.string().trim().min(1).max(253),
  reason: z.string().trim().min(1).max(500),
  expiresAt: z.coerce.date().nullable().default(null),
});

export const revokeMailboxBlocklistEntrySchema = z.object({
  id: z.string().min(1).max(128),
});

export type CommunicationRuleValues = z.infer<
  typeof communicationRuleValuesSchema
>;
export type CommunicationRuleVersionValues = z.infer<
  typeof communicationRuleVersionValuesSchema
>;
export type CommunicationRuleSnapshot = z.infer<
  typeof communicationRuleSnapshotSchema
>;
