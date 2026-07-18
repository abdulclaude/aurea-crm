"use client";

import { IconChevronLeftMedium as ChevronLeftIcon } from "central-icons/IconChevronLeftMedium";
import { Button } from "../ui/button";
import { SidebarTrigger } from "../ui/sidebar";
import { UserStatusIndicator } from "@/components/user-status-indicator";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";

const BACK_BUTTON_PREFIXES = ["/reports", "/inbox"];

function getBackButton(pathname: string): {
  href?: string;
  label: string;
} | null {
  if (
    pathname === "/studio/service-types/new" ||
    /^\/studio\/service-types\/[^/]+\/edit$/.test(pathname)
  ) {
    return { href: "/studio/service-types", label: "Service types" };
  }

  if (/^\/clients\/[^/]+$/.test(pathname)) {
    return { href: "/clients", label: "Clients" };
  }

  return shouldShowBackButton(pathname) ? { label: "Go back" } : null;
}

function shouldShowBackButton(pathname: string): boolean {
  if (BACK_BUTTON_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const lastSegment = segments[segments.length - 1];
    const parentSegment = segments[segments.length - 2];
    if (
      lastSegment === "new" ||
      lastSegment === "edit" ||
      lastSegment === "editor" ||
      !["page", "layout"].includes(lastSegment) &&
        /^[a-z0-9_-]{10,}$/.test(lastSegment) &&
        !/^(dashboard|clients|deals|workflows|executions|credentials|webhooks|studio|classes|service-types|instructors|funnels|pipelines|campaigns|builder|reports|settings)$/.test(
          lastSegment,
        )
    ) {
      return true;
    }
  }

  return false;
}

const AppHeader = () => {
  const pathname = usePathname();
  const router = useRouter();
  const backButton = getBackButton(pathname);

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-2 bg-background text-primary border-b border-black/5 dark:border-white/5 px-4 w-full",
      )}
    >
      <div className="flex items-center">
        <SidebarTrigger className="mr-2 md:hidden" />
        {backButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              backButton.href
                ? router.push(backButton.href)
                : router.back()
            }
            className="gap-2 border-none"
          >
            <ChevronLeftIcon className="size-3" />
            {backButton.label}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserStatusIndicator />
      </div>
    </header>
  );
};

export default AppHeader;
