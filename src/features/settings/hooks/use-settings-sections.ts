"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useIsInstructor } from "@/features/instructors/hooks/use-is-instructor";
import { useTRPC } from "@/trpc/client";

import { getVisibleSettingsSections } from "../lib/settings-registry";

export function useSettingsSections() {
  const trpc = useTRPC();
  const { isInstructor } = useIsInstructor();
  const { data: permissions } = useSuspenseQuery(
    trpc.permissions.getCurrent.queryOptions(),
  );

  return getVisibleSettingsSections({
    capabilities: permissions.capabilities,
    isInstructor,
  });
}
