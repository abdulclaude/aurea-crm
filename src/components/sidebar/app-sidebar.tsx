"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { IconAnalytics as AnalyticsIcon } from "central-icons/IconAnalytics";
import { IconCalendarClock as TimeLogsIcon } from "central-icons/IconCalendarClock";
import { IconConstructionHelmet as WorkersIcon } from "central-icons/IconConstructionHelmet";
import { IconCuteRobot as Bot } from "central-icons/IconCuteRobot";
import { IconGroup1 as UsersIcon } from "central-icons/IconGroup1";
import { IconHistory as ExecutionsIcon } from "central-icons/IconHistory";
import { IconHomeRoof as HomeIcon } from "central-icons/IconHomeRoof";
import { IconImagineAi } from "central-icons/IconImagineAi";
import { IconPayment as WorkflowsIcon } from "central-icons/IconPayment";
import { IconVerticalAlignmentCenter as PipelinesIcon } from "central-icons/IconVerticalAlignmentCenter";

import { IconCalendar3 as ClassesIcon } from "central-icons/IconCalendar3";
import { IconCalendarClock4 as RotasIcon } from "central-icons/IconCalendarClock4";
import { IconDumbell as AppsIcon } from "central-icons/IconDumbell";
import { IconReceiptBill as Receipt } from "central-icons/IconReceiptBill";

import {
  Handshake,
  NotebookPen,
  ScrollText,
  Zap,
  FileText,
  Boxes,
  Palette,
  RefreshCw,
  Clock,
  Banknote,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import AccountSwitcher from "@/features/organizations/components/account-switcher";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const baseMenuItems = [
  {
    title: "General",
    items: [
      {
        title: "Home",
        icon: HomeIcon,
        url: "/dashboard",
      },
      {
        title: "Assistant",
        icon: Bot,
        url: "/assistant",
      },
      {
        title: "Logs",
        icon: ScrollText,
        url: "/logs",
      },
    ],
  },
  {
    title: "Automations",
    items: [
      {
        title: "Workflows",
        icon: WorkflowsIcon,
        url: "/workflows",
      },
      {
        title: "Bundles",
        icon: IconImagineAi,
        url: "/bundles",
      },
      {
        title: "Executions",
        icon: ExecutionsIcon,
        url: "/executions",
      },
    ],
  },
  {
    title: "Clients",
    items: [
      {
        title: "Manage clients",
        icon: UsersIcon,
        url: "/clients",
      },
    ],
  },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const trpc = useTRPC();

  const { state: sidebarState } = useSidebar();
  const isIconMode = sidebarState === "collapsed";

  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );

  const { data: orgs } = useSuspenseQuery(
    trpc.organizations.getMyOrganizations.queryOptions()
  );

  // Fetch modules to check if Time Tracking is enabled
  const { data: modules = [] } = useSuspenseQuery(
    trpc.modules.listAvailable.queryOptions()
  );

  const activeOrg =
    orgs?.find((o) => o.id === active?.activeOrganizationId) ?? orgs?.[0];

  // All agency members can see Clients menu
  // (Staff will only see their assigned clients, filtered server-side)
  const canSeeClients = !!activeOrg?.role;

  const activeClient = active?.activeSubaccount ?? null;

  // Check if Time Tracking module is enabled
  const isTimeTrackingEnabled = modules.some(
    (m) => m.type === "TIME_TRACKING" && m.enabled
  );

  // Check if Pilates Studio module is enabled
  const isPilatesStudioEnabled = modules.some(
    (m) => m.type === "PILATES_STUDIO" && m.enabled
  );

  // Check if Invoicing module is enabled
  const isInvoicingEnabled = modules.some(
    (m) => m.type === "INVOICING" && m.enabled
  );

  const crmMenuItem = {
    title: "CRM",
    items: [
      {
        title: "Contacts",
        icon: NotebookPen,
        url: "/contacts",
      },
      {
        title: "Deals",
        icon: Handshake,
        url: "/deals",
      },
      {
        title: "Pipelines",
        icon: PipelinesIcon,
        url: "/pipelines",
      },
    ],
  };

  const timeTrackingMenuItem = {
    title: "Shift tracking",
    items: [
      {
        title: "Time logs",
        icon: TimeLogsIcon,
        url: "/time-logs",
      },
      {
        title: "Rotas",
        icon: RotasIcon,
        url: "/rotas",
      },
      {
        title: "Staff",
        icon: WorkersIcon,
        url: "/workers",
      },
      {
        title: "Payroll",
        icon: Banknote,
        url: "/payroll",
      },
      {
        title: "Requests",
        icon: Clock,
        url: "/requests",
      },
    ],
  };

  const builderMenuItem = {
    title: "Builder",
    items: [
      {
        title: "Funnels",
        icon: Zap,
        url: "/funnels",
      },
      {
        title: "Forms",
        icon: FileText,
        url: "/builder/forms",
      },
      {
        title: "Library",
        icon: Boxes,
        url: "/builder/library",
      },
    ],
  };

  const analyticsMenuItem = {
    title: "Analytics",
    items: [
      {
        title: "Analytics",
        icon: AnalyticsIcon,
        url: "/analytics",
      },
    ],
  };

  const pilatesStudioMenuItem = {
    title: "Pilates Studio",
    items: [
      {
        title: "Classes",
        icon: ClassesIcon,
        url: "/studio/classes",
      },
      {
        title: "Mindbody",
        icon: AppsIcon,
        url: "/studio/mindbody",
      },
    ],
  };

  const invoicingMenuItem = {
    title: "Invoicing",
    items: [
      {
        title: "Invoices",
        icon: Receipt,
        url: "/invoices",
      },
      {
        title: "Recurring",
        icon: RefreshCw,
        url: "/invoices/recurring",
      },
      {
        title: "Templates",
        icon: FileText,
        url: "/invoices/templates",
      },
    ],
  };

  const menuItems = [
    ...baseMenuItems,
    builderMenuItem,
    crmMenuItem,
    ...(isTimeTrackingEnabled ? [timeTrackingMenuItem] : []),
    ...(isInvoicingEnabled ? [invoicingMenuItem] : []),
    ...(isPilatesStudioEnabled ? [pilatesStudioMenuItem] : []),
    analyticsMenuItem,
  ];

  const visibleMenuItems = menuItems.filter((group) => {
    if (group.title === "Clients") {
      if (!canSeeClients) return false;
      if (activeClient) return false;
    }
    return true;
  });

  const groupedMenuItems = isIconMode
    ? [
        {
          title: "All",
          items: visibleMenuItems.flatMap((group) => group.items),
        },
      ]
    : visibleMenuItems;

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

      <SidebarContent className="bg-background text-primary flex flex-col pt-4">
        {groupedMenuItems.map((group) => (
          <Collapsible
            key={group.title}
            defaultOpen={false}
            className="group/collapsible w-full"
          >
            <SidebarGroup className={cn(isIconMode && "px-1", "w-full")}>
              <SidebarGroupLabel
                className={cn(
                  "text-primary/60 text-[11px] select-none group-data-[collapsible=icon]:hidden w-full",
                  canSeeClients &&
                    activeClient &&
                    group.title === "Clients" &&
                    "text-amber-200"
                )}
                asChild
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between hover:text-primary/80 transition-colors">
                  {group.title}
                  <ChevronDown className="ml-auto size-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 group-data-[collapsible=icon]:hidden" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu className={cn("gap-1", isIconMode && "gap-2")}>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={
                            item.url === "/"
                              ? pathname === "/"
                              : pathname.startsWith(item.url)
                          }
                          asChild
                          className={cn(
                            "gap-x-2.5 text-xs py-2 px-2.5 rounded-sm transition duration-150 hover:bg-primary-foreground!",
                            pathname === item.url && "bg-primary-foreground!"
                          )}
                        >
                          <Link
                            href={item.url}
                            prefetch
                            className="group/menu-item"
                          >
                            <item.icon
                              className={cn(
                                "size-3.5 select-none text-primary/80 group-hover/menu-item:text-primary",
                                pathname === item.url &&
                                  "text-black group-hover/menu-item:text-black"
                              )}
                            />

                            <span
                              className={cn(
                                "text-primary/80 group-hover/menu-item:text-primary font-medium tracking-tight",
                                pathname === item.url &&
                                  "text-black font-medium group-hover/menu-item:text-black",
                                "group-data-[collapsible=icon]:sr-only"
                              )}
                            >
                              {item.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
