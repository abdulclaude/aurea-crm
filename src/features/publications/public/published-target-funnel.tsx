import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PublishedFunnelDocument } from "@/features/funnel-builder/lib/published-funnel-document";
import { PublicationConsentBanner } from "@/features/publications/components/publication-consent-banner";
import { PublicationFirstPartyTracker } from "@/features/publications/components/publication-first-party-tracker";
import { publicationConsentConfigSchema } from "@/features/publications/contracts";
import {
  getPublicationTrackingCategories,
  hasPublicationConsentDecision,
  publicationConsentCookieName,
} from "@/features/publications/public/consent";
import { getPublishedFunnelPage } from "@/features/publications/public/funnel-snapshot";
import { createPublicationTrackingToken } from "@/features/publications/public/tracking-token";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";

export async function PublishedTargetFunnel({
  pageSlug,
  snapshot,
  targetId,
  versionId,
  themeSnapshot,
  consentSnapshot,
}: {
  pageSlug: string | null;
  snapshot: unknown;
  targetId: string;
  versionId: string;
  themeSnapshot: unknown;
  consentSnapshot: unknown;
}) {
  let published;
  try {
    published = getPublishedFunnelPage({ snapshot, pageSlug });
  } catch {
    notFound();
  }
  const consent = publicationConsentConfigSchema.parse(consentSnapshot);
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(
    publicationConsentCookieName(targetId),
  )?.value;
  const trackingCategories = getPublicationTrackingCategories({
    analytics: published.analytics,
    config: consent,
    cookieValue,
  });
  const enableTracking = trackingCategories.length > 0;
  const firstPartyToken = trackingCategories.includes("ANALYTICS")
    ? createPublicationTrackingToken({
        funnelId: published.data.page.funnelId,
        targetId,
        versionId,
      })
    : null;
  const hasConsentDecision = hasPublicationConsentDecision({
    config: consent,
    cookieValue,
  });
  const themeCss = buildPublicationThemeCss(themeSnapshot);

  return (
    <div className="aurea-publication-root">
      {themeCss ? (
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      ) : null}
      <PublishedFunnelDocument
        data={published.data}
        policy={{
          mode: "published",
          allowCustomCode: published.allowCustomCode,
          allowCustomScripts:
            published.allowCustomCode &&
            trackingCategories.includes("MARKETING"),
          enableTracking,
          trackingCategories,
        }}
      />
      {firstPartyToken ? (
        <PublicationFirstPartyTracker
          targetId={targetId}
          token={firstPartyToken}
          versionId={versionId}
        />
      ) : null}
      {consent.mode === "REQUIRED" && !hasConsentDecision ? (
        <PublicationConsentBanner config={consent} targetId={targetId} />
      ) : null}
    </div>
  );
}
