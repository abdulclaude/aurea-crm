import { TRPCError } from "@trpc/server";
import {
  and,
  arrayOverlaps,
  eq,
  inArray,
  isNotNull,
  isNull,
  type SQL,
} from "drizzle-orm";
import type { CampaignSegmentType } from "@/db/enums";
import { client } from "@/db/schema";
import type { SavedAudienceDefinition } from "@/features/audiences/lib/audience-definition";
import { buildAudienceConditions } from "@/features/audiences/server/audience-query";
import { legacyCampaignSegmentFilterSchema } from "@/features/campaigns/lib/campaign-audience-contracts";

function emailableConditions(): SQL[] {
  return [isNotNull(client.email), eq(client.emailUnsubscribed, false)];
}

export function buildSavedAudienceWhereClause(input: {
  organizationId: string;
  locationId: string | null;
  definition: SavedAudienceDefinition;
}): SQL | undefined {
  return and(
    ...buildAudienceConditions({
      scope: {
        organizationId: input.organizationId,
        locationId: input.locationId,
      },
      definition: input.definition,
    }),
    ...emailableConditions(),
  );
}

export function buildClientWhereClause(
  organizationId: string,
  locationId: string | null,
  segmentType: CampaignSegmentType,
  segmentFilter?: unknown,
): SQL | undefined {
  const parsed = legacyCampaignSegmentFilterSchema.safeParse(
    segmentFilter ?? {},
  );
  if (!parsed.success) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The campaign's legacy audience filter is invalid.",
    });
  }
  const baseConditions = [
    eq(client.organizationId, organizationId),
    locationId ? eq(client.locationId, locationId) : isNull(client.locationId),
    ...emailableConditions(),
  ];

  switch (segmentType) {
    case "BY_TYPE":
      return and(
        ...baseConditions,
        parsed.data.types?.length
          ? inArray(client.type, parsed.data.types)
          : undefined,
      );
    case "BY_TAGS":
      return and(
        ...baseConditions,
        parsed.data.tags?.length
          ? arrayOverlaps(client.tags, parsed.data.tags)
          : undefined,
      );
    case "BY_LIFECYCLE":
      return and(
        ...baseConditions,
        parsed.data.lifecycleStages?.length
          ? inArray(client.lifecycleStage, parsed.data.lifecycleStages)
          : undefined,
      );
    case "BY_COUNTRY":
      return and(
        ...baseConditions,
        parsed.data.countries?.length
          ? inArray(client.country, parsed.data.countries)
          : undefined,
      );
    case "ALL":
    case "CUSTOM":
    default:
      return and(...baseConditions);
  }
}
