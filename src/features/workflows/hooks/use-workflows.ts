// Hook to fetch all workflows using Suspsense

import { useTRPC } from "@/trpc/client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { toast } from "sonner";

import { useWorkflowsParams } from "./use-workflows-params";

// hook to fetch all workflows using suspense

export const useSuspenseWorkflows = () => {
  const trpc = useTRPC();
  const [params] = useWorkflowsParams();

  return useSuspenseQuery(trpc.workflows.getMany.queryOptions(params));
};

// hook to fetch a single workflow using suspense

export const useSuspenseWorkflow = (id: string) => {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.workflows.getOne.queryOptions({ id }));
};

// hook to create a new workflow

export const useCreateWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Workflow "${data.name}" created.`);

        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to create workflow: ${error.message}`);
      },
    })
  );
};

// hook to remove a workflow

export const useRemoveWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.remove.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Workflow ${data.name} removed.`);

        // checking the WHOLE cache and finding the difference without the id
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));

        // below is a better option, you're getting the actual item you want to invalidate from the cache
        // queryClient.invalidateQueries(
        //   trpc.workflows.getOne.queryFilter({ id: data.id })
        // );
      },
    })
  );
};

// hook to update a workflow name

export const useUpdateWorkflowName = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.updateName.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Workflow "${data.name}" has been updated.`);

        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));

        queryClient.invalidateQueries(
          trpc.workflows.getOne.queryOptions({ id: data.id })
        );
      },
      onError: (error) => {
        toast.error(`Failed to update workflow name: ${error.message}`);
      },
    })
  );
};

// hook to update a workflow

export const useUpdateWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Workflow "${data.name}" has been saved.`);

        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));

        queryClient.invalidateQueries(
          trpc.workflows.getOne.queryOptions({ id: data.id })
        );
      },
      onError: (error) => {
        toast.error(`Failed to save workflow: ${error.message}`);
      },
    })
  );
};
