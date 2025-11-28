"use client";

import { useEffect, useRef } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

/**
 * Hook to track user presence (online/offline status)
 * Sends heartbeat updates every 30 seconds
 */
export function usePresence() {
  const trpc = useTRPC();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );

  const updatePresence = useMutation(
    trpc.notifications.updatePresence.mutationOptions()
  );

  useEffect(() => {
    // Send initial presence update
    updatePresence.mutate({
      status: "online",
      organizationId: active?.activeOrganizationId ?? undefined,
      subaccountId: active?.activeSubaccountId ?? undefined,
    });

    // Set up heartbeat interval (every 30 seconds)
    intervalRef.current = setInterval(() => {
      updatePresence.mutate({
        status: "online",
        organizationId: active?.activeOrganizationId ?? undefined,
        subaccountId: active?.activeSubaccountId ?? undefined,
      });
    }, 30000);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence.mutate({
          status: "away",
          organizationId: active?.activeOrganizationId ?? undefined,
          subaccountId: active?.activeSubaccountId ?? undefined,
        });
      } else {
        updatePresence.mutate({
          status: "online",
          organizationId: active?.activeOrganizationId ?? undefined,
          subaccountId: active?.activeSubaccountId ?? undefined,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle page unload (mark as offline)
    const handleBeforeUnload = () => {
      updatePresence.mutate({
        status: "offline",
        organizationId: active?.activeOrganizationId ?? undefined,
        subaccountId: active?.activeSubaccountId ?? undefined,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Mark as offline on unmount
      updatePresence.mutate({
        status: "offline",
        organizationId: active?.activeOrganizationId ?? undefined,
        subaccountId: active?.activeSubaccountId ?? undefined,
      });
    };
  }, [active?.activeOrganizationId, active?.activeSubaccountId]);

  return {
    isTracking: true,
  };
}
