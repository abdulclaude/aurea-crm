"use client";
import * as React from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { IconPayment } from "central-icons/IconPayment";

import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";

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
import {
  ArchiveIcon,
  FolderIcon,
  FolderOpenIcon,
  GlobeIcon,
  LayoutTemplateIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";

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
  useInstallStudioStarterTemplates,
  useMoveWorkflowToFolder,
  useUpdateTemplateMeta,
  useWorkflowFolders,
} from "../hooks/use-workflows";

import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { useEntitySearch } from "@/hooks/use-entity-search";

import type { Workflows } from "@/db/types";
import { NodeType } from "@/db/enums";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { WorkflowFolders, type WorkflowFolder } from "./workflow-folders";
import { toast } from "sonner";

type WorkflowNodePreview = {
  id?: string;
  type?: NodeType;
  createdAt?: string | Date | null;
  position?: unknown;
};

type WorkflowEntity = Omit<Workflows, "nodes"> & {
  nodes?: WorkflowNodePreview[];
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
  return (
    <div className="space-y-4">
      <WorkflowFolders />
      <AllWorkflowsList />
    </div>
  );
};

export default WorkflowsList;

const AllWorkflowsList = () => {
  const workflows = useSuspenseWorkflows();
  const folders = useWorkflowFolders();
  const [params, setParams] = useWorkflowsParams();
  return (
    <>
      <EntityList
        items={workflows.data.items}
        getKey={(workflow) => workflow.id}
        renderItem={(workflow) => (
          <WorkflowItem data={workflow} folders={folders.data?.folders ?? []} />
        )}
        emptyView={<WorkflowsEmpty />}
      />
      <EntityPagination
        disabled={workflows.isFetching}
        totalPages={workflows.data.totalPages}
        page={workflows.data.page}
        onPageChange={(page) => setParams({ ...params, page })}
      />
    </>
  );
};

export const WorkflowsHeader = ({ disabled }: { disabled?: boolean }) => {
  const createWorkflow = useCreateWorkflow();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [params] = useWorkflowsParams();
  const studioEvent = searchParams.get("studioEvent");
  const serviceTypeId = searchParams.get("serviceTypeId");
  const pricingOptionId = searchParams.get("pricingOptionId");
  const formId = searchParams.get("formId");
  const resourceName = searchParams.get("resourceName");
  const isServiceBookingStarter =
    studioEvent === "CLASS_BOOKED" && Boolean(serviceTypeId);
  const isPricingPurchaseStarter =
    studioEvent === "PRICING_OPTION_PURCHASED" && Boolean(pricingOptionId);
  const isFormSubmissionStarter =
    studioEvent === "FORM_SUBMITTED" && Boolean(formId);

  const handleCreate = () => {
    const folderId =
      params.folder !== "all" && params.folder !== "unfiled"
        ? params.folder
        : null;
    createWorkflow.mutate(
      {
        folderId,
        starter:
          isServiceBookingStarter && serviceTypeId
            ? { event: "CLASS_BOOKED", serviceTypeId }
            : isPricingPurchaseStarter && pricingOptionId
              ? { event: "PRICING_OPTION_PURCHASED", pricingOptionId }
              : isFormSubmissionStarter && formId
                ? { event: "FORM_SUBMITTED", formId }
            : undefined,
      },
      {
        onSuccess: (data) => {
          router.push(`/workflows/${data.id}`);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  return (
    <EntityHeader
      title="Workflows"
      description={
        isServiceBookingStarter
          ? `Create an automation already connected to ${resourceName ?? "this service"}.`
          : isPricingPurchaseStarter
            ? `Create an automation that starts when ${resourceName ?? "this pricing option"} is purchased.`
            : isFormSubmissionStarter
              ? `Create an automation that starts when ${resourceName ?? "this form"} is submitted.`
          : "Create and manage your workflows"
      }
      onNew={handleCreate}
      newButtonLabel={
        isServiceBookingStarter
          ? "Create booking automation"
          : isPricingPurchaseStarter
            ? "Create purchase automation"
            : isFormSubmissionStarter
              ? "Create response automation"
            : "New workflow"
      }
      disabled={disabled}
      isCreating={createWorkflow.isPending}
    />
  );
};

export const WorkflowsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <EntityContainer>{children}</EntityContainer>;
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

export const WorkflowsLoading = () => {
  return <LoadingView message="Loading workflows..." />;
};

export const WorkflowsError = () => {
  return <ErrorView message="Error loading workflows..." />;
};

export const WorkflowsEmpty = () => {
  const createWorkflow = useCreateWorkflow();

  const router = useRouter();
  const [params] = useWorkflowsParams();

  const handleCreate = () => {
    const folderId =
      params.folder !== "all" && params.folder !== "unfiled"
        ? params.folder
        : null;
    createWorkflow.mutate(
      { folderId },
      {
        onSuccess: (data) => {
          router.push(`/workflows/${data.id}`);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  return (
    <EmptyView
      title="No workflows"
      label="workflow"
      onNew={handleCreate}
      message="No workflows have been found. Get started by creating a workflow."
    />
  );
};

// Workflow Item

export const WorkflowItem = ({
  data,
  folders = [],
}: {
  data: WorkflowEntity;
  folders?: WorkflowFolder[];
}) => {
  const removeWorkflow = useRemoveWorkflow();
  const moveWorkflow = useMoveWorkflowToFolder();
  const updateArchived = useUpdateWorkflowArchived();

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
      className="rounded-lg"
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
      menuItems={
        <>
          {archived ? (
            <DropdownMenuItem
              className="text-xs"
              disabled={updateArchived.isPending}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                updateArchived.mutate({ id: data.id, archived: false });
              }}
            >
              <RotateCcwIcon className="mr-2 size-3.5" />
              {updateArchived.isPending ? "Restoring..." : "Restore workflow"}
            </DropdownMenuItem>
          ) : null}
          {data.folderId ? (
            <DropdownMenuItem
              className="text-xs"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                moveWorkflow.mutate({ workflowId: data.id, folderId: null });
              }}
            >
              <FolderOpenIcon className="mr-2 size-3.5" />
              Remove from folder
            </DropdownMenuItem>
          ) : null}
          {folders.map((folder) => (
            <DropdownMenuItem
              key={folder.id}
              className="text-xs"
              disabled={data.folderId === folder.id}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                moveWorkflow.mutate({
                  workflowId: data.id,
                  folderId: folder.id,
                });
              }}
            >
              <FolderIcon
                className="mr-2 size-3.5"
                style={folder.color ? { color: folder.color } : undefined}
              />
              Move to {folder.name}
            </DropdownMenuItem>
          ))}
          {(data.folderId || folders.length > 0) && (
            <Separator className="my-1" />
          )}
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
  const [params, setParams] = useWorkflowsParams();
  return (
    <div className="space-y-4">
      <CatalogueSectionHeader
        icon={ArchiveIcon}
        title="Archived workflows"
        description="Inactive automations stay here until you are ready to restore them."
        count={workflows.data.totalCount}
        countLabel="archived workflow"
      />
      <EntityList
        items={workflows.data.items}
        getKey={(workflow) => workflow.id}
        renderItem={(workflow) => <WorkflowItem data={workflow} />}
        emptyView={
          <EmptyView
            title="No archived workflows"
            label="workflow"
            message="Workflows you archive will appear here for safekeeping."
          />
        }
      />
      <EntityPagination
        disabled={workflows.isFetching}
        totalPages={workflows.data.totalPages}
        page={workflows.data.page}
        onPageChange={(page) => setParams({ ...params, page })}
      />
    </div>
  );
};

// Templates

export const TemplatesList = () => {
  const templates = useSuspenseTemplates();
  const installStarterTemplates = useInstallStudioStarterTemplates();
  const [params, setParams] = useWorkflowsParams();

  return (
    <div className="space-y-4">
      <EntityList
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        items={templates.data.items as WorkflowEntity[]}
        getKey={(t) => t.id}
        renderItem={(t) => <TemplateCard data={t} />}
        emptyView={
          <EmptyView
            title="No templates"
            label="template"
            message="No templates have been found. Install studio starters or template an existing workflow."
          />
        }
      />

      <EntityPagination
        disabled={templates.isFetching}
        totalPages={templates.data.totalPages}
        page={templates.data.page}
        onPageChange={(page) => setParams({ ...params, page })}
      />
    </div>
  );
};

const CatalogueSectionHeader = ({
  icon: Icon,
  title,
  description,
  count,
  countLabel,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  count: number;
  countLabel: string;
  action?: React.ReactNode;
}) => {
  const label = count === 1 ? countLabel : `${countLabel}s`;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-black/10 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-background text-primary shadow-sm dark:border-white/10">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-primary">{title}</h2>
            <Badge
              variant="secondary"
              className="h-5 rounded-full px-2 text-[10px]"
            >
              {count} {label}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-primary/50">{description}</p>
        </div>
      </div>
      {action}
    </div>
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
          !!nodeType && triggerPriority.includes(nodeType),
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
      return <MousePointerIcon className="size-4 text-primary" />;
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

const nodeIconDescriptors: Partial<Record<NodeType, NodeIconDescriptor>> = {
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
  [NodeType.CREATE_CLIENT]: { icon: IconPayment, alt: "Create Client" },
  [NodeType.CREATE_TASK]: { icon: IconPayment, alt: "Create task" },
  [NodeType.UPDATE_CLIENT]: { icon: IconPayment, alt: "Update Client" },
  [NodeType.DELETE_CLIENT]: { icon: IconPayment, alt: "Delete Client" },
  [NodeType.CREATE_DEAL]: { icon: IconPayment, alt: "Create deal" },
  [NodeType.UPDATE_DEAL]: { icon: IconPayment, alt: "Update deal" },
  [NodeType.DELETE_DEAL]: { icon: IconPayment, alt: "Delete deal" },
  [NodeType.UPDATE_PIPELINE]: { icon: IconPayment, alt: "Update Pipeline" },
  [NodeType.CLIENT_CREATED_TRIGGER]: {
    icon: IconPayment,
    alt: "Client Created",
  },
  [NodeType.CLIENT_UPDATED_TRIGGER]: {
    icon: IconPayment,
    alt: "Client Updated",
  },
  [NodeType.CLIENT_FIELD_CHANGED_TRIGGER]: {
    icon: IconPayment,
    alt: "Field Changed",
  },
  [NodeType.CLIENT_DELETED_TRIGGER]: {
    icon: IconPayment,
    alt: "Client Deleted",
  },
  [NodeType.CLIENT_TYPE_CHANGED_TRIGGER]: {
    icon: IconPayment,
    alt: "Type Changed",
  },
  [NodeType.CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER]: {
    icon: IconPayment,
    alt: "Lifecycle Changed",
  },
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
    data.description || "",
  );

  return (
    <>
      <Card className="group h-full overflow-hidden rounded-xl border-black/10 bg-background p-0 shadow-none transition hover:border-black/20 hover:shadow-xs dark:border-white/10 dark:hover:border-white/20">
        <CardContent className="flex h-full flex-col justify-between p-0">
          <div className="flex flex-col gap-2 px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <CardTitle className="line-clamp-2 text-sm font-medium leading-5 text-primary">
                  {data.name}
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className="h-5 shrink-0 rounded-full ring-emerald-500/50 bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
              >
                Template
              </Badge>
            </div>

            <CardDescription className="line-clamp-3 min-h-12 text-xs leading-5 text-primary/50 max-w-[45ch]">
              {data.description ||
                "A reusable workflow ready to customise for your studio."}
            </CardDescription>
          </div>

          <Separator />

          <div className=" flex items-center justify-between gap-2 dark:border-white/5 p-6 pb-0">
            <div className="flex min-w-0 flex-1 items-center gap-2">

              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-primary/60 hover:text-primary"
                onClick={() => router.push(`/workflows/${data.id}`)}
              >
                Preview
              </Button>

              <Button
                size="sm"
                className="h-8 text-xs w-max"
                variant="gradient"
                disabled={createFromTemplate.isPending}
                onClick={() =>
                  createFromTemplate.mutate(
                    { id: data.id },
                    {
                      onSuccess: (d) => {
                        router.push(`/workflows/${d.id}`);
                      },
                    },
                  )
                }
              >
                {createFromTemplate.isPending ? "Creating..." : "Use template"}
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 text-primary/60 hover:text-primary"
                  aria-label={`Manage ${data.name}`}
                >
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setOpen(true)}>

                  Edit template
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={removeWorkflow.isPending}
                  onClick={() => removeWorkflow.mutate({ id: data.id })}
                  className="text-rose-600 focus:text-rose-700"
                >

                  {removeWorkflow.isPending ? "Deleting..." : "Delete template"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 sm:max-w-lg" showCloseButton>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Edit template</DialogTitle>
          </DialogHeader>

          <Separator className="bg-black/10 dark:bg-white/10" />

          <div className="flex flex-col gap-6 p-6 pt-2 pb-2">
            <div className="flex flex-col gap-3">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-sm"
              />
            </div>

            <div className="flex flex-col gap-3">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-24 rounded-sm p-2 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 p-6 pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() =>
                updateTemplateMeta.mutate(
                  { id: data.id, name, description },
                  {
                    onSuccess: () => setOpen(false),
                  },
                )
              }
              disabled={updateTemplateMeta.isPending}
            >
              {updateTemplateMeta.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
