import { z } from "zod";

import { staffOperationsPolicyValuesSchema } from "@/features/staff-settings/contracts";

export const STAFF_RUNTIME_CUSTOM_FIELD = "_aureaStaffRuntime";

const compensationSnapshotSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("ASSIGNMENT"),
    assignmentId: z.string(),
    templateId: z.string(),
    templateVersionId: z.string(),
    templateVersion: z.number().int().positive(),
    hourlyRate: z.string(),
    currency: z.string(),
    effectiveFrom: z.coerce.date(),
    effectiveTo: z.coerce.date().nullable(),
  }),
  z.object({
    source: z.literal("LEGACY_INSTRUCTOR"),
    hourlyRate: z.string().nullable(),
    currency: z.string(),
  }),
]);

const operationsPolicySnapshotSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("POLICY_VERSION"),
    policyId: z.string(),
    policyVersionId: z.string(),
    policyVersion: z.number().int().positive(),
    effectiveFrom: z.coerce.date(),
    values: staffOperationsPolicyValuesSchema,
  }),
  z.object({
    source: z.literal("LEGACY_DEFAULTS"),
    values: staffOperationsPolicyValuesSchema,
  }),
]);

export const staffRuntimeSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  capturedAt: z.coerce.date(),
  compensation: compensationSnapshotSchema,
  operationsPolicy: operationsPolicySnapshotSchema,
});

export type CompensationRuntimeSnapshot = z.infer<
  typeof compensationSnapshotSchema
>;
export type OperationsPolicyRuntimeSnapshot = z.infer<
  typeof operationsPolicySnapshotSchema
>;
export type StaffRuntimeSnapshot = z.infer<typeof staffRuntimeSnapshotSchema>;

export const LEGACY_STAFF_OPERATIONS_VALUES =
  staffOperationsPolicyValuesSchema.parse({
    publicInstructorProfilesByDefault: false,
    availabilityMode: "ROTA_REQUIRED",
    staffCanEditAvailability: true,
    shiftSwapRequiresApproval: true,
    timeOffRequiresApproval: true,
    timeClockRoundingMinutes: 1,
    breakRequiredAfterMinutes: 360,
    minimumBreakMinutes: 30,
    timeEntryApprovalMode: "MANAGER_REQUIRED",
  });

function asJsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...value } as Record<string, unknown>;
}

export function stripStaffRuntimeSnapshot(
  customFields: unknown,
): Record<string, unknown> {
  const fields = asJsonRecord(customFields);
  delete fields[STAFF_RUNTIME_CUSTOM_FIELD];
  return fields;
}

export function withStaffRuntimeSnapshot(
  customFields: unknown,
  snapshot: StaffRuntimeSnapshot,
): Record<string, unknown> {
  return {
    ...stripStaffRuntimeSnapshot(customFields),
    [STAFF_RUNTIME_CUSTOM_FIELD]: snapshot,
  };
}

export function readStaffRuntimeSnapshot(
  customFields: unknown,
): StaffRuntimeSnapshot | null {
  const candidate = asJsonRecord(customFields)[STAFF_RUNTIME_CUSTOM_FIELD];
  const parsed = staffRuntimeSnapshotSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function preserveStaffRuntimeSnapshot(
  existingCustomFields: unknown,
  nextCustomFields: unknown,
): Record<string, unknown> {
  const nextFields = stripStaffRuntimeSnapshot(nextCustomFields);
  const existingSnapshot = readStaffRuntimeSnapshot(existingCustomFields);
  return existingSnapshot
    ? withStaffRuntimeSnapshot(nextFields, existingSnapshot)
    : nextFields;
}

export function roundDurationMinutes(
  durationMinutes: number,
  incrementMinutes: number,
): number {
  return Math.max(
    0,
    Math.round(durationMinutes / incrementMinutes) * incrementMinutes,
  );
}

export function calculateAmount(
  durationMinutes: number,
  breakMinutes: number,
  hourlyRate: string | null,
): string | null {
  if (hourlyRate === null) return null;
  const rateMinorUnits = Math.round(Number(hourlyRate) * 100);
  const billableMinutes = Math.max(0, durationMinutes - breakMinutes);
  const amountMinorUnits = Math.round((rateMinorUnits * billableMinutes) / 60);
  return (amountMinorUnits / 100).toFixed(2);
}

export function breakComplianceMessage(input: {
  durationMinutes: number;
  breakMinutes: number;
  policy: OperationsPolicyRuntimeSnapshot;
}): string | null {
  const threshold = input.policy.values.breakRequiredAfterMinutes;
  if (
    threshold === null ||
    input.durationMinutes < threshold ||
    input.breakMinutes >= input.policy.values.minimumBreakMinutes
  ) {
    return null;
  }
  return `Break violation: ${input.policy.values.minimumBreakMinutes}min break required after ${threshold}min`;
}
