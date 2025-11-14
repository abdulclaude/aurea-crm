import AppHeader from "@/components/sidebar/app-header";
import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[#1A2326] text-white"> {children} </main>
    </>
  );
};

export default Layout;
