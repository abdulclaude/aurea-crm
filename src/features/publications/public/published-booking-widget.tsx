import { CalendarDays, Clock3, ExternalLink } from "lucide-react";

import type { PublishedBookingWidgetSource } from "@/features/publications/public/contracts";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";
import { buildCalBookingDestination } from "@/features/studio/widgets/booking-destination";

export function PublishedBookingWidget({
  source,
  themeSnapshot,
  transparentBackground,
}: {
  source: PublishedBookingWidgetSource;
  themeSnapshot: unknown;
  transparentBackground: boolean;
}) {
  const { config } = source.widget;
  const themeCss = buildPublicationThemeCss(themeSnapshot);
  const brandName = source.brand.companyName ?? source.brand.name ?? "Appointments";
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
            <p className="text-xs opacity-65">Book an appointment</p>
          </div>
        </header>
        <div
          className={
            config.layout === "GRID"
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "divide-y divide-[var(--publication-border,#e5e7eb)]"
          }
        >
          {source.events.map((event) => (
            <article
              key={event.id}
              className={
                config.layout === "GRID"
                  ? "flex min-h-52 flex-col border border-[var(--publication-border,#e5e7eb)] p-4"
                  : "grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-[var(--publication-primary,#2563eb)]" />
                  <h2 className="text-sm font-semibold">{event.title}</h2>
                </div>
                {config.showDescription && event.description ? (
                  <p className="mt-2 line-clamp-4 text-sm leading-6 opacity-70">
                    {event.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs opacity-65">
                  {config.showDuration ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5" />
                      {event.length} minutes
                    </span>
                  ) : null}
                  <span>{locationLabel(event.locationType)}</span>
                  {config.showPrice ? <span>Free</span> : null}
                </div>
              </div>
              <a
                href={buildCalBookingDestination({
                  username: event.calUsername,
                  eventSlug: event.slug,
                })}
                target="_blank"
                rel="noopener noreferrer"
                data-aurea-track="booking_provider_launch"
                className={
                  config.layout === "GRID"
                    ? "mt-5 inline-flex h-9 items-center justify-center gap-2 bg-[var(--publication-primary,#2563eb)] px-3 text-sm font-medium text-white"
                    : "inline-flex h-9 items-center justify-center gap-2 bg-[var(--publication-primary,#2563eb)] px-3 text-sm font-medium text-white"
                }
              >
                {config.buttonLabel}
                <ExternalLink className="size-3.5" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function locationLabel(locationType: string): string {
  if (locationType === "PHONE") return "Phone";
  if (locationType === "IN_PERSON") return "In person";
  if (locationType === "GOOGLE_MEET") return "Google Meet";
  if (locationType === "ZOOM") return "Zoom";
  if (locationType === "MS_TEAMS") return "Microsoft Teams";
  if (locationType === "CUSTOM") return "Online";
  return "Cal.com video";
}
