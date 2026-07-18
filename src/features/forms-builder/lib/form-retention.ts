export const DEFAULT_PUBLIC_FORM_RETENTION_DAYS = 365;
export const MAX_PUBLIC_FORM_RETENTION_DAYS = 3_650;
export const MAX_FORM_RETENTION_PURGE_BATCH_SIZE = 1_000;

export function publicFormResponseExpiry(
  submittedAt: Date,
  retentionDays: number,
): Date {
  if (
    !Number.isInteger(retentionDays) ||
    retentionDays < 1 ||
    retentionDays > MAX_PUBLIC_FORM_RETENTION_DAYS
  ) {
    throw new RangeError("Form response retention is outside the allowed range");
  }
  return new Date(
    submittedAt.getTime() + retentionDays * 24 * 60 * 60 * 1_000,
  );
}

export function normalizeFormRetentionPurgeBatchSize(value: number): number {
  if (!Number.isFinite(value)) return MAX_FORM_RETENTION_PURGE_BATCH_SIZE;
  return Math.max(
    1,
    Math.min(MAX_FORM_RETENTION_PURGE_BATCH_SIZE, Math.floor(value)),
  );
}
