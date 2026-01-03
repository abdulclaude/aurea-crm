"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Activity,
  Users,
  TrendingUp,
  Globe,
  Eye,
  Gauge,
  BarChart3,
  MonitorSmartphone,
  Target,
  Share2,
  Zap,
  ChevronDown,
  DollarSign,
} from "lucide-react";
import { use, useState, useEffect } from "react";
import { useAnalyticsSidebar } from "@/features/external-funnels/components/analytics-sidebar-wrapper";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { IconSidebarSimpleLeftSquare } from "central-icons/IconSidebarSimpleLeftSquare";
import { Button } from "@/components/ui/button";

interface AnalyticsSidebarProps {
  params: Promise<{ funnelId: string }>;
}

const menuGroups = [
  {
    title: "Overview",
    items: [
      {
        title: "Events",
        icon: Activity,
        url: "/events",
      },
      {
        title: "Sessions",
        icon: Eye,
        url: "/sessions",
      },
      {
        title: "Visitors",
        icon: Users,
        url: "/visitors",
      },
      {
        title: "Web Vitals",
        icon: Zap,
        url: "/web-vitals",
      },
    ],
  },
  {
    title: "Acquisition",
    items: [
      {
        title: "Sources",
        icon: Share2,
        url: "/sources",
      },
      {
        title: "UTM Campaigns",
        icon: TrendingUp,
        url: "/utm",
      },
      {
        title: "Ads",
        icon: DollarSign,
        url: "/ads",
      },
    ],
  },
  {
    title: "Audience",
    items: [
      {
        title: "Geography",
        icon: Globe,
        url: "/geography",
      },
      {
        title: "Devices",
        icon: MonitorSmartphone,
        url: "/devices",
      },
    ],
  },
  {
    title: "Conversions",
    items: [
      {
        title: "Funnel Flow",
        icon: Target,
        url: "/funnel",
      },
    ],
  },
];

// Custom trigger for analytics sidebar
function AnalyticsSidebarTrigger() {
  const { toggleSidebar } = useAnalyticsSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={toggleSidebar}
    >
      <IconSidebarSimpleLeftSquare className="size-4" />
      <span className="sr-only">Toggle Analytics Sidebar</span>
    </Button>
  );
}

export function AnalyticsSidebar({ params }: AnalyticsSidebarProps) {
  const { funnelId } = use(params);
  const pathname = usePathname();
  const basePath = `/funnels/${funnelId}/analytics`;
  const { state } = useAnalyticsSidebar();

  const isCollapsed = state === "collapsed";

  // Find which group contains the current page
  const getCurrentGroup = (currentPath: string, base: string) => {
    for (const group of menuGroups) {
      for (const item of group.items) {
        const href = `${base}${item.url}`;
        if (currentPath === href) {
          return group.title;
        }
      }
    }
    return "Overview"; // Default to Overview group if no match
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Overview: true,
    Acquisition: false,
    Audience: false,
    Conversions: false,
  });

  // Update open groups when pathname changes to auto-open the group with the active page
  // and close all other groups
  useEffect(() => {
    const currentGroup = getCurrentGroup(pathname, basePath);
    setOpenGroups({
      Overview: currentGroup === "Overview",
      Acquisition: currentGroup === "Acquisition",
      Audience: currentGroup === "Audience",
      Conversions: currentGroup === "Conversions",
    });
  }, [pathname, basePath]);

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

  return (
    <aside
      className={cn(
        "flex-shrink-0 h-screen transition-all duration-200 bg-background border-r border-black/5 dark:border-white/5 overflow-hidden",
        isCollapsed ? "w-[calc(var(--sidebar-width-icon)_+_1rem)]" : "w-52"
      )}
      data-state={state}
      data-collapsible="icon"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-background text-primary h-14 border-b border-black/5 dark:border-white/5 p-0 flex items-center">
          <div
            className={cn(
              "px-4 w-full flex items-center justify-between h-full",
              isCollapsed && "justify-center"
            )}
          >
            <h2
              className={cn("text-sm font-semibold", isCollapsed && "hidden")}
            >
              Analytics
            </h2>
            <AnalyticsSidebarTrigger />
          </div>
        </div>

        {/* Content */}
        <div
          className={cn(
            "bg-background text-primary flex flex-col flex-1 overflow-y-auto",
            isCollapsed ? "pt-4 gap-1 items-center" : "pt-4"
          )}
        >
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              // Icon mode: flatten all items into single column with animation
              <motion.div
                key="icon-mode"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-1 items-center w-full"
              >
                {menuGroups.flatMap((group) =>
                  group.items.map((item) => {
                    const href = `${basePath}${item.url}`;
                    const isActive = pathname === href;
                    const Icon = item.icon;

                    const linkContent = (
                      <Link
                        href={href}
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-sm transition duration-150 hover:bg-primary-foreground group/menu-item",
                          isActive && "bg-primary-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 select-none text-primary/80 group-hover/menu-item:text-primary",
                            isActive &&
                              "text-black group-hover/menu-item:text-black"
                          )}
                        />
                      </Link>
                    );

                    return (
                      <Tooltip key={item.title} delayDuration={0}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })
                )}
              </motion.div>
            ) : (
              // Expanded mode: show groups with animation
              <motion.div
                key="expanded-mode"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full"
              >
                {menuGroups.map((group) => {
                  const isOpen = openGroups[group.title];

                  return (
                    <div key={group.title} className="px-2 mb-2">
                      <button
                        onClick={() => toggleGroup(group.title)}
                        className="text-primary/60 text-[11px] select-none px-2 py-2 mb-2 w-full flex items-center justify-between hover:text-primary/80 hover:bg-primary-foreground transition-colors rounded-sm"
                      >
                        <span>{group.title}</span>
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 transition-transform duration-200",
                            isOpen && "rotate-180"
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
                            <div className="space-y-1">
                              {group.items.map((item, index) => {
                                const href = `${basePath}${item.url}`;
                                const isActive = pathname === href;
                                const Icon = item.icon;

                                return (
                                  <motion.div
                                    key={item.title}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{
                                      duration: 0.2,
                                      delay: index * 0.03,
                                    }}
                                  >
                                    <Link
                                      href={href}
                                      className={cn(
                                        "flex items-center gap-x-2.5 text-xs py-2 px-2.5 rounded-sm transition duration-150 hover:bg-primary-foreground group/menu-item",
                                        isActive && "bg-primary-foreground"
                                      )}
                                    >
                                      <Icon
                                        className={cn(
                                          "size-3.5 select-none text-primary/80 group-hover/menu-item:text-primary flex-shrink-0",
                                          isActive &&
                                            "text-black group-hover/menu-item:text-black"
                                        )}
                                      />
                                      <span
                                        className={cn(
                                          "text-primary/80 group-hover/menu-item:text-primary font-medium tracking-tight",
                                          isActive &&
                                            "text-black font-medium group-hover/menu-item:text-black"
                                        )}
                                      >
                                        {item.title}
                                      </span>
                                    </Link>
                                  </motion.div>
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
        </div>
      </div>
    </aside>
  );
}
