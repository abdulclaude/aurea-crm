// Hook to fetch all workflows using Suspsense

import { useTRPC } from "@/trpc/client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { toast } from "sonner";

import { useWorkflowsParams } from "./use-workflows-params";

// hook to fetch all workflows using suspense

export const useSuspenseWorkflows = () => {
  const trpc = useTRPC();
  const [params] = useWorkflowsParams();

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 5;
  const search = params.search ?? "";
  const folder = params.folder ?? "all";
  const kind = params.kind ?? "all";
  const sort = params.sort ?? "updatedAt.desc";
  return useSuspenseQuery(
    trpc.workflows.getMany.queryOptions({
      page,
      pageSize,
      search,
      folderId: folder,
      isBundle:
        kind === "bundle" ? true : kind === "workflow" ? false : undefined,
      sort,
    }),
  );
};

export const useWorkflowFolders = () => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.workflows.getFolders.queryOptions(),
    placeholderData: { folders: [], unfiledCount: 0 },
  });
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
        queryClient.invalidateQueries(trpc.workflows.getFolders.queryOptions());
        queryClient.invalidateQueries(
          trpc.workflows.getArchived.queryOptions({}),
        );
        queryClient.invalidateQueries(
          trpc.workflows.getTemplates.queryOptions({}),
        );
      },
      onError: (error) => {
        // toast.error(`Failed to create workflow: ${error.message}`);
        console.log(`Failed to create workflow: ${error.message}`);
      },
    }),
  );
};

export const useCreateWorkflowFolder = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.createFolder.mutationOptions({
      onSuccess: (folder) => {
        toast.success(`Folder "${folder.name}" created.`);
        queryClient.invalidateQueries(trpc.workflows.getFolders.queryOptions());
      },
      onError: (error) => toast.error(error.message),
    }),
  );
};

export const useUpdateWorkflowFolder = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.updateFolder.mutationOptions({
      onSuccess: (folder) => {
        toast.success(`Folder "${folder.name}" updated.`);
        queryClient.invalidateQueries(trpc.workflows.getFolders.queryOptions());
      },
      onError: (error) => toast.error(error.message),
    }),
  );
};

export const useDeleteWorkflowFolder = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.deleteFolder.mutationOptions({
      onSuccess: (folder) => {
        toast.success(`Folder "${folder.name}" deleted.`);
        queryClient.invalidateQueries(trpc.workflows.getFolders.queryOptions());
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
      onError: (error) => toast.error(error.message),
    }),
  );
};

export const useMoveWorkflowToFolder = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.moveToFolder.mutationOptions({
      onSuccess: (workflow) => {
        toast.success(`Workflow "${workflow.name}" moved.`);
        queryClient.invalidateQueries(trpc.workflows.getFolders.queryOptions());
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
      onError: (error) => toast.error(error.message),
    }),
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
        queryClient.invalidateQueries(trpc.workflows.getFolders.queryOptions());
        queryClient.invalidateQueries(
          trpc.workflows.getArchived.queryOptions({}),
        );
        queryClient.invalidateQueries(
          trpc.workflows.getTemplates.queryOptions({}),
        );

        // below is a better option, you're getting the actual item you want to invalidate from the cache
        // queryClient.invalidateQueries(
        //   trpc.workflows.getOne.queryFilter({ id: data.id })
        // );
      },
    }),
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
          trpc.workflows.getArchived.queryOptions({}),
        );
        queryClient.invalidateQueries(
          trpc.workflows.getTemplates.queryOptions({}),
        );

        queryClient.invalidateQueries(
          trpc.workflows.getOne.queryOptions({ id: data.id }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to update workflow name: ${error.message}`);
      },
    }),
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
          trpc.workflows.getArchived.queryOptions({}),
        );
        queryClient.invalidateQueries(
          trpc.workflows.getTemplates.queryOptions({}),
        );

        queryClient.invalidateQueries(
          trpc.workflows.getOne.queryOptions({ id: data.id }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to save workflow: ${error.message}`);
      },
    }),
  );
};

// hook to execute a workflow

export const useExecuteWorkflow = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.workflows.execute.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Workflow "${data.name}" has been executed.`);
      },
      onError: (error) => {
        toast.error(`Failed to execute workflow: ${error.message}`);
      },
    }),
  );
};

// hook to toggle archived status

export const useUpdateWorkflowArchived = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.updateArchived.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          `Workflow "${data.name}" has been ${
            (data as unknown as { archived?: boolean }).archived
              ? "archived"
              : "activated"
          }.`,
        );
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
        queryClient.invalidateQueries(
          trpc.workflows.getArchived.queryOptions({}),
        );
        queryClient.invalidateQueries(
          trpc.workflows.getOne.queryOptions({ id: data.id }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to update workflow: ${error.message}`);
      },
    }),
  );
};

// hook to fetch archived workflows

export const useSuspenseArchivedWorkflows = () => {
  const trpc = useTRPC();
  const [params] = useWorkflowsParams();
  const { page, pageSize, search, folder, kind, sort } = params;
  return useSuspenseQuery(
    trpc.workflows.getArchived.queryOptions({
      page,
      pageSize,
      search,
      folderId: folder,
      isBundle:
        kind === "bundle" ? true : kind === "workflow" ? false : undefined,
      sort,
    }),
  );
};

// hooks for templates

export const useSuspenseTemplates = () => {
  const trpc = useTRPC();
  const [params] = useWorkflowsParams();
  const { page, pageSize, search } = params;
  return useSuspenseQuery(
    trpc.workflows.getTemplates.queryOptions({ page, pageSize, search }),
  );
};

export const useCreateTemplateFromWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.createTemplateFromWorkflow.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Template "${data.name}" created.`);
        queryClient.invalidateQueries(
          trpc.workflows.getTemplates.queryOptions({}),
        );
      },
      onError: (error) => {
        toast.error(`Failed to create template: ${error.message}`);
      },
    }),
  );
};

export const useCreateWorkflowFromTemplate = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.createWorkflowFromTemplate.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Workflow "${data.name}" created from template.`);
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to use template: ${error.message}`);
      },
    }),
  );
};

export const useInstallStudioStarterTemplates = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.workflows.installStudioStarterTemplates.mutationOptions({
      onSuccess: (data) => {
        if (data.createdCount > 0) {
          toast.success(`${data.createdCount} starter templates installed.`);
        } else {
          toast.success("Starter templates are already installed.");
        }
        queryClient.invalidateQueries(
          trpc.workflows.getTemplates.queryOptions({}),
        );
      },
      onError: (error) => {
        toast.error(`Failed to install templates: ${error.message}`);
      },
    }),
  );
};

// update template metadata

export const useUpdateTemplateMeta = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.updateTemplateMeta.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Template "${data.name}" updated.`);
        queryClient.invalidateQueries(
          trpc.workflows.getTemplates.queryOptions({}),
        );
      },
      onError: (error) => {
        toast.error(`Failed to update template: ${error.message}`);
      },
    }),
  );
};
