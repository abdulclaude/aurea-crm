"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { IconAnalytics as AnalyticsIcon } from "central-icons/IconAnalytics";
import { IconCalendarClock as TimeLogsIcon } from "central-icons/IconCalendarClock";
import { IconConstructionHelmet as InstructorsIcon } from "central-icons/IconConstructionHelmet";
import { IconGroup1 as MembersGroupIcon } from "central-icons/IconGroup1";
import { IconHistory as ExecutionsIcon } from "central-icons/IconHistory";
import { IconHomeRoof as HomeIcon } from "central-icons/IconHomeRoof";
import { IconPayment as WorkflowsIcon } from "central-icons/IconPayment";
import { IconCalendar3 as ClassesIcon } from "central-icons/IconCalendar3";
import { IconDumbell as AppsIcon } from "central-icons/IconDumbell";
import { IconReceiptBill as Receipt } from "central-icons/IconReceiptBill";

import {
  Zap,
  FileText,
  Banknote,
  ChevronDown,
  Send,
  CheckSquare,
  Rocket,
  Inbox,
  Gift,
  Star,
  Users,
  CreditCard,
  UserPlus,
  DoorOpen,
  MessageSquare,
  Heart,
  Share2,
  Sparkles,
  Package,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import {
  Sidebar,
  SidebarContent,
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

interface SidebarGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SidebarItem[];
}

const locationsGroup: SidebarGroup = {
  title: "Locations",
  icon: MembersGroupIcon,
  items: [{ title: "Locations", icon: MembersGroupIcon, url: "/clients" }],
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
    Members: true,
    Classes: true,
    Earnings: true,
    Team: false,
    Revenue: false,
    Marketing: false,
    Automations: false,
    Reports: true,
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

  const { data: orgs } = useSuspenseQuery(
    trpc.organizations.getMyOrganizations.queryOptions(),
  );

  const activeOrg =
    orgs?.find((o) => o.id === active?.activeOrganizationId) ?? orgs?.[0];

  const { isInstructor } = useIsInstructor();

  const canSeeClients = !!activeOrg?.role;
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
      title: "Home",
      icon: HomeIcon,
      items: [
        { title: "Dashboard", icon: HomeIcon, url: "/dashboard" },
        { title: "Schedule", icon: ClassesIcon, url: "/studio/schedule" },
        { title: "Check-in", icon: DoorOpen, url: "/studio/check-in" },
        { title: "Inbox", icon: Inbox, url: "/inbox" },
      ],
    },
    {
      title: "Members",
      icon: MembersGroupIcon,
      items: [
        { title: "Clients", icon: Users, url: "/clients" },
        { title: "Households", icon: Users, url: "/households" },
        { title: "Member acquisition", icon: UserPlus, url: "/acquisition" },
        { title: "Tasks", icon: CheckSquare, url: "/tasks" },
        { title: "Waivers", icon: FileText, url: "/waivers" },
      ],
    },
    {
      title: "Classes",
      icon: ClassesIcon,
      items: [
        { title: "Classes", icon: ClassesIcon, url: "/studio/classes" },
        { title: "Class types", icon: AppsIcon, url: "/studio/class-types" },
        { title: "Rooms & spots", icon: HomeIcon, url: "/studio/rooms" },
        {
          title: "Substitutions",
          icon: InstructorsIcon,
          url: "/studio/substitutions",
        },
        { title: "Add-ons", icon: AppsIcon, url: "/studio/add-ons" },
      ],
    },
    {
      title: "Team",
      icon: InstructorsIcon,
      items: [
        { title: "Instructors", icon: InstructorsIcon, url: "/instructors" },
        { title: "Time logs", icon: TimeLogsIcon, url: "/time-logs" },
        { title: "Payroll", icon: Banknote, url: "/payroll" },
      ],
    },
    {
      title: "Revenue",
      icon: Receipt,
      items: [
        { title: "Overview", icon: CreditCard, url: "/revenue" },
        { title: "Memberships", icon: Receipt, url: "/studio/memberships" },
        { title: "Product catalog", icon: Package, url: "/studio/products" },
        { title: "Point of sale", icon: Receipt, url: "/studio/pos" },
        { title: "Gift cards", icon: Gift, url: "/studio/gift-cards" },
      ],
    },
    {
      title: "Marketing",
      icon: Send,
      items: [
        { title: "Campaigns", icon: Send, url: "/campaigns" },
        { title: "SMS", icon: MessageSquare, url: "/sms" },
        { title: "Intro offers", icon: Sparkles, url: "/intro-offers" },
        { title: "Referrals", icon: Share2, url: "/referrals" },
        { title: "Loyalty", icon: Heart, url: "/loyalty" },
        { title: "Funnels", icon: Zap, url: "/funnels" },
        { title: "Forms", icon: FileText, url: "/builder/forms" },
      ],
    },
    {
      title: "Automations",
      icon: WorkflowsIcon,
      items: [
        { title: "Workflows", icon: WorkflowsIcon, url: "/workflows" },
        { title: "Executions", icon: ExecutionsIcon, url: "/executions" },
      ],
    },
    {
      title: "Reports",
      icon: AnalyticsIcon,
      items: [
        { title: "Sales", icon: Receipt, url: "/reports/sales" },
        {
          title: "Payment processing",
          icon: CreditCard,
          url: "/reports/payment-processing",
        },
        { title: "Clients", icon: Users, url: "/reports/clients" },
        { title: "Staff", icon: InstructorsIcon, url: "/reports/staff" },
        { title: "Inventory", icon: Package, url: "/reports/inventory" },
      ],
    },
    locationsGroup,
  ];

  const menuItems = isInstructor ? instructorMenuItems : adminMenuItems;

  const visibleMenuItems = menuItems.filter((group) => {
    if (group.title === "Locations") {
      if (!canSeeClients) return false;
      if (activeClient) return false;
    }
    return true;
  });

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
                        canSeeClients &&
                          activeClient &&
                          group.title === "Clients" &&
                          "text-amber-200",
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
    </Sidebar>
  );
};

export default AppSidebar;
