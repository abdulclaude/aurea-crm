import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { generatePublishedPageHTML } from "@/features/funnel-builder/lib/published-funnel-renderer";
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

  const page = await prisma.funnelPage.findFirst({
    where: {
      funnel: {
        id: funnelId,
        status: "PUBLISHED",
      },
      slug: slug,
    },
  });

  if (!page) {
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
  const page = await prisma.funnelPage.findFirst({
    where: {
      funnel: {
        id: funnelId,
        status: "PUBLISHED",
      },
      slug: slug,
    },
    include: {
      funnelBlock: {
        include: {
          funnelBreakpoint: true,
          funnelBlockEvent: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!page) {
    notFound();
  }

  // Fetch pixel integrations for the funnel
  const pixelIntegrations = await prisma.funnelPixelIntegration.findMany({
    where: {
      funnelId: funnelId,
      enabled: true,
    },
  });

  // Generate complete HTML with tracking
  const html = generatePublishedPageHTML({
    page: page as any,
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
