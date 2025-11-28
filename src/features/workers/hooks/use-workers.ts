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
