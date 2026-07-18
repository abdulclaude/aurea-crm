import { formatDecimalMoney } from "@/features/commerce/lib/money";
import type { PublishedMembershipWidgetSource } from "@/features/publications/public/contracts";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";

export function PublishedMembershipWidget({
  source,
  themeSnapshot,
  transparentBackground,
}: {
  source: PublishedMembershipWidgetSource;
  themeSnapshot: unknown;
  transparentBackground: boolean;
}) {
  const { config } = source.widget;
  const themeCss = buildPublicationThemeCss(themeSnapshot);
  const brandName =
    source.brand.companyName ?? source.brand.name ?? "Memberships";
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
            <p className="text-xs opacity-65">Membership options</p>
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
            return (
              <article
                key={offer.id}
                className={
                  config.layout === "GRID"
                    ? "border p-4"
                    : "grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start"
                }
                style={{
                  borderColor: featured
                    ? "var(--publication-primary,#2563eb)"
                    : "var(--publication-border,#e5e7eb)",
                }}
              >
                <div>
                  <h2 className="text-sm font-semibold">{offer.name}</h2>
                  {featured ? (
                    <p className="mt-1 text-xs font-medium text-[var(--publication-primary,#2563eb)]">
                      Featured
                    </p>
                  ) : null}
                  {config.showDescription && offer.descriptionHtml ? (
                    <div
                      className="mt-2 text-sm leading-6 opacity-75 [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-2"
                      dangerouslySetInnerHTML={{
                        __html: offer.descriptionHtml,
                      }}
                    />
                  ) : null}
                  {config.showAccessSummary && offer.accessSummary ? (
                    <p className="mt-3 text-xs opacity-65">
                      {offer.accessSummary}
                    </p>
                  ) : null}
                </div>
                {config.showPrice ? (
                  <div className="text-left sm:text-right">
                    <p className="text-base font-semibold">
                      {formatDecimalMoney(offer.price, offer.currency)}
                    </p>
                    {config.showBillingInterval ? (
                      <p className="text-xs opacity-60">
                        {billingLabel(offer.billingInterval)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function billingLabel(interval: string): string {
  if (interval === "ONE_TIME") return "One-time";
  return interval.charAt(0) + interval.slice(1).toLowerCase();
}
