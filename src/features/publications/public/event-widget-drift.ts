import "server-only";

import type { PublishedEventWidgetSource } from "@/features/publications/public/contracts";
import {
  selectPublicEventPrograms,
  selectPublicEventTimeZone,
} from "@/features/publications/server/widget-source-data";
import { toPublicEventProgram } from "@/features/studio/widgets/event-public-program";

export async function eventWidgetSourceIsCurrent(input: {
  organizationId: string;
  locationId: string | null;
  source: PublishedEventWidgetSource;
}): Promise<boolean> {
  const scope = {
    organizationId: input.organizationId,
    locationId: input.locationId,
  };
  const [rows, timezone] = await Promise.all([
    selectPublicEventPrograms({
      ids: input.source.widget.config.serviceTypeIds,
      scope,
      occurrencesPerEvent: input.source.widget.config.occurrencesPerEvent,
      occurrenceIds: input.source.events.flatMap((event) =>
        event.occurrences.map((occurrence) => occurrence.id),
      ),
      includeEndedOccurrences: true,
    }),
    selectPublicEventTimeZone(scope),
  ]);
  if (
    rows.length !== input.source.events.length ||
    timezone !== input.source.timezone
  ) {
    return false;
  }
  return JSON.stringify(
    rows.map((row) => toPublicEventProgram(row, input.source.widget.config)),
  ) === JSON.stringify(input.source.events);
}
