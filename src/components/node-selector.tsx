"use client";

import { createId } from "@paralleldrive/cuid2";
import { useReactFlow } from "@xyflow/react";

import { IconWorld as HttpRequestIcon } from "central-icons/IconWorld";
import React, { useCallback, useState, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronRight, Search } from "lucide-react";

import { IconCursorClick as ManualTriggerIcon } from "central-icons/IconCursorClick";
import { IconPeopleAdd as CreateContactIcon } from "central-icons/IconPeopleAdd";
import { IconPeopleEdit as UpdateContactIcon } from "central-icons/IconPeopleEdit";
import { IconMagicEdit as ContactFieldChangedIcon } from "central-icons/IconMagicEdit";
import { IconPeopleRemove as ContactDeletedIcon } from "central-icons/IconPeopleRemove";
import { IconListSparkle as ContactTypeChangedIcon } from "central-icons/IconListSparkle";
import { IconLineChart3 as ContactLifecycleStageChangedIcon } from "central-icons/IconLineChart3";
import { IconCoinsAdd as CreateDealIcon } from "central-icons/IconCoinsAdd";
import { IconRewrite as DealEditIcon } from "central-icons/IconRewrite";
import { IconBranch as IfElseIcon } from "central-icons/IconBranch";
import { IconVariables as SetVariableIcon } from "central-icons/IconVariables";
import { IconStop as StopWorkflowIcon } from "central-icons/IconStop";
import { IconArrowRightLeft as SwitchIcon } from "central-icons/IconArrowRightLeft";
import { IconRepeat as LoopIcon } from "central-icons/IconRepeat";
import { IconImagineAi } from "central-icons/IconImagineAi";
import { BanknoteXIcon } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppProvider, NodeType } from "@prisma/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useSuspenseAppProviders } from "@/features/apps/hooks/use-apps";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "./ui/separator";

export type NodeTypeOption = {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }> | string;
  requiresApp?: AppProvider;
};

// Node definitions organized by category
const manualTriggerNode: NodeTypeOption = {
  type: NodeType.MANUAL_TRIGGER,
  label: "Trigger manually",
  description:
    "Runs the flow on clicking a button. Good for getting started quickly.",
  icon: ManualTriggerIcon,
};

const googleTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.GOOGLE_FORM_TRIGGER,
    label: "Google Form Submission",
    description: "Runs the flow when a Google Form is submitted.",
    icon: "/logos/googleform.svg",
  },
  {
    type: NodeType.GOOGLE_CALENDAR_TRIGGER,
    label: "Google Calendar Event",
    description: "Runs the flow when a calendar event is created or updated.",
    icon: "/logos/googlecalendar.svg",
    requiresApp: AppProvider.GOOGLE_CALENDAR,
  },
  {
    type: NodeType.GMAIL_TRIGGER,
    label: "Gmail (new email)",
    description:
      "Listens for new messages in a label or query and exposes them to the workflow.",
    icon: "/logos/google.svg",
    requiresApp: AppProvider.GMAIL,
  },
];

const googleExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.GOOGLE_CALENDAR_EXECUTION,
    label: "Google Calendar",
    description: "Create or update events on your connected Google Calendar.",
    icon: "/logos/googlecalendar.svg",
    requiresApp: AppProvider.GOOGLE_CALENDAR,
  },
  {
    type: NodeType.GMAIL_EXECUTION,
    label: "Gmail",
    description: "Send personalized emails via your connected Gmail account.",
    icon: "/logos/google.svg",
    requiresApp: AppProvider.GMAIL,
  },
];

const microsoftTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.OUTLOOK_TRIGGER,
    label: "Outlook (new email)",
    description: "Runs when a new email arrives in your Outlook inbox.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.ONEDRIVE_TRIGGER,
    label: "OneDrive (file changed)",
    description: "Runs when files are added, modified, or deleted in OneDrive.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
];

const microsoftExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.OUTLOOK_EXECUTION,
    label: "Outlook Email",
    description: "Send emails via your connected Outlook account.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.ONEDRIVE_EXECUTION,
    label: "OneDrive",
    description: "Upload, download, or delete files in OneDrive.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
];

const socialNodes: NodeTypeOption[] = [
  {
    type: NodeType.DISCORD,
    label: "Discord",
    description: "Send a message to Discord",
    icon: "/logos/discord.svg",
  },
  {
    type: NodeType.SLACK,
    label: "Slack",
    description: "Send a message to Slack",
    icon: "/logos/slack.svg",
  },
  {
    type: NodeType.TELEGRAM_EXECUTION,
    label: "Telegram message",
    description: "Send a message via your Telegram bot.",
    icon: "/logos/telegram.svg",
  },
];

const contactTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.CONTACT_CREATED_TRIGGER,
    label: "Contact Created",
    description: "Triggers when a new contact is created in your CRM.",
    icon: CreateContactIcon,
  },
  {
    type: NodeType.CONTACT_UPDATED_TRIGGER,
    label: "Contact Updated",
    description: "Triggers when any contact field is updated.",
    icon: UpdateContactIcon,
  },
  {
    type: NodeType.CONTACT_FIELD_CHANGED_TRIGGER,
    label: "Contact Field Changed",
    description: "Triggers when a specific contact field changes value.",
    icon: ContactFieldChangedIcon,
  },
  {
    type: NodeType.CONTACT_DELETED_TRIGGER,
    label: "Contact Deleted",
    description: "Triggers when a contact is deleted from your CRM.",
    icon: ContactDeletedIcon,
  },
  {
    type: NodeType.CONTACT_TYPE_CHANGED_TRIGGER,
    label: "Contact Type Changed",
    description: "Triggers when a contact's type is changed.",
    icon: ContactTypeChangedIcon,
  },
  {
    type: NodeType.CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER,
    label: "Contact Lifecycle Stage Changed",
    description:
      "Triggers when a contact moves to a different lifecycle stage.",
    icon: ContactLifecycleStageChangedIcon,
  },
];

const contactExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.CREATE_CONTACT,
    label: "Create Contact",
    description: "Create a new contact in your CRM.",
    icon: CreateContactIcon,
  },
  {
    type: NodeType.UPDATE_CONTACT,
    label: "Update Contact",
    description: "Update an existing contact in your CRM.",
    icon: UpdateContactIcon,
  },
  {
    type: NodeType.DELETE_CONTACT,
    label: "Delete Contact",
    description: "Delete a contact from your CRM.",
    icon: ContactDeletedIcon,
  },
];

const dealExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.CREATE_DEAL,
    label: "Create Deal",
    description: "Create a new deal in your CRM pipeline.",
    icon: CreateDealIcon,
  },
  {
    type: NodeType.UPDATE_DEAL,
    label: "Update Deal",
    description: "Update an existing deal in your CRM.",
    icon: DealEditIcon,
  },
  {
    type: NodeType.DELETE_DEAL,
    label: "Delete Deal",
    description: "Delete a deal from your CRM.",
    icon: BanknoteXIcon,
  },
];

const pipelineExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.UPDATE_PIPELINE,
    label: "Move Deal Stage",
    description: "Move a deal to a different pipeline stage.",
    icon: "/logos/move-right.svg",
  },
];

const logicNodes: NodeTypeOption[] = [
  {
    type: NodeType.IF_ELSE,
    label: "IF / ELSE",
    description: "Split workflow into two branches based on a condition.",
    icon: IfElseIcon,
  },
  {
    type: NodeType.SWITCH,
    label: "SWITCH",
    description:
      "Split workflow into multiple branches based on value matching.",
    icon: SwitchIcon,
  },
  {
    type: NodeType.LOOP,
    label: "LOOP",
    description: "Repeat actions for each item in an array or N times.",
    icon: LoopIcon,
  },
  {
    type: NodeType.SET_VARIABLE,
    label: "Set Variable",
    description: "Store or transform data for use in subsequent nodes.",
    icon: SetVariableIcon,
  },
  {
    type: NodeType.STOP_WORKFLOW,
    label: "Stop Workflow",
    description: "Immediately terminate workflow execution.",
    icon: StopWorkflowIcon,
  },
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Makes a HTTP request",
    icon: HttpRequestIcon,
  },
  {
    type: NodeType.GEMINI,
    label: "Gemini",
    description: "Use Google Gemini to generate text",
    icon: "/logos/gemini.svg",
  },
  {
    type: NodeType.WAIT,
    label: "Wait / Delay",
    description: "Pause workflow execution for a specified amount of time.",
    icon: "/logos/clock.svg",
  },
];

const otherTriggers: NodeTypeOption[] = [
  {
    type: NodeType.TELEGRAM_TRIGGER,
    label: "Telegram (new message)",
    description: "Runs whenever your Telegram bot receives a new message.",
    icon: "/logos/telegram.svg",
  },
  {
    type: NodeType.STRIPE_TRIGGER,
    label: "Stripe Event",
    description: "Runs the flow when a Stripe event is captured.",
    icon: "/logos/stripe.svg",
  },
];

// All trigger node types - used to validate that only one trigger exists per workflow
const TRIGGER_NODE_TYPES: NodeType[] = [
  NodeType.MANUAL_TRIGGER,
  NodeType.GOOGLE_FORM_TRIGGER,
  NodeType.GOOGLE_CALENDAR_TRIGGER,
  NodeType.GMAIL_TRIGGER,
  NodeType.OUTLOOK_TRIGGER,
  NodeType.ONEDRIVE_TRIGGER,
  NodeType.TELEGRAM_TRIGGER,
  NodeType.STRIPE_TRIGGER,
  NodeType.CONTACT_CREATED_TRIGGER,
  NodeType.CONTACT_UPDATED_TRIGGER,
  NodeType.CONTACT_FIELD_CHANGED_TRIGGER,
  NodeType.CONTACT_DELETED_TRIGGER,
  NodeType.CONTACT_TYPE_CHANGED_TRIGGER,
  NodeType.CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER,
];

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  isBundle?: boolean;
}

export const NodeSelector: React.FC<NodeSelectorProps> = ({
  open,
  onOpenChange,
  children,
  isBundle = false,
}) => {
  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();
  const { data: connectedProviders } = useSuspenseAppProviders();
  const connectedProviderSet = React.useMemo(
    () => new Set(connectedProviders || []),
    [connectedProviders]
  );

  const [currentView, setCurrentView] = useState<string>("main");
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(["Nodes"]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hasTrigger, setHasTrigger] = useState(false);

  const trpc = useTRPC();
  const { data: bundles = [] } = useQuery({
    ...trpc.workflows.listBundles.queryOptions(),
    enabled: open,
  });

  // Update hasTrigger state when the sheet opens or nodes change
  React.useEffect(() => {
    if (open) {
      const nodes = getNodes();
      const triggerExists = nodes.some((node) =>
        TRIGGER_NODE_TYPES.includes(node.type as NodeType)
      );
      setHasTrigger(triggerExists);
    }
  }, [open, getNodes]);

  const handleNodeSelect = useCallback(
    (selection: NodeTypeOption, bundleId?: string) => {
      // Check if trying to add a trigger node
      if (TRIGGER_NODE_TYPES.includes(selection.type)) {
        const nodes = getNodes();
        const existingTrigger = nodes.find((node) =>
          TRIGGER_NODE_TYPES.includes(node.type as NodeType)
        );

        if (existingTrigger) {
          toast.error(
            "Only one trigger is allowed per workflow. Please remove the existing trigger first."
          );
          return;
        }
      }

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const flowPosition = screenToFlowPosition({
        x: centerX + (Math.random() - 0.5) * 200,
        y: centerY + (Math.random() - 0.5) * 200,
      });

      const newNode = {
        id: createId(),
        data: bundleId ? { bundleWorkflowId: bundleId } : {},
        position: flowPosition,
        type: selection.type,
      };

      setNodes((nodes) => {
        // Remove INITIAL placeholder node if it exists
        const filteredNodes = nodes.filter(
          (node) => node.type !== NodeType.INITIAL
        );
        return [...filteredNodes, newNode];
      });

      onOpenChange(false);
      setCurrentView("main");
      setBreadcrumbs(["Nodes"]);
      setSearchQuery("");
    },
    [setNodes, getNodes, onOpenChange, screenToFlowPosition]
  );

  const getIntegrationLabel = (provider?: AppProvider) => {
    switch (provider) {
      case AppProvider.GOOGLE_CALENDAR:
        return "Google Calendar";
      case AppProvider.GMAIL:
        return "Gmail";
      case AppProvider.OUTLOOK:
        return "Outlook";
      case AppProvider.ONEDRIVE:
        return "OneDrive";
      case AppProvider.MICROSOFT:
        return "Microsoft 365";
      default:
        return "this integration";
    }
  };

  const renderNodeButton = (nodeType: NodeTypeOption) => {
    const Icon = nodeType.icon;
    const isIntegrationSatisfied =
      !nodeType.requiresApp || connectedProviderSet.has(nodeType.requiresApp);
    const isTrigger = TRIGGER_NODE_TYPES.includes(nodeType.type);
    const isTriggerDisabled = isTrigger && hasTrigger;

    return (
      <Button
        key={nodeType.type}
        className="w-full justify-start h-max py-5 px-8 bg-background text-primary hover:bg-primary-foreground/40 hover:text-primary rounded-sm border border-black/10"
        onClick={() => handleNodeSelect(nodeType)}
        variant="ghost"
        disabled={!isIntegrationSatisfied || isTriggerDisabled}
      >
        <div className="flex items-center gap-6 w-full overflow-hidden">
          {typeof Icon === "string" ? (
            <Image
              src={Icon}
              alt={nodeType.label}
              width={20}
              height={20}
              className="size-5 object-contain rounded-sm mt-1"
            />
          ) : (
            <Icon className="size-5 text-primary " />
          )}

          <div className="flex flex-col items-start text-left gap-0.5 max-w-[220px]">
            <h1 className="font-medium text-sm">{nodeType.label}</h1>

            <p className="text-[11px] text-primary/60 font-normal w-full whitespace-normal wrap-break-word">
              {nodeType.description}
            </p>

            {!isIntegrationSatisfied && (
              <p className="text-[10px] text-amber-600 font-normal wrap-break-word">
                Connect {getIntegrationLabel(nodeType.requiresApp)} in Apps to
                use this node.
              </p>
            )}

            {isTriggerDisabled && (
              <p className="text-[10px] text-amber-600 font-normal wrap-break-word">
                A trigger already exists. Remove it to add a different one.
              </p>
            )}
          </div>
        </div>
      </Button>
    );
  };

  const renderMenuButton = (
    label: string,
    description: string,
    icon: string | React.ComponentType<{ className?: string }>,
    onClick: () => void
  ) => {
    const Icon = icon;
    return (
      <Button
        className="w-full justify-between h-max py-5 px-8 bg-background text-primary hover:bg-primary-foreground/40 hover:text-primary rounded-sm border border-black/10"
        onClick={onClick}
        variant="ghost"
      >
        <div className="flex items-center gap-6 w-full overflow-hidden">
          {typeof Icon === "string" ? (
            <Image
              src={Icon}
              alt={label}
              width={20}
              height={20}
              className="size-5 object-contain rounded-sm mt-1"
            />
          ) : (
            <Icon className="size-5 text-primary " />
          )}

          <div className="flex flex-col items-start text-left gap-0.5 flex-1">
            <h1 className="font-medium text-sm">{label}</h1>
            <p className="text-[11px] text-primary/60 font-normal">
              {description}
            </p>
          </div>

          <ChevronRight className="size-4 text-primary/50" />
        </div>
      </Button>
    );
  };

  const navigateTo = (view: string, breadcrumb: string) => {
    setCurrentView(view);
    setBreadcrumbs([...breadcrumbs, breadcrumb]);
  };

  const navigateBack = (index: number) => {
    if (index === 0) {
      setCurrentView("main");
      setBreadcrumbs(["Nodes"]);
    } else {
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(newBreadcrumbs);
      // Derive view from breadcrumbs
      if (newBreadcrumbs.length === 1) setCurrentView("main");
      else if (newBreadcrumbs[1] === "Google") setCurrentView("google");
      else if (newBreadcrumbs[1] === "Microsoft") setCurrentView("microsoft");
      else if (newBreadcrumbs[1] === "Social") setCurrentView("social");
      else if (newBreadcrumbs[1] === "CRM") setCurrentView("crm");
      else if (newBreadcrumbs[1] === "Logic") setCurrentView("logic");
      else if (newBreadcrumbs[1] === "Bundles") setCurrentView("bundles");
    }
  };

  // Get search placeholder based on current view
  const getSearchPlaceholder = () => {
    switch (currentView) {
      case "main":
        return "Search all nodes...";
      case "google":
        return "Search Google nodes...";
      case "google-triggers":
        return "Search Google triggers...";
      case "google-executions":
        return "Search Google executions...";
      case "microsoft":
        return "Search Microsoft nodes...";
      case "microsoft-triggers":
        return "Search Microsoft triggers...";
      case "microsoft-executions":
        return "Search Microsoft executions...";
      case "social":
        return "Search social nodes...";
      case "crm":
        return "Search CRM nodes...";
      case "crm-contacts":
        return "Search contact nodes...";
      case "crm-contacts-triggers":
        return "Search contact triggers...";
      case "crm-contacts-executions":
        return "Search contact executions...";
      case "crm-deals":
        return "Search deal nodes...";
      case "crm-pipeline":
        return "Search pipeline nodes...";
      case "logic":
        return "Search logic nodes...";
      case "bundles":
        return "Search bundles...";
      default:
        return "Search nodes...";
    }
  };

  // Get all nodes for root-level global search
  const allNodes = useMemo(() => {
    const nodes: NodeTypeOption[] = [];

    // If no trigger exists, show ONLY trigger nodes
    if (!hasTrigger && !isBundle) {
      nodes.push(manualTriggerNode);
      nodes.push(...googleTriggerNodes);
      nodes.push(...microsoftTriggerNodes);
      nodes.push(...otherTriggers);
      nodes.push(...contactTriggerNodes);
      return nodes;
    }

    // If trigger exists, show ONLY execution nodes
    nodes.push(...googleExecutionNodes);
    nodes.push(...microsoftExecutionNodes);
    nodes.push(...socialNodes);
    nodes.push(...contactExecutionNodes);
    nodes.push(...dealExecutionNodes);
    nodes.push(...pipelineExecutionNodes);
    if (!isBundle) {
      nodes.push(...logicNodes);
    }
    return nodes;
  }, [isBundle, hasTrigger]);

  // Filter nodes based on search query
  const filterNodes = (nodes: NodeTypeOption[]) => {
    if (!searchQuery.trim()) return nodes;
    const query = searchQuery.toLowerCase();
    return nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query)
    );
  };

  // Contextual search results based on current view
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;

    let searchableNodes: NodeTypeOption[];
    switch (currentView) {
      case "main":
        searchableNodes = allNodes;
        break;
      case "google":
        // If no trigger, show only triggers; if trigger exists, show only executions
        searchableNodes = hasTrigger
          ? googleExecutionNodes
          : googleTriggerNodes;
        break;
      case "google-triggers":
        searchableNodes = googleTriggerNodes;
        break;
      case "google-executions":
        searchableNodes = googleExecutionNodes;
        break;
      case "microsoft":
        // If no trigger, show only triggers; if trigger exists, show only executions
        searchableNodes = hasTrigger
          ? microsoftExecutionNodes
          : microsoftTriggerNodes;
        break;
      case "microsoft-triggers":
        searchableNodes = microsoftTriggerNodes;
        break;
      case "microsoft-executions":
        searchableNodes = microsoftExecutionNodes;
        break;
      case "social":
        searchableNodes = socialNodes;
        break;
      case "crm":
        // If no trigger, show triggers + executions; if trigger exists, show only executions
        searchableNodes = hasTrigger
          ? [
              ...contactExecutionNodes,
              ...dealExecutionNodes,
              ...pipelineExecutionNodes,
            ]
          : [
              ...contactTriggerNodes,
              ...contactExecutionNodes,
              ...dealExecutionNodes,
              ...pipelineExecutionNodes,
            ];
        break;
      case "crm-contacts":
        // If no trigger, show triggers + executions; if trigger exists, show only executions
        searchableNodes = hasTrigger
          ? contactExecutionNodes
          : [...contactTriggerNodes, ...contactExecutionNodes];
        break;
      case "crm-contacts-triggers":
        searchableNodes = contactTriggerNodes;
        break;
      case "crm-contacts-executions":
        searchableNodes = contactExecutionNodes;
        break;
      case "crm-deals":
        searchableNodes = dealExecutionNodes;
        break;
      case "crm-pipeline":
        searchableNodes = pipelineExecutionNodes;
        break;
      case "logic":
        searchableNodes = logicNodes;
        break;
      case "bundles":
        searchableNodes = [];
        break;
      default:
        searchableNodes = allNodes;
    }

    const query = searchQuery.toLowerCase();
    return searchableNodes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query)
    );
  }, [currentView, searchQuery, allNodes, hasTrigger]);

  // Filter bundles based on search query
  const filteredBundles = useMemo(() => {
    if (!searchQuery.trim()) return bundles;
    const query = searchQuery.toLowerCase();
    return bundles.filter(
      (bundle) =>
        bundle.name.toLowerCase().includes(query) ||
        bundle.description?.toLowerCase().includes(query)
    );
  }, [bundles, searchQuery]);

  const renderContent = () => {
    // If there's a search query, show contextual search results
    if (searchQuery.trim() && searchResults) {
      const showBundles = currentView === "main" || currentView === "bundles";
      const bundlesToShow = showBundles ? filteredBundles : [];

      if (searchResults.length === 0 && bundlesToShow.length === 0) {
        return (
          <div className="px-2 py-6 flex items-center justify-center">
            <p className="text-xs text-primary">
              No results found for "{searchQuery}"
            </p>
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-2">
          {searchResults.map((node) => renderNodeButton(node))}

          {bundlesToShow.length > 0 && (
            <>
              <div className="px-2 py-2 mt-2">
                <p className="text-xs text-primary/60 font-medium">
                  Bundles ({bundlesToShow.length})
                </p>
              </div>
              {bundlesToShow.map((bundle) => (
                <Button
                  key={`bundle-${bundle.id}`}
                  className="w-full justify-start h-max py-5 px-8 bg-background text-primary hover:bg-primary-foreground/40 hover:text-primary rounded-sm border border-black/10"
                  onClick={() =>
                    handleNodeSelect(
                      {
                        type: NodeType.BUNDLE_WORKFLOW,
                        label: bundle.name,
                        description: bundle.description || "",
                        icon: IconImagineAi,
                      },
                      bundle.id
                    )
                  }
                  variant="ghost"
                >
                  <div className="flex items-center gap-6 w-full overflow-hidden">
                    <IconImagineAi className="size-5 text-primary " />

                    <div className="flex flex-col items-start text-left gap-0.5 max-w-[220px]">
                      <h1 className="font-medium text-sm">{bundle.name}</h1>

                      <p className="text-[11px] text-primary/60 font-normal w-full whitespace-normal wrap-break-word">
                        {bundle.description || "Execute this bundle workflow"}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
            </>
          )}
        </div>
      );
    }

    switch (currentView) {
      case "main":
        return (
          <div className="flex flex-col gap-2">
            {/* Manual trigger - only show when no trigger exists */}
            {!isBundle && !hasTrigger && renderNodeButton(manualTriggerNode)}

            {/* Google - show when no trigger OR when trigger exists (different nodes shown inside) */}
            {!isBundle &&
              renderMenuButton(
                "Google",
                hasTrigger
                  ? "Gmail, Calendar"
                  : "Gmail, Calendar, Forms (Triggers)",
                "/logos/google.svg",
                () => navigateTo("google", "Google")
              )}

            {/* Microsoft - show when no trigger OR when trigger exists */}
            {!isBundle &&
              renderMenuButton(
                "Microsoft",
                hasTrigger
                  ? "Outlook, OneDrive"
                  : "Outlook, OneDrive (Triggers)",
                "/logos/microsoft.svg",
                () => navigateTo("microsoft", "Microsoft")
              )}

            {/* Social - only show when trigger exists (execution nodes only) */}
            {hasTrigger &&
              renderMenuButton(
                "Social",
                "Discord, Slack, Telegram",
                "/logos/slack.svg",
                () => navigateTo("social", "Social")
              )}

            {/* CRM - show based on trigger state */}
            {renderMenuButton(
              "CRM",
              hasTrigger
                ? "Contacts, Deals, Pipelines"
                : "Contact Triggers & Actions",
              CreateContactIcon,
              () => navigateTo("crm", "CRM")
            )}

            {/* Logic - only show when trigger exists (execution nodes) */}
            {!isBundle &&
              hasTrigger &&
              renderMenuButton(
                "Logic",
                "IF/ELSE, Switch, Loop, HTTP, AI",
                IfElseIcon,
                () => navigateTo("logic", "Logic")
              )}

            {/* Bundles - only show when trigger exists */}
            {!isBundle &&
              hasTrigger &&
              renderMenuButton(
                "Bundle Workflows",
                "Reusable workflow bundles",
                IconImagineAi,
                () => navigateTo("bundles", "Bundles")
              )}

            {/* Other triggers - only show when no trigger exists */}
            {!isBundle && !hasTrigger && otherTriggers.length > 0 && (
              <>
                <div className="px-2 py-2 mt-2">
                  <p className="text-xs text-primary/60 font-medium">
                    Other Triggers
                  </p>
                </div>
                {filterNodes(otherTriggers).map((node) =>
                  renderNodeButton(node)
                )}
              </>
            )}
          </div>
        );

      case "google":
        return (
          <div className="flex flex-col gap-2">
            {/* Show only triggers when no trigger exists */}
            {!hasTrigger &&
              filterNodes(googleTriggerNodes).map((node) =>
                renderNodeButton(node)
              )}
            {/* Show only executions when trigger exists */}
            {hasTrigger &&
              filterNodes(googleExecutionNodes).map((node) =>
                renderNodeButton(node)
              )}
          </div>
        );

      case "google-triggers":
        return (
          <div className="flex flex-col gap-2">
            {filterNodes(googleTriggerNodes).map((node) =>
              renderNodeButton(node)
            )}
          </div>
        );

      case "google-executions":
        return (
          <div className="flex flex-col gap-2">
            {filterNodes(googleExecutionNodes).map((node) =>
              renderNodeButton(node)
            )}
          </div>
        );

      case "microsoft":
        return (
          <div className="flex flex-col gap-2">
            {/* Show only triggers when no trigger exists */}
            {!hasTrigger &&
              filterNodes(microsoftTriggerNodes).map((node) =>
                renderNodeButton(node)
              )}
            {/* Show only executions when trigger exists */}
            {hasTrigger &&
              filterNodes(microsoftExecutionNodes).map((node) =>
                renderNodeButton(node)
              )}
          </div>
        );

      case "microsoft-triggers":
        return (
          <div className="flex flex-col gap-2">
            {filterNodes(microsoftTriggerNodes).map((node) =>
              renderNodeButton(node)
            )}
          </div>
        );

      case "microsoft-executions":
        return (
          <div className="flex flex-col gap-2">
            {filterNodes(microsoftExecutionNodes).map((node) =>
              renderNodeButton(node)
            )}
          </div>
        );

      case "social":
        return (
          <div className="flex flex-col gap-2">
            {filterNodes(socialNodes).map((node) => renderNodeButton(node))}
          </div>
        );

      case "crm":
        return (
          <div className="flex flex-col gap-2">
            {/* Contacts - always show */}
            {renderMenuButton(
              "Contacts",
              hasTrigger ? "Contact actions" : "Contact triggers",
              CreateContactIcon,
              () => navigateTo("crm-contacts", "Contacts")
            )}
            {/* Deals - only show when trigger exists (execution only) */}
            {hasTrigger &&
              renderMenuButton("Deals", "Deal actions", CreateDealIcon, () =>
                navigateTo("crm-deals", "Deals")
              )}
            {/* Pipeline - only show when trigger exists (execution only) */}
            {hasTrigger &&
              renderMenuButton(
                "Pipeline",
                "Pipeline actions",
                "/logos/move-right.svg",
                () => navigateTo("crm-pipeline", "Pipeline")
              )}
          </div>
        );

      case "crm-contacts":
        return (
          <div className="flex flex-col gap-2">
            {/* Show only triggers when no trigger exists */}
            {!hasTrigger &&
              filterNodes(contactTriggerNodes).map((node) =>
                renderNodeButton(node)
              )}
            {/* Show only executions when trigger exists */}
            {hasTrigger &&
              filterNodes(contactExecutionNodes).map((node) =>
                renderNodeButton(node)
              )}
          </div>
        );

      case "crm-contacts-triggers":
        return (
          <div className="flex flex-col gap-2">
            {filterNodes(contactTriggerNodes).map((node) =>
              renderNodeButton(node)
            )}
          </div>
        );

      case "crm-contacts-executions":
        return (
          <div className="flex flex-col gap-2">
            {filterNodes(contactExecutionNodes).map((node) =>
              renderNodeButton(node)
            )}
          </div>
        );

      case "crm-deals":
        return (
          <div className="flex flex-col gap-2">
            {filterNodes(dealExecutionNodes).map((node) =>
              renderNodeButton(node)
            )}
          </div>
        );

      case "crm-pipeline":
        return (
          <div className="flex flex-col gap-2">
            {filterNodes(pipelineExecutionNodes).map((node) =>
              renderNodeButton(node)
            )}
          </div>
        );

      case "logic":
        return (
          <div className="flex flex-col gap-2">
            {filterNodes(logicNodes).map((node) => renderNodeButton(node))}
          </div>
        );

      case "bundles":
        if (!bundles.length) {
          return (
            <p className="px-2 py-4 text-xs text-primary/75 text-center">
              No bundle workflows available. Create a workflow and mark it as a
              bundle to use it here.
            </p>
          );
        }
        return (
          <div className="flex flex-col gap-2">
            {filteredBundles.map((bundle) => (
              <Button
                key={`bundle-${bundle.id}`}
                className="w-full justify-start h-max py-5 px-8 bg-background text-primary hover:bg-primary-foreground/40 hover:text-primary rounded-sm border border-black/10"
                onClick={() =>
                  handleNodeSelect(
                    {
                      type: NodeType.BUNDLE_WORKFLOW,
                      label: bundle.name,
                      description: bundle.description || "",
                      icon: IconImagineAi,
                    },
                    bundle.id
                  )
                }
                variant="ghost"
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  <IconImagineAi className="size-5 text-primary " />

                  <div className="flex flex-col items-start text-left gap-0.5 max-w-[220px]">
                    <h1 className="font-medium text-sm">{bundle.name}</h1>

                    <p className="text-[11px] text-primary/60 font-normal w-full whitespace-normal wrap-break-word">
                      {bundle.description || "Execute this bundle workflow"}
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setCurrentView("main");
          setBreadcrumbs(["Nodes"]);
          setSearchQuery("");
        }
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto border-none text-primary bg-background pb-8"
      >
        <SheetHeader className="px-8 pt-6 gap-0">
          <SheetTitle className="text-primary font-medium">
            Add a node
          </SheetTitle>
          <SheetDescription className="text-primary/60">
            {isBundle
              ? "Choose from execution, social, or CRM nodes for your bundle"
              : "Browse through categories to find the node you need"}
          </SheetDescription>
        </SheetHeader>

        <Separator className="bg-black/10 dark:bg-white/10" />

        {/* Breadcrumb Navigation */}
        <div className="px-8 py-4 pb-3">
          <div className="flex items-center gap-2 text-xs">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={`breadcrumb-${index}-${crumb}`}>
                <button
                  type="button"
                  onClick={() => navigateBack(index)}
                  className={`${
                    index === breadcrumbs.length - 1
                      ? "text-primary font-medium"
                      : "text-primary/60 hover:text-primary"
                  } transition-colors`}
                >
                  {crumb}
                </button>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="size-3 text-primary/60" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="px-8 pb-3">
          <div className="relative">
            <Search className="absolute z-10 left-3 top-1/2 -translate-y-1/2 size-3.5 text-primary!" />

            <Input
              type="text"
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-black/10 text-primary placeholder:text-primary/60 focus:border-black/20"
            />
          </div>
        </div>

        <div className="px-8">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  );
};
