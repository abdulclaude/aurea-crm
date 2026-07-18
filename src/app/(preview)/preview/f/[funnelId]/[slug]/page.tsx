import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelPage as funnelPageTable } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";
import {
  PREVIEW_FUNNEL_RENDER_POLICY,
  type PublishedPageData,
} from "@/features/funnel-builder/lib/published-funnel-renderer";
import { PublishedFunnelDocument } from "@/features/funnel-builder/lib/published-funnel-document";

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

  // Fetch page with all blocks (no status check for preview)
  const page = await db.query.funnelPage.findFirst({
    where: and(
      eq(funnelPageTable.funnelId, funnelId),
      eq(funnelPageTable.slug, slug),
    ),
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

  try {
    await requireCapability({
      actor: {
        userId: session.user.id,
        organizationId: page.funnel.organizationId,
        locationId: page.funnel.locationId,
      },
      capability: "publication.view",
      resource: {
        organizationId: page.funnel.organizationId,
        locationId: page.funnel.locationId,
      },
    });
  } catch (error) {
    if (
      error instanceof TRPCError &&
      (error.code === "FORBIDDEN" || error.code === "PRECONDITION_FAILED")
    ) {
      notFound();
    }
    throw error;
  }

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
    pixelIntegrations: [],
  } satisfies PublishedPageData;

  return (
    <>
      {/* Preview Banner - positioned to work with dashboard layout */}
      <div className="sticky top-0 z-50 bg-yellow-500 text-yellow-950 px-4 py-2.5 text-center text-sm font-medium border-b border-yellow-600 shadow-sm">
        <span className="inline-flex items-center gap-2">
          <Eye className="size-4" aria-hidden="true" />
          Preview Mode - This is how your funnel will look when published
        </span>
      </div>

      <PublishedFunnelDocument
        data={renderData}
        policy={PREVIEW_FUNNEL_RENDER_POLICY}
      />
    </>
  );
}

/**
 * Force dynamic rendering
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;
