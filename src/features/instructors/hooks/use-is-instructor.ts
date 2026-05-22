"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useIsInstructor() {
  const trpc = useTRPC();

  const { data } = useSuspenseQuery(
    trpc.instructors.getMyInstructorProfile.queryOptions()
  );

  return {
    isInstructor: !!data,
    instructor: data ?? null,
  };
}
