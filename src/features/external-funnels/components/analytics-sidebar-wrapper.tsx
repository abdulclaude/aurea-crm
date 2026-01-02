"use client";

import { AnalyticsSidebar } from "@/features/external-funnels/components/analytics-sidebar";
import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppHeader from "@/components/sidebar/app-header";
import { createContext, useContext, useState, useCallback } from "react";

// Create a separate context for the analytics sidebar to avoid conflicts with main sidebar
type AnalyticsSidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const AnalyticsSidebarContext = createContext<AnalyticsSidebarContextProps | null>(null);

export function useAnalyticsSidebar() {
  const context = useContext(AnalyticsSidebarContext);
  if (!context) {
    throw new Error("useAnalyticsSidebar must be used within AnalyticsSidebarWrapper");
  }
  return context;
}

function AnalyticsSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  
  const toggleSidebar = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const state = open ? "expanded" : "collapsed";

  return (
    <AnalyticsSidebarContext.Provider
      value={{ state, open, setOpen, toggleSidebar }}
    >
      {children}
    </AnalyticsSidebarContext.Provider>
  );
}

export function AnalyticsSidebarWrapper({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ funnelId: string }>;
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AnalyticsSidebarProvider>
        <div className="flex w-screen h-screen overflow-hidden">
          {/* Main app sidebar - leftmost */}
          <AppSidebar />
          
          {/* Analytics sidebar - next to main sidebar */}
          <AnalyticsSidebar params={params} />
          
          {/* Content area - takes remaining width */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <AppHeader />
            <div className="flex-1 bg-accent/20 overflow-y-auto overflow-x-hidden">
              {children}
            </div>
          </div>
        </div>
      </AnalyticsSidebarProvider>
    </SidebarProvider>
  );
}
