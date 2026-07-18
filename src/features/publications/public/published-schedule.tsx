import { CalendarDays, Clock, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { formatDecimalMoney } from "@/features/commerce/lib/money";
import {
  publishedScheduleSourceSchema,
  storedPublicationSnapshotSchema,
} from "@/features/publications/public/contracts";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";
import { getPublicScheduleInventory } from "@/features/studio/server/public-schedule-inventory";
import {
  publicScheduleDateKey,
  publicScheduleDayLabel,
  publicScheduleTime,
} from "@/features/studio/widgets/public-schedule-format";

export async function PublishedSchedule({
  locationId,
  organizationId,
  snapshot,
  themeSnapshot,
}: {
  locationId: string | null;
  organizationId: string;
  snapshot: unknown;
  themeSnapshot: unknown;
}) {
  const envelope = storedPublicationSnapshotSchema.parse(snapshot);
  const channelConfig = envelope.channelConfig;
  if (channelConfig.kind !== "SCHEDULE") notFound();
  const source = publishedScheduleSourceSchema.parse(envelope.source);
  const brand =
    source.scope === "ORGANIZATION" ? source.organization : source.location;
  if (!brand) notFound();

  const inventory = await getPublicScheduleInventory({
    scope: { organizationId, locationId },
    maxDaysAhead: channelConfig.maxDaysAhead,
    classTypeIds: channelConfig.classTypeIds,
  });
  const classes = inventory.classes;
  const grouped = new Map<string, typeof classes>();
  for (const entry of classes) {
    const day = publicScheduleDateKey(entry.startTime, inventory.timezone);
    const values = grouped.get(day) ?? [];
    values.push(entry);
    grouped.set(day, values);
  }
  const themeCss = buildPublicationThemeCss(themeSnapshot);
  const brandName = brand.companyName ?? brand.name ?? "Schedule";

  return (
    <main className="aurea-publication-root">
      {themeCss ? (
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      ) : null}
      <header className="border-b border-[var(--publication-border,#e5e7eb)] px-4 py-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          {brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="size-10 object-contain" src={brand.logo} alt="" />
          ) : (
            <CalendarDays className="size-5" aria-hidden="true" />
          )}
          <div>
            <h1 className="text-lg font-semibold">{brandName}</h1>
            <p className="text-sm opacity-70">Class schedule</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-6">
        {grouped.size === 0 ? (
          <p className="py-12 text-center text-sm opacity-70">
            No upcoming classes are available.
          </p>
        ) : (
          [...grouped.entries()].map(([day, dayClasses]) => (
            <section className="mb-8" key={day}>
              <h2 className="border-b border-[var(--publication-border,#e5e7eb)] pb-2 text-sm font-semibold">
                {publicScheduleDayLabel(dayClasses[0].startTime, inventory.timezone)}
              </h2>
              <div className="divide-y divide-[var(--publication-border,#e5e7eb)]">
                {dayClasses.map((entry) => {
                  const available = entry.capacity !== null
                    ? Math.max(0, entry.capacity - entry.bookedCount)
                    : null;
                  const type = entry.serviceType?.name ?? entry.classType?.name;
                  return (
                    <article
                      className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      key={entry.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium">{entry.name}</h3>
                          {type ? (
                            <span className="text-xs opacity-65">{type}</span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" aria-hidden="true" />
                            {publicScheduleTime(entry.startTime, inventory.timezone)} -{" "}
                            {publicScheduleTime(entry.endTime, inventory.timezone)}
                          </span>
                          {entry.instructor?.name ? (
                            <span className="inline-flex items-center gap-1">
                              <UserRound
                                className="size-3"
                                aria-hidden="true"
                              />
                              {entry.instructor.name}
                            </span>
                          ) : null}
                          {entry.room?.name ? (
                            <span>{entry.room.name}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-left text-xs sm:text-right">
                        {entry.dropInPrice ? (
                          <p className="font-medium">
                            {formatDecimalMoney(
                              entry.dropInPrice,
                              entry.currency,
                            )}
                          </p>
                        ) : null}
                        {channelConfig.showAvailability &&
                        available !== null ? (
                          <p className="opacity-65">{available} available</p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
      {inventory.truncated ? (
        <p className="border-t px-4 py-3 text-center text-xs opacity-65">
          More classes are available in the full schedule.
        </p>
      ) : null}
    </main>
  );
}
