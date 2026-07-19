import type { Capability } from "@/features/permissions/capabilities";

export const UPLOAD_ROUTE_POLICIES = {
  orgLogo: { capability: null, requireOrganization: false, requireLocation: false },
  profilePicture: { capability: null, requireOrganization: false, requireLocation: false },
  workspaceLogo: { capability: "settings.manage", requireOrganization: true, requireLocation: false },
  emailLogo: { capability: "provider.manage", requireOrganization: true, requireLocation: false },
  instructorProfilePhoto: { capability: "team.manage", requireOrganization: true, requireLocation: true },
  instructorDocument: { capability: "team.manage", requireOrganization: true, requireLocation: true },
  mindbodyImportFile: { capability: "provider.manage", requireOrganization: true, requireLocation: true },
  invoiceDocument: { capability: "commerce.manage", requireOrganization: true, requireLocation: false },
  waiverDocument: { capability: "customer.manage", requireOrganization: true, requireLocation: false },
} as const satisfies Record<
  string,
  {
    capability: Capability | null;
    requireOrganization: boolean;
    requireLocation: boolean;
  }
>;

export type UploadRouteKey = keyof typeof UPLOAD_ROUTE_POLICIES;

export type UploadSessionScope = {
  userId: string | null;
  organizationId: string | null;
  locationId: string | null;
};

export type AuthorizedUploadScope = {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
  uploadRoute: UploadRouteKey;
};

export class UploadAuthorizationError extends Error {
  constructor(
    readonly reason:
      | "UNAUTHENTICATED"
      | "ORGANIZATION_REQUIRED"
      | "LOCATION_REQUIRED"
      | "CAPABILITY_DENIED",
  ) {
    super(reason);
    this.name = "UploadAuthorizationError";
  }
}

export async function authorizeUploadScope(input: {
  route: UploadRouteKey;
  session: UploadSessionScope;
  checkCapability: (input: {
    capability: Capability;
    organizationId: string;
    locationId: string | null;
  }) => Promise<boolean>;
}): Promise<AuthorizedUploadScope> {
  const policy = UPLOAD_ROUTE_POLICIES[input.route];
  if (!input.session.userId) {
    throw new UploadAuthorizationError("UNAUTHENTICATED");
  }
  if (policy.requireOrganization && !input.session.organizationId) {
    throw new UploadAuthorizationError("ORGANIZATION_REQUIRED");
  }
  if (policy.requireLocation && !input.session.locationId) {
    throw new UploadAuthorizationError("LOCATION_REQUIRED");
  }
  if (policy.capability) {
    if (!input.session.organizationId) {
      throw new UploadAuthorizationError("ORGANIZATION_REQUIRED");
    }
    const allowed = await input.checkCapability({
      capability: policy.capability,
      organizationId: input.session.organizationId,
      locationId: input.session.locationId,
    });
    if (!allowed) {
      throw new UploadAuthorizationError("CAPABILITY_DENIED");
    }
  }
  return {
    userId: input.session.userId,
    organizationId: input.session.organizationId,
    locationId: input.session.locationId,
    uploadRoute: input.route,
  };
}
