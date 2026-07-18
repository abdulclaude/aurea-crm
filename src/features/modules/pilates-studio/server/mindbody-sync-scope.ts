export type MindbodySyncScope = {
  organizationId: string;
  locationId: string | null;
};

type RequestedMindbodySyncScope = {
  organizationId?: string;
  locationId?: string | null;
};

export function assertMindbodySyncScope(
  appScope: MindbodySyncScope,
  requestedScope?: RequestedMindbodySyncScope,
): MindbodySyncScope {
  if (
    requestedScope?.organizationId !== undefined &&
    requestedScope.organizationId !== appScope.organizationId
  ) {
    throw new Error(
      "Mindbody sync organization does not match the connected account",
    );
  }

  if (
    requestedScope?.locationId !== undefined &&
    requestedScope.locationId !== appScope.locationId
  ) {
    throw new Error(
      "Mindbody sync location does not match the connected account",
    );
  }

  return appScope;
}
