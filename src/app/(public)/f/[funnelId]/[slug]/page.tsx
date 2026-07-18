import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  funnelPage as funnelPageTable,
  funnelPixelIntegration as funnelPixelIntegrationTable,
} from "@/db/schema";
import {
  LEGACY_PUBLISHED_FUNNEL_RENDER_POLICY,
  type PublishedPageData,
} from "@/features/funnel-builder/lib/published-funnel-renderer";
import { PublishedFunnelDocument } from "@/features/funnel-builder/lib/published-funnel-document";
import { publicationSeoConfigSchema } from "@/features/publications/contracts";
import { getPublishedFunnelPage } from "@/features/publications/public/funnel-snapshot";
import { PublishedTargetFunnel } from "@/features/publications/public/published-target-funnel";
import {
  getPublicationControlBySource,
  getPublishedPublicationBySource,
} from "@/features/publications/public/resolver";
import type { Metadata } from "next";

interface PublishedFunnelPageProps {
  params: Promise<{
    funnelId: string;
    slug: string;
  }>;
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
}: PublishedFunnelPageProps): Promise<Metadata> {
  const { funnelId, slug } = await params;

  const page = await db.query.funnelPage.findFirst({
    where: and(
      eq(funnelPageTable.funnelId, funnelId),
      eq(funnelPageTable.slug, slug),
    ),
    with: {
      funnel: {
        columns: { status: true, organizationId: true, locationId: true },
      },
    },
  });

  if (!page) {
    return {
      title: "Page Not Found",
    };
  }

  const source = {
    organizationId: page.funnel.organizationId,
    locationId: page.funnel.locationId,
    kind: "FUNNEL" as const,
    sourceKey: `funnel:${funnelId}`,
  };
  const control = await getPublicationControlBySource(source);
  if (control) {
    const published = await getPublishedPublicationBySource(source);
    if (!published) return { title: "Page Not Found" };
    try {
      const snapshotPage = getPublishedFunnelPage({
        snapshot: published.snapshot,
        pageSlug: slug,
      }).data.page;
      const seo = publicationSeoConfigSchema.parse(published.seoSnapshot);
      const title = seo.title ?? snapshotPage.metaTitle ?? snapshotPage.name;
      const description = seo.description ?? snapshotPage.metaDescription ?? undefined;
      const image = seo.imageUrl ?? snapshotPage.metaImage;
      return {
        title,
        description,
        alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
        robots: { index: seo.index, follow: seo.follow },
        openGraph: { title, description, images: image ? [image] : [] },
      };
    } catch {
      return { title: "Page Not Found" };
    }
  }

  if (!page.isPublished || page.funnel.status !== "PUBLISHED") {
    return { title: "Page Not Found" };
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
 * Published Funnel Page
 *
 * Renders a published funnel page with:
 * - Tracking disabled until the funnel is moved to consent-aware publication
 * - Explicitly policy-gated custom CSS/JS
 * - SEO metadata
 */
export default async function PublishedFunnelPage({
  params,
}: PublishedFunnelPageProps) {
  const { funnelId, slug } = await params;

  // Fetch page with all blocks, breakpoints, tracking events
  const page = await db.query.funnelPage.findFirst({
    where: and(
      eq(funnelPageTable.funnelId, funnelId),
      eq(funnelPageTable.slug, slug),
    ),
    with: {
      funnel: {
        columns: { status: true, organizationId: true, locationId: true },
      },
      funnelBlocks: {
        with: {
          funnelBreakpoints: true,
          funnelBlockEvents: true,
        },
        orderBy: (block) => [asc(block.order)],
      },
    },
  });

  if (!page) {
    notFound();
  }

  const source = {
    organizationId: page.funnel.organizationId,
    locationId: page.funnel.locationId,
    kind: "FUNNEL" as const,
    sourceKey: `funnel:${funnelId}`,
  };
  const control = await getPublicationControlBySource(source);
  if (control) {
    const published = await getPublishedPublicationBySource(source);
    if (!published) notFound();
    return (
      <PublishedTargetFunnel
        pageSlug={slug}
        snapshot={published.snapshot}
        targetId={published.id}
        versionId={published.versionId}
        themeSnapshot={published.themeSnapshot}
        consentSnapshot={published.consentSnapshot}
      />
    );
  }

  if (!page.isPublished || page.funnel.status !== "PUBLISHED") {
    notFound();
  }

  // Fetch pixel integrations for the funnel
  const pixelIntegrations = await db.query.funnelPixelIntegration.findMany({
    where: and(
      eq(funnelPixelIntegrationTable.funnelId, funnelId),
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
