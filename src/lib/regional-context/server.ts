import "server-only";

import { getEffectiveWorkspaceRegionalValues } from "@/features/workspace-settings/server/query-service";

export type RegionalContext = {
  timezone: string;
  locale: string;
  currency: string;
  weekStart: "SUNDAY" | "MONDAY" | "SATURDAY";
  dateFormat: "LOCALE" | "MONTH_DAY_YEAR" | "DAY_MONTH_YEAR" | "YEAR_MONTH_DAY";
  timeFormat: "TWELVE_HOUR" | "TWENTY_FOUR_HOUR";
};

export async function getRegionalContext(input: {
  organizationId: string;
  locationId: string | null;
}): Promise<RegionalContext> {
  return getEffectiveWorkspaceRegionalValues(input);
}
