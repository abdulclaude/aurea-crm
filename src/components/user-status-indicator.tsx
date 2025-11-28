"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { IconLiveFull as StatusIcon } from "central-icons/IconLiveFull";
import { IconPeople as UserIcon } from "central-icons/IconPeople";
import { IconSettingsGear3 as SettingsIcon } from "central-icons/IconSettingsGear3";

import { IconDiamond as UpgradeIcon } from "central-icons/IconDiamond";
import { IconTicket as UsersIcon } from "central-icons/IconTicket";
import { IconRescueRing as HelpCircleIcon } from "central-icons/IconRescueRing";
import { IconDoor as LogOutIcon } from "central-icons/IconDoor";
import { IconBuildings as WorkspaceIcon } from "central-icons/IconBuildings";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { UserStatus } from "@prisma/client";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const { useSession } = authClient;

interface UserStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  textColorHover: string;
  icon: string;
  description: string;
}

const STATUS_CONFIG: Record<UserStatus, UserStatusConfig> = {
  [UserStatus.ONLINE]: {
    label: "Online",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20",
    textColor: "text-emerald-500!",
    textColorHover: "hover:text-emerald-500!",
    icon: "●",
    description: "Available to chat",
  },
  [UserStatus.WORKING]: {
    label: "Working",
    color: "bg-amber-500",
    bgColor: "bg-amber-500/10 hover:bg-amber-500/20",
    textColor: "text-amber-500!",
    textColorHover: "hover:text-amber-500!",
    icon: "●",
    description: "Focused on work",
  },
  [UserStatus.DO_NOT_DISTURB]: {
    label: "Busy",
    color: "bg-rose-500",
    bgColor: "bg-rose-500/10 hover:bg-rose-500/20",
    textColor: "text-rose-500!",
    textColorHover: "hover:text-rose-500!",
    icon: "—",
    description: "Only urgent notifications",
  },
  [UserStatus.AWAY]: {
    label: "Away",
    color: "bg-indigo-500",
    bgColor: "bg-indigo-500/10 hover:bg-indigo-500/20",
    textColor: "text-indigo-500!",
    textColorHover: "hover:text-indigo-500!",
    icon: "○",
    description: "Stepped away",
  },
  [UserStatus.OFFLINE]: {
    label: "Offline",
    color: "bg-slate-500 dark:bg-slate-600",
    bgColor: "bg-slate-500/10 hover:bg-slate-500/20",
    textColor: "text-slate-500!",
    textColorHover: "hover:text-slate-500!",
    icon: "○",
    description: "Not available",
  },
};

function UserStatusIndicatorInner() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch user status from API
  const { data: userStatus } = useSuspenseQuery(
    trpc.users.getStatus.queryOptions()
  );

  // Fetch organization and client data for quick switching
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );
  const { data: clients } = useSuspenseQuery(
    trpc.organizations.getClients.queryOptions()
  );

  const updateStatus = useMutation({
    ...trpc.users.updateStatus.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [["users", "getStatus"]],
      });
    },
  });

  const setActiveSubaccount = useMutation(
    trpc.organizations.setActiveSubaccount.mutationOptions()
  );

  const currentStatus = userStatus?.status || UserStatus.ONLINE;
  const statusConfig =
    STATUS_CONFIG[currentStatus as UserStatus] ||
    STATUS_CONFIG[UserStatus.ONLINE];

  const handleStatusChange = async (status: UserStatus) => {
    try {
      await updateStatus.mutateAsync({ status });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleQuickSwitch = async () => {
    const activeSubaccountId = active?.activeSubaccountId;

    if (activeSubaccountId) {
      // We're in a client account, switch to the next client or back to agency
      const currentIndex =
        clients?.findIndex((c) => c.subaccountId === activeSubaccountId) ?? -1;

      if (currentIndex !== -1 && clients && currentIndex < clients.length - 1) {
        // Switch to next client
        await setActiveSubaccount.mutateAsync({
          subaccountId: clients[currentIndex + 1].subaccountId ?? null,
        });
      } else {
        // Go back to agency workspace
        await setActiveSubaccount.mutateAsync({ subaccountId: null });
      }
    } else if (clients && clients.length > 0) {
      // We're in agency workspace, switch to first client
      await setActiveSubaccount.mutateAsync({
        subaccountId: clients[0].subaccountId ?? null,
      });
    }

    window.location.reload();
  };

  // Check if user has premium subscription
  // TODO: Implement premium check with Polar subscription
  const isPremium = false; // Placeholder

  if (!session?.user) return null;

  const initials =
    session.user.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const canQuickSwitch = clients && clients.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="relative size-8 cursor-pointer">
          <Avatar className="size-8 rounded-full">
            {session.user.image ? (
              <AvatarImage
                src={session.user.image}
                alt={session.user.name || "User"}
              />
            ) : (
              <AvatarFallback className="bg-[#202e32] text-[11px] text-white">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>

          <span
            className={cn(
              "absolute top-[calc(100%-8px)] left-[calc(100%-6px)] right-0 flex size-2 items-center justify-center rounded-full ring-2 ring-background text-[8px] font-bold text-white",
              statusConfig.color
            )}
          />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 bg-primary-foreground border-black/5 dark:border-white/5 p-0"
      >
        <div className="bg-background rounded-lg shadow-sm p-1 relative z-10">
          {/* User Header with Avatar, Name, Email, and Status Badge */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-start gap-2">
              <Avatar className="size-8">
                {session.user.image ? (
                  <AvatarImage
                    src={session.user.image}
                    alt={session.user.name || "User"}
                  />
                ) : (
                  <AvatarFallback className="bg-[#202e32] text-[11px] text-white">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight text-primary dark:text-white truncate">
                  {session.user.name}
                </p>
                <p className="text-[11px] leading-tight text-primary/60 dark:text-white/50 truncate">
                  {session.user.email}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-1.5 py-0 h-5 border-current shrink-0 border-none",
                  statusConfig.color.includes("emerald") &&
                    "bg-emerald-500 text-emerald-100",
                  statusConfig.color.includes("amber") &&
                    "bg-amber-500 text-amber-100",
                  statusConfig.color.includes("rose") &&
                    "bg-rose-500 text-rose-100",
                  statusConfig.color.includes("indigo") &&
                    "bg-indigo-500 text-indigo-100",
                  statusConfig.color.includes("slate") &&
                    "bg-slate-500 text-slate-100"
                )}
              >
                {statusConfig.label}
              </Badge>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />

          {/* Update Status Section */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-3 hover:bg-foreground hover:text-black group">
                <StatusIcon className="size-3.5 text-primary/75 group-hover:text-black shrink-0" />
                <span className="text-xs font-medium">Update status</span>
              </DropdownMenuSubTrigger>

              <DropdownMenuSubContent className="w-max p-1 mr-2.5 text-primary border-black/5 dark:border-white/5 shadow-2xs space-y-1">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusChange(status as UserStatus)}
                    className={cn(
                      "flex items-center gap-2.5 cursor-pointer text-xs bg-background group",
                      config.textColorHover,
                      `hover:${config.bgColor}`,
                      currentStatus === status && config.bgColor
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-2.5 items-center justify-center rounded-full text-[8px] font-bold text-white shrink-0",
                        config.color
                      )}
                    />

                    <span
                      className={cn(
                        "font-medium dark:text-white",
                        status === currentStatus && config.textColor
                      )}
                    >
                      {config.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />

          {/* Main Menu Items */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => router.push("/settings/profile")}
              className="flex items-center gap-3 cursor-pointer hover:bg-foreground hover:text-black group"
            >
              <UserIcon className="size-3.5 text-primary/75 group-hover:text-black shrink-0" />
              <span className="text-xs font-medium">Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="flex items-center gap-3 cursor-pointer hover:bg-foreground hover:text-black group"
            >
              <SettingsIcon className="size-3.5 text-primary/75 group-hover:text-black shrink-0" />
              <span className="text-xs font-medium">Settings</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />

          {/* Premium & Affiliate */}
          <DropdownMenuGroup>
            {!isPremium && (
              <DropdownMenuItem
                onClick={() => router.push("/settings/billing")}
                className="flex items-center gap-3 cursor-pointer hover:bg-foreground hover:text-black group"
              >
                <UpgradeIcon className="size-3.5 text-sky-500 shrink-0" />
                <span className="text-xs font-medium">Upgrade to Pro</span>
                <Badge
                  variant="destructive"
                  className="ml-auto text-[10px] px-1.5 py-0 h-4"
                >
                  20% off
                </Badge>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={() => router.push("/affiliate")}
              className="flex items-center gap-3 cursor-pointer hover:bg-foreground hover:text-black group"
            >
              <UsersIcon className="size-3.5 text-primary/75 group-hover:text-black shrink-0" />
              <span className="text-xs font-medium">Affiliate</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />

          {/* Help */}
          <DropdownMenuItem
            onClick={() => window.open("https://help.aurea-crm.com", "_blank")}
            className="flex items-center gap-3 cursor-pointer hover:bg-foreground hover:text-black grou rounded-t-sm p"
          >
            <HelpCircleIcon className="size-3.5 text-primary/75 group-hover:text-black shrink-0" />
            <span className="text-xs font-medium">Help</span>
          </DropdownMenuItem>
        </div>

        {/* Quick Switch & Logout - Different Background */}
        <div className="p-1 pt-1.5 space-y-1">
          <DropdownMenuItem
            onClick={handleQuickSwitch}
            disabled={!canQuickSwitch}
            className={cn(
              "flex items-center gap-3 cursor-pointer hover:bg-primary/5 hover:text-black group bg-transparent",
              !canQuickSwitch && "opacity-50 cursor-not-allowed"
            )}
          >
            <WorkspaceIcon className="size-3.5 text-primary/75 group-hover:text-black shrink-0" />
            <span className="text-xs font-medium">
              {active?.activeSubaccountId
                ? "Switch workspace"
                : "Switch to client"}
            </span>
            {canQuickSwitch && (
              <span className="ml-auto text-[10px] font-mono text-primary/50">
                S
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => authClient.signOut()}
            className="flex items-center gap-3 cursor-pointer hover:bg-primary/5 hover:text-black group bg-transparent"
          >
            <LogOutIcon className="size-3.5 text-primary/75 group-hover:text-black shrink-0" />
            <span className="text-xs font-medium">Log out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserStatusIndicator() {
  return (
    <React.Suspense fallback={null}>
      <UserStatusIndicatorInner />
    </React.Suspense>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "relative inline-flex size-3 items-center justify-center rounded-full text-[8px] font-bold text-white border-2 border-white",
        config.color
      )}
      title={`${config.label} - ${config.description}`}
    ></span>
  );
}
