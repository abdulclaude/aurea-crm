import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  funnelPage as funnelPageTable,
  funnelPixelIntegration as funnelPixelIntegrationTable,
} from "@/db/schema";
import {
  generatePublishedPageHTML,
  type PublishedPageData,
} from "@/features/funnel-builder/lib/published-funnel-renderer";
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
    where: and(eq(funnelPageTable.funnelId, funnelId), eq(funnelPageTable.slug, slug)),
    with: {
      funnel: {
        columns: { status: true },
      },
    },
  });

  if (!page || page.funnel.status !== "PUBLISHED") {
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
 * Published Funnel Page
 *
 * Renders a published funnel page with:
 * - All tracking scripts injected
 * - Block-level event tracking
 * - Custom CSS/JS
 * - SEO metadata
 */
export default async function PublishedFunnelPage({
  params,
}: PublishedFunnelPageProps) {
  const { funnelId, slug } = await params;

  // Fetch page with all blocks, breakpoints, tracking events
  const page = await db.query.funnelPage.findFirst({
    where: and(eq(funnelPageTable.funnelId, funnelId), eq(funnelPageTable.slug, slug)),
    with: {
      funnel: {
        columns: { status: true },
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

  if (!page || page.funnel.status !== "PUBLISHED") {
    notFound();
  }

  // Fetch pixel integrations for the funnel
  const pixelIntegrations = await db.query.funnelPixelIntegration.findMany({
    where: and(
      eq(funnelPixelIntegrationTable.funnelId, funnelId),
      eq(funnelPixelIntegrationTable.enabled, true)
    ),
  });

  const renderPage: PublishedPageData["page"] = {
    ...page,
    blocks: page.funnelBlocks.map(({ funnelBreakpoints, funnelBlockEvents, ...block }) => ({
      ...block,
      breakpoints: funnelBreakpoints,
      trackingEvent: funnelBlockEvents[0] ?? null,
    })),
  };

  // Generate complete HTML with tracking
  const html = generatePublishedPageHTML({
    page: renderPage,
    pixelIntegrations,
  });

  // Return raw HTML response
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}

/**
 * Force dynamic rendering (disable static generation)
 * This ensures tracking scripts are always fresh
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;
