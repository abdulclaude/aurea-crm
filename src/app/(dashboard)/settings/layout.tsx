"use client";

import { Suspense, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconChevronLeftMedium as ChevronLeftIcon } from "central-icons/IconChevronLeftMedium";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserStatusIndicator } from "@/components/user-status-indicator";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { SettingsNavigation } from "@/features/settings/components/settings-navigation";
import { SettingsLoading } from "@/features/settings/components/settings-loading";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Settings Header */}
      <div className="flex bg-background items-center justify-between border-b border-black/5 dark:border-white/5 p-4 h-14">
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open settings navigation"
              onClick={() => setNavigationOpen(true)}
            >
              <Menu />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 border-none"
              asChild
            >
              <Link href="/dashboard">
                <ChevronLeftIcon className="size-3" />
                Back to app
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserStatusIndicator />
          </div>

          {/* <h1 className="text-sm font-medium">Settings</h1> */}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-black/5 bg-background dark:border-white/5 md:block">
          <Suspense fallback={<SettingsLoading label="Loading navigation" />}>
            <SettingsNavigation />
          </Suspense>
        </aside>

        {/* Settings Content */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Suspense fallback={<SettingsLoading />}>{children}</Suspense>
        </main>
      </div>
      <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] overflow-y-auto">
          <SheetHeader className="border-b">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle>Settings</SheetTitle>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close settings navigation"
                >
                  <X />
                </Button>
              </SheetClose>
            </div>
            <SheetDescription className="sr-only">
              Workspace settings navigation
            </SheetDescription>
          </SheetHeader>
          <Suspense fallback={<SettingsLoading label="Loading navigation" />}>
            <SettingsNavigation onNavigate={() => setNavigationOpen(false)} />
          </Suspense>
        </SheetContent>
      </Sheet>
    </div>
  );
}
