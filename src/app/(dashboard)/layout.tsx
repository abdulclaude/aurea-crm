import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  // Ensure the user has at least one organization; otherwise redirect to onboarding
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const membershipCount = await prisma.member.count({
    where: { userId: session.user.id },
  });

  if (membershipCount === 0) {
    redirect("/onboarding/agency");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-accent/20">{children}</SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
