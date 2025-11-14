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
  BoltIcon,
  BookOpenIcon,
  Layers2Icon,
  PinIcon,
  UserPenIcon,
  PlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";

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
  const [isSwitching, setIsSwitching] = React.useState<string | null>(null);

  const activeOrg =
    orgs?.find((o) => o.id === active?.activeOrganizationId) ?? orgs?.[0];

  const handleSwitch = async (organizationId: string) => {
    try {
      setIsSwitching(organizationId);
      // Use Better Auth client API to set active organization in the current session
      await authClient.organization.setActive({ organizationId });
      // Hard reload to re-fetch session-bound data
      window.location.reload();
    } finally {
      setIsSwitching(null);
    }
  };

  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-max p-0 flex" asChild>
        <Button
          variant="ghost"
          className={cn(
            "rounded-xl text-left font-medium text-xs flex items-center justify-between hover:bg-[#202E32] hover:text-white",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Avatar className="size-4">
              <AvatarImage src={activeOrg?.logo ?? ""} />
              <AvatarFallback>
                {(activeOrg?.name?.[0] ?? "O").toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <span className="truncate text-xs font-medium tracking-tight">
              {activeOrg?.name.slice(0, 10) ?? "Select account"}
              {activeOrg?.name.length > 10 && "..."}
            </span>
          </div>
          <ChevronDownIcon className="size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-64 bg-[#1A2326] text-white border-white/10"
      >
        <DropdownMenuLabel className="flex min-w-0 flex-col space-y-0.5">
          {activeOrg?.ownerName === activeOrg?.ownerEmail ? (
            <span className="truncate text-xs font-medium text-white">
              {activeOrg?.ownerEmail}
            </span>
          ) : (
            <>
              <span className="truncate text-sm font-medium">
                {activeOrg?.ownerName}
              </span>
              <span className="truncate text-xs font-medium text-white/50">
                {activeOrg?.ownerEmail}
              </span>
            </>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5" />

        <DropdownMenuLabel className="text-xs text-white/50">
          Clients
        </DropdownMenuLabel>

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2 hover:bg-[#202E32]! hover:text-white!">
              <UsersIcon className="size-4" />
              <span className="text-xs font-medium ">Select client</span>
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent className="w-64 bg-[#1A2326]  text-white border-white/10">
              {clients && clients.length > 0 ? (
                clients.map((client) => {
                  const selected = client.id === active?.activeOrganizationId;
                  return (
                    <DropdownMenuItem
                      key={client.id}
                      className={cn(
                        "flex items-center gap-3 hover:bg-[#202E32]! hover:text-white!",
                        selected &&
                          "bg-[#202E32] hover:bg-[#202E32] hover:brightness-120"
                      )}
                      onClick={() => handleSwitch(client.id)}
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
                      {isSwitching === client.id && (
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
                className="hover:bg-[#202E32]! hover:text-white!"
                onClick={() => {
                  router.push("/clients/new");
                }}
              >
                <PlusIcon className=" size-4" />
                <span className="text-xs font-medium">Create new client</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            onClick={() => {
              // Placeholder: Manage members route
              window.location.href = "/settings/members";
            }}
          >
            <UsersIcon className=" size-4" />
            <span className="text-xs font-medium">Manage members</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/5" />
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
