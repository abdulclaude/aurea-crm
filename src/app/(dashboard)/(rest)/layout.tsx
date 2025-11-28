import AppHeader from "@/components/sidebar/app-header";
import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PresenceTracker } from "@/features/notifications/components/presence-tracker";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <PresenceTracker />
      <AppHeader />
      <main className="flex-1 bg-background text-primary overflow-x-hidden">
        {children}
      </main>
    </>
  );
};

export default Layout;
