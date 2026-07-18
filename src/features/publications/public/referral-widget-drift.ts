import "server-only";

import type { PublishedReferralWidgetSource } from "@/features/publications/public/contracts";
import { selectPublicReferralPrograms } from "@/features/publications/server/widget-source-data";
import { toPublicReferralProgram } from "@/features/studio/widgets/referral-public-program";

export async function referralWidgetSourceIsCurrent(input: {
  organizationId: string;
  locationId: string | null;
  source: PublishedReferralWidgetSource;
}): Promise<boolean> {
  const rows = await selectPublicReferralPrograms({
    ids: [input.source.widget.config.programId],
    scope: {
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
  });
  const live = rows[0];
  return Boolean(
    live &&
      JSON.stringify(toPublicReferralProgram(live)) ===
        JSON.stringify(input.source.program),
  );
}
