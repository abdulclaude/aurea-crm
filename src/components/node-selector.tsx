"use client";

import { createId } from "@paralleldrive/cuid2";
import { useReactFlow } from "@xyflow/react";

import { IconWorld as HttpRequestIcon } from "central-icons/IconWorld";
import React, { useCallback, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";

import { IconCursorClick as ManualTriggerIcon } from "central-icons/IconCursorClick";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { IntegrationProvider, NodeType } from "@/generated/prisma/enums";
import { Button } from "./ui/button";
import { useSuspenseIntegrationProviders } from "@/features/integrations/hooks/use-integrations";

export type NodeTypeOption = {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }> | string;
  requiresIntegration?: IntegrationProvider;
};

const triggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.MANUAL_TRIGGER,
    label: "Trigger manually",
    description:
      "Runs the flow on clicking a button. Good for getting started quickly.",
    icon: ManualTriggerIcon,
  },
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
    requiresIntegration: IntegrationProvider.GOOGLE_CALENDAR,
  },
  {
    type: NodeType.STRIPE_TRIGGER,
    label: "Stripe Event",
    description: "Runs the flow when a Stripe event is captured.",
    icon: "/logos/stripe.svg",
  },
  {
    type: NodeType.GMAIL_TRIGGER,
    label: "Gmail (new email)",
    description:
      "Listens for new messages in a label or query and exposes them to the workflow.",
    icon: "/logos/google.svg",
    requiresIntegration: IntegrationProvider.GMAIL,
  },
  {
    type: NodeType.TELEGRAM_TRIGGER,
    label: "Telegram (new message)",
    description: "Runs whenever your Telegram bot receives a new message.",
    icon: "/logos/telegram.svg",
  },
  {
    type: NodeType.WHATSAPP_TRIGGER,
    label: "WhatsApp (new message)",
    description: "Runs whenever your WhatsApp business number gets a message.",
    icon: "/logos/whatsapp.svg",
    requiresIntegration: IntegrationProvider.WHATSAPP,
  },
];

const executionNodes: NodeTypeOption[] = [
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
    type: NodeType.GOOGLE_CALENDAR_EXECUTION,
    label: "Google Calendar",
    description: "Create or update events on your connected Google Calendar.",
    icon: "/logos/googlecalendar.svg",
    requiresIntegration: IntegrationProvider.GOOGLE_CALENDAR,
  },
  {
    type: NodeType.GMAIL_EXECUTION,
    label: "Gmail",
    description: "Send personalized emails via your connected Gmail account.",
    icon: "/logos/google.svg",
    requiresIntegration: IntegrationProvider.GMAIL,
  },
  {
    type: NodeType.TELEGRAM_EXECUTION,
    label: "Telegram message",
    description: "Send a message via your Telegram bot.",
    icon: "/logos/telegram.svg",
  },
  {
    type: NodeType.WHATSAPP_EXECUTION,
    label: "WhatsApp message",
    description:
      "Send a WhatsApp message through your connected business number.",
    icon: "/logos/whatsapp.svg",
    requiresIntegration: IntegrationProvider.WHATSAPP,
  },
];

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const NodeSelector: React.FC<NodeSelectorProps> = ({
  open,
  onOpenChange,
  children,
}) => {
  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();
  const { data: connectedProviders } = useSuspenseIntegrationProviders();
  const connectedProviderSet = React.useMemo(
    () => new Set(connectedProviders || []),
    [connectedProviders]
  );

  const communicationTypes = useMemo(
    () =>
      new Set<NodeType>([
        NodeType.DISCORD,
        NodeType.SLACK,
        NodeType.TELEGRAM_EXECUTION,
        NodeType.WHATSAPP_EXECUTION,
      ]),
    []
  );

  const communicationNodes = useMemo(
    () => executionNodes.filter((node) => communicationTypes.has(node.type)),
    [communicationTypes]
  );

  const actionNodes = useMemo(
    () => executionNodes.filter((node) => !communicationTypes.has(node.type)),
    [communicationTypes]
  );

  const handleNodeSelect = useCallback(
    (selection: NodeTypeOption) => {
      // check if manual trigger already exists

      if (selection.type === NodeType.MANUAL_TRIGGER) {
        const nodes = getNodes();
        const hasManualTrigger = nodes.some(
          (node) => node.type === NodeType.MANUAL_TRIGGER
        );

        if (hasManualTrigger) {
          toast.error("Only one manual trigger is allowed per workflow.");
          return;
        }
      }

      setNodes((nodes) => {
        const hasInitialTrigger = nodes.some(
          (node) => node.type === NodeType.INITIAL
        );

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const flowPosition = screenToFlowPosition({
          x: centerX + (Math.random() - 0.5) * 200,
          y: centerY + (Math.random() - 0.5) * 200,
        });

        const newNode = {
          id: createId(),
          data: {},
          position: flowPosition,
          type: selection.type,
        };

        if (hasInitialTrigger) {
          return [newNode];
        }

        return [...nodes, newNode];
      });
      onOpenChange(false);
    },
    [setNodes, getNodes, onOpenChange, screenToFlowPosition]
  );

  const getIntegrationLabel = (provider?: IntegrationProvider) => {
    switch (provider) {
      case IntegrationProvider.GOOGLE_CALENDAR:
        return "Google Calendar";
      case IntegrationProvider.GMAIL:
        return "Gmail";
      default:
        return "this integration";
    }
  };

  const renderNodeButtons = (
    nodes: NodeTypeOption[],
    emptyText: string,
    category: "trigger" | "execution" | "communication"
  ) => {
    if (!nodes.length) {
      return <p className="px-8 py-6 text-xs text-white/40">{emptyText}</p>;
    }

    return nodes.map((nodeType) => {
      const Icon = nodeType.icon;
      const isIntegrationSatisfied =
        !nodeType.requiresIntegration ||
        connectedProviderSet.has(nodeType.requiresIntegration);

      return (
        <Button
          key={`${category}-${nodeType.type}`}
          className="w-full justify-start h-max py-5 px-8 bg-[#202E32] brightness-120 border border-[#375159]/25 text-white/50 hover:border-[#375159]/50  hover:bg-[#202E32] hover:brightness-140 hover:text-white transition duration-250 rounded-sm"
          onClick={() => handleNodeSelect(nodeType)}
          variant="ghost"
          disabled={!isIntegrationSatisfied}
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
              <Icon className="size-5 text-white " />
            )}

            <div className="flex flex-col items-start text-left gap-0.5 max-w-[220px]">
              <h1 className="font-medium text-sm">{nodeType.label}</h1>

              <p className="text-[11px] text-white/40 font-normal w-full whitespace-normal wrap-break-word">
                {nodeType.description}
              </p>

              {!isIntegrationSatisfied && (
                <p className="text-[10px] text-amber-200 font-normal wrap-break-word">
                  Connect {getIntegrationLabel(nodeType.requiresIntegration)} in
                  Integrations to use this node.
                </p>
              )}
            </div>
          </div>
        </Button>
      );
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto border-none bg-[#202E32] text-white"
      >
        <SheetHeader className="px-8 pt-12 gap-1">
          <SheetTitle>Add a node</SheetTitle>
          <SheetDescription>
            Choose from triggers, executions, or communication nodes.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="triggers" className="px-8">
          <TabsList className="bg-[#202E32] brightness-120 text-white/50 mb-2 w-max">
            <TabsTrigger
              className="data-[state=active]:bg-[#202E32] data-[state=active]:brightness-130 px-4"
              value="triggers"
            >
              Triggers
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-[#202E32] data-[state=active]:brightness-130 px-4"
              value="executions"
            >
              Executions
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-[#202E32] data-[state=active]:brightness-130 px-4"
              value="communication"
            >
              Communication
            </TabsTrigger>
          </TabsList>

          <TabsContent value="triggers" className="focus-visible:outline-none">
            <div className="flex flex-col gap-2">
              {renderNodeButtons(
                triggerNodes,
                "No trigger nodes available.",
                "trigger"
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="executions"
            className="focus-visible:outline-none"
          >
            <div className="flex flex-col gap-2">
              {renderNodeButtons(
                actionNodes,
                "No execution nodes available.",
                "execution"
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="communication"
            className="focus-visible:outline-none"
          >
            <div className="flex flex-col gap-2">
              {renderNodeButtons(
                communicationNodes,
                "No communication nodes available.",
                "communication"
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
