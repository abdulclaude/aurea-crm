export function normalizeStaffIdentityEmail(
  email: string | null,
): string | null {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function canAttachIdentityUser(input: {
  identityUserId: string | null;
  sourceUserId: string | null;
}): boolean {
  return (
    !input.identityUserId ||
    !input.sourceUserId ||
    input.identityUserId === input.sourceUserId
  );
}

export function isStaffIdentityAccessBlocked(
  statuses: readonly (string | null | undefined)[],
): boolean {
  return statuses.some(
    (status) => status === "SUSPENDED" || status === "ARCHIVED",
  );
}
