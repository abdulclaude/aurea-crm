"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { IconAnalytics as AnalyticsIcon } from "central-icons/IconAnalytics";
import { IconCalendarClock as TimeLogsIcon } from "central-icons/IconCalendarClock";
import { IconConstructionHelmet as InstructorsIcon } from "central-icons/IconConstructionHelmet";
import { IconGroup1 as MembersGroupIcon } from "central-icons/IconGroup1";
import { IconHomeRoof as HomeIcon } from "central-icons/IconHomeRoof";
import { IconCalendar3 as ClassesIcon } from "central-icons/IconCalendar3";
import { IconReceiptBill as Receipt } from "central-icons/IconReceiptBill";

import {
  Zap,
  FileText,
  Banknote,
  ChevronDown,
  History,
  Send,
  Rocket,
  Gift,
  Star,
  Users,
  CreditCard,
  DoorOpen,
  Sparkles,
  Package,
  Settings,
  Workflow,
  ListChecks,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import AccountSwitcher from "@/features/organizations/components/account-switcher";
import { useIsInstructor } from "@/features/instructors/hooks/use-is-instructor";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

interface SidebarItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
}

type SidebarGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SidebarItem[];
};

function CompletionRing({ pct }: { pct: number }) {
  const size = 18;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const center = size / 2;
  const color = pct >= 66 ? "#14b8a6" : pct >= 33 ? "#f59e0b" : "#ef4444";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
      />
    </svg>
  );
}

const AppSidebar = () => {
  const pathname = usePathname();
  const trpc = useTRPC();

  const { state: sidebarState } = useSidebar();
  const isIconMode = sidebarState === "collapsed";

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Home: true,
    "Schedule & booking": true,
    Members: true,
    Earnings: true,
    Team: true,
    Revenue: true,
    Marketing: false,
    Automations: true,
    Reports: false,
  });

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

  const FAVORITES_KEY = "sidebar-favorites";
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((url: string) => {
    setFavorites((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  }, []);

  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions(),
  );

  const { isInstructor } = useIsInstructor();

  const activeClient = active?.activeLocation ?? null;

  const enabled = !!activeClient;
  const { data: launchpadProgress } = useQuery({
    ...trpc.launchpad.progress.queryOptions(),
    enabled,
  });
  const launchpadPct = enabled ? (launchpadProgress?.percentage ?? 0) : 0;

  const instructorMenuItems: SidebarGroup[] = [
    {
      title: "Home",
      icon: HomeIcon,
      items: [
        { title: "Dashboard", icon: HomeIcon, url: "/dashboard" },
        { title: "My schedule", icon: ClassesIcon, url: "/my-schedule" },
      ],
    },
    {
      title: "Classes",
      icon: ClassesIcon,
      items: [
        { title: "My classes", icon: ClassesIcon, url: "/my-classes" },
        {
          title: "Substitutions",
          icon: InstructorsIcon,
          url: "/studio/substitutions",
        },
      ],
    },
    {
      title: "Earnings",
      icon: Banknote,
      items: [
        { title: "Earnings", icon: Banknote, url: "/my-earnings" },
        { title: "Time logs", icon: TimeLogsIcon, url: "/time-logs" },
      ],
    },
  ];

  const adminMenuItems: SidebarGroup[] = [
    {
      title: "Schedule & booking",
      icon: ClassesIcon,
      items: [
        { title: "Schedule", icon: ClassesIcon, url: "/studio/schedule" },
        { title: "Service types", icon: ListChecks, url: "/studio/service-types" },
        { title: "Classes", icon: ClassesIcon, url: "/studio/classes" },
        { title: "Check-in", icon: DoorOpen, url: "/studio/check-in" },
      ],
    },
    {
      title: "Members",
      icon: MembersGroupIcon,
      items: [
        { title: "Clients", icon: Users, url: "/clients" },
        { title: "Households", icon: Users, url: "/households" },
        { title: "Waivers", icon: FileText, url: "/waivers" },
      ],
    },
    {
      title: "Revenue",
      icon: Receipt,
      items: [
        { title: "Overview", icon: CreditCard, url: "/revenue" },
        { title: "Pricing options", icon: Receipt, url: "/studio/pricing-options" },
        { title: "Memberships", icon: Receipt, url: "/studio/memberships" },
        { title: "Invoices", icon: Receipt, url: "/invoices" },
        { title: "Products & POS", icon: Package, url: "/studio/pos" },
        { title: "Gift cards", icon: Gift, url: "/studio/gift-cards" },
      ],
    },
    {
      title: "Team",
      icon: InstructorsIcon,
      items: [
        { title: "Staff", icon: InstructorsIcon, url: "/team" },
        { title: "Payroll", icon: Banknote, url: "/payroll" },
        { title: "Time logs", icon: TimeLogsIcon, url: "/time-logs" },
      ],
    },
    {
      title: "Marketing",
      icon: Send,
      items: [
        { title: "Campaigns", icon: Send, url: "/campaigns" },
        { title: "Intro offers", icon: Sparkles, url: "/intro-offers" },
        { title: "Referrals", icon: Gift, url: "/referrals" },
        { title: "Funnels & forms", icon: Zap, url: "/funnels" },
      ],
    },
    {
      title: "Automations",
      icon: Workflow,
      items: [
        { title: "Workflows", icon: Workflow, url: "/workflows" },
        { title: "Executions", icon: History, url: "/executions" },
        { title: "Bundles", icon: Package, url: "/bundles" },
      ],
    },
    {
      title: "Reports",
      icon: AnalyticsIcon,
      items: [
        { title: "Reports", icon: AnalyticsIcon, url: "/reports" },
      ],
    },
  ];

  const menuItems = isInstructor ? instructorMenuItems : adminMenuItems;

  const visibleMenuItems = menuItems;

  const allItems = visibleMenuItems.flatMap((group) => group.items);
  const pinnedItems = favorites
    .map((url) => allItems.find((item) => item.url === url))
    .filter(Boolean) as SidebarItem[];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="bg-background text-primary h-14 border-b border-black/5 dark:border-white/5 p-0 items-center justify-center flex">
        <SidebarMenuItem
          className="p-0 items-center justify-between group-data-[collapsible=icon]:justify-center w-full h-full px-2"
          data-tooltip="Toggle Sidebar"
        >
          <AccountSwitcher className="group-data-[collapsible=icon]:hidden" />
          <SidebarTrigger className="group-data-[collapsible=icon]:inline-flex" />
        </SidebarMenuItem>
      </SidebarHeader>

      <SidebarContent
        className={cn(
          "bg-background text-primary flex flex-col flex-1 overflow-y-auto",
          isIconMode ? "pt-4 gap-1 items-center" : "pt-4",
        )}
      >
        {/* Launchpad — admin only, outside AnimatePresence for reliable rendering */}
        {!isInstructor && (
          <div className="mb-1 w-full px-2 group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Link
              href="/launchpad"
              className={cn(
                "group/lp relative flex w-full items-center gap-x-2.5 rounded-sm px-2.5 py-2 text-xs transition duration-150 hover:bg-primary-foreground",
                "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0",
                pathname.startsWith("/launchpad") &&
                  "bg-primary-foreground",
              )}
            >
              <Rocket
                className={cn(
                  "size-3.5 shrink-0 text-primary/80 group-hover/lp:text-primary group-data-[collapsible=icon]:size-4",
                  pathname.startsWith("/launchpad") && "text-black",
                )}
              />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
                <span
                  className={cn(
                    "font-medium tracking-tight text-primary/80 group-hover/lp:text-primary",
                    pathname.startsWith("/launchpad") && "text-black",
                  )}
                >
                  Launchpad
                </span>
                <CompletionRing pct={launchpadPct} />
              </div>
              <svg
                viewBox="0 0 32 32"
                className="absolute inset-0 size-full pointer-events-none hidden group-data-[collapsible=icon]:block"
              >
                <circle
                  cx={16}
                  cy={16}
                  r={13}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={2}
                />
                <circle
                  cx={16}
                  cy={16}
                  r={13}
                  fill="none"
                  stroke={
                    launchpadPct >= 66
                      ? "#14b8a6"
                      : launchpadPct >= 33
                        ? "#f59e0b"
                        : "#ef4444"
                  }
                  strokeWidth={2}
                  strokeDasharray={2 * Math.PI * 13}
                  strokeDashoffset={
                    2 * Math.PI * 13 * (1 - launchpadPct / 100)
                  }
                  strokeLinecap="round"
                  transform="rotate(-90 16 16)"
                  style={{
                    transition:
                      "stroke-dashoffset 0.5s ease, stroke 0.5s ease",
                  }}
                />
              </svg>
            </Link>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isIconMode ? (
            <motion.div
              key="icon-mode"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-1 items-center w-full"
            >
              {/* Pinned items */}
              {pinnedItems.length > 0 && (
                <>
                  {pinnedItems.map((item) => (
                    <SidebarMenuItem key={`pin-${item.url}`}>
                      <SidebarMenuButton
                        tooltip={`★ ${item.title}`}
                        isActive={pathname.startsWith(item.url)}
                        asChild
                        className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-sm transition duration-150 hover:bg-primary-foreground",
                          pathname.startsWith(item.url) &&
                            "bg-primary-foreground",
                        )}
                      >
                        <Link href={item.url} prefetch>
                          <item.icon
                            className={cn(
                              "size-4 select-none text-primary/80 hover:text-primary",
                              pathname.startsWith(item.url) &&
                                "text-black hover:text-black",
                            )}
                          />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <div className="w-6 border-t border-black/5 dark:border-white/5 my-1" />
                </>
              )}

              {/* Group icons — each links to the first item in the group */}
              {visibleMenuItems.map((group) => {
                const GroupIcon = group.icon;
                const firstUrl = group.items[0]?.url ?? "/";
                const isGroupActive = group.items.some((item) =>
                  pathname.startsWith(item.url),
                );

                return (
                  <SidebarMenuItem key={group.title}>
                    <SidebarMenuButton
                      tooltip={group.title}
                      isActive={isGroupActive}
                      asChild
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-sm transition duration-150 hover:bg-primary-foreground",
                        isGroupActive && "bg-primary-foreground",
                      )}
                    >
                      <Link href={firstUrl} prefetch>
                        <GroupIcon
                          className={cn(
                            "size-4 select-none text-primary/80 hover:text-primary",
                            isGroupActive && "text-black hover:text-black",
                          )}
                        />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="expanded-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              {/* Pinned items */}
              {pinnedItems.length > 0 && (
                <div className="px-2 mb-2">
                  <div className="text-primary/60 text-[11px] select-none px-2 py-2 mb-2">
                    Pinned
                  </div>
                  <div className="space-y-1">
                    {pinnedItems.map((item) => {
                      const isActive =
                        item.url === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.url);
                      const Icon = item.icon;

                      return (
                        <div key={item.url} className="group/pin relative">
                          <Link
                            href={item.url}
                            className={cn(
                              "flex items-center gap-x-2.5 text-xs py-2 px-2.5 rounded-sm transition duration-150 hover:bg-primary-foreground group/menu-item",
                              isActive && "bg-primary-foreground",
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-3.5 select-none text-primary/80 group-hover/menu-item:text-primary flex-shrink-0",
                                isActive &&
                                  "text-black group-hover/menu-item:text-black",
                              )}
                            />
                            <span
                              className={cn(
                                "flex-1 text-primary/80 group-hover/menu-item:text-primary font-medium tracking-tight",
                                isActive &&
                                  "text-black font-medium group-hover/menu-item:text-black",
                              )}
                            >
                              {item.title}
                            </span>
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavorite(item.url);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/pin:opacity-100 transition-opacity"
                          >
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Groups */}
              {visibleMenuItems.map((group) => {
                const isOpen = openGroups[group.title];
                const GroupIcon = group.icon;
                const isGroupActive = group.items.some((item) =>
                  item.url === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.url),
                );

                return (
                  <div key={group.title} className="px-2 mb-2">
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className={cn(
                        "text-xs select-none px-2.5 py-2 mb-1 w-full flex items-center gap-x-2.5 hover:bg-primary-foreground transition-colors rounded-sm",
                        isGroupActive
                          ? "bg-primary-foreground"
                          : "text-primary/80",
                      )}
                    >
                      <GroupIcon
                        className={cn(
                          "size-3 shrink-0",
                          isGroupActive
                            ? "text-black dark:text-white"
                            : "text-primary/80 dark:text-white/60",
                        )}
                      />
                      <span
                        className={cn(
                          "flex-1 text-left font-medium tracking-tight",
                          isGroupActive
                            ? "text-black dark:text-white"
                            : "text-primary/80",
                        )}
                      >
                        {group.title}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          style={{ overflow: "hidden" }}
                        >
                          <div className="space-y-0.5">
                            {group.items.map((item, index) => {
                              const isActive =
                                item.url === "/"
                                  ? pathname === "/"
                                  : pathname.startsWith(item.url);
                              const isFav = favorites.includes(item.url);

                              return (
                                <div
                                  key={item.title}
                                  className="group/fav relative"
                                >
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{
                                      duration: 0.2,
                                      delay: index * 0.03,
                                    }}
                                  >
                                    <Link
                                      href={item.url}
                                      className={cn(
                                        "flex items-center text-xs py-2 pl-7 pr-2.5 rounded-sm transition duration-150 hover:bg-primary-foreground group/menu-item",
                                        isActive && "bg-primary-foreground",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "flex-1 text-primary/80 group-hover/menu-item:text-primary font-medium tracking-tight",
                                          isActive &&
                                            "text-black font-medium group-hover/menu-item:text-black",
                                        )}
                                      >
                                        {item.title}
                                      </span>
                                    </Link>
                                  </motion.div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleFavorite(item.url);
                                    }}
                                    className={cn(
                                      "absolute right-2.5 top-1/2 -translate-y-1/2 z-10 transition-opacity",
                                      isFav
                                        ? "opacity-100"
                                        : "opacity-0 group-hover/fav:opacity-100",
                                    )}
                                  >
                                    <Star
                                      className={cn(
                                        "size-3",
                                        isFav
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-primary/30 hover:text-amber-400",
                                      )}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarContent>

      {!isInstructor && (
        <SidebarFooter className="border-t border-black/5 bg-background p-2 dark:border-white/5">
          <SidebarMenuItem className="w-full">
            <SidebarMenuButton
              tooltip="Studio settings"
              isActive={pathname.startsWith("/settings/workspace")}
              asChild
              className={cn(
                "h-9 justify-start rounded-sm px-2.5 text-xs hover:bg-primary-foreground",
                "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0",
                pathname.startsWith("/settings/workspace") &&
                  "bg-primary-foreground",
              )}
            >
              <Link href="/settings/workspace" prefetch>
                <Settings
                  className={cn(
                    "size-3.5 shrink-0 text-primary/80",
                    pathname.startsWith("/settings/workspace") && "text-black",
                  )}
                />
                <span className="font-medium tracking-tight text-primary/80 group-data-[collapsible=icon]:hidden">
                  Studio settings
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarFooter>
      )}
    </Sidebar>
  );
};

export default AppSidebar;
