// Hook to fetch all bundles using Suspense

import { useTRPC } from "@/trpc/client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { toast } from "sonner";

import { useBundlesParams } from "./use-bundles-params";

// hook to fetch all bundles using suspense

export const useSuspenseBundles = () => {
  const trpc = useTRPC();
  const [params] = useBundlesParams();

  const { page, pageSize, search } = params;
  return useSuspenseQuery(
    trpc.workflows.getMany.queryOptions({ page, pageSize, search, isBundle: true })
  );
};

// hook to fetch a single bundle using suspense

export const useSuspenseBundle = (id: string) => {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.workflows.getOne.queryOptions({ id }));
};

// hook to create a new bundle

export const useCreateBundle = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.createBundle.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Bundle "${data.name}" created.`);

        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to create bundle: ${error.message}`);
      },
    })
  );
};

// hook to remove a bundle

export const useRemoveBundle = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.remove.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Bundle ${data.name} removed.`);

        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
    })
  );
};

// hook to update a bundle name

export const useUpdateBundleName = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.updateName.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Bundle "${data.name}" has been updated.`);

        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
        queryClient.invalidateQueries(
          trpc.workflows.getOne.queryOptions({ id: data.id })
        );
      },
      onError: (error) => {
        toast.error(`Failed to update bundle name: ${error.message}`);
      },
    })
  );
};

// hook to update a bundle

export const useUpdateBundle = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Bundle "${data.name}" has been saved.`);

        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
        queryClient.invalidateQueries(
          trpc.workflows.getOne.queryOptions({ id: data.id })
        );
      },
      onError: (error) => {
        toast.error(`Failed to save bundle: ${error.message}`);
      },
    })
  );
};
