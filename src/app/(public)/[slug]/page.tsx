import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  funnel as funnelTable,
  funnelPage as funnelPageTable,
  funnelPixelIntegration as funnelPixelIntegrationTable,
} from "@/db/schema";
import {
  LEGACY_PUBLISHED_FUNNEL_RENDER_POLICY,
  type PublishedPageData,
} from "@/features/funnel-builder/lib/published-funnel-renderer";
import { PublishedFunnelDocument } from "@/features/funnel-builder/lib/published-funnel-document";
import { publicationSeoConfigSchema } from "@/features/publications/contracts";
import { redirectPublishedChannel } from "@/features/publications/public/channel-redirect";
import { getPublishedFunnelPage } from "@/features/publications/public/funnel-snapshot";
import { PublishedTargetFunnel } from "@/features/publications/public/published-target-funnel";
import { PublishedSchedule } from "@/features/publications/public/published-schedule";
import {
  getPublicationControlByDomain,
  getPublishedPublicationByDomain,
} from "@/features/publications/public/resolver";
import type { Metadata } from "next";

interface DomainFunnelPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Get funnel from subdomain or custom domain
 */
async function getFunnelFromDomain(host: string) {
  // Remove port if present (e.g., "testing.localhost:3000" -> "testing.localhost")
  const hostWithoutPort = host.split(":")[0].toLowerCase().replace(/\.$/, "");

  // Check if it's a custom domain
  const customDomainFunnels = await db.query.funnel.findMany({
    where: and(
      eq(funnelTable.customDomain, hostWithoutPort),
      eq(funnelTable.status, "PUBLISHED"),
      eq(funnelTable.domainType, "CUSTOM"),
      eq(funnelTable.domainVerified, true),
    ),
    limit: 2,
  });
  if (customDomainFunnels.length === 1) return customDomainFunnels[0];
  if (customDomainFunnels.length > 1) return null;

  // Check if it's a subdomain
  // Extract subdomain from host (e.g., "testing.localhost" -> "testing")
  const parts = hostWithoutPort.split(".");

  // For localhost development: testing.localhost -> ["testing", "localhost"]
  // For production: testing.platform.com -> ["testing", "platform", "com"]
  if (parts.length >= 2) {
    const subdomain = parts[0];

    // Don't treat "www" or the base domain as a subdomain
    if (
      subdomain !== "www" &&
      subdomain !== "localhost" &&
      !hostWithoutPort.startsWith("localhost")
    ) {
      const subdomainFunnels = await db.query.funnel.findMany({
        where: and(
          eq(funnelTable.subdomain, subdomain),
          eq(funnelTable.status, "PUBLISHED"),
          eq(funnelTable.domainType, "SUBDOMAIN"),
        ),
        limit: 2,
      });
      return subdomainFunnels.length === 1 ? subdomainFunnels[0] : null;
    }
  }

  return null;
}

const normalizeHostHeader = (host: string) =>
  host.split(":")[0]?.toLowerCase().replace(/\.$/, "") ?? "";

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
}: DomainFunnelPageProps): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";

  const publishedTarget = await getPublishedPublicationByDomain(
    normalizeHostHeader(host),
  );
  if (publishedTarget) {
    const seo = publicationSeoConfigSchema.parse(publishedTarget.seoSnapshot);
    if (publishedTarget.kind !== "FUNNEL") {
      return {
        title: seo.title ?? publishedTarget.name,
        description: seo.description ?? undefined,
        robots: { index: seo.index, follow: seo.follow },
      };
    }
    try {
      const page = getPublishedFunnelPage({
        snapshot: publishedTarget.snapshot,
        pageSlug: slug,
      }).data.page;
      const title = seo.title ?? page.metaTitle ?? page.name;
      const description = seo.description ?? page.metaDescription ?? undefined;
      const image = seo.imageUrl ?? page.metaImage;
      return {
        title,
        description,
        alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
        robots: { index: seo.index, follow: seo.follow },
        openGraph: { title, description, images: image ? [image] : [] },
      };
    } catch {
      return { title: "Page Not Found", robots: { index: false } };
    }
  }

  if (await getPublicationControlByDomain(normalizeHostHeader(host))) {
    return { title: "Page Not Found", robots: { index: false } };
  }

  const funnel = await getFunnelFromDomain(host);
  if (!funnel) {
    return {
      title: "Page Not Found",
    };
  }

  const page = await db.query.funnelPage.findFirst({
    where: and(
      eq(funnelPageTable.funnelId, funnel.id),
      eq(funnelPageTable.slug, slug),
    ),
  });

  if (!page || !page.isPublished) {
    return {
      title: "Page Not Found",
    };
  }

  return {
    title: page.metaTitle || page.name,
    description: page.metaDescription || undefined,
    openGraph: {
      title: page.metaTitle || page.name,
      description: page.metaDescription || undefined,
      images: page.metaImage ? [page.metaImage] : [],
    },
  };
}

/**
 * Published Funnel Page via Subdomain or Custom Domain
 *
 * This route handles funnels accessed via:
 * - Subdomain: clientname.platform.com/{slug}
 * - Custom Domain: www.clientdomain.com/{slug}
 */
export default async function DomainFunnelPage({
  params,
}: DomainFunnelPageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";

  const publishedTarget = await getPublishedPublicationByDomain(
    normalizeHostHeader(host),
  );
  if (publishedTarget) {
    if (publishedTarget.kind === "SCHEDULE") {
      return (
        <PublishedSchedule
          locationId={publishedTarget.locationId}
          organizationId={publishedTarget.organizationId}
          snapshot={publishedTarget.snapshot}
          themeSnapshot={publishedTarget.themeSnapshot}
        />
      );
    }
    if (publishedTarget.kind === "WIDGET") notFound();
    if (publishedTarget.kind !== "FUNNEL") {
      redirectPublishedChannel({
        kind: publishedTarget.kind,
        organizationSlug: publishedTarget.organizationSlug,
        sourceId: publishedTarget.sourceId,
        snapshot: publishedTarget.snapshot,
        targetSlug: publishedTarget.slug,
      });
    }
    return (
      <PublishedTargetFunnel
        pageSlug={slug}
        snapshot={publishedTarget.snapshot}
        targetId={publishedTarget.id}
        versionId={publishedTarget.versionId}
        themeSnapshot={publishedTarget.themeSnapshot}
        consentSnapshot={publishedTarget.consentSnapshot}
      />
    );
  }

  if (await getPublicationControlByDomain(normalizeHostHeader(host))) {
    notFound();
  }

  // Find funnel by domain
  const funnel = await getFunnelFromDomain(host);
  if (!funnel) {
    notFound();
  }

  // Fetch page with all blocks, breakpoints, tracking events
  const page = await db.query.funnelPage.findFirst({
    where: and(
      eq(funnelPageTable.funnelId, funnel.id),
      eq(funnelPageTable.slug, slug),
    ),
    with: {
      funnelBlocks: {
        with: {
          funnelBreakpoints: true,
          funnelBlockEvents: true,
        },
        orderBy: (block) => [asc(block.order)],
      },
    },
  });

  if (!page || !page.isPublished) {
    notFound();
  }

  // Fetch pixel integrations for the funnel
  const pixelIntegrations = await db.query.funnelPixelIntegration.findMany({
    where: and(
      eq(funnelPixelIntegrationTable.funnelId, funnel.id),
      eq(funnelPixelIntegrationTable.enabled, true),
    ),
  });

  const renderPage: PublishedPageData["page"] = {
    ...page,
    blocks: page.funnelBlocks.map(
      ({ funnelBreakpoints, funnelBlockEvents, ...block }) => ({
        ...block,
        breakpoints: funnelBreakpoints,
        trackingEvent: funnelBlockEvents[0] ?? null,
      }),
    ),
  };

  const renderData = {
    page: renderPage,
    pixelIntegrations,
  } satisfies PublishedPageData;

  return (
    <PublishedFunnelDocument
      data={renderData}
      policy={LEGACY_PUBLISHED_FUNNEL_RENDER_POLICY}
    />
  );
}

/**
 * Force dynamic rendering (disable static generation)
 * This keeps the legacy source state fresh while publication migration is pending.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;
