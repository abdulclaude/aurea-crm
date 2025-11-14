"use client";
import * as React from "react";

import { useRouter } from "next/navigation";

import { IconPayment } from "central-icons/IconPayment";

import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontalIcon, MousePointerIcon } from "lucide-react";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/react-flow/entity-components";

import {
  useCreateWorkflow,
  useRemoveWorkflow,
  useSuspenseWorkflows,
  useSuspenseArchivedWorkflows,
  useSuspenseTemplates,
  useUpdateWorkflowArchived,
  useCreateTemplateFromWorkflow,
  useCreateWorkflowFromTemplate,
  useUpdateTemplateMeta,
} from "../hooks/use-workflows";

import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { useEntitySearch } from "@/hooks/use-entity-search";

import type { Workflows } from "@/generated/prisma/client";
import { NodeType } from "@/generated/prisma/enums";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type WorkflowEntity = Workflows & {
  archived?: boolean | null;
  isTemplate?: boolean | null;
  description?: string | null;
  nodes?: { type: NodeType }[];
};

export const WorkflowsTabs = () => {
  const [params, setParams] = useWorkflowsParams();
  const view = params.view || "all";

  return (
    <Tabs
      value={view}
      onValueChange={(v) => setParams({ ...params, view: v, page: 1 })}
    >
      <TabsList className="bg-[#212F34] rounded-sm">
        <TabsTrigger value="all">All workflows</TabsTrigger>
        <TabsTrigger value="archived">Archived</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

const WorkflowsList = () => {
  const [params] = useWorkflowsParams();
  const view = params.view || "all";
  if (view === "archived") {
    return <ArchivedWorkflowsList />;
  }
  if (view === "templates") {
    return <TemplatesList />;
  }
  return <AllWorkflowsList />;
};

export default WorkflowsList;

const AllWorkflowsList = () => {
  const workflows = useSuspenseWorkflows();
  return (
    <EntityList
      items={workflows.data.items}
      getKey={(workflow) => workflow.id}
      renderItem={(workflow) => <WorkflowItem data={workflow} />}
      emptyView={<WorkflowsEmpty />}
    />
  );
};

export const WorkflowsHeader = ({ disabled }: { disabled?: boolean }) => {
  const createWorkflow = useCreateWorkflow();
  const { handleError, modal } = useUpgradeModal();

  const router = useRouter();

  const handleCreate = () => {
    createWorkflow.mutate(undefined, {
      onSuccess: (data) => {
        router.push(`/workflows/${data.id}`);
      },
      onError: (error) => {
        // open upgrade modal
        handleError(error);
      },
    });
  };

  return (
    <>
      {modal}
      <EntityHeader
        title="Workflows"
        description="Create and manage your workflows"
        onNew={handleCreate}
        newButtonLabel="New workflow"
        disabled={disabled}
        isCreating={createWorkflow.isPending}
      />
    </>
  );
};

export const WorkflowsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={
        <div className="flex flex-col gap-2">
          <WorkflowsHeader />
        </div>
      }
      search={
        <div className="flex gap-2 justify-between">
          <WorkflowsTabs />
          <WorkflowsSearch className="w-96" />{" "}
        </div>
      }
      pagination={<WorkflowsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const WorkflowsSearch = ({ className }: { className?: string }) => {
  const [params, setParams] = useWorkflowsParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      className={className}
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search workflows..."
    />
  );
};

export const WorkflowsPagination = () => {
  const [params] = useWorkflowsParams();
  const view = params.view || "all";
  if (view === "archived") {
    return <ArchivedWorkflowsPagination />;
  }
  if (view === "templates") {
    return <TemplatesPagination />;
  }
  return <AllWorkflowsPagination />;
};

const AllWorkflowsPagination = () => {
  const workflows = useSuspenseWorkflows();
  const [params, setParams] = useWorkflowsParams();
  return (
    <EntityPagination
      disabled={workflows.isFetching}
      totalPages={workflows.data.totalPages}
      page={workflows.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const WorkflowsLoading = () => {
  return <LoadingView message="Loading workflows..." />;
};

export const WorkflowsError = () => {
  return <ErrorView message="Error loading workflows..." />;
};

export const WorkflowsEmpty = () => {
  const createWorkflow = useCreateWorkflow();
  const { handleError, modal } = useUpgradeModal();

  const router = useRouter();

  const handleCreate = () => {
    createWorkflow.mutate(undefined, {
      onSuccess: (data) => {
        router.push(`/workflows/${data.id}`);
      },
      onError: (error) => {
        handleError(error);
      },
    });
  };

  return (
    <>
      {modal}
      <EmptyView
        title="No workflows"
        label="workflow"
        onNew={handleCreate}
        message="No workflows have been found. Get started by creating a workflow."
      />
    </>
  );
};

// Workflow Item

export const WorkflowItem = ({ data }: { data: WorkflowEntity }) => {
  const removeWorkflow = useRemoveWorkflow();
  const updateArchived = useUpdateWorkflowArchived();
  const createTemplate = useCreateTemplateFromWorkflow();

  const handleRemove = () => {
    removeWorkflow.mutate({ id: data.id });
  };

  const archived = data.archived ?? false;

  return (
    <EntityItem
      href={`/workflows/${data.id}`}
      title={data.name}
      subtitle={
        <>
          Created {formatDistanceToNow(data.createdAt, { addSuffix: true })}{" "}
          &bull; Updated{" "}
          {formatDistanceToNow(data.updatedAt, {
            addSuffix: true,
          })}{" "}
        </>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <IconPayment className="size-4 text-white fill-white" />
        </div>
      }
      menuItems={
        <>
          <DropdownMenuItem
            className="bg-[#1A2326] hover:bg-[#202E32]! hover:text-white! transition duration-150 w-full"
            onClick={() =>
              updateArchived.mutate({ id: data.id, archived: !archived })
            }
          >
            {archived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="bg-[#1A2326] hover:bg-[#202E32]! hover:text-white! transition duration-150 w-full"
            onClick={() => createTemplate.mutate({ id: data.id })}
          >
            Save as template
          </DropdownMenuItem>
        </>
      }
      onRemove={handleRemove}
      isRemoving={removeWorkflow.isPending}
    />
  );
};

// Archived workflows

export const ArchivedWorkflowsList = () => {
  const workflows = useSuspenseArchivedWorkflows();
  return (
    <EntityList
      items={workflows.data.items}
      getKey={(workflow) => workflow.id}
      renderItem={(workflow) => <WorkflowItem data={workflow} />}
      emptyView={<ErrorView message="No archived workflows." />}
    />
  );
};

export const ArchivedWorkflowsPagination = () => {
  const workflows = useSuspenseArchivedWorkflows();
  const [params, setParams] = useWorkflowsParams();
  return (
    <EntityPagination
      disabled={workflows.isFetching}
      totalPages={workflows.data.totalPages}
      page={workflows.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

// Templates

export const TemplatesList = () => {
  const templates = useSuspenseTemplates();
  return (
    <EntityList
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      items={templates.data.items as WorkflowEntity[]}
      getKey={(t) => t.id}
      renderItem={(t) => <TemplateCard data={t} />}
      emptyView={<ErrorView message="No templates found." />}
    />
  );
};

export const TemplatesPagination = () => {
  const templates = useSuspenseTemplates();
  const [params, setParams] = useWorkflowsParams();
  return (
    <EntityPagination
      disabled={templates.isFetching}
      totalPages={templates.data.totalPages}
      page={templates.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const TemplateItem = ({ data }: { data: WorkflowEntity }) => {
  const createFromTemplate = useCreateWorkflowFromTemplate();
  const removeWorkflow = useRemoveWorkflow();
  const router = useRouter();

  const handleRemove = () => {
    removeWorkflow.mutate({ id: data.id });
  };

  return (
    <EntityItem
      href={`/workflows/${data.id}`}
      title={data.name}
      subtitle={
        <>
          Created{" "}
          {formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}{" "}
          &bull; Updated{" "}
          {formatDistanceToNow(new Date(data.updatedAt), {
            addSuffix: true,
          })}{" "}
        </>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <IconPayment className="size-4 text-white fill-white" />
        </div>
      }
      actions={
        <Button
          size="sm"
          variant="outline"
          className="bg-[#202E32] border-white/10 hover:bg-[#202E32] hover:brightness-110"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            createFromTemplate.mutate(
              { id: data.id },
              {
                onSuccess: (d) => {
                  router.push(`/workflows/${d.id}`);
                },
              }
            );
          }}
        >
          Use template
        </Button>
      }
      onRemove={handleRemove}
      isRemoving={removeWorkflow.isPending}
    />
  );
};

// New card for templates grid
const getTriggerIcon = (nodes?: { type: NodeType }[]) => {
  const triggerPriority: NodeType[] = [
    NodeType.STRIPE_TRIGGER,
    NodeType.GOOGLE_FORM_TRIGGER,
    NodeType.MANUAL_TRIGGER,
  ];
  const type =
    nodes?.find((n) => triggerPriority.includes(n.type))?.type ??
    NodeType.MANUAL_TRIGGER;
  switch (type) {
    case NodeType.STRIPE_TRIGGER:
      return <img src="/logos/stripe.svg" alt="Stripe" className="size-5" />;
    case NodeType.GOOGLE_FORM_TRIGGER:
      return (
        <img src="/logos/googleform.svg" alt="Google Form" className="size-5" />
      );
    case NodeType.MANUAL_TRIGGER:
    default:
      return <MousePointerIcon className="size-4 text-white" />;
  }
};

export const TemplateCard = ({ data }: { data: WorkflowEntity }) => {
  const createFromTemplate = useCreateWorkflowFromTemplate();
  const removeWorkflow = useRemoveWorkflow();
  const updateTemplateMeta = useUpdateTemplateMeta();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(data.name);
  const [description, setDescription] = React.useState<string>(
    data.description || ""
  );

  return (
    <>
      <Card className="bg-[#1A2326] border-white/5 rounded-md p-3 h-full">
        <CardContent className="p-0 h-full flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-[#202E32] rounded-sm p-2">
                {getTriggerIcon(data.nodes)}
              </div>

              <CardTitle className="text-sm font-medium line-clamp-2 text-white">
                {data.name}
              </CardTitle>
            </div>

            <div className="space-y-1">
              {!!data.description && (
                <CardDescription className="text-xs text-white/50 line-clamp-3 leading-5">
                  {data.description}
                </CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button
              size="sm"
              variant="outline"
              className="bg-[#202E32] text-white hover:text-white text-xs border-none hover:bg-[#202E32] hover:brightness-110"
              onClick={() =>
                createFromTemplate.mutate(
                  { id: data.id },
                  {
                    onSuccess: (d) => {
                      router.push(`/workflows/${d.id}`);
                    },
                  }
                )
              }
            >
              Use template
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:bg-[#1A2326]! hover:brightness-110 hover:text-white transition duration-150 text-white"
                >
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#1A2326] text-white border-white/5 transition duration-150"
              >
                <DropdownMenuItem
                  className="bg-[#1A2326] hover:bg-[#202E32]! hover:text-white! transition duration-150 w-full"
                  onSelect={() => setOpen(true)}
                >
                  Edit template
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => removeWorkflow.mutate({ id: data.id })}
                  className="bg-[#1A2326] hover:bg-[#202E32]! hover:text-white! transition duration-150 w-full"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="bg-[#1A2326] border-white/10 text-white p-0"
          showCloseButton
        >
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Edit template</DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="flex flex-col gap-6 p-6 pt-2 pb-2">
            <div className="flex flex-col gap-3">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className=" border-white/10 rounded-sm bg-[#202E32]"
              />
            </div>

            <div className="flex flex-col gap-3">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-[#202E32] border border-white/10 rounded-sm p-2 text-sm min-h-24"
              />
            </div>
          </div>

          <DialogFooter className="p-6 pt-0">
            <Button
              onClick={() =>
                updateTemplateMeta.mutate(
                  { id: data.id, name, description },
                  {
                    onSuccess: () => setOpen(false),
                  }
                )
              }
              disabled={updateTemplateMeta.isPending}
              className="bg-[#202E32] hover:bg-[#202E32]! hover:brightness-110"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
