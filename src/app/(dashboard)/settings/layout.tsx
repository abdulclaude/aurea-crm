"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconChevronLeftMedium as ChevronLeftIcon } from "central-icons/IconChevronLeftMedium";
import { IconBell2 as BellIcon } from "central-icons/IconBell2";
import { IconPeopleCircle as UserIcon } from "central-icons/IconPeopleCircle";
import { IconBlock as WorkspaceIcon } from "central-icons/IconBlock";
import { IconGroup1 as MembersIcon } from "central-icons/IconGroup1";
import { IconKey2 as CredentialsIcon } from "central-icons/IconKey2";
import { IconEar as WebhooksIcon } from "central-icons/IconEar";
import { IconPlugin2 as AppsIcon } from "central-icons/IconPlugin2";
import { IconCreditCard2 as BillingIcon } from "central-icons/IconCreditCard2";
import { IconPlugin1 as ModulesIcon } from "central-icons/IconPlugin1";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserStatusIndicator } from "@/components/user-status-indicator";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

const settingsNavSections = [
  {
    title: "Account",
    items: [
      {
        title: "Profile",
        href: "/settings/profile",
        icon: UserIcon,
      },
      {
        title: "Notifications",
        href: "/settings/notifications",
        icon: BellIcon,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Workspace",
        href: "/settings/workspace",
        icon: WorkspaceIcon,
      },
      {
        title: "Members",
        href: "/settings/members",
        icon: MembersIcon,
      },
      {
        title: "Credentials",
        href: "/settings/credentials",
        icon: CredentialsIcon,
      },
      {
        title: "Webhooks",
        href: "/settings/webhooks",
        icon: WebhooksIcon,
      },
      {
        title: "Apps",
        href: "/settings/apps",
        icon: AppsIcon,
      },
      {
        title: "Modules",
        href: "/settings/modules",
        icon: ModulesIcon,
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        title: "Billing",
        href: "/settings/billing",
        icon: BillingIcon,
      },
    ],
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Settings Header */}
      <div className="flex bg-background items-center justify-between border-b border-black/5 dark:border-white/5 p-4 h-14">
        <div className="flex items-center justify-between gap-3 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2 border-none"
          >
            <ChevronLeftIcon className="size-3" />
            Go back
          </Button>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserStatusIndicator />
          </div>

          {/* <h1 className="text-sm font-medium">Settings</h1> */}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-64 border-r border-black/5 dark:border-white/5 bg-background overflow-y-auto">
          <nav className="p-4 space-y-6">
            {settingsNavSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <h3 className="px-3 text-xs font-medium text-primary/60 mb-2">
                  {section.title}
                </h3>

                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-semibold transition-colors tracking-tight",
                          isActive
                            ? "bg-primary-foreground/75 text-primary"
                            : "text-primary/60 hover:bg-primary-foreground/75 hover:text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Settings Content */}
        <main className="flex-1 overflow-y-auto ">{children}</main>
      </div>
    </div>
  );
}
