export function selectAiCredentialCandidate<
  T extends { isDefault: boolean },
>(rows: T[]):
  | { status: "selected"; credential: T }
  | { status: "missing" }
  | { status: "ambiguous" } {
  if (rows.length === 0) return { status: "missing" };
  const defaults = rows.filter((row) => row.isDefault);
  if (defaults.length === 1) {
    return { status: "selected", credential: defaults[0] };
  }
  if (defaults.length > 1 || rows.length > 1) {
    return { status: "ambiguous" };
  }
  return { status: "selected", credential: rows[0] };
}

export function aiCredentialMatchesExactScope(input: {
  credential: {
    id: string;
    organizationId: string;
    locationId: string | null;
    type: string;
  };
  expected: {
    organizationId: string;
    locationId: string | null;
    type: string;
    credentialId?: string;
  };
}): boolean {
  return (
    input.credential.organizationId === input.expected.organizationId &&
    input.credential.locationId === input.expected.locationId &&
    input.credential.type === input.expected.type &&
    (!input.expected.credentialId ||
      input.credential.id === input.expected.credentialId)
  );
}
