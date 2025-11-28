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
import { GlobeIcon, MoreHorizontalIcon } from "lucide-react";

import { IconCursorClick as MousePointerIcon } from "central-icons/IconCursorClick";

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
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import type { Prisma } from "@/generated/prisma/client";

type WorkflowNodePreview = {
  id?: string;
  type?: NodeType;
  createdAt?: string | Date | null;
  position?: Prisma.JsonValue;
};

type WorkflowEntity = Omit<Workflows, "nodes"> & {
  nodes?: WorkflowNodePreview[];
};

export const WorkflowsTabs = () => {
  const [params, setParams] = useWorkflowsParams();
  const view = params.view || "all";

  return (
    <Tabs
      value={view}
      onValueChange={(v) => setParams({ ...params, view: v, page: 1 })}
    >
      <TabsList className="rounded-sm">
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
        <div className="flex gap-2 justify-between items-end mt-4 w-full">
          <WorkflowsTabs />
          <WorkflowsSearch className="w-72" />{" "}
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
    return null;
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

  const handleRemove = () => {
    removeWorkflow.mutate({ id: data.id });
  };

  const archived = data.archived ?? false;
  const templated = data.isTemplate ?? false;
  const { firstNode, lastNode } = getWorkflowPreviewNodes(data.nodes);
  const lastIconType = lastNode?.type ?? firstNode?.type;

  const statusBadges =
    archived || templated ? (
      <div className="flex items-center gap-1">
        {archived && (
          <Badge className="bg-sky-800 rounded-sm h-6 text-[10px] uppercase tracking-wide text-sky-200 border border-white/5 px-2">
            Archived
          </Badge>
        )}

        {templated && (
          <Badge className="bg-teal-700 rounded-sm h-6 text-[10px] uppercase tracking-wide text-teal-200 border border-white/5 px-2">
            Templated
          </Badge>
        )}
      </div>
    ) : null;

  return (
    <EntityItem
      href={`/workflows/${data.id}`}
      title={
        <div className="flex items-center gap-2">
          <span>{data.name}</span>
          {statusBadges}
        </div>
      }
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
        <div className="flex items-center gap-1.5">
          <NodePreviewIcon type={firstNode?.type} />
          <NodePreviewIcon type={lastIconType} />
        </div>
      }
      menuItems={<></>}
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
      emptyView={
        <EmptyView
          title="No archived workflows"
          label="workflow"
          message="No archived workflows have been found. Get started by creating archiving a workflow."
        />
      }
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
      emptyView={
        <EmptyView
          title="No templates"
          label="template"
          message="No templates have been found. Get started by templating an existing workflow."
        />
      }
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
        <div className="flex items-center gap-2">
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
          <Button
            size="sm"
            variant="ghost"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/workflows/${data.id}`);
            }}
          >
            View template
          </Button>
        </div>
      }
      onRemove={handleRemove}
      isRemoving={removeWorkflow.isPending}
    />
  );
};

// New card for templates grid
const getTriggerIcon = (nodes?: WorkflowNodePreview[]) => {
  const triggerPriority: NodeType[] = [
    NodeType.STRIPE_TRIGGER,
    NodeType.GOOGLE_FORM_TRIGGER,
    NodeType.MANUAL_TRIGGER,
  ];
  const type =
    nodes
      ?.map((node) => node.type)
      .find(
        (nodeType): nodeType is NodeType =>
          !!nodeType && triggerPriority.includes(nodeType)
      ) ?? NodeType.MANUAL_TRIGGER;
  switch (type) {
    case NodeType.STRIPE_TRIGGER:
      return (
        <Image
          src="/logos/stripe.svg"
          alt="Stripe"
          width={20}
          height={20}
          className="size-5"
        />
      );
    case NodeType.GOOGLE_FORM_TRIGGER:
      return (
        <Image
          src="/logos/googleform.svg"
          alt="Google Form"
          width={20}
          height={20}
          className="size-5"
        />
      );
    case NodeType.MANUAL_TRIGGER:
    default:
      return <MousePointerIcon className="size-4 text-white" />;
  }
};

type NodeIconDescriptor =
  | {
      icon: React.ComponentType<{ className?: string }>;
      alt: string;
    }
  | {
      image: string;
      alt: string;
    };

const nodeIconDescriptors: Record<NodeType, NodeIconDescriptor> = {
  [NodeType.INITIAL]: { icon: IconPayment, alt: "Initial" },
  [NodeType.MANUAL_TRIGGER]: { icon: MousePointerIcon, alt: "Manual trigger" },
  [NodeType.GOOGLE_FORM_TRIGGER]: {
    image: "/logos/googleform.svg",
    alt: "Google Forms",
  },
  [NodeType.GOOGLE_CALENDAR_TRIGGER]: {
    image: "/logos/googlecalendar.svg",
    alt: "Google Calendar",
  },
  [NodeType.GOOGLE_CALENDAR_EXECUTION]: {
    image: "/logos/googlecalendar.svg",
    alt: "Google Calendar",
  },
  [NodeType.GMAIL_TRIGGER]: {
    image: "/logos/gmail.svg",
    alt: "Gmail",
  },
  [NodeType.GMAIL_EXECUTION]: {
    image: "/logos/gmail.svg",
    alt: "Gmail",
  },
  [NodeType.TELEGRAM_TRIGGER]: {
    image: "/logos/telegram.svg",
    alt: "Telegram",
  },
  [NodeType.TELEGRAM_EXECUTION]: {
    image: "/logos/telegram.svg",
    alt: "Telegram",
  },
  [NodeType.STRIPE_TRIGGER]: { image: "/logos/stripe.svg", alt: "Stripe" },
  [NodeType.HTTP_REQUEST]: { icon: GlobeIcon, alt: "HTTP Request" },
  [NodeType.GEMINI]: { image: "/logos/gemini.svg", alt: "Gemini" },
  [NodeType.ANTHROPIC]: { image: "/logos/anthropic.svg", alt: "Anthropic" },
  [NodeType.OPENAI]: { image: "/logos/openai.svg", alt: "OpenAI" },
  [NodeType.DISCORD]: { image: "/logos/discord.svg", alt: "Discord" },
  [NodeType.SLACK]: { image: "/logos/slack.svg", alt: "Slack" },
  [NodeType.WAIT]: { icon: IconPayment, alt: "Wait" },
  [NodeType.CREATE_CONTACT]: { icon: IconPayment, alt: "Create Contact" },
  [NodeType.UPDATE_CONTACT]: { icon: IconPayment, alt: "Update Contact" },
  [NodeType.DELETE_CONTACT]: { icon: IconPayment, alt: "Delete Contact" },
  [NodeType.CREATE_DEAL]: { icon: IconPayment, alt: "Create Deal" },
  [NodeType.UPDATE_DEAL]: { icon: IconPayment, alt: "Update Deal" },
  [NodeType.DELETE_DEAL]: { icon: IconPayment, alt: "Delete Deal" },
  [NodeType.UPDATE_PIPELINE]: { icon: IconPayment, alt: "Update Pipeline" },
  [NodeType.CONTACT_CREATED_TRIGGER]: { icon: IconPayment, alt: "Contact Created" },
  [NodeType.CONTACT_UPDATED_TRIGGER]: { icon: IconPayment, alt: "Contact Updated" },
  [NodeType.CONTACT_FIELD_CHANGED_TRIGGER]: { icon: IconPayment, alt: "Field Changed" },
  [NodeType.CONTACT_DELETED_TRIGGER]: { icon: IconPayment, alt: "Contact Deleted" },
  [NodeType.CONTACT_TYPE_CHANGED_TRIGGER]: { icon: IconPayment, alt: "Type Changed" },
  [NodeType.CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER]: { icon: IconPayment, alt: "Lifecycle Changed" },
  [NodeType.IF_ELSE]: { icon: IconPayment, alt: "If/Else" },
  [NodeType.SWITCH]: { icon: IconPayment, alt: "Switch" },
  [NodeType.LOOP]: { icon: IconPayment, alt: "Loop" },
  [NodeType.SET_VARIABLE]: { icon: IconPayment, alt: "Set Variable" },
  [NodeType.STOP_WORKFLOW]: { icon: IconPayment, alt: "Stop Workflow" },
  [NodeType.BUNDLE_WORKFLOW]: { icon: IconPayment, alt: "Bundle Workflow" },
  [NodeType.OUTLOOK_TRIGGER]: {
    image: "/logos/microsoft.svg",
    alt: "Outlook",
  },
  [NodeType.OUTLOOK_EXECUTION]: {
    image: "/logos/microsoft.svg",
    alt: "Outlook",
  },
  [NodeType.ONEDRIVE_TRIGGER]: {
    image: "/logos/microsoft.svg",
    alt: "OneDrive",
  },
  [NodeType.ONEDRIVE_EXECUTION]: {
    image: "/logos/microsoft.svg",
    alt: "OneDrive",
  },
};

const renderNodeIconGraphic = (type: NodeType) => {
  const descriptor = nodeIconDescriptors[type];

  if (!descriptor) {
    return <IconPayment className="size-4 text-black" />;
  }

  if ("icon" in descriptor) {
    const IconComp = descriptor.icon;
    return <IconComp className="size-4 text-black" />;
  }

  return (
    <Image
      src={descriptor.image}
      alt={descriptor.alt}
      width={16}
      height={16}
      className="size-4 object-contain"
    />
  );
};

const NodePreviewIcon = ({ type }: { type?: NodeType }) => {
  if (!type) {
    return (
      <div className="size-8 rounded-sm bg-background border border-black/10 first:border-r-0 last:border-l-0 first:rounded-r-none last:rounded-l-none flex items-center justify-center first:-mr-1.5 last:-ml-1.5">
        <IconPayment className="size-4 text-black" />
      </div>
    );
  }

  return (
    <div className="size-8 rounded-sm bg-background border border-black/10 flex items-center justify-center first:-mr-1.5 last:-ml-1.5 last:border-l-0 last:rounded-l-none first:border-r-none first:rounded-r-none">
      {renderNodeIconGraphic(type)}
    </div>
  );
};

const toTimestamp = (value?: string | Date | null) => {
  if (!value) {
    return 0;
  }
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

const toPositionX = (position: WorkflowNodePreview["position"]) => {
  if (!position || typeof position !== "object") {
    return 0;
  }

  const maybePosition = position as { x?: number | string | null };
  if (typeof maybePosition.x === "number") {
    return maybePosition.x;
  }
  if (
    typeof maybePosition.x === "string" &&
    !Number.isNaN(Number(maybePosition.x))
  ) {
    return Number(maybePosition.x);
  }
  return 0;
};

const getWorkflowPreviewNodes = (nodes?: WorkflowNodePreview[]) => {
  if (!nodes || nodes.length === 0) {
    return {
      firstNode: undefined,
      lastNode: undefined,
    };
  }

  const filteredNodes = nodes
    .filter((node) => node.type && node.type !== NodeType.INITIAL)
    .sort((a, b) => {
      const timeDiff = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
      if (timeDiff !== 0) {
        return timeDiff;
      }

      return toPositionX(a.position) - toPositionX(b.position);
    });

  if (filteredNodes.length === 0) {
    return {
      firstNode: undefined,
      lastNode: undefined,
    };
  }

  const firstNode = filteredNodes[0];
  const lastNode = filteredNodes[filteredNodes.length - 1];

  return {
    firstNode,
    lastNode,
  };
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
            <div className="flex items-center gap-2">
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
              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10 text-xs"
                onClick={() => router.push(`/workflows/${data.id}`)}
              >
                View template
              </Button>
            </div>

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
