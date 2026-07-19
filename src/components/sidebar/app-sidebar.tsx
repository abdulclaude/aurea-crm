"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { GettingStartedCard } from "./getting-started-card";
import { SidebarFooterActions } from "./sidebar-footer-actions";
import { sidebarIcons } from "./sidebar-icons";
import { SidebarResizeHandle } from "./sidebar-resize-handle";
import { useSidebarPreferences } from "./sidebar-preferences";
import type { SidebarGroup, SidebarItem } from "./sidebar-types";

const NavigationIcons = sidebarIcons.navigation;
const GroupIcons = sidebarIcons.groups;
const ItemIcons = sidebarIcons.items;

function isItemRouteActive(pathname: string, url: string): boolean {
  return pathname === url || pathname.startsWith(`${url}/`);
}

function isSidebarItemActive(pathname: string, item: SidebarItem): boolean {
  return [item.url, ...(item.activeUrls ?? [])].some((url) =>
    isItemRouteActive(pathname, url),
  );
}

const SIDEBAR_FAVORITE_ALIASES: Record<string, string> = {
  "/archives": "/workflows",
  "/bundles": "/workflows",
  "/households": "/clients",
  "/referrals": "/intro-offers",
  "/studio/class-series": "/studio/classes",
  "/studio/gift-cards": "/studio/account-credit",
  "/studio/promo-codes": "/studio/account-credit",
  "/studio/rooms": "/studio/service-types",
  "/studio/substitutions": "/team",
};

const AppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const trpc = useTRPC();

  const prefetchRoute = useCallback(
    (url: string) => router.prefetch(url),
    [router],
  );

  const { state: sidebarState } = useSidebar();
  const isIconMode = sidebarState === "collapsed";
  const { isGroupVisible, isItemVisible } = useSidebarPreferences();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((previous) =>
      previous[groupTitle] ? {} : { [groupTitle]: true },
    );
  };

  const FAVORITES_KEY = "sidebar-favorites";
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FAVORITES_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (
        Array.isArray(parsed) &&
        parsed.every((value): value is string => typeof value === "string")
      ) {
        setFavorites(
          Array.from(
            new Set(
              parsed.map((url) => SIDEBAR_FAVORITE_ALIASES[url] ?? url),
            ),
          ),
        );
      }
    } catch {
      setFavorites([]);
    }
    setFavoritesHydrated(true);
  }, []);

  useEffect(() => {
    if (!favoritesHydrated) return;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites, favoritesHydrated]);

  const toggleFavorite = useCallback((url: string) => {
    setFavorites((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  }, []);

  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions(),
  );

  const { isInstructor } = useIsInstructor();

  const activeLocation = active?.activeLocation ?? null;

  const enabled = favoritesHydrated && !!activeLocation;
  const { data: launchpadProgress } = useQuery({
    ...trpc.launchpad.progress.queryOptions(),
    enabled,
  });
  const gettingStartedSteps = [
    {
      id: "service-type",
      title: "Add a service type",
      href: "/studio/service-types",
      isComplete: launchpadProgress?.hasClassTypes ?? false,
    },
    {
      id: "room",
      title: "Add a room",
      href: "/studio/rooms",
      isComplete: launchpadProgress?.hasRooms ?? false,
    },
    {
      id: "instructor",
      title: "Add an instructor",
      href: "/team",
      isComplete: launchpadProgress?.hasInstructors ?? false,
    },
    {
      id: "class",
      title: "Create a class",
      href: "/studio/classes",
      isComplete: launchpadProgress?.hasClasses ?? false,
    },
    {
      id: "schedule",
      title: "Build your schedule",
      href: "/studio/schedule",
      isComplete: launchpadProgress?.hasFutureBookableClass ?? false,
    },
  ];
  const gettingStartedPercentage = Math.round(
    (gettingStartedSteps.filter((step) => step.isComplete).length /
      gettingStartedSteps.length) *
      100,
  );

  const instructorMenuItems: SidebarGroup[] = [
    {
      title: "Home",
      icon: GroupIcons.home,
      items: [
        {
          title: "Dashboard",
          icon: NavigationIcons.dashboard,
          url: "/dashboard",
        },
        {
          title: "My schedule",
          icon: ItemIcons.schedule,
          url: "/my-schedule",
        },
      ],
    },
    {
      title: "Classes",
      icon: GroupIcons.classes,
      items: [
        {
          title: "My classes",
          icon: ItemIcons.classes,
          url: "/my-classes",
        },
        {
          title: "Substitutions",
          icon: ItemIcons.subRequests,
          url: "/studio/substitutions",
        },
      ],
    },
    {
      title: "Earnings",
      icon: GroupIcons.earnings,
      items: [
        {
          title: "Earnings",
          icon: ItemIcons.earnings,
          url: "/my-earnings",
        },
        {
          title: "Time logs",
          icon: ItemIcons.timeLogs,
          url: "/time-logs",
        },
      ],
    },
  ];

  const adminMenuItems: SidebarGroup[] = [
    {
      title: "Schedule & booking",
      icon: GroupIcons.scheduleBooking,
      items: [
        {
          title: "Schedule",
          icon: ItemIcons.schedule,
          url: "/studio/schedule",
        },
        {
          title: "Classes",
          icon: ItemIcons.classes,
          url: "/studio/classes",
          activeUrls: ["/studio/class-series"],
        },
        {
          title: "Check-in",
          icon: ItemIcons.checkIn,
          url: "/studio/check-in",
        },
        {
          title: "Schedule setup",
          icon: ItemIcons.scheduleSetup,
          url: "/studio/service-types",
          activeUrls: ["/studio/rooms"],
        },
      ],
    },
    {
      title: "People",
      icon: GroupIcons.people,
      items: [
        {
          title: "Members",
          icon: ItemIcons.members,
          url: "/clients",
          activeUrls: ["/households"],
        },
        { title: "Waivers", icon: ItemIcons.waivers, url: "/waivers" },
      ],
    },
    {
      title: "Revenue",
      icon: GroupIcons.revenue,
      items: [
        {
          title: "Overview",
          icon: ItemIcons.revenueOverview,
          url: "/revenue",
        },
        {
          title: "Pricing options",
          icon: ItemIcons.pricingOptions,
          url: "/studio/pricing-options",
        },
        { title: "Invoices", icon: ItemIcons.invoices, url: "/invoices" },
        {
          title: "Products & POS",
          icon: ItemIcons.productsPos,
          url: "/studio/pos",
        },
        {
          title: "Credits & promotions",
          icon: ItemIcons.creditsPromotions,
          url: "/studio/account-credit",
          activeUrls: ["/studio/gift-cards", "/studio/promo-codes"],
        },
      ],
    },
    {
      title: "Marketing",
      icon: GroupIcons.marketing,
      items: [
        {
          title: "Campaigns",
          icon: ItemIcons.campaigns,
          url: "/campaigns",
        },
        {
          title: "Growth tools",
          icon: ItemIcons.growthTools,
          url: "/intro-offers",
          activeUrls: ["/referrals"],
        },
        { title: "Forms", icon: ItemIcons.forms, url: "/builder/forms" },
      ],
    },
    {
      title: "Automations",
      icon: GroupIcons.automations,
      items: [
        {
          title: "Workflows",
          icon: ItemIcons.workflows,
          url: "/workflows",
          activeUrls: ["/archives", "/bundles"],
        },
        {
          title: "Executions",
          icon: ItemIcons.executions,
          url: "/executions",
        },
      ],
    },
  ];

  const menuItems = isInstructor ? instructorMenuItems : adminMenuItems;
  const allStandaloneItems: SidebarItem[] = isInstructor
    ? []
    : [
        {
          title: "Dashboard",
          icon: NavigationIcons.dashboard,
          url: "/dashboard",
        },
        { title: "Inbox", icon: NavigationIcons.inbox, url: "/inbox" },
        {
          title: "Team",
          icon: NavigationIcons.team,
          url: "/team",
          activeUrls: ["/studio/substitutions"],
        },
        {
          title: "Reports",
          icon: NavigationIcons.reports,
          url: "/reports",
        },
        ...(process.env.NODE_ENV !== "production"
          ? [
              {
                title: "Route checklist",
                icon: ItemIcons.routeChecklist,
                url: "/qa/routes",
              },
            ]
          : []),
      ];

  const visibleMenuItems = menuItems
    .filter((group) => isGroupVisible(group.title))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isItemVisible(item.url)),
    }))
    .filter((group) => group.items.length > 0);
  const standaloneItems = allStandaloneItems.filter((item) =>
    isItemVisible(item.url),
  );

  const activeGroupTitle = visibleMenuItems.find((group) =>
    group.items.some((item) => isSidebarItemActive(pathname, item)),
  )?.title;

  useEffect(() => {
    setOpenGroups(activeGroupTitle ? { [activeGroupTitle]: true } : {});
  }, [activeGroupTitle, pathname]);

  const allItems = [
    ...standaloneItems,
    ...visibleMenuItems.flatMap((group) => group.items),
  ];
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
          "flex flex-1 flex-col overflow-y-auto bg-background text-primary",
          isIconMode ? "items-center gap-1 pt-2" : "pt-2",
        )}
      >
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
                        isActive={isSidebarItemActive(pathname, item)}
                        asChild
                        className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-sm transition duration-150 hover:bg-primary-foreground",
                          isSidebarItemActive(pathname, item) &&
                            "bg-primary-foreground",
                        )}
                      >
                        <Link
                          href={item.url}
                          prefetch={false}
                          onMouseEnter={() => prefetchRoute(item.url)}
                          onFocus={() => prefetchRoute(item.url)}
                        >
                          <item.icon
                            className={cn(
                              "size-4 select-none text-primary/80 hover:text-primary",
                              isSidebarItemActive(pathname, item) &&
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

              {standaloneItems.map((item) => {
                const isActive = isSidebarItemActive(pathname, item);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      asChild
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-sm transition duration-150 hover:bg-primary-foreground",
                        isActive && "bg-primary-foreground",
                      )}
                    >
                      <Link
                        href={item.url}
                        prefetch={false}
                        onMouseEnter={() => prefetchRoute(item.url)}
                        onFocus={() => prefetchRoute(item.url)}
                      >
                        <item.icon
                          className={cn(
                            "size-4 select-none text-primary/80 hover:text-primary",
                            isActive && "text-black hover:text-black",
                          )}
                        />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Group icons */}
              {visibleMenuItems.map((group) => {
                const GroupIcon = group.icon;
                const isGroupActive = group.items.some((item) =>
                  isSidebarItemActive(pathname, item),
                );

                return (
                  <DropdownMenu key={group.title}>
                    <SidebarMenuItem>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          tooltip={group.title}
                          isActive={isGroupActive}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-sm transition duration-150 hover:bg-primary-foreground",
                            isGroupActive && "bg-primary-foreground",
                          )}
                        >
                          <GroupIcon
                            className={cn(
                              "size-4 select-none text-primary/80 hover:text-primary",
                              isGroupActive && "text-black hover:text-black",
                            )}
                          />

                          <span className="sr-only">Open {group.title}</span>
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={8}
                        className="min-w-44 border-black/5 bg-background p-1 text-primary shadow-2xs dark:border-white/5"
                      >
                        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium text-primary/60">
                          {group.title}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
                        {group.items.map((item) => {
                          const isActive = isSidebarItemActive(pathname, item);

                          return (
                            <DropdownMenuItem
                              key={item.url}
                              asChild
                              className={cn(
                                "cursor-pointer text-xs focus:bg-primary-foreground focus:text-primary",
                                isActive && "bg-primary-foreground",
                              )}
                            >
                              <Link
                                href={item.url}
                                prefetch={false}
                                onMouseEnter={() => prefetchRoute(item.url)}
                                onFocus={() => prefetchRoute(item.url)}
                              >
                                <item.icon
                                  className={cn(
                                    "size-3.5 text-primary/80",
                                    isActive && "text-black",
                                  )}
                                />
                                <span>{item.title}</span>
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </SidebarMenuItem>
                  </DropdownMenu>
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
                        isSidebarItemActive(pathname, item);
                      const Icon = item.icon;

                      return (
                        <div key={item.url} className="group/pin relative">
                          <Link
                            href={item.url}
                            prefetch={false}
                            onMouseEnter={() => prefetchRoute(item.url)}
                            onFocus={() => prefetchRoute(item.url)}
                            className={cn(
                              "flex items-center gap-x-2.5 text-xs py-2 px-2.5 rounded-sm transition duration-150 hover:bg-primary-foreground group/menu-item",
                              isActive && "bg-primary-foreground",
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-4 select-none text-primary/80 group-hover/menu-item:text-primary flex-shrink-0",
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
                            <NavigationIcons.favorite className="size-3 text-amber-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {standaloneItems.length > 0 ? (
                <div className="mb-2 space-y-1 px-2">
                  {standaloneItems.map((item) => {
                    const isActive = isSidebarItemActive(pathname, item);
                    return (
                      <Link
                        key={item.url}
                        href={item.url}
                        prefetch={false}
                        onMouseEnter={() => prefetchRoute(item.url)}
                        onFocus={() => prefetchRoute(item.url)}
                        className={cn(
                          "flex items-center gap-x-2 rounded-sm px-2.5 py-2 text-[11px] font-medium tracking-tight text-primary/80 transition duration-150 hover:bg-primary-foreground hover:text-primary subpixel-antialiased",
                          isActive && "bg-primary-foreground text-black",
                        )}
                      >
                        <item.icon className="size-3.5 antialiased shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}

              {/* Groups */}
              {visibleMenuItems.map((group) => {
                const isOpen = openGroups[group.title];
                const GroupIcon = group.icon;
                const isGroupActive = group.items.some((item) =>
                  isSidebarItemActive(pathname, item),
                );

                return (
                  <div key={group.title} className="px-2 mb-2">
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className={cn(
                        "text-xs select-none px-2.5 py-2 mb-1 w-full flex items-center gap-x-2 hover:bg-primary-foreground transition-colors rounded-sm",
                        isGroupActive
                          ? "bg-primary-foreground"
                          : "text-primary/80",
                      )}
                    >
                      <GroupIcon
                        className={cn(
                          "size-3 shrink-0",
                          isGroupActive
                            ? "text-primary dark:text-white"
                            : "text-primary/75 dark:text-white/60",
                        )}
                      />
                      <span
                        className={cn(
                          "flex-1 text-left font-medium tracking-tight",
                          isGroupActive
                            ? "text-primary dark:text-white"
                            : "text-primary/75",
                        )}
                      >
                        {group.title}
                      </span>
                      <NavigationIcons.expandGroup
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
                              const isActive = isSidebarItemActive(
                                pathname,
                                item,
                              );
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
                                      prefetch={false}
                                      onMouseEnter={() =>
                                        prefetchRoute(item.url)
                                      }
                                      onFocus={() => prefetchRoute(item.url)}
                                      className={cn(
                                        "flex items-center text-xs py-2 pl-7.5 pr-2.5 rounded-sm transition duration-150 hover:bg-primary-foreground group/menu-item",
                                        isActive && "bg-primary-foreground",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "flex-1 text-primary/50 group-hover/menu-item:text-primary font-medium tracking-tight",
                                          isActive &&
                                            "text-primary font-medium group-hover/menu-item:text-black",
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
                                    <NavigationIcons.favorite
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
        <SidebarFooter className="gap-1 bg-background p-3 pt-2">
          <GettingStartedCard
            percentage={gettingStartedPercentage}
            steps={gettingStartedSteps}
            celebrationKey={`${active?.activeOrganizationId ?? "unknown"}:${active?.activeLocationId ?? "all"}`}
          />
          <SidebarFooterActions
            groups={menuItems}
            standaloneItems={allStandaloneItems}
          />
        </SidebarFooter>
      )}
      <SidebarResizeHandle />
    </Sidebar>
  );
};

export default AppSidebar;
