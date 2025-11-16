"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  LogOutIcon,
  SettingsIcon,
  UsersIcon,
  CreditCardIcon,
  Layers2Icon,
  PlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import Image from "next/image";
import { useRouter } from "next/navigation";

type AccountSwitcherProps = {
  className?: string;
};

export function AccountSwitcher({ className }: AccountSwitcherProps) {
  const trpc = useTRPC();

  const { data: orgs } = useSuspenseQuery(
    trpc.organizations.getMyOrganizations.queryOptions()
  );
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );
  const { data: clients } = useSuspenseQuery(
    trpc.organizations.getClients.queryOptions()
  );
  const setActiveSubaccount = useMutation(
    trpc.organizations.setActiveSubaccount.mutationOptions()
  );
  const [isSwitching, setIsSwitching] = React.useState<
    string | "agency" | null
  >(null);

  const activeOrg =
    orgs?.find((o) => o.id === active?.activeOrganizationId) ?? orgs?.[0];

  const activeClient = active?.activeSubaccount ?? null;
  const activeSubaccountId = active?.activeSubaccountId ?? null;

  const currentAccountName =
    activeClient?.companyName ?? activeOrg?.name ?? "Select account";
  const currentAccountLogo = activeClient?.logo ?? activeOrg?.logo ?? "";

  const canManageClients = activeOrg?.role === "owner";

  const handleSwitch = async (subaccountId: string | null) => {
    try {
      setIsSwitching(subaccountId ?? "agency");
      await setActiveSubaccount.mutateAsync({ subaccountId });
      // Hard reload to re-fetch session-bound data
      window.location.reload();
    } finally {
      setIsSwitching(null);
    }
  };

  const router = useRouter();

  const workspaceLabel = canManageClients
    ? activeClient
      ? "Client workspace"
      : "Agency workspace"
    : "Workspace";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-max flex" asChild>
        <Button
          variant="ghost"
          className={cn(
            "rounded-md text-left font-medium text-xs flex items-center justify-between h-max!  hover:bg-[#202E32] hover:text-white ",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Avatar className="size-4">
              <AvatarImage
                src={currentAccountLogo}
                className="object-scale-down"
              />
              <AvatarFallback>
                {(currentAccountName?.[0] ?? "O").toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <span className="truncate text-xs font-medium tracking-tight">
              {currentAccountName.slice(0, 14)}
              {currentAccountName.length > 14 && "..."}
            </span>
          </div>
          <ChevronDownIcon className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-64 bg-[#1A2326] text-white border-white/10"
      >
        <DropdownMenuLabel className="flex min-w-0 flex-col space-y-1.5 text-white">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            {workspaceLabel}
          </span>

          <div className="space-y-0.5 flex flex-col">
            <span className="truncate text-xs font-semibold text-white uppercase">
              {currentAccountName}
            </span>

            {activeClient && activeOrg?.name ? (
              <span className="truncate text-xs font-medium text-white/50">
                <span className="text-[10px]"> via {activeOrg.name} </span>
              </span>
            ) : !activeClient ? (
              <span className="truncate text-[10px] font-medium text-white/50">
                {activeOrg?.ownerEmail ?? activeOrg?.ownerName}
              </span>
            ) : null}
          </div>
        </DropdownMenuLabel>

        {canManageClients && (
          <>
            <DropdownMenuSeparator className="bg-white/5" />

            <DropdownMenuLabel className="text-xs text-white/50">
              Clients
            </DropdownMenuLabel>

            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 hover:bg-[#202E32]! hover:text-white!">
                  <UsersIcon className="size-4" />
                  <span className="text-xs font-medium ">Switch to client</span>
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent className="w-64 bg-[#1A2326] ml-3  text-white border-white/10">
                  <DropdownMenuItem
                    className={cn(
                      "flex items-center gap-3 hover:bg-[#202E32]! hover:text-white!",
                      !activeSubaccountId &&
                        "bg-[#202E32] hover:bg-[#202E32] hover:brightness-125"
                    )}
                    onClick={() => handleSwitch(null)}
                  >
                    <Layers2Icon className="size-3 text-white/60" />
                    <div className="flex min-w-0 flex-col">
                      <span className="text-[11px] text-white/50">
                        {activeSubaccountId
                          ? `Back to ${activeOrg?.name ?? "agency"}`
                          : activeOrg?.name ?? "Agency workspace"}
                      </span>
                    </div>

                    {isSwitching === "agency" && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Switching...
                      </span>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/5" />

                  {clients && clients.length > 0 ? (
                    clients.map((client) => {
                      const selected =
                        client.isActive ??
                        client.subaccountId === activeSubaccountId;
                      return (
                        <DropdownMenuItem
                          key={client.subaccountId ?? client.id}
                          className={cn(
                            "flex items-center gap-3 hover:bg-[#202E32]! hover:text-white!",
                            selected &&
                              "bg-[#202E32] hover:bg-[#202E32] hover:brightness-120"
                          )}
                          onClick={() =>
                            handleSwitch(client.subaccountId ?? null)
                          }
                        >
                          {client.logo ? (
                            <Image
                              src={client.logo ?? ""}
                              alt={client.name ?? ""}
                              width={20}
                              height={20}
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="bg-muted text-foreground/80 grid size-6 shrink-0 place-items-center rounded">
                              {(client.name?.[0] ?? "C").toUpperCase()}
                            </div>
                          )}
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-medium">
                              {client.name}
                            </span>
                          </div>
                          {isSwitching === client.subaccountId && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              Switching...
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })
                  ) : (
                    <DropdownMenuItem
                      disabled
                      className="text-white/60 text-xs px-3"
                    >
                      No clients found
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator className="bg-white/5" />

                  <DropdownMenuItem
                    className="hover:bg-[#202E32]! hover:text-white! group"
                    onClick={() => {
                      router.push("/clients/new");
                    }}
                  >
                    <PlusIcon className=" size-3 text-white/50 group-hover:text-white transition duration-150" />
                    <span className="text-xs font-medium text-white/50 group-hover:text-white transition duration-150">
                      Create new client
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/5" />
          </>
        )}
        <DropdownMenuItem
          onClick={() => {
            // Placeholder: Organization settings route
            window.location.href = "/settings";
          }}
        >
          <SettingsIcon className=" size-4" />
          <span className="text-xs font-medium">Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => authClient.customer.portal()}>
          <CreditCardIcon className=" size-4" />
          <span className="text-xs font-medium">Billing</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/5" />

        <DropdownMenuItem onClick={() => authClient.signOut()}>
          <LogOutIcon className=" size-4" />
          <span className="text-xs font-medium">Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AccountSwitcher;
