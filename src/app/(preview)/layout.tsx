import AppHeader from "@/components/sidebar/app-header";
import { db } from "@/db";
import { member, locationMember } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PresenceTracker } from "@/features/notifications/components/presence-tracker";
import { count, eq } from "drizzle-orm";

const PreviewLayout = async ({ children }: { children: React.ReactNode }) => {
  // Ensure the user is authenticated
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

  return (
    <>
      <PresenceTracker />
      <main className="flex-1 bg-background text-primary overflow-x-hidden">
        {children}
      </main>
    </>
  );
};

export default PreviewLayout;
