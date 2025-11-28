import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  // Ensure the user has at least one organization or subaccount membership
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-accent/20 overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
