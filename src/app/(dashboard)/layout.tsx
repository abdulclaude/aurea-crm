import type { Metadata } from "next";
import { db } from "@/db";
import { member, locationMember } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayoutWrapper } from "@/components/dashboard-layout-wrapper";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { count, eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Dashboard" };

const Layout = async ({ children }: { children: React.ReactNode }) => {
  // Ensure the user has at least one organization or location membership
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Check for organization membership
  const [{ count: organizationMembershipCount }] = await db
    .select({ count: count() })
    .from(member)
    .where(eq(member.userId, session.user.id));

  // Check for location membership (client workspace access)
  const [{ count: locationMembershipCount }] = await db
    .select({ count: count() })
    .from(locationMember)
    .where(eq(locationMember.userId, session.user.id));

  // Only redirect to onboarding if user has neither organization nor location membership
  if (organizationMembershipCount === 0 && locationMembershipCount === 0) {
    redirect("/onboarding/studio");
  }

  // Prefetch session-bound queries so client components (sidebar, header, pages)
  // receive cached data during hydration instead of making unauthenticated SSR requests.
  void prefetch(trpc.organizations.getActive.queryOptions());
  void prefetch(trpc.organizations.getMyOrganizations.queryOptions());
  void prefetch(trpc.modules.listAvailable.queryOptions());
  void prefetch(trpc.instructors.getMyInstructorProfile.queryOptions());

  return (
    <HydrateClient>
      <DashboardLayoutWrapper>
        {children}
      </DashboardLayoutWrapper>
    </HydrateClient>
  );
};

export default Layout;
