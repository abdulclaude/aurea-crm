import { CalendarDays, Clock3, MapPin, MonitorPlay, UserRound } from "lucide-react";

import { formatDecimalMoney } from "@/features/commerce/lib/money";
import type { PublishedEventWidgetSource } from "@/features/publications/public/contracts";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";

export function PublishedEventWidget({
  source,
  themeSnapshot,
  transparentBackground,
}: {
  source: PublishedEventWidgetSource;
  themeSnapshot: unknown;
  transparentBackground: boolean;
}) {
  const { config } = source.widget;
  const themeCss = buildPublicationThemeCss(themeSnapshot);
  const brandName = source.brand.companyName ?? source.brand.name ?? "Events";
  const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: source.timezone,
  });
  return (
    <main
      className="aurea-publication-root min-h-screen px-4 py-5"
      style={{ background: transparentBackground ? "transparent" : undefined }}
    >
      {themeCss ? <style dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center gap-3 border-b border-[var(--publication-border,#e5e7eb)] pb-4">
          {source.brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="size-9 object-contain" src={source.brand.logo} alt="" />
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{brandName}</h1>
            <p className="text-xs opacity-65">Upcoming events</p>
          </div>
        </header>
        <div
          className={
            config.layout === "GRID"
              ? "grid gap-4 sm:grid-cols-2"
              : "divide-y divide-[var(--publication-border,#e5e7eb)]"
          }
        >
          {source.events.map((event) => (
            <article
              key={event.id}
              className={
                config.layout === "GRID"
                  ? "overflow-hidden border border-[var(--publication-border,#e5e7eb)]"
                  : "grid gap-4 py-5 sm:grid-cols-[12rem_1fr]"
              }
            >
              {config.showImage && event.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className={
                    config.layout === "GRID"
                      ? "aspect-[16/9] w-full object-cover"
                      : "aspect-[4/3] w-full object-cover"
                  }
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={event.imageUrl}
                />
              ) : null}
              <div className={config.layout === "GRID" ? "p-4" : "min-w-0"}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{event.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs opacity-65">
                      {event.format === "VIRTUAL" ? <MonitorPlay className="size-3.5" /> : <Clock3 className="size-3.5" />}
                      {event.durationMinutes} minutes · {formatLabel(event.format)}
                    </p>
                  </div>
                  {config.showPrice && event.price ? (
                    <p className="text-sm font-semibold">
                      {formatDecimalMoney(event.price, event.currency)}
                    </p>
                  ) : null}
                </div>
                {config.showDescription && event.description ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 opacity-75">
                    {event.description}
                  </p>
                ) : null}
                {config.showLocation && event.defaultLocation ? (
                  <p className="mt-3 flex items-start gap-1.5 text-xs opacity-65">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    {event.defaultLocation}
                  </p>
                ) : null}
                {config.showSchedule ? (
                  <div className="mt-4 border-t border-[var(--publication-border,#e5e7eb)] pt-3">
                    <p className="mb-2 text-xs font-medium opacity-65">Upcoming dates</p>
                    <ul className="space-y-2">
                      {event.occurrences.map((occurrence) => (
                        <li key={occurrence.id} className="text-xs">
                          <p className="flex items-center gap-1.5 font-medium">
                            <CalendarDays className="size-3.5 text-[var(--publication-primary,#2563eb)]" />
                            {dateTimeFormatter.format(new Date(occurrence.startTime))}
                          </p>
                          {occurrence.instructorName ? (
                            <p className="mt-1 flex items-center gap-1.5 pl-5 opacity-65">
                              <UserRound className="size-3" />
                              {occurrence.instructorName}
                            </p>
                          ) : null}
                          {config.showLocation && occurrenceLocation(occurrence) ? (
                            <p className="mt-1 flex items-center gap-1.5 pl-5 opacity-65">
                              <MapPin className="size-3" />
                              {occurrenceLocation(occurrence)}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function formatLabel(format: "IN_PERSON" | "VIRTUAL" | "HYBRID"): string {
  if (format === "IN_PERSON") return "In person";
  if (format === "VIRTUAL") return "Virtual";
  return "Hybrid";
}

function occurrenceLocation(occurrence: {
  location: string | null;
  roomName: string | null;
  isVirtual: boolean;
}): string | null {
  if (occurrence.isVirtual) return "Online";
  return [occurrence.location, occurrence.roomName].filter(Boolean).join(" · ") || null;
}
