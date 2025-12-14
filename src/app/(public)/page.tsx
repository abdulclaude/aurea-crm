import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import prisma from "@/lib/db";

/**
 * Root Public Page Handler
 *
 * Handles requests to subdomain or custom domain root (e.g., subdomain.platform.com/)
 * Redirects to the first page of the funnel if one is found
 */
export default async function PublicRootPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  // Remove port if present (e.g., "testing.localhost:3000" -> "testing.localhost")
  const hostWithoutPort = host.split(":")[0];

  // Check if it's a custom domain
  let funnel = await prisma.funnel.findFirst({
    where: {
      customDomain: hostWithoutPort,
      status: "PUBLISHED",
      domainType: "CUSTOM",
    },
    include: {
      funnelPage: {
        orderBy: { order: "asc" },
        take: 1,
      },
    },
  });

  // Check if it's a subdomain
  if (!funnel) {
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
          include: {
            funnelPage: {
              orderBy: { order: "asc" },
              take: 1,
            },
          },
        });
      }
    }
  }

  // If no funnel found, show 404
  if (!funnel) {
    notFound();
  }

  // Redirect to first page
  const firstPage = funnel.funnelPage[0];
  if (!firstPage) {
    notFound();
  }

  redirect(`/${firstPage.slug}`);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
