export type CommerceResourceScope = {
  organizationId: string;
  locationId: string | null;
};

/** A null location is an organization-level scope, not a wildcard. */
export function commerceResourceScopeMatches(
  resource: CommerceResourceScope,
  operation: CommerceResourceScope,
): boolean {
  return (
    resource.organizationId === operation.organizationId &&
    resource.locationId === operation.locationId
  );
}
