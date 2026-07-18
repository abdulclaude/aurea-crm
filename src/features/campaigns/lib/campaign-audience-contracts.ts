import { z } from "zod";

import {
  CLIENT_TYPE_VALUES,
  LIFECYCLE_STAGE_VALUES,
} from "@/features/crm/constants";

export const CAMPAIGN_SEGMENT_TYPE_VALUES = [
  "ALL",
  "BY_TYPE",
  "BY_TAGS",
  "BY_LIFECYCLE",
  "BY_COUNTRY",
  "CUSTOM",
] as const;

export const campaignSegmentTypeSchema = z.enum(CAMPAIGN_SEGMENT_TYPE_VALUES);

export const legacyCampaignSegmentFilterSchema = z
  .object({
    types: z
      .array(z.enum(CLIENT_TYPE_VALUES))
      .max(CLIENT_TYPE_VALUES.length)
      .optional(),
    tags: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
    lifecycleStages: z
      .array(z.enum(LIFECYCLE_STAGE_VALUES))
      .max(LIFECYCLE_STAGE_VALUES.length)
      .optional(),
    countries: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  })
  .passthrough();

export type CampaignSegmentTypeValue = z.infer<
  typeof campaignSegmentTypeSchema
>;
export type LegacyCampaignSegmentFilter = z.infer<
  typeof legacyCampaignSegmentFilterSchema
>;
