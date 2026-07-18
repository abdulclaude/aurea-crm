import { CalendarClock, ExternalLink, TicketPercent } from "lucide-react";

import { formatDecimalMoney } from "@/features/commerce/lib/money";
import type { PublishedIntroOfferWidgetSource } from "@/features/publications/public/contracts";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";

export function PublishedIntroOfferWidget({
  source,
  themeSnapshot,
  transparentBackground,
}: {
  source: PublishedIntroOfferWidgetSource;
  themeSnapshot: unknown;
  transparentBackground: boolean;
}) {
  const { config } = source.widget;
  const themeCss = buildPublicationThemeCss(themeSnapshot);
  const brandName = source.brand.companyName ?? source.brand.name ?? "Intro offers";
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
            <p className="text-xs opacity-65">New client offers</p>
          </div>
        </header>
        <div
          className={
            config.layout === "GRID"
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "divide-y divide-[var(--publication-border,#e5e7eb)]"
          }
        >
          {source.offers.map((offer) => {
            const featured = config.featuredPricingOptionId === offer.id;
            const destination = `/p/${encodeURIComponent(source.organizationSlug)}/${encodeURIComponent(offer.pricingTarget.slug)}`;
            return (
              <article
                key={offer.id}
                className={
                  config.layout === "GRID"
                    ? "flex min-h-64 flex-col border p-4"
                    : "grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                }
                style={{
                  borderColor: featured
                    ? "var(--publication-primary,#2563eb)"
                    : "var(--publication-border,#e5e7eb)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <TicketPercent className="mt-0.5 size-4 shrink-0 text-[var(--publication-primary,#2563eb)]" />
                    <h2 className="text-sm font-semibold">{offer.name}</h2>
                  </div>
                  {featured ? (
                    <p className="mt-1 text-xs font-medium text-[var(--publication-primary,#2563eb)]">
                      Featured
                    </p>
                  ) : null}
                  {config.showDescription && offer.descriptionHtml ? (
                    <div
                      className="mt-2 text-sm leading-6 opacity-75 [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-2"
                      dangerouslySetInnerHTML={{ __html: offer.descriptionHtml }}
                    />
                  ) : null}
                  {config.showAccessSummary && offer.accessSummary ? (
                    <p className="mt-3 text-xs opacity-65">{offer.accessSummary}</p>
                  ) : null}
                  {config.showDuration && offer.durationDays ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs opacity-65">
                      <CalendarClock className="size-3.5" />
                      {offer.durationDays} days
                    </p>
                  ) : null}
                </div>
                <div className={config.layout === "GRID" ? "mt-5" : "sm:text-right"}>
                  {config.showPrice ? (
                    <p className="mb-2 text-base font-semibold">
                      {formatDecimalMoney(offer.price, offer.currency)}
                    </p>
                  ) : null}
                  <a
                    href={destination}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-aurea-track="intro_offer_checkout_launch"
                    data-aurea-resource-kind="pricing_option"
                    data-aurea-resource-id={offer.id}
                    className="inline-flex h-9 items-center justify-center gap-2 bg-[var(--publication-primary,#2563eb)] px-3 text-sm font-medium text-white"
                  >
                    {config.buttonLabel}
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
