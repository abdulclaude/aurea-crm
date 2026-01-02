"use client";

import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

export function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAnalyticsPage = pathname.includes("/analytics");
  
  // If it's an analytics page, don't wrap in SidebarProvider at all
  // The analytics layout will provide its own sidebar
  if (isAnalyticsPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="z-10">
        <AppSidebar />
      </div>
      <SidebarInset className="bg-accent/20 overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
