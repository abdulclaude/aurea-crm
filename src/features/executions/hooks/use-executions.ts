import { useTRPC } from "@/trpc/client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { toast } from "sonner";

import { useExecutionsParams } from "./use-executions-params";

// hook to fetch all executions using suspense

export const useSuspenseExecutions = () => {
  const trpc = useTRPC();
  const [params] = useExecutionsParams();

  return useSuspenseQuery(trpc.executions.getMany.queryOptions(params));
};

// hook to fetch a single execution using suspense

export const useSuspenseExecution = (id: string) => {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.executions.getOne.queryOptions({ id }));
};

// hook to fetch all executions (no pagination) for timeline

export const useSuspenseAllExecutions = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.executions.getAll.queryOptions());
};
