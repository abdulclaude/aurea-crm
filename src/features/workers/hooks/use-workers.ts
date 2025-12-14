"use client";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export const useWorkersList = (input?: {
  limit?: number;
  cursor?: string;
  search?: string;
  isActive?: boolean;
}) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workers.list.queryOptions(input || {}));
};

export const useWorkerById = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workers.getById.queryOptions({ id }));
};

export const useCreateWorker = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.create.mutationOptions({}));
};

export const useUpdateWorker = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.update.mutationOptions({}));
};

export const useDeleteWorker = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.delete.mutationOptions({}));
};

export const useGenerateMagicLink = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.generateMagicLink.mutationOptions({}));
};

export const useVerifyMagicLink = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.verifyMagicLink.mutationOptions({}));
};

export const useWorkerProfile = (workerId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workers.getProfile.queryOptions({ workerId }));
};

export const useSendMagicLinkEmail = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.sendMagicLinkEmail.mutationOptions({}));
};

// Portal-specific hooks
export const useWorkerFullProfile = (workerId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workers.getFullProfile.queryOptions({ workerId }));
};

export const useUpdateWorkerProfile = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.updateProfile.mutationOptions({}));
};

export const useWorkerDocuments = (workerId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workers.getDocuments.queryOptions({ workerId }));
};

export const useCreateDocument = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.createDocument.mutationOptions({}));
};

export const useDeleteDocument = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.deleteDocument.mutationOptions({}));
};

export const useWorkerDashboard = (workerId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workers.getDashboard.queryOptions({ workerId }));
};

export const useWorkerSchedule = (workerId: string, startDate: Date, endDate: Date) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workers.getSchedule.queryOptions({ workerId, startDate, endDate }));
};

export const useWorkerTimeLogs = (workerId: string, startDate: Date, endDate: Date) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workers.getTimeLogs.queryOptions({ workerId, startDate, endDate }));
};

export const useClockIn = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.clockIn.mutationOptions({}));
};

export const useClockOut = () => {
  const trpc = useTRPC();
  return useMutation(trpc.workers.clockOut.mutationOptions({}));
};
