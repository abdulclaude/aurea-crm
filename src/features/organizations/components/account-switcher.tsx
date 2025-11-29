"use client";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { IconDoor as LogOutIcon } from "central-icons/IconDoor";
import { IconPeopleCopy as UsersIcon } from "central-icons/IconPeopleCopy";
import { IconInvite as InviteIcon } from "central-icons/IconInvite";
import { IconStores as ClientsIcon } from "central-icons/IconStores";
import { IconBuildings as WorkspaceSettingsIcon } from "central-icons/IconBuildings";
import { ChevronDownIcon, Layers2Icon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

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

  // All agency members can see and switch between clients
  // Agency Staff will only see their assigned clients (filtered server-side)
  const canSwitchClients = !!activeOrg?.role;

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-36 flex " asChild>
        <Button
          variant="ghost"
          className={cn(
            "rounded-sm text-left font-medium text-xs flex items-center justify-between h-max! hover:bg-foreground hover:text-black border-none transition duration-150 px-1! py-1! pr-2.5!",
            className
          )}
        >
          <div className="flex items-center gap-1">
            <Avatar className="size-6">
              <AvatarImage
                src={currentAccountLogo}
                className="object-scale-down size-5 pl-1"
              />

              <AvatarFallback className="bg-[#202E32] brightness-120 text-white text-[10px]">
                {(currentAccountName?.[0] ?? "O").toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <span className="truncate text-[11px] font-medium tracking-tight">
              {currentAccountName.slice(0, 14)}
              {currentAccountName.length > 14 && "..."}
            </span>
          </div>

          <ChevronDownIcon className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56 text-primary">
        <DropdownMenuLabel className="flex min-w-0 flex-col space-y-1.5 text-primary">
          <div className=" flex flex-col">
            <span className="truncate text-xs font-semibold text-primary">
              {currentAccountName}
            </span>

            {activeClient && activeOrg?.name ? (
              <span className="truncate text-xs font-normal text-primary/75">
                <span className="text-[10px]"> via {activeOrg.name} </span>
              </span>
            ) : !activeClient ? (
              <span className="truncate text-[10px] font-medium text-primary/75">
                {activeOrg?.ownerName ?? activeOrg?.ownerEmail}
              </span>
            ) : null}
          </div>
        </DropdownMenuLabel>

        {canSwitchClients && (
          <>
            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />

            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 hover:bg-foreground hover:text-black group">
                  <ClientsIcon className="size-3.5 text-primary/75 group-hover:text-black" />

                  <span className="text-xs text-primary/75 group-hover:text-black tracking-tight">
                    Switch to client
                  </span>
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent className="w-64 ml-2.5 text-primary border-black/5 flex flex-col gap-y-0 p-0">
                  {clients && clients.length > 0 ? (
                    clients.map((client) => {
                      const selected =
                        client.isActive ??
                        client.subaccountId === activeSubaccountId;
                      return (
                        <DropdownMenuItem
                          key={client.subaccountId ?? client.id}
                          className={cn(
                            "flex items-center gap-2 bg-background hover:bg-foreground hover:text-black hover:opacity-100! p-2 px-3 m-1 group",
                            selected &&
                              "bg-foreground hover:bg-primary-foreground opacity-100!"
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
                            <div className="bg-foreground text-primary text-xs grid size-6 shrink-0 place-items-center rounded">
                              {(client.name?.[0] ?? "C").toUpperCase()}
                            </div>
                          )}
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-medium text-primary/75 group-hover:text-primary">
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
                      className="text-primary/75 text-xs px-3"
                    >
                      No clients found
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-0.5" />

                  <DropdownMenuItem
                    className="bg-background hover:bg-foreground hover:text-black group p-2 px-3 m-1"
                    onClick={() => {
                      router.push("/clients/new");
                    }}
                  >
                    <PlusIcon className=" size-3 text-primary/75 group-hover:text-black transition duration-150" />
                    <span className="text-xs font-medium text-primary/75 group-hover:text-black transition duration-150">
                      Create new client
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {activeSubaccountId && (
                <DropdownMenuItem
                  className={cn(
                    "flex items-center gap-3 hover:bg-foreground hover:text-black group",
                    !activeSubaccountId &&
                      "hover:bg-foreground hover:text-black"
                  )}
                  onClick={() => handleSwitch(null)}
                >
                  <Layers2Icon className="size-3 text-primary/75 group-hover:text-black" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[11px] font-medium truncate">
                      Back to {activeOrg?.name ?? "Agency"}'s workspace
                    </span>
                  </div>

                  {isSwitching === "agency" && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Switching...
                    </span>
                  )}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
          </>
        )}

        <DropdownMenuItem
          className="group"
          onClick={() => {
            router.push("/settings/members");
          }}
        >
          <UsersIcon className="text-primary/75 group-hover:text-black size-3.5" />
          <span className="text-xs group-hover:text-black text-primary/75 tracking-tight">
            Manage members
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="group"
          onClick={() => {
            router.push("/invites");
          }}
        >
          <InviteIcon className="text-primary/75 group-hover:text-black size-3.5" />
          <span className="text-xs group-hover:text-black text-primary/75 tracking-tight">
            Invites
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-0.5" />

        <DropdownMenuItem
          className="group"
          onClick={() => {
            router.push("/settings/workspace");
          }}
        >
          <WorkspaceSettingsIcon className="text-primary/75 group-hover:text-black size-3.5" />
          <span className="text-xs group-hover:text-black text-primary/75 tracking-tight">
            Workspace settings
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AccountSwitcher;
