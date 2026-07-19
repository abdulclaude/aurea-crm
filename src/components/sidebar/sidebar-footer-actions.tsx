"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { sidebarIcons } from "./sidebar-icons";
import { SidebarCustomizationDialog } from "./sidebar-customization-dialog";
import type { SidebarGroup, SidebarItem } from "./sidebar-types";

const NavigationIcons = sidebarIcons.navigation;
const ItemIcons = sidebarIcons.items;
const HELP_URL = "https://help.aurea-crm.com";
const SUPPORT_EMAIL = "support@aurea-crm.com";

const footerActionClassName =
  "h-auto justify-start gap-x-2 rounded-sm px-2.5 py-2 text-[11px] font-medium tracking-tight text-primary/80 hover:bg-primary-foreground hover:text-primary group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0";

function ExternalIndicator(): React.JSX.Element {
  return <NavigationIcons.external className="ml-auto size-3 text-primary/35" />;
}

export function SidebarFooterActions({
  groups,
  standaloneItems,
}: {
  groups: SidebarGroup[];
  standaloneItems: SidebarItem[];
}): React.JSX.Element {
  const pathname = usePathname();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const settingsActive = pathname.startsWith("/settings");

  return (
    <>
      <div className="w-full space-y-0.5">
      <SidebarMenuItem className="w-full">
        <SidebarMenuButton
          tooltip="Studio settings"
          isActive={settingsActive}
          asChild
          className={cn(
            footerActionClassName,
            settingsActive && "bg-primary-foreground text-black",
          )}
        >
          <Link href="/settings/profile" prefetch={false}>
            <NavigationIcons.settings className="size-3.5 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">
              Studio settings
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem className="w-full">
        <SidebarMenuButton
          tooltip="Help"
          asChild
          className={footerActionClassName}
        >
          <a href={HELP_URL} target="_blank" rel="noreferrer">
            <NavigationIcons.help className="size-3 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Help</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <DropdownMenu>
        <SidebarMenuItem className="w-full">
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip="Resources"
              className={footerActionClassName}
            >
              <NavigationIcons.resources className="size-3.5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">
                Resources
              </span>
            </SidebarMenuButton>
            </DropdownMenuTrigger>

          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="w-64 rounded-xl border-black/10 bg-background p-1.5 shadow-xs dark:border-white/10"
          >
            <DropdownMenuItem
              className="h-9 rounded-lg text-xs"
              onSelect={() => setCustomizeOpen(true)}
            >
              <ItemIcons.customizeSidebar className="size-3" />
              Customize sidebar
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 bg-black/5 dark:bg-white/5" />

            <DropdownMenuItem asChild className="h-9 rounded-lg text-xs">
              <a href={HELP_URL} target="_blank" rel="noreferrer">
                <ItemIcons.documentation className="size-3" />
                Documentation
                <ExternalIndicator />
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-black/5 dark:bg-white/5" />

            <DropdownMenuItem asChild className="h-9 rounded-lg text-xs">
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Aurea bug report`}>
                <ItemIcons.reportBug className="size-3" />
                Report a bug
                <ExternalIndicator />
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="h-9 rounded-lg text-xs">
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Aurea feature request`}>
                <ItemIcons.suggestFeature className="size-3" />
                Suggest a feature
                <ExternalIndicator />
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="h-9 rounded-lg text-xs">
              <a href={HELP_URL} target="_blank" rel="noreferrer">
                <ItemIcons.support className="size-3" />
                Help & support
                <ExternalIndicator />
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </SidebarMenuItem>
      </DropdownMenu>
      </div>

      <SidebarCustomizationDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        groups={groups}
        standaloneItems={standaloneItems}
      />
    </>
  );
}
