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

import { cn } from "@/lib/utils";

const menuItems = [
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

      <SidebarContent className="bg-[#1A2326] text-white flex flex-col gap-0">
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-white/50 text-xs">
              {group.title}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
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
