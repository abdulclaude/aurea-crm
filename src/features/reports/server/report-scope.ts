import "server-only";

import { TRPCError } from "@trpc/server";
import {
  getRegionalContext,
  type RegionalContext,
} from "@/lib/regional-context/server";

export type ReportScope = {
  organizationId: string;
  locationId: string;
};

export type ReportLocale = RegionalContext;

export function requireReportScope(input: {
  organizationId: string | null;
  locationId: string | null;
}): ReportScope {
  if (!input.organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before opening reports.",
    });
  }
  if (!input.locationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select a location before opening reports.",
    });
  }
  return {
    organizationId: input.organizationId,
    locationId: input.locationId,
  };
}

export async function getReportLocale(
  scope: ReportScope,
): Promise<ReportLocale> {
  return getRegionalContext(scope);
}
