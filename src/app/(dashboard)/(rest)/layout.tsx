import AppHeader from "@/components/sidebar/app-header";
import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PresenceTracker } from "@/features/notifications/components/presence-tracker";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <PresenceTracker />
      <AppHeader />
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background text-primary">
        {children}
      </main>
    </div>
  );
};

export default Layout;
