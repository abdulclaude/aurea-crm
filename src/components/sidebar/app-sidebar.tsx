"use client";

import { UsersIcon } from "lucide-react";

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
} from "@/components/ui/sidebar";

import AccountSwitcher from "@/features/organizations/components/account-switcher";

import { IconPlugin1 as WebhooksIcon } from "central-icons/IconPlugin1";
import { IconPlugin2 as IntegrationsIcon } from "central-icons/IconPlugin2";
import { IconHistory as ExecutionsIcon } from "central-icons/IconHistory";
import { IconPeopleAdd as CredentialsIcon } from "central-icons/IconPeopleAdd";
import { IconPayment as WorkflowsIcon } from "central-icons/IconPayment";
import { IconHomeRoof as HomeIcon } from "central-icons/IconHomeRoof";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

const menuItems = [
  {
    title: "General",
    items: [
      {
        title: "Home",
        icon: HomeIcon,
        url: "/dashboard",
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
        title: "Executions",
        icon: ExecutionsIcon,
        url: "/executions",
      },
    ],
  },
  {
    title: "Connections",
    items: [
      {
        title: "Credentials",
        icon: CredentialsIcon,
        url: "/credentials",
      },

      {
        title: "Webhooks",
        icon: WebhooksIcon,
        url: "/webhooks",
      },
      {
        title: "Integrations",
        icon: IntegrationsIcon,
        url: "/integrations",
      },
    ],
  },
  {
    title: "Clients",
    items: [
      {
        title: "Subaccounts",
        icon: UsersIcon,
        url: "/clients",
      },
    ],
  },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const trpc = useTRPC();

  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );

  const { data: orgs } = useSuspenseQuery(
    trpc.organizations.getMyOrganizations.queryOptions()
  );

  const activeOrg =
    orgs?.find((o) => o.id === active?.activeOrganizationId) ?? orgs?.[0];

  const canManageClients = activeOrg?.role === "owner";

  const activeClient = active?.activeSubaccount ?? null;

  const visibleMenuItems = menuItems.filter((group) => {
    if (group.title === "Clients") {
      if (!canManageClients) return false;
      if (activeClient) return false;
    }
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="bg-[#1A2326] text-white h-14 border-b border-[#252E31] p-0 items-center justify-center flex">
        <SidebarMenuItem
          className="p-0 items-center justify-between group-data-[collapsible=icon]:justify-center w-full h-full px-1.5"
          data-tooltip="Toggle Sidebar"
        >
          <AccountSwitcher className="group-data-[collapsible=icon]:hidden" />
          <SidebarTrigger className="group-data-[collapsible=icon]:inline-flex" />
        </SidebarMenuItem>
      </SidebarHeader>

      <SidebarContent className="bg-[#1A2326] text-white flex flex-col pt-4">
        {/* {activeClient && (
          <div className="mx-3 mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/70">
              Client workspace
            </p>
            <p className="text-sm font-semibold text-white">
              {activeClient.companyName}
            </p>
          </div>
        )} */}

        {visibleMenuItems.map((group) => (
          <SidebarGroup key={group.title} className="">
            <SidebarGroupLabel
              className={cn(
                "text-white/30 text-[11px]",
                canManageClients &&
                  activeClient &&
                  group.title === "Clients" &&
                  "text-amber-200"
              )}
            >
              {group.title}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
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
                      className="gap-x-2.5 text-xs py-2 px-2.5 rounded-xl"
                    >
                      <Link href={item.url} prefetch>
                        <item.icon
                          className={cn(
                            "size-3.5 text-white/50",
                            pathname === item.url && "text-white"
                          )}
                        />

                        <span
                          className={cn(
                            "text-white/50 font-medium",
                            pathname === item.url &&
                              "text-white font-semibold tracking-tight"
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
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
