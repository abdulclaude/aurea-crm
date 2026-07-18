import type { PublishedScheduleWidgetSource } from "@/features/publications/public/contracts";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";
import {
  publicScheduleDateKey,
  publicScheduleDayLabel,
  publicScheduleTime,
} from "@/features/studio/widgets/public-schedule-format";
import { formatDecimalMoney } from "@/features/commerce/lib/money";

type Inventory = Awaited<
  ReturnType<
    typeof import("@/features/studio/server/public-schedule-inventory").getPublicScheduleInventory
  >
>;

export function PublishedScheduleWidget({
  source,
  inventory,
  themeSnapshot,
  transparentBackground,
}: {
  source: PublishedScheduleWidgetSource;
  inventory: Inventory;
  themeSnapshot: unknown;
  transparentBackground: boolean;
}) {
  const { config } = source.widget;
  const grouped = new Map<string, Inventory["classes"]>();
  for (const entry of inventory.classes) {
    const key = publicScheduleDateKey(entry.startTime, inventory.timezone);
    const values = grouped.get(key) ?? [];
    values.push(entry);
    grouped.set(key, values);
  }
  const themeCss = buildPublicationThemeCss(themeSnapshot);
  const brandName = source.brand.companyName ?? source.brand.name ?? "Schedule";

  return (
    <main
      className="aurea-publication-root min-h-screen px-4 py-5"
      style={{
        background: transparentBackground ? "transparent" : undefined,
        fontFamily: `${config.fontFamily}, system-ui, sans-serif`,
      }}
    >
      {themeCss ? <style dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      <div className="mx-auto max-w-4xl">
        <header className="mb-5 flex items-center gap-3 border-b border-[var(--publication-border,#e5e7eb)] pb-4">
          {source.brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="size-9 object-contain" src={source.brand.logo} alt="" />
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{brandName}</h1>
            <p className="text-xs opacity-65">Class schedule</p>
          </div>
        </header>

        {grouped.size === 0 ? (
          <p className="py-12 text-center text-sm opacity-65">
            No upcoming classes are available.
          </p>
        ) : (
          [...grouped.values()].map((dayClasses) => (
            <section className="mb-6" key={publicScheduleDateKey(dayClasses[0].startTime, inventory.timezone)}>
              <h2
                className="border-b pb-2 text-xs font-semibold uppercase"
                style={{ borderColor: config.primaryColor, color: config.primaryColor }}
              >
                {publicScheduleDayLabel(dayClasses[0].startTime, inventory.timezone)}
              </h2>
              <div className="divide-y divide-[var(--publication-border,#e5e7eb)]">
                {dayClasses.map((entry) => {
                  const available = entry.capacity === null
                    ? null
                    : Math.max(0, entry.capacity - entry.bookedCount);
                  const type = entry.serviceType?.name ?? entry.classType?.name;
                  return (
                    <article
                      className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      key={entry.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium">{entry.name}</h3>
                          {type ? <span className="text-xs opacity-65">{type}</span> : null}
                          {entry.isVirtual ? <span className="text-xs opacity-65">Online</span> : null}
                        </div>
                        <p className="mt-1 text-xs opacity-70">
                          {publicScheduleTime(entry.startTime, inventory.timezone)} - {publicScheduleTime(entry.endTime, inventory.timezone)}
                          {config.showInstructors && entry.instructor?.name ? ` | ${entry.instructor.name}` : ""}
                          {entry.room?.name ? ` | ${entry.room.name}` : ""}
                        </p>
                      </div>
                      <div className="text-left text-xs sm:text-right">
                        {config.showPrices && entry.dropInPrice ? (
                          <p className="font-medium">
                            {formatDecimalMoney(entry.dropInPrice, entry.currency)}
                          </p>
                        ) : null}
                        {available !== null ? (
                          <p style={{ color: available === 0 ? "#dc2626" : config.accentColor }}>
                            {available === 0 ? "Full" : `${available} available`}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
        {inventory.truncated ? (
          <p className="border-t pt-3 text-center text-xs opacity-65">
            More classes are available in the full schedule.
          </p>
        ) : null}
      </div>
    </main>
  );
}
