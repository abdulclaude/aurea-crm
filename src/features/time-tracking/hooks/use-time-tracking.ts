"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferRouterInputs } from "@trpc/server";

type RouterInputs = inferRouterInputs<AppRouter>;

export const useTimeLogsList = (input?: RouterInputs["timeTracking"]["list"]) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.timeTracking.list.queryOptions(input ?? {}));
};

export const useActiveTimeLog = (input: RouterInputs["timeTracking"]["getActiveTimeLog"]) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.timeTracking.getActiveTimeLog.queryOptions(input));
};

export const useClockIn = () => {
  const trpc = useTRPC();
  return useMutation(trpc.timeTracking.clockIn.mutationOptions({}));
};

export const useClockOut = () => {
  const trpc = useTRPC();
  return useMutation(trpc.timeTracking.clockOut.mutationOptions({}));
};

export const useApproveTimeLog = () => {
  const trpc = useTRPC();
  return useMutation(trpc.timeTracking.approve.mutationOptions({}));
};

export const useDeleteTimeLog = () => {
  const trpc = useTRPC();
  return useMutation(trpc.timeTracking.delete.mutationOptions({}));
};

export const useQRCodes = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.timeTracking.listQRCodes.queryOptions());
};

export const useTimesheet = (input: { contactId?: string; startDate: Date; endDate: Date }) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.timeTracking.getTimesheet.queryOptions(input));
};
