"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../ui/button";
import { UserStatusIndicator } from "@/components/user-status-indicator";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

import { IconChevronLeftMedium as ChevronLeftIcon } from "central-icons/IconChevronLeftMedium";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const AppHeader = () => {
  const pathname = usePathname();
  const isAnalyticsPage = pathname.includes("/analytics");
  const trpc = useTRPC();

  const [isSwitching, setIsSwitching] = useState<string | "agency" | null>(
    null
  );

  const setActiveSubaccount = useMutation(
    trpc.organizations.setActiveSubaccount.mutationOptions()
  );

  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );

  const activeClient = active?.activeSubaccount ?? null;

  const { data: orgs } = useSuspenseQuery(
    trpc.organizations.getMyOrganizations.queryOptions()
  );

  const activeOrg =
    orgs?.find((o) => o.id === active?.activeOrganizationId) ?? orgs?.[0];

  const handleSwitch = async (subaccountId: string | null) => {
    try {
      setIsSwitching(subaccountId ?? "agency");
      await setActiveSubaccount.mutateAsync({ subaccountId });
      // Hard reload to re-fetch session-bound data
      window.location.href = "/dashboard";
    } finally {
      setIsSwitching(null);
    }
  };

  return (
    <>
      <header
        className={cn(
          "flex h-14 shrink-0 items-center justify-end gap-2 bg-background text-primary border-b border-black/5 dark:border-white/5 px-4 w-full"
        )}
      >
        <NotificationBell />
        <UserStatusIndicator />
      </header>

      <div>
        {activeClient && activeOrg && (
          <div className="flex items-center justify-center bg-white text-primary px-3 py-4 h-full w-full gap-2.5 border-b border-black/5 dark:border-white/5 ">
            <Button
              variant="ghost"
              onClick={() => handleSwitch(null)}
              className="text-[11px] h-max! px-1.5! py-1 bg-transparent! hover:bg-primary/5! hover:text-black! gap-2! items-center text-primary border-none transition duration-150"
            >
              <ChevronLeftIcon className="size-[0.55rem]" />
              Go back to {activeOrg.name}'s workspace
            </Button>

            <div className="w-px h-3 bg-teal-500/75" />
            <p className="text-[11px] font-normal text-teal-500">
              You are currently in the workspace of{" "}
              <span className="underline underline-offset-1">
                {" "}
                {activeClient.companyName}{" "}
              </span>
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default AppHeader;
