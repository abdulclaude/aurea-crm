import { notFound } from "next/navigation";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { generatePublishedPageHTML } from "@/features/funnel-builder/lib/published-funnel-renderer";
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
  let funnel = await prisma.funnel.findFirst({
    where: {
      customDomain: hostWithoutPort,
      status: "PUBLISHED",
      domainType: "CUSTOM",
    },
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
      funnel = await prisma.funnel.findFirst({
        where: {
          subdomain: subdomain,
          status: "PUBLISHED",
          domainType: "SUBDOMAIN",
        },
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

  const page = await prisma.funnelPage.findFirst({
    where: {
      funnelId: funnel.id,
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
  const page = await prisma.funnelPage.findFirst({
    where: {
      funnelId: funnel.id,
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
      funnelId: funnel.id,
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
