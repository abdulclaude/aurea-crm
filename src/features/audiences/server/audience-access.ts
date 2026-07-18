import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { savedAudience } from "@/db/schema";
import {
  savedAudienceDefinitionSchema,
  type SavedAudienceDefinition,
} from "@/features/audiences/lib/audience-definition";
import { findAudienceReferenceWarnings } from "@/features/audiences/server/audience-query";
import type { AudienceScope } from "@/features/audiences/server/audience-query";
import { requireCapability } from "@/features/permissions/server/authorization";

export function requireActiveAudienceScope(input: {
  organizationId: string | null;
  locationId: string | null;
}): AudienceScope {
  if (!input.organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing audiences.",
    });
  }
  return {
    organizationId: input.organizationId,
    locationId: input.locationId,
  };
}

export async function authorizeAudienceScope(input: {
  userId: string;
  scope: AudienceScope;
  capability: "audience.view" | "audience.manage";
}): Promise<void> {
  await requireCapability({
    actor: {
      userId: input.userId,
      organizationId: input.scope.organizationId,
      locationId: input.scope.locationId,
    },
    capability: input.capability,
    resource: input.scope,
  });
}

export async function getScopedAudience(input: {
  id: string;
  scope: AudienceScope;
}): Promise<{
  id: string;
  name: string;
  definition: unknown;
  schemaVersion: number;
  archivedAt: Date | null;
}> {
  const [audience] = await db
    .select({
      id: savedAudience.id,
      name: savedAudience.name,
      definition: savedAudience.definition,
      schemaVersion: savedAudience.schemaVersion,
      archivedAt: savedAudience.archivedAt,
    })
    .from(savedAudience)
    .where(
      and(
        eq(savedAudience.id, input.id),
        eq(savedAudience.organizationId, input.scope.organizationId),
        input.scope.locationId
          ? eq(savedAudience.locationId, input.scope.locationId)
          : isNull(savedAudience.locationId),
      ),
    )
    .limit(1);

  if (!audience) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Audience not found." });
  }
  return audience;
}

export async function getActiveScopedAudienceDefinition(input: {
  id: string;
  scope: AudienceScope;
}): Promise<{
  id: string;
  name: string;
  schemaVersion: number;
  definition: SavedAudienceDefinition;
}> {
  const audience = await getScopedAudience(input);
  if (audience.archivedAt) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Restore the saved audience before using it.",
    });
  }
  const parsed = savedAudienceDefinitionSchema.safeParse(audience.definition);
  if (!parsed.success) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The saved audience definition is no longer valid.",
    });
  }
  const warnings = await findAudienceReferenceWarnings({
    scope: input.scope,
    definition: parsed.data,
  });
  if (warnings.length > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: warnings.join(" "),
    });
  }
  return {
    id: audience.id,
    name: audience.name,
    schemaVersion: audience.schemaVersion,
    definition: parsed.data,
  };
}

export function assertAudienceReferences(warnings: string[]): void {
  if (warnings.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: warnings.join(" "),
    });
  }
}
