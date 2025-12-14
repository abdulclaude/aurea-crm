import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { generatePublishedPageHTML } from "@/features/funnel-builder/lib/published-funnel-renderer";

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
  const sessionRecord = await prisma.session.findUnique({
    where: { token: session.session.token },
    select: { activeOrganizationId: true },
  });

  // Fetch page with all blocks (no status check for preview)
  const page = await prisma.funnelPage.findFirst({
    where: {
      funnel: {
        id: funnelId,
      },
      slug: slug,
    },
    include: {
      funnel: true,
      funnelBlock: {
        include: {
          funnelBreakpoint: true,
          funnelBlockEvent: true,
          smartSectionInstance: {
            include: {
              smartSection: true,
            },
          },
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

  // Verify user has access to this funnel
  // Check if user is a member of the organization or has access to a subaccount in this org
  const hasMembership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: page.funnel.organizationId,
    },
  });

  const hasSubaccountAccess = await prisma.subaccountMember.findFirst({
    where: {
      userId: session.user.id,
      subaccount: {
        organizationId: page.funnel.organizationId,
      },
    },
  });

  if (!hasMembership && !hasSubaccountAccess) {
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
