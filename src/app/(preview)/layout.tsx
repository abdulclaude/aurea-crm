import AppHeader from "@/components/sidebar/app-header";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PresenceTracker } from "@/features/notifications/components/presence-tracker";

const PreviewLayout = async ({ children }: { children: React.ReactNode }) => {
  // Ensure the user is authenticated
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Check for organization membership
  const organizationMembershipCount = await prisma.member.count({
    where: { userId: session.user.id },
  });

  // Check for subaccount membership (client workspace access)
  const subaccountMembershipCount = await prisma.subaccountMember.count({
    where: { userId: session.user.id },
  });

  // Only redirect to onboarding if user has neither organization nor subaccount membership
  if (organizationMembershipCount === 0 && subaccountMembershipCount === 0) {
    redirect("/onboarding/agency");
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
