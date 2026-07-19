"use client";

import type { CSSProperties, ReactNode } from "react";

import AppSidebar from "@/components/sidebar/app-sidebar";
import { FloatingAssistant } from "@/components/ai/floating-assistant";
import { FloatingAssistantTabs } from "@/components/ai/floating-assistant-tabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  SidebarPreferencesProvider,
  useSidebarPreferences,
} from "@/components/sidebar/sidebar-preferences";
import { usePathname } from "next/navigation";

export function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSettings = pathname === "/settings" || pathname.startsWith("/settings/");

  if (isSettings) {
    return <>{children}</>;
  }

  return (
    <SidebarPreferencesProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarPreferencesProvider>
  );
}

function DashboardShell({ children }: { children: ReactNode }): React.JSX.Element {
  const { width, isResizing } = useSidebarPreferences();

  return (
    <SidebarProvider
      data-resizing={isResizing}
      className="h-svh overflow-hidden data-[resizing=true]:[&_[data-slot=sidebar-container]]:transition-none data-[resizing=true]:[&_[data-slot=sidebar-gap]]:transition-none"
      style={{ "--sidebar-width": `${width}px` } as CSSProperties}
    >
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
