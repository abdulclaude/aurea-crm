"use client";

import { use, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  FileText,
  Calendar,
  Clock,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ArrowLeftRight,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useWorkerProfile } from "@/features/workers/hooks/use-workers";

interface WorkerSession {
  workerId: string;
  name: string;
  subaccountId: string | null;
  authenticatedAt: string;
  sessionExpiry?: string;
}

const PORTAL_SESSION_DURATION_DAYS = 7; // 7 days session duration

function getSessionExpiry(): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + PORTAL_SESSION_DURATION_DAYS);
  return expiry.toISOString();
}

function isSessionValid(session: WorkerSession): boolean {
  if (!session.sessionExpiry) return true; // Legacy sessions without expiry
  return new Date(session.sessionExpiry) > new Date();
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

function getNavItems(workerId: string): NavItem[] {
  return [
    {
      href: `/portal/${workerId}/dashboard`,
      label: "Dashboard",
      icon: LayoutDashboard,
      description: "Clock in/out & overview",
    },
    {
      href: `/portal/${workerId}/earnings`,
      label: "Earnings",
      icon: DollarSign,
      description: "Hours & payments",
    },
    {
      href: `/portal/${workerId}/time-logs`,
      label: "Time Logs",
      icon: Clock,
      description: "Work history",
    },
    {
      href: `/portal/${workerId}/schedule`,
      label: "My Schedule",
      icon: Calendar,
      description: "Upcoming shifts",
    },
    {
      href: `/portal/${workerId}/requests`,
      label: "My Requests",
      icon: ArrowLeftRight,
      description: "Shift swaps & time off",
    },
    {
      href: `/portal/${workerId}/documents`,
      label: "Documents",
      icon: FileText,
      description: "Certifications",
    },
    {
      href: `/portal/${workerId}/profile`,
      label: "My Profile",
      icon: User,
      description: "Personal information",
    },
  ];
}

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
        "hover:bg-primary/5",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-primary/60 hover:text-primary"
      )}
    >
      <Icon className="size-5 shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium">{item.label}</span>
        {item.description && (
          <span className="text-xs text-primary/40 truncate">
            {item.description}
          </span>
        )}
      </div>
      {isActive && <ChevronRight className="size-4 ml-auto shrink-0" />}
    </Link>
  );
}

function SidebarContent({
  workerId,
  workerName,
  profilePhoto,
  onLogout,
  onNavClick,
}: {
  workerId: string;
  workerName: string;
  profilePhoto?: string | null;
  onLogout: () => void;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const navItems = getNavItems(workerId);

  const initials = workerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="p-4 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">WP</span>
          </div>
          <div>
            <h1 className="font-semibold text-primary">Worker Portal</h1>
            <p className="text-xs text-primary/50">Manage your work</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={profilePhoto || undefined} alt={workerName} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-primary truncate">
              {workerName}
            </p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Active
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-primary/10">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-primary/60 hover:text-red-500 hover:bg-red-500/10"
          onClick={onLogout}
        >
          <LogOut className="size-5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
}

export default function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const [workerSession, setWorkerSession] = useState<WorkerSession | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Skip auth check on auth page
  const isAuthPage = pathname.includes("/auth");

  // Check for worker session
  useEffect(() => {
    if (isAuthPage) {
      setIsLoading(false);
      return;
    }

    const session = localStorage.getItem("workerSession");
    if (!session) {
      router.push(`/portal/${workerId}/auth`);
      return;
    }

    try {
      const parsed = JSON.parse(session) as WorkerSession;

      // Check if session is for this worker
      if (parsed.workerId !== workerId) {
        router.push(`/portal/${workerId}/auth`);
        return;
      }

      // Check session expiry
      if (!isSessionValid(parsed)) {
        localStorage.removeItem("workerSession");
        router.push(`/portal/${workerId}/auth`);
        return;
      }

      // Refresh session expiry on activity
      const refreshedSession: WorkerSession = {
        ...parsed,
        sessionExpiry: getSessionExpiry(),
      };
      localStorage.setItem("workerSession", JSON.stringify(refreshedSession));

      setWorkerSession(refreshedSession);
    } catch {
      localStorage.removeItem("workerSession");
      router.push(`/portal/${workerId}/auth`);
    } finally {
      setIsLoading(false);
    }
  }, [workerId, router, isAuthPage, pathname]);

  const { data: profile } = useWorkerProfile(workerId);

  const handleLogout = () => {
    localStorage.removeItem("workerSession");
    router.push(`/portal/${workerId}/auth`);
  };

  // Show nothing while loading (prevents flash)
  if (isLoading && !isAuthPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary/50">Loading...</div>
      </div>
    );
  }

  // Auth page doesn't need the layout
  if (isAuthPage) {
    return children;
  }

  // If no session (shouldn't happen due to redirect, but safety check)
  if (!workerSession) {
    return null;
  }

  const workerName = profile?.name || workerSession.name;
  const profilePhoto = (profile as any)?.profilePhoto;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-black/20 border-r border-primary/10">
        <SidebarContent
          workerId={workerId}
          workerName={workerName}
          profilePhoto={profilePhoto}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-black/20 border-b border-primary/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">WP</span>
            </div>
            <span className="font-semibold text-primary">Worker Portal</span>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarContent
                workerId={workerId}
                workerName={workerName}
                profilePhoto={profilePhoto}
                onLogout={handleLogout}
                onNavClick={() => setMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64">
        <div className="pt-16 lg:pt-0 min-h-screen">{children}</div>
      </main>
    </div>
  );
}
