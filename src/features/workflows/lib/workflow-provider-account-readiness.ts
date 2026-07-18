import {
  providerAccountMatchesScope,
  type ProviderAccountScope,
} from "@/features/provider-accounts/lib/scope-policy";

export const workflowProviderAccountReadinessStatuses = [
  "READY",
  "INACTIVE",
  "MISSING_GRANT",
  "MISSING_SCOPES",
] as const;

export type WorkflowProviderAccountReadinessStatus =
  (typeof workflowProviderAccountReadinessStatuses)[number];

type WorkflowProviderAccountCandidate = {
  organizationId: string;
  locationId: string | null;
  inheritToLocations: boolean;
  status: string;
  grantedScopes: readonly string[] | null;
};

export type WorkflowProviderAccountReadiness = {
  status: WorkflowProviderAccountReadinessStatus;
  ready: boolean;
  missingScopes: string[];
};

export function isWorkflowProviderAccountAvailableToScope(
  candidate: Pick<
    WorkflowProviderAccountCandidate,
    "organizationId" | "locationId" | "inheritToLocations"
  >,
  scope: ProviderAccountScope,
): boolean {
  return providerAccountMatchesScope(candidate, scope);
}

export function getWorkflowProviderAccountReadiness(
  candidate: Pick<
    WorkflowProviderAccountCandidate,
    "status" | "grantedScopes"
  >,
  requiredScopes: readonly string[],
): WorkflowProviderAccountReadiness {
  const grantedScopes = new Set(candidate.grantedScopes ?? []);
  const missingScopes = requiredScopes.filter(
    (scope) => !grantedScopes.has(scope),
  );

  if (candidate.status !== "ACTIVE") {
    return { status: "INACTIVE", ready: false, missingScopes };
  }
  if (candidate.grantedScopes === null) {
    return { status: "MISSING_GRANT", ready: false, missingScopes };
  }
  if (missingScopes.length > 0) {
    return { status: "MISSING_SCOPES", ready: false, missingScopes };
  }
  return { status: "READY", ready: true, missingScopes: [] };
}
