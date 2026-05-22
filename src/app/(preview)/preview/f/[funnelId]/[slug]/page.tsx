import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  funnelPage as funnelPageTable,
  funnelPixelIntegration as funnelPixelIntegrationTable,
  member,
  session as sessionTable,
  location,
  locationMember,
} from "@/db/schema";
import {
  generatePublishedPageHTML,
  type PublishedPageData,
} from "@/features/funnel-builder/lib/published-funnel-renderer";

interface PreviewFunnelPageProps {
  params: Promise<{
    funnelId: string;
    slug: string;
  }>;
}

/**
 * Preview Funnel Page (Draft Mode)
 *
 * Allows authenticated users to preview draft funnels before publishing
 */
export default async function PreviewFunnelPage({
  params,
}: PreviewFunnelPageProps) {
  const { funnelId, slug } = await params;

  // Check authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    notFound();
  }

  // Get active organization from session record
  const sessionRecord = await db.query.session.findFirst({
    where: eq(sessionTable.token, session.session.token),
    columns: { activeOrganizationId: true },
  });

  // Fetch page with all blocks (no status check for preview)
  const page = await db.query.funnelPage.findFirst({
    where: and(eq(funnelPageTable.funnelId, funnelId), eq(funnelPageTable.slug, slug)),
    with: {
      funnel: true,
      funnelBlocks: {
        with: {
          funnelBreakpoints: true,
          funnelBlockEvents: true,
          smartSectionInstance: {
            with: {
              smartSection: true,
            },
          },
        },
        orderBy: (block) => [asc(block.order)],
      },
    },
  });

  if (!page) {
    notFound();
  }

  // Verify user has access to this funnel
  // Check if user is a member of the organization or has access to a location in this org
  const hasMembership = await db.query.member.findFirst({
    where: and(
      eq(member.userId, session.user.id),
      eq(member.organizationId, page.funnel.organizationId)
    ),
    columns: { id: true },
  });

  const [hasLocationAccess] = await db
    .select({ id: locationMember.id })
    .from(locationMember)
    .innerJoin(location, eq(location.id, locationMember.locationId))
    .where(
      and(
        eq(locationMember.userId, session.user.id),
        eq(location.organizationId, page.funnel.organizationId)
      )
    )
    .limit(1);

  if (!hasMembership && !hasLocationAccess) {
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

  // Return raw HTML response with preview banner
  return (
    <>
      {/* Preview Banner - positioned to work with dashboard layout */}
      <div className="sticky top-0 z-50 bg-yellow-500 text-yellow-950 px-4 py-2.5 text-center text-sm font-medium border-b border-yellow-600 shadow-sm">
        <span className="inline-flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            <path
              fillRule="evenodd"
              d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
              clipRule="evenodd"
            />
          </svg>
          Preview Mode - This is how your funnel will look when published
        </span>
      </div>

      {/* Funnel Content */}
      <div
        dangerouslySetInnerHTML={{
          __html: html,
        }}
      />
    </>
  );
}

/**
 * Force dynamic rendering
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;
