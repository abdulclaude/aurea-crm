"use client";

import AppSidebar from "@/components/sidebar/app-sidebar";
import { FloatingAssistant } from "@/components/ai/floating-assistant";
import { FloatingAssistantTabs } from "@/components/ai/floating-assistant-tabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

export function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFunnelAnalytics = /\/funnels\/[^/]+\/analytics/.test(pathname);

  if (isFunnelAnalytics) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-accent/20">
        <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
        <FloatingAssistantTabs />
      </SidebarInset>
      <FloatingAssistant />
    </SidebarProvider>
  );
}
