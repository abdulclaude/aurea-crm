import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { location, session } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";

export class AiRequestScopeError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 409,
  ) {
    super(message);
    this.name = "AiRequestScopeError";
  }
}

export type AiRequestScope = {
  userId: string;
  organizationId: string;
  locationId: string | null;
  locationName: string | null;
};

export async function resolveAiRequestScope(input: {
  sessionToken: string;
  userId: string;
}): Promise<AiRequestScope> {
  const [activeSession] = await db
    .select({
      organizationId: session.activeOrganizationId,
      locationId: session.activeLocationId,
    })
    .from(session)
    .where(
      and(
        eq(session.token, input.sessionToken),
        eq(session.userId, input.userId),
      ),
    )
    .limit(1);

  if (!activeSession) {
    throw new AiRequestScopeError("The authenticated session is no longer active.", 401);
  }

  if (!activeSession.organizationId) {
    throw new AiRequestScopeError(
      "Select an organization before using Aurea AI.",
      409,
    );
  }

  let locationId: string | null = null;
  let locationName: string | null = null;
  if (activeSession.locationId) {
    const [activeLocation] = await db
      .select({ id: location.id, name: location.companyName })
      .from(location)
      .where(
        and(
          eq(location.id, activeSession.locationId),
          eq(location.organizationId, activeSession.organizationId),
        ),
      )
      .limit(1);

    if (!activeLocation) {
      throw new AiRequestScopeError(
        "The active location is not available in this organization.",
        403,
      );
    }
    locationId = activeLocation.id;
    locationName = activeLocation.name;
  }

  await requireCapability({
    actor: {
      userId: input.userId,
      organizationId: activeSession.organizationId,
      locationId,
    },
    capability: "customer.view",
    resource: {
      organizationId: activeSession.organizationId,
      locationId,
    },
  });

  return {
    userId: input.userId,
    organizationId: activeSession.organizationId,
    locationId,
    locationName,
  };
}
