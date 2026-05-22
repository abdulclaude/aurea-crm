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
  generatePublishedPageHTML,
  type PublishedPageData,
} from "@/features/funnel-builder/lib/published-funnel-renderer";
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
  const hostWithoutPort = host.split(":")[0];

  // Check if it's a custom domain
  let funnel = await db.query.funnel.findFirst({
    where: and(
      eq(funnelTable.customDomain, hostWithoutPort),
      eq(funnelTable.status, "PUBLISHED"),
      eq(funnelTable.domainType, "CUSTOM")
    ),
  });

  if (funnel) return funnel;

  // Check if it's a subdomain
  // Extract subdomain from host (e.g., "testing.localhost" -> "testing")
  const parts = hostWithoutPort.split(".");

  // For localhost development: testing.localhost -> ["testing", "localhost"]
  // For production: testing.platform.com -> ["testing", "platform", "com"]
  if (parts.length >= 2) {
    const subdomain = parts[0];

    // Don't treat "www" or the base domain as a subdomain
    if (subdomain !== "www" && subdomain !== "localhost" && !hostWithoutPort.startsWith("localhost")) {
      funnel = await db.query.funnel.findFirst({
        where: and(
          eq(funnelTable.subdomain, subdomain),
          eq(funnelTable.status, "PUBLISHED"),
          eq(funnelTable.domainType, "SUBDOMAIN")
        ),
      });
    }
  }

  return funnel;
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
}: DomainFunnelPageProps): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";

  const funnel = await getFunnelFromDomain(host);
  if (!funnel) {
    return {
      title: "Page Not Found",
    };
  }

  const page = await db.query.funnelPage.findFirst({
    where: and(eq(funnelPageTable.funnelId, funnel.id), eq(funnelPageTable.slug, slug)),
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

  // Find funnel by domain
  const funnel = await getFunnelFromDomain(host);
  if (!funnel) {
    notFound();
  }

  // Fetch page with all blocks, breakpoints, tracking events
  const page = await db.query.funnelPage.findFirst({
    where: and(eq(funnelPageTable.funnelId, funnel.id), eq(funnelPageTable.slug, slug)),
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

  if (!page) {
    notFound();
  }

  // Fetch pixel integrations for the funnel
  const pixelIntegrations = await db.query.funnelPixelIntegration.findMany({
    where: and(
      eq(funnelPixelIntegrationTable.funnelId, funnel.id),
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
