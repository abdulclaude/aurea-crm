export type ProviderAccountScope = {
  organizationId: string;
  locationId: string | null;
};

export type ProviderAccountScopeCandidate = {
  organizationId: string;
  locationId: string | null;
  inheritToLocations: boolean;
};

export function providerAccountMatchesScope(
  candidate: ProviderAccountScopeCandidate,
  scope: ProviderAccountScope,
): boolean {
  if (candidate.organizationId !== scope.organizationId) return false;
  if (candidate.locationId) return candidate.locationId === scope.locationId;
  if (!scope.locationId) return true;
  return candidate.inheritToLocations;
}

export function providerAccountMatchesExactScope(
  candidate: Pick<ProviderAccountScopeCandidate, "organizationId" | "locationId">,
  scope: ProviderAccountScope,
): boolean {
  return (
    candidate.organizationId === scope.organizationId &&
    candidate.locationId === scope.locationId
  );
}

export function chooseDefaultProviderAccount<
  T extends ProviderAccountScopeCandidate,
>(candidates: readonly T[], scope: ProviderAccountScope): T | null {
  const eligible = candidates.filter((candidate) =>
    providerAccountMatchesScope(candidate, scope),
  );
  return (
    eligible.find((candidate) => candidate.locationId === scope.locationId) ??
    eligible.find((candidate) => candidate.locationId === null) ??
    null
  );
}
