"use client";

import { createId } from "@paralleldrive/cuid2";
import { useReactFlow } from "@xyflow/react";

import { GlobeIcon, MousePointerIcon } from "lucide-react";
import React, { useCallback } from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { IntegrationProvider, NodeType } from "@/generated/prisma/enums";
import { Separator } from "./ui/separator";
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
    icon: MousePointerIcon,
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
];

const executionNodes: NodeTypeOption[] = [
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Makes a HTTP request",
    icon: GlobeIcon,
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
      default:
        return "this integration";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto border-none"
      >
        <SheetHeader className="px-8 py-8 pt-12">
          <SheetTitle>What triggers this workflow?</SheetTitle>

          <SheetDescription>
            A trigger is a step that starts your workflow.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div>
          {triggerNodes.map((nodeType) => {
            const Icon = nodeType.icon;
            const isIntegrationSatisfied =
              !nodeType.requiresIntegration ||
              connectedProviderSet.has(nodeType.requiresIntegration);

            return (
              <Button
                key={nodeType.type}
                className="w-full justify-start h-auto py-5 px-4 rounded-none border-l-2 border-transparent hover:border-l-primary hover:bg-accent/25 transition duration-250"
                onClick={() => handleNodeSelect(nodeType)}
                variant="ghost"
                disabled={!isIntegrationSatisfied}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <img
                      src={Icon}
                      alt={nodeType.label}
                      className="size-5 object-contain rounded-sm"
                    />
                  ) : (
                    <Icon className="size-5" />
                  )}

                  <div className="flex flex-col items-start text-left gap-0.5">
                    <span className="font-medium text-sm">
                      {nodeType.label}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {nodeType.description}
                    </span>
                    {!isIntegrationSatisfied && (
                      <span className="text-[11px] text-amber-600 mt-1">
                        Connect{" "}
                        {getIntegrationLabel(nodeType.requiresIntegration)} in
                        Integrations to use this trigger.
                      </span>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        <Separator />

        <SheetHeader className="px-8 py-8">
          <SheetTitle>What executes this workflow?</SheetTitle>

          <SheetDescription>
            A trigger is a step that starts your workflow.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div>
          {executionNodes.map((nodeType) => {
            const Icon = nodeType.icon;
            const isIntegrationSatisfied =
              !nodeType.requiresIntegration ||
              connectedProviderSet.has(nodeType.requiresIntegration);

            return (
              <Button
                key={nodeType.type}
                className="w-full justify-start h-auto py-5 px-4 rounded-none border-l-2 border-transparent hover:border-l-primary hover:bg-accent/25 transition duration-250"
                onClick={() => handleNodeSelect(nodeType)}
                variant="ghost"
                disabled={!isIntegrationSatisfied}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <img
                      src={Icon}
                      alt={nodeType.label}
                      className="size-5 object-contain rounded-sm"
                    />
                  ) : (
                    <Icon className="size-5" />
                  )}

                  <div className="flex flex-col items-start text-left gap-0.5">
                    <span className="font-medium text-sm">
                      {nodeType.label}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {nodeType.description}
                    </span>
                    {!isIntegrationSatisfied && (
                      <span className="text-[11px] text-amber-600 mt-1">
                        Connect{" "}
                        {getIntegrationLabel(nodeType.requiresIntegration)} in
                        Integrations to use this action.
                      </span>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
